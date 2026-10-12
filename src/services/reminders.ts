import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_ID_KEY = 'daily-reminder-id';

export async function enableDailyReminder(hour = 19) {
  const permissions = await Notifications.requestPermissionsAsync();
  if (!permissions.granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('learning', { name: 'Nauka prawa jazdy', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const identifier = await Notifications.scheduleNotificationAsync({
    content: { title: 'Czas na krótką powtórkę', body: 'Rozwiąż dziś 5 pytań za 3 punkty.', sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: 'learning' },
  });
  return identifier;
}

export async function disableDailyReminder(identifier?: string) {
  if (identifier) await Notifications.cancelScheduledNotificationAsync(identifier);
  else await Notifications.cancelAllScheduledNotificationsAsync();
}

export { REMINDER_ID_KEY };
