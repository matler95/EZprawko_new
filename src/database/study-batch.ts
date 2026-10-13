import type { SQLiteDatabase } from 'expo-sqlite';
import { categoryClause } from '@/domain/driving-categories';
import { studyFilterSql, type StudyFilter } from '@/database/study-filters';
import type { QuestionLanguage } from '@/database/translations';

export type StudyQuestion = {
  id: number; question: string; points: number; scope: string; correct_answer: string;
  media_filename: string | null; contentLanguage: QuestionLanguage;
};
export type StudyBatchScope = {
  filter: StudyFilter; category: string; language: QuestionLanguage; limit: number;
  topic?: string; sign?: string; session?: string; search?: string;
};

/** Prefer questions outside the last batch, filling a small pool with honest repeats. */
export async function readStudyBatch(db: SQLiteDatabase, scope: StudyBatchScope, previousIds: readonly number[] = []) {
  const { joins, where, order } = studyFilterSql(scope.filter);
  const previous = [...new Set(previousIds)].filter(id => Number.isSafeInteger(id) && id > 0);
  const search = scope.search?.trim();
  const topicClause = scope.topic ? ' AND EXISTS (SELECT 1 FROM question_topics t WHERE t.question_id=q.id AND t.topic=?)' : '';
  const signClause = scope.sign ? ' AND EXISTS (SELECT 1 FROM question_signs s WHERE s.question_id=q.id AND s.sign_code=?)' : '';
  const sessionClause = scope.session ? ' AND EXISTS (SELECT 1 FROM exam_answers e WHERE e.question_id=q.id AND e.session_id=? AND e.is_correct=0)' : '';
  const searchClause = search ? ' AND COALESCE(tr.question,q.question) LIKE ?' : '';
  const preference = previous.length ? `CASE WHEN q.id IN (${previous.map(() => '?').join(',')}) THEN 1 ELSE 0 END, ` : '';
  const limit = scope.session ? 32 : scope.limit === 5 ? 5 : 12;
  const params = [scope.language, scope.category, ...(scope.topic ? [scope.topic] : []),
    ...(scope.sign ? [scope.sign] : []), ...(scope.session ? [scope.session] : []),
    ...(search ? [`%${search}%`] : []), ...previous, limit];
  const questions = await db.getAllAsync<StudyQuestion>(`SELECT DISTINCT q.id,
    COALESCE(tr.question,q.question) AS question,
    CASE WHEN tr.question IS NULL THEN 'pl' ELSE tr.language END AS contentLanguage,
    q.points,q.scope,q.correct_answer,q.media_filename
    FROM questions q LEFT JOIN question_translations tr ON tr.question_id=q.id AND tr.language=?
    ${joins} WHERE (${where}) AND ${categoryClause}${topicClause}${signClause}${sessionClause}${searchClause}
    ORDER BY ${preference}${order} LIMIT ?`, params);
  const previousSet = new Set(previous);
  return { questions, repeated: questions.filter(question => previousSet.has(question.id)).length };
}
