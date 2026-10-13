import type { SQLiteDatabase } from 'expo-sqlite';
import { createExam, resumeActiveExam, selectedCategory, type Question } from '@/database/repository';
import { selectedQuestionLanguage, type QuestionLanguage } from '@/database/translations';
import { cachedMediaUri, protectMedia, releaseProtectedMedia } from '@/services/media-cache';
import { prepareExamMedia, type MediaPreloadProgress } from '@/services/media-preload';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { validExamSelection } from '@/domain/exam-selection';

type PreparedExam = { category: string; language: QuestionLanguage; questions: Question[] };
let work: { key: string; promise: Promise<PreparedExam>; listeners: Set<(progress: MediaPreloadProgress) => void>; progress?: MediaPreloadProgress } | null = null;
let newestKey = '';
export { subscribePreparedExam, examPreferencesChanged } from '@/domain/exam-preparation-events';
const filenames = (questions: Question[]) => questions.map(q => q.mediaFilename).filter((name): name is string => Boolean(name));

export async function ensurePreparedExam(db: SQLiteDatabase, category: string, onProgress?: (progress: MediaPreloadProgress) => void): Promise<PreparedExam> {
  const revision = userDataRevision();
  const language = await selectedQuestionLanguage(db);
  const key = `${revision}:${category}:${language}`;
  newestKey = key;
  if (work) {
    if (work.key === key) {
      const pending = work;
      if (onProgress) {
        pending.listeners.add(onProgress);
        if (pending.progress) onProgress(pending.progress);
      }
      try { return await pending.promise; }
      finally { if (onProgress) pending.listeners.delete(onProgress); }
    }
    await work.promise.catch(() => undefined);
    return ensurePreparedExam(db, category, onProgress);
  }
  const promise = (async () => {
    const active = await resumeActiveExam(db);
    protectMedia('active', active ? filenames(active.questions) : []);
    let prepared: PreparedExam | undefined;
    const stored = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'prepared-exam'");
    if (stored) {
      try {
        const candidate = JSON.parse(stored.value) as PreparedExam;
        if (candidate.category === category && candidate.language === language && validExamSelection(candidate.questions, category)) prepared = candidate;
      } catch { /* Replace incompatible/invalid candidate. */ }
    }
    prepared ??= { category, language, questions: await createExam(db, category) };
    protectMedia('prepared', filenames(prepared.questions));
    try {
      await db.withExclusiveTransactionAsync(async tx => {
        if (!userDataWritable(revision) || newestKey !== key) throw new Error('Przygotowanie przerwane.');
        if (await selectedQuestionLanguage(tx) !== language || await selectedCategory(tx) !== category) throw new Error('Zmieniono ustawienia nauki.');
        await tx.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('prepared-exam', ?)", JSON.stringify(prepared));
      });
      await prepareExamMedia(prepared.questions, progress => {
        if (work?.key !== key) return;
        work.progress = progress;
        for (const listener of work.listeners) listener(progress);
      }, () => userDataWritable(revision) && newestKey === key);
      if (!userDataWritable(revision) || newestKey !== key) throw new Error('Przygotowanie przerwane.');
      return prepared;
    } catch (error) { releaseProtectedMedia('prepared'); throw error; }
  })();
  work = { key, promise, listeners: new Set(onProgress ? [onProgress] : []) };
  try { return await promise; } finally { if (work?.promise === promise) work = null; }
}

export function consumePreparedExam(questions: Question[]) {
  protectMedia('active', filenames(questions));
  releaseProtectedMedia('prepared');
}
export async function verifyPreparedMedia(questions: readonly Question[]) {
  for (const question of questions) if (question.mediaFilename && !await cachedMediaUri(question.mediaFilename, true)) throw new Error('Materiały wymagają ponownego przygotowania.');
}
