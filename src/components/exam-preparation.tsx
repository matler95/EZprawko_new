import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTargetCategory } from '@/context/target-category-context';
import { ensurePreparedExam, subscribePreparedExam } from '@/services/prepared-exam';
import { supabase } from '@/services/supabase';

/** Warm a single next attempt while the application is open. Never starts its clock. */
export function ExamPreparation() {
  const db = useSQLiteContext();
  const { category } = useTargetCategory();
  useEffect(() => {
    const warm = () => { if (AppState.currentState === 'active') void ensurePreparedExam(db, category).catch(() => undefined); };
    warm();
    const interval = setInterval(warm, 60_000);
    const app = AppState.addEventListener('change', state => { if (state === 'active') warm(); });
    const auth = supabase.auth.onAuthStateChange(() => { void Promise.resolve().then(warm); });
    const unsubscribe = subscribePreparedExam(warm);
    return () => { clearInterval(interval); app.remove(); auth.data.subscription.unsubscribe(); unsubscribe(); };
  }, [category, db]);
  return null;
}
