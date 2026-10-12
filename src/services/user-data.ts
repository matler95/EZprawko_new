import type { SQLiteDatabase } from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { exportUserData, resetUserProgress } from "@/database/user-data";
import { clearMediaCache } from "@/services/media-cache";
import { disableDailyReminder } from "@/services/reminders";
import { supabase } from "@/services/supabase";
import { signOutLocalAccount } from '@/services/account';

export async function shareUserData(db: SQLiteDatabase) {
  if (!await Sharing.isAvailableAsync()) throw new Error("Udostępnianie plików nie jest dostępne na tym urządzeniu.");
  if (!FileSystem.cacheDirectory) throw new Error("Brak katalogu eksportu na urządzeniu.");
  const directory = `${FileSystem.cacheDirectory}user-data-exports/`;
  const uri = `${directory}ezprawko-${Date.now()}.json`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  try {
    const data = await exportUserData(db);
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "Eksport danych EZprawko" });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

export async function deleteLocalUserData(db: SQLiteDatabase) {
  // Cross-system work is not an atomic transaction. If a step fails, report it
  // and keep the operation retryable; never announce complete erasure on failure.
  await disableDailyReminder();
  const { error } = await signOutLocalAccount();
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || data.session) throw new Error("Nie udało się usunąć lokalnej sesji. Spróbuj ponownie po sprawdzeniu połączenia.");
  await clearMediaCache();
  if (!FileSystem.cacheDirectory) throw new Error("Brak katalogu cache na urządzeniu.");
  await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}user-data-exports/`, { idempotent: true });
  await resetUserProgress(db, true);
  return error
    ? "Usunięto dane lokalne. Nie potwierdzono unieważnienia sesji na serwerze. Konto Supabase, logi serwerowe i kopie zapisane poza aplikacją pozostają."
    : "Usunięto postępy, ustawienia, przypomnienia, cache i lokalną sesję. Zachowano bazę pytań. Konto Supabase, logi serwerowe i kopie zapisane poza aplikacją nie zostały usunięte.";
}
