import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { reminderPreferences, saveReminderPreferences } from '@/database/reminder-preferences';
import { defaultReminderTime, reminderMinutes, type ReminderTime } from '@/domain/reminder-time';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';

const REMINDER_ID_KEY = 'daily-reminder-id';

export const DAILY_REMINDER_ID = 'ezprawko-daily-learning';
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.catch(() => undefined);
  return result;
}
function guard(revision: number) {
  if (!userDataWritable(revision)) throw new Error('Zmiana przypomnienia przerwana przez reset danych.');
}
async function ensureChannel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('learning', { name: 'Nauka prawa jazdy', importance: Notifications.AndroidImportance.DEFAULT });
}
async function schedule(time: ReminderTime) {
  reminderMinutes(time);
  await ensureChannel();
  return Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: { title: 'Czas na krótką powtórkę', body: 'Rozwiąż dziś 5 pytań za 3 punkty.', sound: true, data: { reminderKey: DAILY_REMINDER_ID } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: time.hour, minute: time.minute, channelId: 'learning' },
  });
}
async function snapshot(db: SQLiteDatabase) {
  const preference = await reminderPreferences(db);
  const [permission, scheduled] = await Promise.all([Notifications.getPermissionsAsync(), Notifications.getAllScheduledNotificationsAsync()]);
  const owned = scheduled.filter((item) => item.identifier === DAILY_REMINDER_ID || item.identifier === preference.identifier || item.content.data?.reminderKey === DAILY_REMINDER_ID);
  return { ...preference, enabled: permission.granted && owned.length > 0, permissionGranted: permission.granted, identifiers: owned.map((item) => item.identifier), scheduleCount: owned.length };
}
export function readDailyReminder(db: SQLiteDatabase) { return serial(() => snapshot(db)); }
export function updateDailyReminder(db: SQLiteDatabase, time: ReminderTime, enabled: boolean, requestPermission = false) {
  reminderMinutes(time);
  const revision = userDataRevision();
  return serial(async () => {
    guard(revision);
    const previous = await snapshot(db);
    if (enabled) await ensureChannel();
    if (enabled && !previous.permissionGranted) {
      const permission = requestPermission ? await Notifications.requestPermissionsAsync() : await Notifications.getPermissionsAsync();
      if (!permission.granted) throw new Error('Brak zgody na powiadomienia. Włącz ją w ustawieniach systemowych telefonu.');
    }
    guard(revision);
    const known = [...new Set([...previous.identifiers, DAILY_REMINDER_ID, ...(previous.identifier ? [previous.identifier] : [])])];
    try {
      if (enabled) {
        await schedule(time);
        guard(revision);
        for (const identifier of known) if (identifier !== DAILY_REMINDER_ID) await Notifications.cancelScheduledNotificationAsync(identifier);
      } else {
        for (const identifier of known) await Notifications.cancelScheduledNotificationAsync(identifier);
      }
      await saveReminderPreferences(db, time, enabled ? DAILY_REMINDER_ID : null, () => guard(revision));
    } catch (error) {
      // OS and SQLite are separate systems; compensation can itself fail.
      try {
        for (const identifier of known) await Notifications.cancelScheduledNotificationAsync(identifier);
        if (userDataWritable(revision) && previous.enabled) await schedule(previous.time);
      } catch {
        throw new Error('Nie udało się przywrócić poprzedniego harmonogramu. Sprawdź stan przypomnień i spróbuj ponownie.');
      }
      throw error;
    }
    return snapshot(db);
  });
}
// Full local deletion shares this queue, preventing a delayed re-enable after wipe.
export function enableDailyReminder(hour = defaultReminderTime.hour, minute = 0) {
  const time = { hour, minute }; reminderMinutes(time);
  const revision = userDataRevision();
  return serial(async () => {
    await ensureChannel();
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return false;
    guard(revision);
    await schedule(time);
    if (!userDataWritable(revision)) { await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID); return false; }
    return DAILY_REMINDER_ID;
  });
}
export function disableDailyReminder(identifier?: string) {
  return serial(async () => {
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      if (identifier !== DAILY_REMINDER_ID) await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    } else await Notifications.cancelAllScheduledNotificationsAsync();
  });
}

export { REMINDER_ID_KEY };
