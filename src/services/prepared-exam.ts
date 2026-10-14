import type { SQLiteDatabase } from 'expo-sqlite';
import { createExam, resumeActiveExam, type Question } from '@/database/repository';
import { type QuestionLanguage } from '@/database/translations';
import { examPreparationTarget } from '@/services/exam-preparation-target';
import { cancelPreparedStudyMedia } from '@/services/prepared-study';
import { cachedMediaUri, protectMedia, releaseProtectedMedia, trimMediaCache } from '@/services/media-cache';
import { prepareExamMedia, type MediaPreloadProgress } from '@/services/media-preload';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { validExamSelection } from '@/domain/exam-selection';
import { hasAvailableQuestionMedia } from '@/domain/media-eligibility';
import { subscribePreparedExam } from '@/domain/exam-preparation-events';
import { preserveExpiredExam, readExamReuse } from '@/database/exam-reuse';
import { recordMediaDiagnostic } from '@/services/media-diagnostics';

type PreparedExam = { category: string; language: QuestionLanguage; questions: Question[]; reuseSourceId?: string };
let work: { key: string; promise: Promise<PreparedExam>; listeners: Set<(progress: MediaPreloadProgress) => void>; owners: Set<() => boolean>; backgroundOwners: Set<() => boolean>; progress?: MediaPreloadProgress } | null = null;
let newestKey = '';
let generation = 0;
subscribePreparedExam(() => { generation++; newestKey = ''; });
export { subscribePreparedExam, examPreferencesChanged } from '@/domain/exam-preparation-events';
const filenames = (questions: Question[]) => questions.map(q => q.mediaFilename).filter((name): name is string => Boolean(name));

export async function ensurePreparedExam(db: SQLiteDatabase, category: string, onProgress?: (progress: MediaPreloadProgress) => void, canContinue: () => boolean = () => true): Promise<PreparedExam> {
  if (!canContinue()) throw new Error('Przygotowanie przerwane.');
  const revision = userDataRevision();
  const target = await examPreparationTarget(db);
  if (!target || target.category !== category) throw new Error('Zmieniono ustawienia nauki.');
  const language = target.language;
  if (onProgress) cancelPreparedStudyMedia(db);
  const key = `${revision}:${category}:${language}:${generation}`;
  newestKey = key;
  if (work) {
    if (work.key === key) {
      const pending = work;
      const owners = onProgress ? pending.owners : pending.backgroundOwners;
      owners.add(canContinue);
      if (onProgress) {
        pending.listeners.add(onProgress);
        if (pending.progress) onProgress(pending.progress);
      }
      try { return await pending.promise; }
      finally { owners.delete(canContinue); if (onProgress) pending.listeners.delete(onProgress); }
    }
    await work.promise.catch(() => undefined);
    return ensurePreparedExam(db, category, onProgress, canContinue);
  }
  const promise = (async () => {
    const startedAt = Date.now();
    const foreground = () => Boolean(work?.key === key && [...work.owners].some(owner => owner()));
    const current = () => userDataWritable(revision) && newestKey === key &&
      (foreground() || Boolean(work?.key === key && [...work.backgroundOwners].some(owner => owner())));
    await preserveExpiredExam(db);
    const active = await resumeActiveExam(db);
    if (active) {
      protectMedia('active', filenames(active.questions));
      if (!onProgress) return active;
    }
    const seed = await readExamReuse(db, category, language);
    let prepared: PreparedExam | undefined;
    const stored = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'prepared-exam'");
    if (stored) {
      try {
        const candidate = JSON.parse(stored.value) as PreparedExam;
        const alreadyStarted = active && candidate.questions?.length === active.questions.length &&
          candidate.questions.every((question, index) => question.id === active.questions[index].id);
        if (!alreadyStarted && candidate.reuseSourceId === seed?.sourceId && candidate.category === category && candidate.language === language && validExamSelection(candidate.questions, category) && candidate.questions.every(question => hasAvailableQuestionMedia(question.id))) prepared = candidate;
      } catch { /* Replace incompatible/invalid candidate. */ }
    }
    prepared ??= { category, language, questions: await createExam(db, category, language), reuseSourceId: seed?.sourceId };
    protectMedia('prepared', filenames(prepared.questions));
    if (!active) releaseProtectedMedia('active');
    try {
      await trimMediaCache?.();
      await db.withExclusiveTransactionAsync(async tx => {
        if (!current()) throw new Error('Przygotowanie przerwane.');
        const persistedTarget = await examPreparationTarget(tx);
        if (persistedTarget?.language !== language || persistedTarget.category !== category) throw new Error('Zmieniono ustawienia nauki.');
        if ((await readExamReuse(tx, category, language))?.sourceId !== seed?.sourceId) throw new Error('Ta próba zmieniła się. Przygotuj egzamin ponownie.');
        await tx.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('prepared-exam', ?)", JSON.stringify(prepared));
      });
      await prepareExamMedia(prepared.questions, progress => {
        if (work?.key !== key) return;
        work.progress = progress;
        for (const listener of work.listeners) listener(progress);
      }, current, onProgress ? 'foreground' : 'background', () => foreground() ? 'foreground' : 'background');
      if (!current()) throw new Error('Przygotowanie przerwane.');
      recordMediaDiagnostic({stage:'preparation',kind:'mixed',items:prepared.questions.length,elapsedMs:Date.now()-startedAt,status:'ok'});
      return prepared;
    } catch (error) {
      recordMediaDiagnostic({stage:'preparation',kind:'mixed',items:prepared.questions.length,elapsedMs:Date.now()-startedAt,status:current()?'error':'cancelled'});
      // A cancelled waiter must not unpin the persisted, partially ready draft.
      // A new preference/reset supersedes it and may release its files.
      if (!userDataWritable(revision) || newestKey !== key) releaseProtectedMedia('prepared');
      throw error;
    }
  })();
  work = { key, promise, listeners: new Set(onProgress ? [onProgress] : []), owners: new Set(onProgress ? [canContinue] : []), backgroundOwners: new Set(onProgress ? [] : [canContinue]) };
  try { return await promise; } finally { if (work?.promise === promise) work = null; }
}

export function consumePreparedExam(questions: Question[]) {
  generation++; newestKey = '';
  protectMedia('active', filenames(questions));
  releaseProtectedMedia('prepared');
  // Never fetch an independent successor while this attempt is active.
}
export async function verifyPreparedMedia(questions: readonly Question[]) {
  for (const question of questions) if (question.mediaFilename && !await cachedMediaUri(question.mediaFilename, true)) throw new Error('Materiały wymagają ponownego przygotowania.');
}
