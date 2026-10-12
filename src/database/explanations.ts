import type { SQLiteDatabase } from "expo-sqlite";
import bundled from "../../assets/data/question-explanations.json";
import { legalSourceUrl, validateExplanationPack, type ExplanationPack } from "@/domain/explanation-pack";

export type QuestionExplanation = {
  explanationText: string; legalBasis: string | null; sourceUrl: string | null;
  reviewedAt: number; reviewedBy: string | null;
};

/** Add columns in place; keep the old explanation column and all user records. */
export async function installExplanations(db: SQLiteDatabase, pack: unknown = bundled) {
  validateExplanationPack(pack);
  await db.withExclusiveTransactionAsync(async (tx) => {
    const columns = await tx.getAllAsync<{ name: string }>("PRAGMA table_info(question_explanations)");
    const existing = new Set(columns.map((column) => column.name));
    for (const column of ["explanation_text", "legal_basis", "reviewed_by", "source_question", "correct_answer", "media_filename"] as const) {
      if (!existing.has(column)) await tx.execAsync(`ALTER TABLE question_explanations ADD COLUMN ${column} TEXT`);
    }
  });
  await installExplanationPack(db, pack);
}

export async function installExplanationPack(db: SQLiteDatabase, pack: ExplanationPack) {
  validateExplanationPack(pack);
  const marker = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'explanations-version'");
  if (marker?.value === pack.version) return;
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const entry of pack.entries) {
      const question = await tx.getFirstAsync<{ question: string; correct_answer: string; media_filename: string | null }>("SELECT question, correct_answer, media_filename FROM questions WHERE id = ?", entry.questionId);
      if (!question || question.question !== entry.sourceQuestion || question.correct_answer !== entry.correctAnswer || question.media_filename !== entry.mediaFilename) {
        throw new Error(`Explanation source mismatch: ${entry.questionId}`);
      }
      await tx.runAsync(`INSERT INTO question_explanations
        (question_id, explanation, explanation_text, legal_basis, source_url, reviewed_at, reviewed_by, source_question, correct_answer, media_filename)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(question_id) DO UPDATE SET explanation=excluded.explanation, explanation_text=excluded.explanation_text,
        legal_basis=excluded.legal_basis, source_url=excluded.source_url, reviewed_at=excluded.reviewed_at, reviewed_by=excluded.reviewed_by,
        source_question=excluded.source_question, correct_answer=excluded.correct_answer, media_filename=excluded.media_filename
        WHERE excluded.reviewed_at >= question_explanations.reviewed_at`,
        entry.questionId, entry.explanationText, entry.explanationText, entry.legalBasis, entry.sourceUrl, entry.reviewedAt, entry.reviewedBy, entry.sourceQuestion, entry.correctAnswer, entry.mediaFilename);
    }
    await tx.runAsync("INSERT OR REPLACE INTO settings VALUES ('explanations-version', ?)", pack.version);
  });
}

export async function getQuestionExplanation(db: SQLiteDatabase, questionId: number): Promise<QuestionExplanation | null> {
  const row = await db.getFirstAsync<QuestionExplanation>(`SELECT COALESCE(e.explanation_text, e.explanation) AS explanationText,
    e.legal_basis AS legalBasis, e.source_url AS sourceUrl, e.reviewed_at AS reviewedAt, e.reviewed_by AS reviewedBy
    FROM question_explanations e JOIN questions q ON q.id=e.question_id
    WHERE e.question_id=? AND e.reviewed_at>0 AND (e.source_question IS NULL OR
      (e.source_question=q.question AND e.correct_answer=q.correct_answer AND e.media_filename IS q.media_filename))`, questionId);
  if (!row?.explanationText.trim()) return null;
  return { ...row, sourceUrl: legalSourceUrl(row.sourceUrl) };
}
