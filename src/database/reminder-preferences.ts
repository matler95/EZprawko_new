import type { SQLiteDatabase } from "expo-sqlite";
import { parseReminderTime, reminderMinutes, type ReminderTime } from "@/domain/reminder-time";
export async function reminderPreferences(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key IN ('daily-reminder-id', 'daily-reminder-minutes')");
  return { time: parseReminderTime(rows.find((row) => row.key === 'daily-reminder-minutes')?.value),
    identifier: rows.find((row) => row.key === 'daily-reminder-id')?.value ?? null };
}
export async function saveReminderPreferences(db: SQLiteDatabase, time: ReminderTime, identifier: string | null, beforeWrite: () => void = () => undefined) {
  const minutes = reminderMinutes(time);
  await db.withExclusiveTransactionAsync(async (tx) => {
    beforeWrite();
    await tx.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('daily-reminder-minutes', ?)", String(minutes));
    if (identifier) await tx.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('daily-reminder-id', ?)", identifier);
    else await tx.runAsync("DELETE FROM settings WHERE key = 'daily-reminder-id'");
  });
}
