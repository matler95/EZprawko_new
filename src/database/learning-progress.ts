import type { SQLiteDatabase } from "expo-sqlite";
import { categoryClause } from "@/domain/driving-categories";
import { learningStreak, localDay } from "@/domain/learning-streak";
import { userDataRevision, userDataWritable } from "@/domain/data-maintenance";

export type Achievement = { id: string; category: string; earned_at: number };
export async function installLearningDays(db: SQLiteDatabase) {
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const [table, timestampColumn] of [['practice_attempts', 'answered_at'], ['exam_sessions', 'completed_at']] as const) {
      const columns = await tx.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      if (!columns.some((column) => column.name === 'local_day')) {
        await tx.execAsync(`ALTER TABLE ${table} ADD COLUMN local_day TEXT`);
        const rows = await tx.getAllAsync<{ id: number | string; timestamp: number | null }>(`SELECT id, ${timestampColumn} AS timestamp FROM ${table}`);
        const byDay = new Map<string, (string | number)[]>();
        for (const row of rows) {
          if (!row.timestamp || !Number.isFinite(row.timestamp) || Number.isNaN(new Date(row.timestamp).getTime())) continue;
          const day = localDay(row.timestamp);
          const ids = byDay.get(day) ?? []; ids.push(row.id); byDay.set(day, ids);
        }
        for (const [day, ids] of byDay) {
          for (let offset = 0; offset < ids.length; offset += 200) {
            const batch = ids.slice(offset, offset + 200);
            await tx.runAsync(`UPDATE ${table} SET local_day = ? WHERE id IN (${batch.map(() => '?').join(',')})`, [day, ...batch]);
          }
        }
      }
    }
    await tx.execAsync('CREATE INDEX IF NOT EXISTS practice_attempts_local_day ON practice_attempts(local_day); CREATE INDEX IF NOT EXISTS exam_sessions_local_day ON exam_sessions(local_day);');
  });
}
export async function signMastery(db: SQLiteDatabase, category: string) {
  return (await db.getFirstAsync<{ total: number; mastered: number }>(`
    SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN m.correct_streak >= 3 THEN 1 ELSE 0 END),0) AS mastered
    FROM questions q LEFT JOIN practice_mastery m ON m.question_id = q.id
    WHERE ${categoryClause} AND EXISTS (SELECT 1 FROM question_signs s WHERE s.question_id = q.id)
  `, category)) ?? { total: 0, mastered: 0 };
}
export async function awardSignExpert(db: SQLiteDatabase, category: string, now = Date.now()) {
  const signs = await signMastery(db, category);
  if (signs.total > 0 && signs.mastered === signs.total) await db.runAsync("INSERT OR IGNORE INTO user_achievements(id, category, earned_at) VALUES ('signs', ?, ?)", category, now);
  return signs;
}
export async function learningDays(db: SQLiteDatabase, now = Date.now()) {
  // New events retain their local calendar day, even after travel/timezone changes.
  // Legacy history is backfilled once in the migration device's local timezone.
  return db.getAllAsync<{ day: string; correct: number; attempts: number }>(`
    SELECT day, SUM(correct) AS correct, SUM(attempts) AS attempts FROM (
      SELECT local_day AS day,
        SUM(is_correct) AS correct, COUNT(*) AS attempts FROM practice_attempts
        WHERE answered_at > 0 AND answered_at <= ? AND local_day IS NOT NULL GROUP BY day
      UNION ALL
      SELECT local_day AS day,
        0 AS correct, COUNT(*) AS attempts FROM exam_sessions
        WHERE completed_at > 0 AND completed_at <= ? AND local_day IS NOT NULL GROUP BY day
    ) GROUP BY day ORDER BY day`, now, now);
}
export async function learningProgress(db: SQLiteDatabase, category: string, now = Date.now()) {
  const revision = userDataRevision();
  let result!: { streak: ReturnType<typeof learningStreak>; correctToday: number; challenge: number; challengeComplete: boolean; signs: { total: number; mastered: number }; achievements: Achievement[] };
  await db.withExclusiveTransactionAsync(async (tx) => {
    const days = await learningDays(tx, now);
    const today = localDay(now);
    const streak = learningStreak(days.map((row) => row.day), today);
    const challenge = learningStreak(days.filter((row) => row.correct >= 5).map((row) => row.day), today);
    const exams = await tx.getFirstAsync<{ first: number | null; perfect: number | null }>("SELECT MIN(completed_at) AS first, MIN(CASE WHEN score = 74 THEN completed_at END) AS perfect FROM exam_sessions WHERE completed_at > 0 AND completed_at <= ?", now);
    let signs;
    if (userDataWritable(revision)) {
      for (const [id, earnedAt] of [['first', exams?.first], ['perfect', exams?.perfect], ['streak', streak.best >= 3 ? now : null]] as const) {
        if (earnedAt) await tx.runAsync("INSERT OR IGNORE INTO user_achievements(id, category, earned_at) VALUES (?, '', ?)", id, earnedAt);
      }
      signs = await awardSignExpert(tx, category, now);
    } else signs = await signMastery(tx, category);
    const achievements = await tx.getAllAsync<Achievement>("SELECT id, category, earned_at FROM user_achievements WHERE category = '' OR category = ?", category);
    result = { streak, correctToday: days.find((row) => row.day === today)?.correct ?? 0, challenge: Math.min(3, challenge.current), challengeComplete: challenge.best >= 3, signs, achievements };
  });
  return result;
}
export type LearningProgress = Awaited<ReturnType<typeof learningProgress>>;
