import type { SQLiteDatabase } from 'expo-sqlite';
import { hasCompletedOnboarding, selectedCategory } from '@/database/repository';
import { selectedQuestionLanguage } from '@/database/translations';
import { readOnboardingDraft } from '@/database/onboarding';

/** Draft preferences become eligible only after the category step is confirmed. */
export async function examPreparationTarget(db: SQLiteDatabase) {
  if (await hasCompletedOnboarding(db)) {
    return { category: await selectedCategory(db), language: await selectedQuestionLanguage(db) };
  }
  const draft = await readOnboardingDraft(db);
  return draft.step >= 2 && draft.category ? { category: draft.category, language: draft.language } : null;
}
