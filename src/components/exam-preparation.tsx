import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTargetCategory } from '@/context/target-category-context';
import { ensurePreparedExam, subscribePreparedExam } from '@/services/prepared-exam';
import { supabase } from '@/services/supabase';
import { readPreparedStudyBatch } from '@/services/prepared-study';
import { selectedQuestionLanguage } from '@/database/translations';

/** Warm a single next attempt while the application is open. Never starts its clock. */
export function ExamPreparation() {
  const db = useSQLiteContext();
  const { category } = useTargetCategory();
  useEffect(() => {
    let current = true;
    const warm = () => {
      if (!current || AppState.currentState !== 'active') return;
      void ensurePreparedExam(db, category).catch(() => undefined);
      void selectedQuestionLanguage(db).then(language => {
        if (!current || AppState.currentState !== 'active') return;
        for (const limit of [5, 12]) void readPreparedStudyBatch(db, { category, language, limit, filter: 'all' }).catch(() => {});
      }).catch(() => {});
    };
    warm();
    const interval = setInterval(warm, 60_000);
    const app = AppState.addEventListener('change', state => { if (state === 'active') warm(); });
    const auth = supabase.auth.onAuthStateChange(() => { void Promise.resolve().then(warm); });
    const unsubscribe = subscribePreparedExam(warm);
    return () => { current = false; clearInterval(interval); app.remove(); auth.data.subscription.unsubscribe(); unsubscribe(); };
  }, [category, db]);
  return null;
}
