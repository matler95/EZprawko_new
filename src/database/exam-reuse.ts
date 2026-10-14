import type { SQLiteDatabase } from 'expo-sqlite';
import { mediaDeliveryVersion } from '@/domain/media-version';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';

const KEY = 'exam-reuse';
const TTL = 24 * 60 * 60_000;
// Change with the question database or delivery revision; no answer content is stored.
const version = () => `1:1d569f59c48c1fb7:${mediaDeliveryVersion}`;
export type ExamReuse = { version: string; sourceId: string; category: string; language: string;
  createdAt: number; retainedIds: number[]; excludedIds: number[] };
const validIds = (ids: unknown): ids is number[] => Array.isArray(ids) && ids.length <= 4000 &&
  ids.every(id => Number.isSafeInteger(id) && id > 0) && new Set(ids).size === ids.length;

export async function readExamReuse(db: SQLiteDatabase, category: string, language: string) {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', KEY);
  if (!row) return undefined;
  try {
    const seed = JSON.parse(row.value) as ExamReuse;
    if (seed.version === version() && seed.category === category && seed.language === language &&
      typeof seed.sourceId === 'string' && Number.isFinite(seed.createdAt) && seed.createdAt <= Date.now() &&
      Date.now() - seed.createdAt < TTL && validIds(seed.retainedIds) && seed.retainedIds.length <= 32 &&
      validIds(seed.excludedIds) && !seed.retainedIds.some(id => seed.excludedIds.includes(id))) return seed;
  } catch { /* Treat corrupt/legacy seeds as unavailable. */ }
  await db.runAsync('DELETE FROM settings WHERE key = ?', KEY);
  return undefined;
}

/** Must run inside the same transaction that deletes the abandoned session. */
export async function preserveUnseenExam(tx: SQLiteDatabase) {
  const active = await tx.getFirstAsync<{ id: string; category: string; current_index: number }>('SELECT * FROM active_exam LIMIT 1');
  if (!active) return;
  const completed = await tx.getFirstAsync<{id: string}>('SELECT id FROM exam_sessions WHERE id = ?',active.id);
  if (completed) {
    await tx.runAsync('DELETE FROM settings WHERE key = ? OR key = ?',KEY,'prepared-exam');
    return;
  }
  if (!Number.isInteger(active.current_index) || active.current_index < 0 || active.current_index >= 32) return;
  const rows = await tx.getAllAsync<{ question_id: number; position: number }>(
    'SELECT question_id, position FROM active_exam_questions WHERE session_id = ? ORDER BY position', active.id);
  const languageRow = await tx.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', `exam-language:${active.id}`);
  const language = languageRow?.value ?? 'pl';
  const exposure = await tx.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', `exam-exposure:${active.id}`);
  const lineage = await tx.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', `exam-lineage:${active.id}`);
  let seen: number[];
  try {
    seen = exposure ? JSON.parse(exposure.value) : rows.filter(q => q.position <= active.current_index).map(q => q.question_id);
    if (!validIds(seen) || rows.length !== 32 || rows.some((q,i) => q.position !== i) || !validIds(rows.map(q => q.question_id))) return;
  } catch { return; }
  let prior: ExamReuse | undefined;
  try { if (lineage) prior = JSON.parse(lineage.value); } catch { /* New series. */ }
  if (prior?.version !== version() || prior.category !== active.category || prior.language !== language ||
    !validIds(prior.excludedIds) || Date.now() - prior.createdAt >= TTL) prior = undefined;
  const excludedIds = [...new Set([...(prior?.excludedIds ?? []), ...seen])];
  const retainedIds = rows.map(q => q.question_id).filter(id => !excludedIds.includes(id));
  const seed: ExamReuse = { version: version(), sourceId: active.id, category: active.category, language,
    createdAt: prior?.createdAt ?? Date.now(), retainedIds, excludedIds };
  if (retainedIds.length) await tx.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', KEY, JSON.stringify(seed));
  else await tx.runAsync('DELETE FROM settings WHERE key = ?', KEY);
  await tx.runAsync('DELETE FROM settings WHERE key = ?', 'prepared-exam');
}

export async function markExamExposure(tx: SQLiteDatabase, sessionId: string, questionId: number, index: number) {
  const key = `exam-exposure:${sessionId}`;
  const stored = await tx.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  let ids: number[] = [];
  if (stored) { ids = JSON.parse(stored.value); if (!validIds(ids)) throw new Error('Invalid exam exposure'); }
  else if (index > 0) {
    const rows = await tx.getAllAsync<{ question_id: number }>('SELECT question_id FROM active_exam_questions WHERE session_id = ? AND position < ?', sessionId, index);
    ids = rows.map(q => q.question_id);
  }
  if (!ids.includes(questionId)) await tx.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, JSON.stringify([...ids, questionId]));
}

export async function preserveExpiredExam(db: SQLiteDatabase) {
  const revision = userDataRevision();
  await db.withExclusiveTransactionAsync(async tx => {
    if (!userDataWritable(revision)) throw new Error('Exam preparation interrupted');
    const active = await tx.getFirstAsync<{ id: string; expires_at: number }>('SELECT id, expires_at FROM active_exam LIMIT 1');
    if (active && active.expires_at <= Date.now()) {
      await preserveUnseenExam(tx);
      await tx.runAsync('DELETE FROM settings WHERE key = ? AND NOT EXISTS (SELECT 1 FROM exam_sessions WHERE id = ?)', `exam-language:${active.id}`,active.id);
      await tx.execAsync('DELETE FROM active_exam_questions; DELETE FROM active_exam;');
      await tx.runAsync('DELETE FROM settings WHERE key LIKE ? OR key LIKE ? OR key LIKE ?', 'exam-clock:%', 'exam-exposure:%', 'exam-lineage:%');
    }
  });
}
