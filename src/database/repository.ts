import type { SQLiteDatabase } from "expo-sqlite";
import { buildOfficialExam, type ExamQuestion } from "@/domain/exam-engine";

export type Question = ExamQuestion & {
  question: string;
  correctAnswer: string;
  answers: { label: string; answer: string }[];
  mediaFilename: string | null;
};

type QuestionRow = {
  id: number;
  scope: ExamQuestion["scope"];
  points: ExamQuestion["points"];
  categories: string;
  question: string;
  correct_answer: string;
  media_filename: string | null;
};

export const learningTopics = [
  "Znaki i sygnały drogowe",
  "Skrzyżowania i pierwszeństwo",
  "Zasady jazdy i manewry",
  "Pierwsza pomoc i wypadki",
  "Technika pojazdu i ładunek",
  "Pozostałe zagadnienia",
] as const;

export type LearningTopic = (typeof learningTopics)[number];

function classifyTopic(question: string): LearningTopic {
  const normalized = question.toLocaleLowerCase("pl-PL");
  if (/(znak|sygnał|sygnaliz|tabliczk|światł)/.test(normalized)) return "Znaki i sygnały drogowe";
  if (/(skrzyż|pierwszeństw|rondo|ustąp)/.test(normalized)) return "Skrzyżowania i pierwszeństwo";
  if (/(pierwszej pomocy|wypadk|rann|krwotok|resuscyt|poszkodowan)/.test(normalized)) return "Pierwsza pomoc i wypadki";
  if (/(pojazd|opon|hamul|ładunk|przyczep|silnik|ciśnien|technicz)/.test(normalized)) return "Technika pojazdu i ładunek";
  if (/(wyprzedz|prędko|pas ruchu|manewr|zatrzym|parkow|kierunkowskaz|odległo)/.test(normalized)) return "Zasady jazdy i manewry";
  return "Pozostałe zagadnienia";
}

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS exam_sessions (id TEXT PRIMARY KEY, category TEXT NOT NULL, started_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, completed_at INTEGER, score INTEGER, passed INTEGER);
    CREATE TABLE IF NOT EXISTS exam_answers (session_id TEXT NOT NULL, question_id INTEGER NOT NULL, selected_answer TEXT, is_correct INTEGER, PRIMARY KEY(session_id, question_id));
    CREATE TABLE IF NOT EXISTS flags (question_id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS practice_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, question_id INTEGER NOT NULL, selected_answer TEXT NOT NULL, is_correct INTEGER NOT NULL, answered_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS active_exam (id TEXT PRIMARY KEY, category TEXT NOT NULL, expires_at INTEGER NOT NULL, current_index INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS active_exam_questions (session_id TEXT NOT NULL, position INTEGER NOT NULL, question_id INTEGER NOT NULL, selected_answer TEXT, PRIMARY KEY(session_id, position));
    CREATE TABLE IF NOT EXISTS challenge_days (day TEXT PRIMARY KEY, correct_answers INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS question_explanations (question_id INTEGER PRIMARY KEY, explanation TEXT NOT NULL, source_url TEXT, reviewed_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS question_topics (question_id INTEGER PRIMARY KEY, topic TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS practice_mastery (question_id INTEGER PRIMARY KEY, correct_streak INTEGER NOT NULL DEFAULT 0, last_correct_at INTEGER);
  `);
  const topicCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM question_topics");
  if (!topicCount?.count) {
    const questions = await db.getAllAsync<{ id: number; question: string }>("SELECT id, question FROM questions");
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const question of questions) {
        await transaction.runAsync(
          "INSERT OR REPLACE INTO question_topics (question_id, topic) VALUES (?, ?)",
          question.id,
          classifyTopic(question.question),
        );
      }
    });
  }
}

export type TopicProgress = { topic: LearningTopic; total: number; practiced: number; mastered: number };

export async function topicProgress(db: SQLiteDatabase): Promise<TopicProgress[]> {
  const rows = await db.getAllAsync<{ topic: LearningTopic; total: number; practiced: number; mastered: number }>(
    `SELECT t.topic, COUNT(*) AS total,
       SUM(CASE WHEN p.question_id IS NOT NULL THEN 1 ELSE 0 END) AS practiced,
       SUM(CASE WHEN COALESCE(m.correct_streak, 0) >= 3 THEN 1 ELSE 0 END) AS mastered
     FROM question_topics t
     LEFT JOIN (
       SELECT question_id,
         COUNT(*) FILTER (WHERE is_correct = 1) AS correct_streak,
         MAX(CASE WHEN is_correct = 1 THEN answered_at END) AS last_correct_at
       FROM practice_attempts GROUP BY question_id
     ) p ON p.question_id = t.question_id
     LEFT JOIN practice_mastery m ON m.question_id = t.question_id
     GROUP BY t.topic`,
  );
  const byTopic = new Map(rows.map((row) => [row.topic, row]));
  return learningTopics.map((topic) => byTopic.get(topic) ?? { topic, total: 0, practiced: 0, mastered: 0 });
}

export async function createExam(
  db: SQLiteDatabase,
  category: string,
): Promise<Question[]> {
  const rows = await db.getAllAsync<QuestionRow>(
    "SELECT id, scope, points, categories, question, correct_answer, media_filename FROM questions",
  );
  const pool = rows.map((row) => ({
    id: row.id,
    scope: row.scope,
    points: row.points,
    categories: JSON.parse(row.categories),
  }));
  const exam = buildOfficialExam(pool, category);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return Promise.all(
    exam.questions.map(async (examQuestion) => {
      const row = byId.get(examQuestion.id)!;
      const answers = await db.getAllAsync<{ label: string; answer: string }>(
        "SELECT label, answer FROM answers WHERE question_id = ? ORDER BY label",
        row.id,
      );
      return {
        ...examQuestion,
        question: row.question,
        correctAnswer: row.correct_answer,
        mediaFilename: row.media_filename,
        answers,
      };
    }),
  );
}

export async function saveCompletedExam(
  db: SQLiteDatabase,
  category: string,
  questions: Question[],
  selected: Record<number, string | undefined>,
  startedAt = Date.now(),
) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const score = questions.reduce(
    (total, question) =>
      total +
      (selected[question.id] === question.correctAnswer ? question.points : 0),
    0,
  );
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      "INSERT INTO exam_sessions VALUES (?, ?, ?, ?, ?, ?, ?)",
      id,
      category,
      startedAt,
      Date.now(),
      Date.now(),
      score,
      score >= 68 ? 1 : 0,
    );
    for (const question of questions)
      await transaction.runAsync(
        "INSERT INTO exam_answers VALUES (?, ?, ?, ?)",
        id,
        question.id,
        selected[question.id] ?? null,
        selected[question.id] === question.correctAnswer ? 1 : 0,
      );
  });
  return { id, score, passed: score >= 68 };
}

export type ExamReviewQuestion = {
  position: number;
  id: number;
  scope: ExamQuestion["scope"];
  points: 1 | 2 | 3;
  question: string;
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  mediaFilename: string | null;
  answers: { label: string; answer: string }[];
};

export type ExamReview = {
  id: string;
  category: string;
  score: number;
  passed: boolean;
  durationSeconds: number;
  questions: ExamReviewQuestion[];
};

export async function examReview(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<ExamReview | null> {
  const session = await db.getFirstAsync<{
    id: string;
    category: string;
    started_at: number;
    completed_at: number;
    score: number;
    passed: number;
  }>(
    "SELECT id, category, started_at, completed_at, score, passed FROM exam_sessions WHERE id = ?",
    sessionId,
  );
  if (!session || !session.completed_at || session.score === null || session.passed === null) {
    return null;
  }
  const rows = await db.getAllAsync<{
    question_id: number;
    selected_answer: string | null;
    is_correct: number;
    scope: ExamQuestion["scope"];
    points: 1 | 2 | 3;
    question: string;
    correct_answer: string;
    media_filename: string | null;
  }>(
    `SELECT a.question_id, a.selected_answer, a.is_correct,
            q.scope, q.points, q.question, q.correct_answer, q.media_filename
     FROM exam_answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.session_id = ?
     ORDER BY a.rowid`,
    sessionId,
  );
  const questions = await Promise.all(
    rows.map(async (row, position) => ({
      position,
      id: row.question_id,
      scope: row.scope,
      points: row.points,
      question: row.question,
      correctAnswer: row.correct_answer,
      selectedAnswer: row.selected_answer,
      isCorrect: row.is_correct === 1,
      mediaFilename: row.media_filename,
      answers: await db.getAllAsync<{ label: string; answer: string }>(
        "SELECT label, answer FROM answers WHERE question_id = ? ORDER BY label",
        row.question_id,
      ),
    })),
  );
  return {
    id: session.id,
    category: session.category,
    score: session.score,
    passed: session.passed === 1,
    durationSeconds: Math.max(0, Math.round((session.completed_at - session.started_at) / 1000)),
    questions,
  };
}

export type ExamHistoryItem = {
  id: string;
  category: string;
  completedAt: number;
  score: number;
  passed: boolean;
};

export type ExamReadiness = {
  attempts: number;
  averageScore: number;
  passRate: number;
  pointsToPass: number;
};

export async function recentExams(
  db: SQLiteDatabase,
  limit = 12,
): Promise<ExamHistoryItem[]> {
  const rows = await db.getAllAsync<{
    id: string;
    category: string;
    completed_at: number;
    score: number;
    passed: number;
  }>(
    "SELECT id, category, completed_at, score, passed FROM exam_sessions WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT ?",
    limit,
  );
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    completedAt: row.completed_at,
    score: row.score,
    passed: row.passed === 1,
  }));
}

export async function examReadiness(db: SQLiteDatabase): Promise<ExamReadiness | null> {
  const attempts = await recentExams(db, 5);
  if (!attempts.length) return null;

  const averageScore = Math.round(
    attempts.reduce((total, item) => total + item.score, 0) / attempts.length,
  );
  return {
    attempts: attempts.length,
    averageScore,
    passRate: Math.round(
      (attempts.filter((item) => item.passed).length / attempts.length) * 100,
    ),
    pointsToPass: Math.max(0, 68 - averageScore),
  };
}

export async function weakAreas(db: SQLiteDatabase) {
  return db.getAllAsync<{ scope: string; attempted: number; correct: number }>(`
    SELECT q.scope, COUNT(*) AS attempted, SUM(a.is_correct) AS correct
    FROM exam_answers a JOIN questions q ON q.id = a.question_id
    GROUP BY q.scope ORDER BY correct * 1.0 / NULLIF(attempted, 0) ASC
  `);
}

export type WeakCategory = {
  category: string;
  attempted: number;
  correct: number;
};

export async function weakCategories(
  db: SQLiteDatabase,
): Promise<WeakCategory[]> {
  const rows = await db.getAllAsync<{
    categories: string;
    is_correct: number;
  }>(`
    SELECT q.categories, p.is_correct
    FROM practice_attempts p
    JOIN questions q ON q.id = p.question_id
  `);
  const totals = new Map<string, WeakCategory>();

  for (const row of rows) {
    const categories = JSON.parse(row.categories) as string[];
    for (const category of categories) {
      const total = totals.get(category) ?? {
        category,
        attempted: 0,
        correct: 0,
      };
      total.attempted += 1;
      total.correct += row.is_correct;
      totals.set(category, total);
    }
  }

  return [...totals.values()].sort(
    (left, right) =>
      left.correct / left.attempted - right.correct / right.attempted,
  );
}

export async function recordPracticeAnswer(
  db: SQLiteDatabase,
  questionId: number,
  selectedAnswer: string,
  correct: boolean,
) {
  const answeredAt = Date.now();
  await db.runAsync(
    "INSERT INTO practice_attempts (question_id, selected_answer, is_correct, answered_at) VALUES (?, ?, ?, ?)",
    questionId,
    selectedAnswer,
    correct ? 1 : 0,
    answeredAt,
  );
  const mastery = await db.getFirstAsync<{ correct_streak: number; last_correct_at: number | null }>(
    "SELECT correct_streak, last_correct_at FROM practice_mastery WHERE question_id = ?",
    questionId,
  );
  const canIncrease = correct && (!mastery?.last_correct_at || answeredAt - mastery.last_correct_at >= 24 * 60 * 60 * 1000);
  await db.runAsync(
    `INSERT INTO practice_mastery (question_id, correct_streak, last_correct_at) VALUES (?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET correct_streak = excluded.correct_streak, last_correct_at = excluded.last_correct_at`,
    questionId,
    correct ? (canIncrease ? (mastery?.correct_streak ?? 0) + 1 : (mastery?.correct_streak ?? 1)) : 0,
    correct ? (canIncrease ? answeredAt : mastery?.last_correct_at ?? answeredAt) : null,
  );
  if (correct) {
    const day = new Date().toISOString().slice(0, 10);
    await db.runAsync(
      "INSERT INTO challenge_days (day, correct_answers) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET correct_answers = correct_answers + 1",
      day,
    );
  }
}

export async function questionExplanation(db: SQLiteDatabase, questionId: number) {
  const row = await db.getFirstAsync<{ explanation: string }>(
    "SELECT explanation FROM question_explanations WHERE question_id = ?",
    questionId,
  );
  return row?.explanation ?? null;
}

export async function toggleFlag(db: SQLiteDatabase, questionId: number) {
  const existing = await db.getFirstAsync<{ question_id: number }>(
    "SELECT question_id FROM flags WHERE question_id = ?",
    questionId,
  );
  if (existing) {
    await db.runAsync("DELETE FROM flags WHERE question_id = ?", questionId);
    return false;
  }
  await db.runAsync("INSERT INTO flags VALUES (?, ?)", questionId, Date.now());
  return true;
}

export async function selectedCategory(db: SQLiteDatabase) {
  const setting = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    "target-category",
  );
  return setting?.value ?? "B";
}

export async function setSelectedCategory(
  db: SQLiteDatabase,
  category: string,
) {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    "target-category",
    category,
  );
}

export type ThemePreference = "system" | "light" | "dark";

export async function themePreference(db: SQLiteDatabase): Promise<ThemePreference> {
  const setting = await db.getFirstAsync<{ value: ThemePreference }>(
    "SELECT value FROM settings WHERE key = ?",
    "theme-preference",
  );
  return setting?.value === "light" || setting?.value === "dark" ? setting.value : "system";
}

export async function setThemePreference(db: SQLiteDatabase, preference: ThemePreference) {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    "theme-preference",
    preference,
  );
}

export async function hasCompletedOnboarding(db: SQLiteDatabase) {
  const setting = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    "onboarding-complete",
  );
  return setting?.value === "true";
}

export async function completeOnboarding(db: SQLiteDatabase) {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    "onboarding-complete",
    "true",
  );
}

export async function dailyReminderIdentifier(db: SQLiteDatabase) {
  const setting = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    "daily-reminder-id",
  );
  return setting?.value ?? false;
}

export async function setDailyReminderIdentifier(
  db: SQLiteDatabase,
  identifier: string | false,
) {
  if (!identifier) {
    await db.runAsync("DELETE FROM settings WHERE key = ?", "daily-reminder-id");
    return;
  }
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    "daily-reminder-id",
    identifier,
  );
}

async function hydrateQuestions(
  db: SQLiteDatabase,
  examQuestions: ExamQuestion[],
) {
  return Promise.all(
    examQuestions.map(async (examQuestion) => {
      const row = await db.getFirstAsync<QuestionRow>(
        "SELECT id, scope, points, categories, question, correct_answer, media_filename FROM questions WHERE id = ?",
        examQuestion.id,
      );
      if (!row) throw new Error(`Question ${examQuestion.id} is unavailable`);
      const answers = await db.getAllAsync<{ label: string; answer: string }>(
        "SELECT label, answer FROM answers WHERE question_id = ? ORDER BY label",
        row.id,
      );
      return {
        ...examQuestion,
        question: row.question,
        correctAnswer: row.correct_answer,
        mediaFilename: row.media_filename,
        answers,
      };
    }),
  );
}

export async function startActiveExam(db: SQLiteDatabase, category: string) {
  const rows = await db.getAllAsync<QuestionRow>(
    "SELECT id, scope, points, categories FROM questions",
  );
  const base = buildOfficialExam(
    rows.map((row) => ({
      id: row.id,
      scope: row.scope,
      points: row.points,
      categories: JSON.parse(row.categories),
    })),
    category,
  );
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = Date.now() + base.durationSeconds * 1000;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(
      "DELETE FROM active_exam_questions; DELETE FROM active_exam;",
    );
    await transaction.runAsync(
      "INSERT INTO active_exam VALUES (?, ?, ?, ?)",
      id,
      category,
      expiresAt,
      0,
    );
    for (const [position, question] of base.questions.entries())
      await transaction.runAsync(
        "INSERT INTO active_exam_questions (session_id, position, question_id) VALUES (?, ?, ?)",
        id,
        position,
        question.id,
      );
  });
  return {
    id,
    category,
    expiresAt,
    index: 0,
    questions: await hydrateQuestions(db, base.questions),
    selections: {} as Record<number, string>,
  };
}

export async function resumeActiveExam(db: SQLiteDatabase) {
  const session = await db.getFirstAsync<{
    id: string;
    category: string;
    expires_at: number;
    current_index: number;
  }>("SELECT * FROM active_exam LIMIT 1");
  if (!session || session.expires_at <= Date.now()) return null;
  const rows = await db.getAllAsync<{
    position: number;
    question_id: number;
    selected_answer: string | null;
  }>(
    "SELECT position, question_id, selected_answer FROM active_exam_questions WHERE session_id = ? ORDER BY position",
    session.id,
  );
  if (rows.length !== 32) return null;
  const questionRows = await db.getAllAsync<QuestionRow>(
    "SELECT id, scope, points, categories FROM questions",
  );
  const byId = new Map(questionRows.map((row) => [row.id, row]));
  const base = rows.map((row) => {
    const item = byId.get(row.question_id);
    if (!item) throw new Error("Missing active question");
    return {
      id: item.id,
      scope: item.scope,
      points: item.points,
      categories: JSON.parse(item.categories),
      readingTimeSeconds: item.scope === "PODSTAWOWY" ? 20 : 0,
      answeringTimeSeconds: item.scope === "PODSTAWOWY" ? 15 : 50,
    } as ExamQuestion;
  });
  return {
    id: session.id,
    category: session.category,
    expiresAt: session.expires_at,
    index: session.current_index,
    questions: await hydrateQuestions(db, base),
    selections: Object.fromEntries(
      rows
        .filter((row) => row.selected_answer)
        .map((row) => [row.question_id, row.selected_answer!]),
    ) as Record<number, string>,
  };
}

export async function saveActiveProgress(
  db: SQLiteDatabase,
  sessionId: string,
  index: number,
  questionId: number,
  selectedAnswer: string | null,
) {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      "UPDATE active_exam_questions SET selected_answer = ? WHERE session_id = ? AND question_id = ?",
      selectedAnswer,
      sessionId,
      questionId,
    );
    await transaction.runAsync(
      "UPDATE active_exam SET current_index = ? WHERE id = ?",
      index,
      sessionId,
    );
  });
}

export async function clearActiveExam(db: SQLiteDatabase) {
  await db.execAsync(
    "DELETE FROM active_exam_questions; DELETE FROM active_exam;",
  );
}

export async function challengeStatus(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ day: string; correct_answers: number }>(
    "SELECT day, correct_answers FROM challenge_days ORDER BY day DESC LIMIT 3",
  );
  const today = new Date().toISOString().slice(0, 10);
  const completedToday =
    rows.find((row) => row.day === today)?.correct_answers ?? 0;
  return {
    daysCompleted: rows.filter((row) => row.correct_answers >= 5).length,
    correctToday: completedToday,
    complete: rows.filter((row) => row.correct_answers >= 5).length >= 3,
  };
}

export async function mediaFilenamesForCategory(
  db: SQLiteDatabase,
  category: string,
  limit = 250,
) {
  const rows = await db.getAllAsync<{ media_filename: string }>(
    `SELECT DISTINCT media_filename
     FROM questions
     WHERE media_filename IS NOT NULL
       AND media_filename != ''
       AND (categories LIKE ? OR scope = 'PODSTAWOWY')
     LIMIT ?`,
    [`%"${category}"%`, limit],
  );

  return rows.map((row) => row.media_filename);
}
