import type { SQLiteDatabase } from "expo-sqlite";

export const userProgressTables = ["exam_answers", "exam_sessions", "active_exam_questions", "active_exam", "practice_attempts", "practice_mastery", "flags"] as const;
// Older installs may retain reward records. Preserve them until an explicit reset,
// and include them in exports without creating or updating these tables again.
async function existingLegacyTables(db: SQLiteDatabase) {
  return db.getAllAsync<{ name: 'challenge_days' | 'user_achievements' }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('challenge_days', 'user_achievements') ORDER BY name",
  );
}
const catalogKeys = ["translations-version", "question-signs-version", "explanations-version"];
const preferenceKeys = ["target-category", "question-language", "ui-language", "theme-preference", "onboarding-complete", "onboarding-draft", "daily-reminder-id", "daily-reminder-minutes"];

export async function resetUserProgress(db: SQLiteDatabase, allSettings = false) {
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const table of userProgressTables) await tx.execAsync(`DELETE FROM ${table}`);
    for (const { name } of await existingLegacyTables(tx)) await tx.execAsync(`DELETE FROM ${name}`);
    await tx.runAsync("DELETE FROM settings WHERE key LIKE ?", "exam-language:%");
    await tx.runAsync("DELETE FROM settings WHERE key LIKE ?", "exam-clock:%");
    if (allSettings) await tx.runAsync(`DELETE FROM settings WHERE key NOT IN (${catalogKeys.map(() => "?").join(",")})`, catalogKeys);
  });
}

export async function exportUserData(db: SQLiteDatabase) {
  const data: Record<string, unknown[]> = {};
  // One consistent snapshot; never export passwords, auth tokens or licensed media.
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const table of userProgressTables) data[table] = await tx.getAllAsync(`SELECT * FROM ${table}`);
    for (const { name } of await existingLegacyTables(tx)) data[name] = await tx.getAllAsync(`SELECT * FROM ${name}`);
    data.settings = await tx.getAllAsync(`SELECT key, value FROM settings WHERE key IN (${preferenceKeys.map(() => "?").join(",")}) OR key LIKE ? ORDER BY key`, [...preferenceKeys, "exam-language:%"]);
  });
  return { format: "ezprawko-user-data", schemaVersion: 1, exportedAt: new Date().toISOString(),
    scope: "Local learning records and preferences only; not a cloud account export or import backup", data };
}
