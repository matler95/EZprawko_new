import type { SQLiteDatabase } from 'expo-sqlite';
import { isDrivingCategory, type DrivingCategory } from '@/domain/driving-categories';
import { parseQuestionLanguage, type QuestionLanguage } from '@/database/translations';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { readUiLanguage } from '@/database/ui-language';

export type OnboardingDraft = { step: number; category: DrivingCategory | null; language: QuestionLanguage };
export const emptyOnboarding: OnboardingDraft = { step: 0, category: null, language: 'pl' };
export function parseOnboardingDraft(raw?: string): OnboardingDraft {
  try {
    const value = JSON.parse(raw ?? '{}');
    const category = typeof value.category === 'string' && isDrivingCategory(value.category) ? value.category : null;
    const step = Number.isInteger(value.step) && value.step >= 0 && value.step <= 3 && (category || value.step <= 1) ? value.step : 0;
    return { step, category, language: parseQuestionLanguage(value.language) };
  } catch { return { ...emptyOnboarding }; }
}
export async function readOnboardingDraft(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'onboarding-draft');
  return row ? parseOnboardingDraft(row.value) : { ...emptyOnboarding, language: await readUiLanguage(db) };
}
export async function saveOnboardingDraft(db: SQLiteDatabase, draft: OnboardingDraft) {
  const revision = userDataRevision();
  await db.withExclusiveTransactionAsync(async tx => {
    if (!userDataWritable(revision)) throw new Error('Setup interrupted');
    const done = await tx.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'onboarding-complete');
    if (done?.value === 'true') return;
    await tx.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 'onboarding-draft', JSON.stringify(draft));
    if (!userDataWritable(revision)) throw new Error('Setup interrupted');
  });
}
export async function finishOnboarding(db: SQLiteDatabase, draft: OnboardingDraft) {
  if (!draft.category || !isDrivingCategory(draft.category)) throw new Error('Choose a category');
  const revision = userDataRevision();
  let category = draft.category;
  await db.withExclusiveTransactionAsync(async tx => {
    if (!userDataWritable(revision)) throw new Error('Setup interrupted');
    const done = await tx.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'onboarding-complete');
    if (done?.value === 'true') {
      const existing = await tx.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'target-category');
      category = existing && isDrivingCategory(existing.value) ? existing.value : 'B';
      return;
    }
    for (const [key, value] of [['target-category', category], ['question-language', parseQuestionLanguage(draft.language)], ['ui-language', parseQuestionLanguage(draft.language)], ['onboarding-complete', 'true']]) {
      await tx.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
    }
    await tx.runAsync('DELETE FROM settings WHERE key = ?', 'onboarding-draft');
    if (!userDataWritable(revision)) throw new Error('Setup interrupted');
  });
  return category;
}
