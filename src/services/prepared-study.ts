import type { SQLiteDatabase } from 'expo-sqlite';
import { readStudyBatch, type StudyBatchScope, type StudyQuestion } from '@/database/study-batch';
import { preloadMedia } from '@/services/media-preload';
import { protectMedia, releaseProtectedMedia } from '@/services/media-cache';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { selectedQuestionLanguage } from '@/database/translations';
import { learningRecommendation, type TopicInsight } from '@/domain/learning-recommendation';

type Result = Awaited<ReturnType<typeof readStudyBatch>>;
type Draft = { promise: Promise<Result>; result?: Result; expires: number; group: string; revision: number };
const pools = new WeakMap<SQLiteDatabase, Map<string, Draft>>();
const intents = new WeakMap<SQLiteDatabase, Draft>();
let sequence = 0;
const keyFor = (scope: StudyBatchScope, previous: readonly number[]) => JSON.stringify([
  userDataRevision(), scope.category, scope.language, scope.filter, scope.session ? 32 : scope.limit === 5 ? 5 : 12,
  scope.topic ?? '', scope.sign ?? '', scope.session ?? '', scope.search?.trim() ?? '',
  [...new Set(previous)].sort((a,b) => a-b),
]);

/** Small in-memory queue of exact unstarted batches, not a new history/session. */
export function readPreparedStudyBatch(db: SQLiteDatabase, scope: StudyBatchScope, previous: readonly number[] = [], prepareMedia = true) {
  let drafts = pools.get(db);
  if (!drafts) { drafts = new Map(); pools.set(db, drafts); }
  for (const [key, draft] of drafts) {
    if (draft.expires <= Date.now() || !userDataWritable(draft.revision)) {
      drafts.delete(key); releaseProtectedMedia(draft.group);
    }
  }
  const key = keyFor(scope, previous);
  const existing = drafts.get(key);
  const select = (draft: Draft) => {
    if (!prepareMedia) return;
    const previousIntent = intents.get(db);
    if (previousIntent && previousIntent !== draft) releaseProtectedMedia(previousIntent.group);
    intents.set(db, draft);
  };
  if (existing) {
    select(existing);
    if (prepareMedia) void existing.promise.then(() => warm(existing, drafts!, key, db)).catch(() => {});
    return existing.promise;
  }
  while (drafts.size >= 4) {
    const oldest = drafts.entries().next().value!;
    drafts.delete(oldest[0]); releaseProtectedMedia(oldest[1].group);
  }
  const revision = userDataRevision();
  const draft: Draft = { promise: readStudyBatch(db, scope, previous), expires: Date.now() + 5 * 60_000,
    group: `study-draft:${++sequence}`, revision };
  drafts.set(key, draft);
  select(draft);
  draft.promise = draft.promise.then(result => {
    if (!userDataWritable(revision)) throw new Error('Study preparation interrupted');
    draft.result = result;
    if (prepareMedia) warm(draft, drafts!, key, db);
    return result;
  }).catch(error => {
    if (drafts!.get(key) === draft) drafts!.delete(key);
    releaseProtectedMedia(draft.group);
    throw error;
  });
  return draft.promise;
}

function warm(draft: Draft, drafts: Map<string, Draft>, key: string, db: SQLiteDatabase) {
  if (!draft.result || drafts.get(key) !== draft || intents.get(db) !== draft) return;
  const files = draft.result.questions.slice(0, 3).flatMap(q => q.media_filename ? [q.media_filename] : []);
  protectMedia(draft.group, files);
  void preloadMedia(files, undefined, () => intents.get(db) === draft && drafts.get(key) === draft && userDataWritable(draft.revision), 'background').catch(() => {});
}

export function consumePreparedStudyBatch(db: SQLiteDatabase, questions: readonly StudyQuestion[]) {
  const drafts = pools.get(db);
  if (!drafts) return;
  for (const [key, draft] of drafts) {
    if (draft.result?.questions.length === questions.length && draft.result.questions.every((q,i) => q.id === questions[i].id)) {
      drafts.delete(key); releaseProtectedMedia(draft.group);
    }
  }
}

export function cancelPreparedStudyMedia(db: SQLiteDatabase) {
  const intent = intents.get(db);
  if (intent) releaseProtectedMedia(intent.group);
  intents.delete(db);
}

// Prepare inexpensive exact question data; media belong to the current window.
export const warmNextStudyBatch = (db: SQLiteDatabase, scope: StudyBatchScope, previous: readonly number[] = []) =>
  readPreparedStudyBatch(db, scope, previous, false);

export async function warmRecommendedStudy(db: SQLiteDatabase, category: string,
  insights: { topics: TopicInsight[]; historicalMistakes: number }, shouldContinue: () => boolean) {
  const revision = userDataRevision();
  const language = await selectedQuestionLanguage(db);
  if (!shouldContinue() || !userDataWritable(revision)) return;
  const recommendation = learningRecommendation(insights.topics, insights.historicalMistakes);
  return readPreparedStudyBatch(db, { category, language, limit: 5,
    filter: recommendation.kind === 'topic' ? 'all' : recommendation.kind === 'mistakes' ? 'mistakes' : 'three',
    topic: recommendation.kind === 'topic' ? recommendation.topic.topic : undefined,
  });
}
