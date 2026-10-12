import type { SQLiteDatabase } from 'expo-sqlite';
import { categoryClause, type DrivingCategory } from '@/domain/driving-categories';

export type MasterySnapshot = { total: number; mastered: number };

export async function studyMastery(db: SQLiteDatabase, category: DrivingCategory): Promise<MasterySnapshot> {
  const result = await db.getFirstAsync<MasterySnapshot>(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN m.correct_streak >= 3 THEN 1 ELSE 0 END), 0) AS mastered
    FROM questions q LEFT JOIN practice_mastery m ON m.question_id = q.id
    WHERE ${categoryClause}`, category);
  if (!result) throw new Error('Mastery snapshot unavailable');
  return result;
}
