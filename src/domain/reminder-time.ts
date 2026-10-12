export type ReminderTime = { hour: number; minute: number };
export const defaultReminderTime: ReminderTime = { hour: 19, minute: 0 };
export function reminderMinutes(time: ReminderTime) {
  if (!Number.isInteger(time.hour) || time.hour < 0 || time.hour > 23 || !Number.isInteger(time.minute) || time.minute < 0 || time.minute > 59) throw new Error("Nieprawidłowa godzina przypomnienia.");
  return time.hour * 60 + time.minute;
}
export function parseReminderTime(value?: string): ReminderTime {
  const minutes = value === undefined || !/^\d+$/.test(value) ? NaN : Number(value);
  return Number.isInteger(minutes) && minutes >= 0 && minutes < 1440 ? { hour: Math.floor(minutes / 60), minute: minutes % 60 } : { ...defaultReminderTime };
}
export function formatReminderTime(time: ReminderTime) {
  reminderMinutes(time);
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}
