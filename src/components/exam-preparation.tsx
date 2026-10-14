import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useTargetCategory } from '@/context/target-category-context';
import { ensurePreparedExam, subscribePreparedExam } from '@/services/prepared-exam';
import { supabase } from '@/services/supabase';
import { resumeActiveExam } from '@/database/repository';
import { protectMedia, trimMediaCache } from '@/services/media-cache';
import { cancelPreparedStudyMedia } from '@/services/prepared-study';
import { examPreparationTarget } from '@/services/exam-preparation-target';

/** Warm a single next attempt while the application is open. Never starts its clock. */
export function ExamPreparation() {
  const db = useSQLiteContext();
  const pathname = usePathname();
  const { category } = useTargetCategory();
  useEffect(() => {
    let current = true;
    let running = false;
    let rerun = false;
    const warm = () => {
      if (!current || AppState.currentState !== 'active') return;
      // An auth/preference event during a failing pre-login attempt must not
      // disappear into that old promise and wait for the periodic retry.
      if (running) { rerun = true; return; }
      running = true;
      void resumeActiveExam(db).then(active => {
        if (!current || AppState.currentState !== 'active') return;
        if (active) {
          protectMedia('active', active.questions.flatMap(q => q.mediaFilename ? [q.mediaFilename] : []));
          if (pathname.startsWith('/exam/')) cancelPreparedStudyMedia(db);
          void trimMediaCache().catch(() => {});
          return;
        }
        // Keep the same draft warming through onboarding, settings/login and
        // briefing. Study/exam screens retain priority for their actual media.
        if (pathname !== '/' && pathname !== '/settings') return;
        return examPreparationTarget(db).then(target => {
          if (!target || !current || AppState.currentState !== 'active') return;
          return ensurePreparedExam(db, target.category, undefined, () => current && AppState.currentState === 'active');
        });
      }).catch(() => {}).finally(() => {
        running = false;
        if (rerun) { rerun = false; warm(); }
      });
    };
    warm();
    const interval = setInterval(warm, 60_000);
    const app = AppState.addEventListener('change', state => { if (state === 'active') warm(); });
    const auth = supabase.auth.onAuthStateChange(() => { void Promise.resolve().then(warm); });
    const unsubscribe = subscribePreparedExam(warm);
    return () => { current = false; clearInterval(interval); app.remove(); auth.data.subscription.unsubscribe(); unsubscribe(); };
  }, [category, db, pathname]);
  return null;
}
