import type { SQLiteDatabase } from 'expo-sqlite';
import { categoryClause } from '@/domain/driving-categories';
import { studyFilterSql } from '@/database/study-filters';
import type { TopicInsight } from '@/domain/learning-recommendation';
import { eligibleQuestionMediaSql } from '@/domain/media-eligibility';

export async function learningInsights(db: SQLiteDatabase, category: string) {
  const [topics, mistakes] = await Promise.all([
    db.getAllAsync<TopicInsight>(`
      WITH events AS (
        SELECT p.question_id,p.is_correct,p.answered_at,1 AS source,p.id AS event_id
        FROM practice_attempts p WHERE p.selected_answer IS NOT NULL
        UNION ALL
        SELECT a.question_id,COALESCE(a.is_correct,0),s.completed_at,0,a.rowid
        FROM exam_answers a JOIN exam_sessions s ON s.id=a.session_id
        WHERE s.category=? AND s.completed_at IS NOT NULL
      ), ranked AS (
        SELECT *,ROW_NUMBER() OVER(PARTITION BY question_id ORDER BY answered_at DESC,source DESC,event_id DESC) AS rank
        FROM events
      )
      SELECT t.topic,COUNT(*) AS total,COUNT(r.question_id) AS answered,
        COALESCE(SUM(r.is_correct),0) AS correct
      FROM question_topics t JOIN questions q ON q.id=t.question_id
      LEFT JOIN ranked r ON r.question_id=q.id AND r.rank=1
      WHERE ${eligibleQuestionMediaSql} AND ${categoryClause} GROUP BY t.topic ORDER BY t.topic`, [category, category]),
    db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM questions q
      WHERE (${studyFilterSql('mistakes').where}) AND ${eligibleQuestionMediaSql} AND ${categoryClause}`, [category]),
  ]);
  return { topics, historicalMistakes: mistakes?.count ?? 0 };
}
