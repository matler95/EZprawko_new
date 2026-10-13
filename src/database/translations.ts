import type { SQLiteDatabase } from 'expo-sqlite';
import catalog from '@/assets/data/question-translations.json';
import { examPreferencesChanged } from '@/domain/exam-preparation-events';

export type QuestionLanguage = 'pl' | 'en' | 'de' | 'uk';
export const questionLanguages = [
  { code: 'pl', label: 'Polski' }, { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' }, { code: 'uk', label: 'Українська' },
] as const;

export function parseQuestionLanguage(value: string | undefined): QuestionLanguage {
  return value === 'en' || value === 'de' || value === 'uk' ? value : 'pl';
}

export async function installTranslations(db: SQLiteDatabase) {
  const marker = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'translations-version'",
  );
  if (marker?.value === catalog.version) return;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync('DELETE FROM question_translations');
    for (let start = 0; start < catalog.entries.length; start += 100) {
      const batch = catalog.entries.slice(start, start + 100);
      await transaction.runAsync(
        `INSERT INTO question_translations (question_id, language, question, answers_json) VALUES ${batch.map(() => '(?, ?, ?, ?)').join(',')}`,
        batch.flatMap((item) => [item.id, item.language, item.question, JSON.stringify(item.answers)]),
      );
    }
    await transaction.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('translations-version', ?)", catalog.version);
  });
}

export async function selectedQuestionLanguage(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'question-language'");
  return parseQuestionLanguage(row?.value);
}

export async function setQuestionLanguage(db: SQLiteDatabase, language: QuestionLanguage) {
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('question-language', ?)", language);
  examPreferencesChanged();
}

export async function examQuestionLanguage(db: SQLiteDatabase, sessionId: string) {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', `exam-language:${sessionId}`);
  return parseQuestionLanguage(row?.value);
}

export async function questionContent(db: SQLiteDatabase, id: number, language: QuestionLanguage) {
  if (language !== 'pl') {
    const translated = await db.getFirstAsync<{ question: string; answers_json: string }>(
      'SELECT question, answers_json FROM question_translations WHERE question_id = ? AND language = ?', id, language,
    );
    if (translated) return { question: translated.question, answers: JSON.parse(translated.answers_json) as { label: string; answer: string }[], contentLanguage: language };
  }
  const original = await db.getFirstAsync<{ question: string }>('SELECT question FROM questions WHERE id = ?', id);
  if (!original) throw new Error(`Missing question ${id}`);
  const answers = await db.getAllAsync<{ label: string; answer: string }>('SELECT label, answer FROM answers WHERE question_id = ? ORDER BY label', id);
  return { question: original.question, answers, contentLanguage: 'pl' as const };
}

export const translationCoverage = catalog.coverage;
