import type { SQLiteDatabase } from 'expo-sqlite';
import { parseQuestionLanguage } from '@/database/translations';
import { setUiLanguage, systemUiLanguage, type UiLanguage } from '@/domain/ui-language';
import { examPreferencesChanged } from '@/domain/exam-preparation-events';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
export async function readUiLanguage(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'ui-language'");
  return row ? parseQuestionLanguage(row.value) : systemUiLanguage();
}
export async function saveUiLanguage(db: SQLiteDatabase, value: UiLanguage) {
  const revision = userDataRevision();
  await db.withExclusiveTransactionAsync(async tx => {
    if (!userDataWritable(revision)) throw new Error('Language change interrupted');
    for (const key of ['ui-language', 'question-language']) await tx.runAsync('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)',key,value);
    if (!userDataWritable(revision)) throw new Error('Language change interrupted');
  });
  setUiLanguage(value); examPreferencesChanged();
}
