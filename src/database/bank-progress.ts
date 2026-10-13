import type { SQLiteDatabase } from "expo-sqlite";
import { categoryClause } from '@/domain/driving-categories';
import { eligibleQuestionMediaSql } from '@/domain/media-eligibility';

export type BankProgress = { total: number; answered: number };

// Count coverage, not correctness/mastery. Ignore skipped answers and stale IDs.
export async function bankProgress(db: SQLiteDatabase, category?: string): Promise<BankProgress> {
  return (await db.getFirstAsync<BankProgress>(`
    WITH answered_questions AS (
      SELECT question_id FROM practice_attempts WHERE selected_answer IS NOT NULL
      UNION
      SELECT a.question_id FROM exam_answers a
      JOIN exam_sessions s ON s.id = a.session_id
      WHERE s.completed_at IS NOT NULL AND a.selected_answer IS NOT NULL
    )
    SELECT COUNT(*) AS total, COUNT(a.question_id) AS answered
    FROM questions q LEFT JOIN answered_questions a ON a.question_id = q.id
    WHERE ${eligibleQuestionMediaSql} ${category ? `AND ${categoryClause}` : ''}
  `, category ? [category] : [])) ?? { total: 0, answered: 0 };
}
