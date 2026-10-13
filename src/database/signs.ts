import type { SQLiteDatabase } from "expo-sqlite";
import links from "../../assets/data/question-signs.json";
import { categoryClause } from '@/domain/driving-categories';

export async function installQuestionSigns(db: SQLiteDatabase) {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS question_signs (
    question_id INTEGER NOT NULL REFERENCES questions(id), sign_code TEXT NOT NULL,
    evidence TEXT NOT NULL, PRIMARY KEY(question_id, sign_code));
    CREATE INDEX IF NOT EXISTS question_signs_code ON question_signs(sign_code);`);
  const version = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'question-signs-version'");
  if (version?.value === links.version) return;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync("DELETE FROM question_signs");
    for (const link of links.entries) {
      await transaction.runAsync("INSERT INTO question_signs VALUES (?, ?, ?)", link.questionId, link.code, link.evidence);
    }
    await transaction.runAsync("INSERT OR REPLACE INTO settings VALUES ('question-signs-version', ?)", links.version);
  });
}

export async function signQuestionCounts(db: SQLiteDatabase, category?: string): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ code: string; count: number }>(`SELECT s.sign_code AS code, COUNT(*) AS count FROM question_signs s JOIN questions q ON q.id = s.question_id ${category ? `WHERE ${categoryClause}` : ''} GROUP BY s.sign_code`, category ? [category] : []);
  return Object.fromEntries(rows.map((row) => [row.code, row.count]));
}
