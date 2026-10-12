import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LearningRewards } from "@/components/learning-rewards";
import { learningProgress, type LearningProgress } from "@/database/learning-progress";
import { useTargetCategory } from "@/context/target-category-context";
import { categoryLabel } from "@/domain/driving-categories";
import { OnboardingFlow } from '@/components/onboarding-flow';
import { SafeAreaView } from "react-native-safe-area-context";
import { ReadinessRing } from "@/components/readiness-ring";
import { ExamBriefing } from "@/components/exam-briefing";
import { LoadingError, LoadingSkeleton } from "@/components/skeleton";
import { prepareExamMedia, type MediaPreloadProgress } from '@/services/media-preload';

import {
  clearActiveExam,
  examReadiness,
  hasCompletedOnboarding,
  resumeActiveExam,
  startActiveExam,
  type ExamReadiness,
} from "@/database/repository";

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const db = useSQLiteContext();
  const { category, acceptPersistedCategory, error: categoryError } = useTargetCategory();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [failedRevision, setFailedRevision] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const readError = failedRevision === reload;
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const startLock = useRef(false);
  const prepareCancelled = useRef(false);
  const commitLock = useRef(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [mediaProgress, setMediaProgress] = useState<MediaPreloadProgress | null>(null);
  const [briefing, setBriefing] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ExamReadiness | null>(null);
  const [learning, setLearning] = useState<LearningProgress | null>(null);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setFailedRevision(null);
    const refresh = () => { void Promise.all([
      hasCompletedOnboarding(db),
      learningProgress(db, category),
      examReadiness(db),
      resumeActiveExam(db),
    ]).then(([completed, nextChallenge, nextReadiness, active]) => {
      if (!mounted) return;
      setOnboardingComplete(completed);
      setLearning(nextChallenge);
      setReadiness(nextReadiness);
      setActiveExamId(active?.id ?? null);
      setOnboardingChecked(true);
    }).catch(() => { if (mounted) setFailedRevision(reload); }); };
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 60_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { mounted = false; prepareCancelled.current = true; clearInterval(timer); subscription.remove(); };
  }, [category, db, reload]));

  const startExam = async () => {
    if (startLock.current) return;
    startLock.current = true;
    prepareCancelled.current = false;
    commitLock.current = false;
    setIsCommitting(false);
    setIsStarting(true);
    setMediaProgress(null);
    setStartError(null);
    try {
      const active = await startActiveExam(db, category,
        async (questions) => { await prepareExamMedia(questions, (progress) => {
          if (!prepareCancelled.current) setMediaProgress(progress);
        }, () => !prepareCancelled.current);
          if (prepareCancelled.current) throw new Error('Przygotowanie przerwane.');
          commitLock.current = true; setIsCommitting(true);
        },
        () => !prepareCancelled.current,
      );
      setActiveExamId(active.id);
      setBriefing(false);
      router.push({ pathname: "/exam/[id]", params: { id: active.id } });
    } catch (reason) {
      if (!prepareCancelled.current) setStartError(reason instanceof Error ? reason.message : "Nie udało się przygotować egzaminu. Sprawdź dostęp do multimediów i spróbuj ponownie.");
    } finally {
      startLock.current = false;
      commitLock.current = false; setIsCommitting(false);
      setIsStarting(false);
    }
  };

  if (readError || !onboardingChecked) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          {readError ? <LoadingError onRetry={() => setReload((value) => value + 1)} /> : <LoadingSkeleton variant="dashboard" label="Wczytywanie panelu kursanta" />}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!onboardingComplete) {
    return <OnboardingFlow onComplete={(selected, destination) => {
      acceptPersistedCategory(selected);
      setOnboardingComplete(true);
      try {
        if (destination === 'study') router.navigate('/study?filter=three&count=5&start=1');
        else if (destination === 'settings') router.navigate('/settings');
      } catch { setStartError('Konfiguracja została zapisana. Wybierz Naukę lub Ustawienia z panelu.'); }
    }} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hello}>EZprawko</Text>
        <Text style={styles.muted}>Oficjalna teoria · {categoryLabel(category)}</Text>
        <Pressable onPress={() => router.navigate("/settings")}>
          <Text style={styles.categoryLink}>Zmień kategorię</Text>
        </Pressable>

        {activeExamId ? (
          <Pressable
            onPress={async () => {
              try {
                const active = await resumeActiveExam(db);
                setActiveExamId(active?.id ?? null);
                if (active) router.push({ pathname: "/exam/[id]", params: { id: active.id } });
                else setStartError("Ta próba wygasła lub ma niepełny zapis. Możesz rozpocząć nowy egzamin.");
              } catch { setStartError("Nie udało się odczytać próby. Możesz ją porzucić i rozpocząć nową."); }
            }}
            style={styles.resumeCard}
          >
            <View>
              <Text style={styles.resumeTitle}>Masz egzamin w toku</Text>
              <Text style={styles.resumeCopy}>Wróć dokładnie do miejsca, w którym przerwałeś.</Text>
            </View>
            <Text style={styles.resumeAction}>Wznów</Text>
          </Pressable>
        ) : null}
        {activeExamId && <Pressable accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => Alert.alert("Porzucić próbę?", "Usuniemy tylko niezakończoną próbę. Historia ukończonych egzaminów i nauki pozostanie bez zmian.", [
          { text: "Anuluj", style: "cancel" },
          { text: "Porzuć próbę", style: "destructive", onPress: () => { void clearActiveExam(db).then(() => setActiveExamId(null)).catch(() => setStartError("Nie udało się porzucić próby. Spróbuj ponownie.")); } },
        ])}><Text style={styles.categoryLink}>Porzuć egzamin w toku</Text></Pressable>}
        {(startError || categoryError) && <Text accessibilityRole="alert" style={styles.resumeCopy}>{startError || categoryError}</Text>}

        <View style={styles.hero}>
          <Text style={styles.kicker}>SYMULACJA EGZAMINU WORD</Text>
          <Text style={styles.heroTitle}>32 pytania.{"\n"}25 minut. 74 punkty.</Text>
          <Text style={styles.heroText}>
            20 pytań podstawowych i 12 specjalistycznych. Próg zdania: 68 punktów.
          </Text>
          <Pressable disabled={isStarting} onPress={() => { setStartError(null); setBriefing(true); }} style={[styles.gold, isStarting && styles.disabled]}>
            <Text style={styles.goldText}>{isStarting ? "Przygotowujemy…" : "Rozpocznij egzamin próbny →"}</Text>
          </Pressable>
        </View>

        <View style={styles.readinessCard}>
          <View style={styles.readinessCopyColumn}>
            <Text style={styles.readinessTitle}>Gotowość egzaminacyjna</Text>
            <Text style={styles.readinessCopy}>
              {readiness
                ? readiness.pointsToPass === 0
                  ? `Średnio ${readiness.averageScore}/74 · próg osiągnięty`
                  : `Średnio ${readiness.averageScore}/74 · brakuje ${readiness.pointsToPass} pkt`
                : "Ukończ pierwszy egzamin, aby ocenić gotowość."}
            </Text>
          </View>
          <ReadinessRing value={readiness?.passRate ?? null} />
        </View>

        {learning && <LearningRewards progress={learning} category={category} />}

        <Text style={styles.section}>Dzisiejsza nauka</Text>
        <Pressable onPress={() => router.navigate("/study?filter=three&count=5")} style={styles.recommendedCard}>
          <View>
            <Text style={styles.recommendedKicker}>NAJLEPSZY KOLEJNY KROK</Text>
            <Text style={styles.recommendedTitle}>5 pytań za 3 punkty</Text>
            <Text style={styles.recommendedCopy}>Zacznij od pytań o największej wadze na egzaminie.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable onPress={() => router.navigate("/study?filter=mistakes")} style={styles.card}>
          <Text style={styles.cardTitle}>Powtórz błędne odpowiedzi</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        {learning && <LearningRewards progress={learning} category={category} part="achievements" />}
      </ScrollView>
      <ExamBriefing visible={briefing} category={category} hasActiveExam={Boolean(activeExamId)} starting={isStarting} committing={isCommitting} progress={mediaProgress} error={startError}
        onCancel={() => { if (!commitLock.current) { prepareCancelled.current = true; setBriefing(false); } }}
        onSettings={() => { prepareCancelled.current = true; setBriefing(false); router.navigate('/settings'); }}
        onStart={() => void startExam()} />
    </SafeAreaView>
  );
}

const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  content: { padding: 24, paddingBottom: 48 },
  hello: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  muted: { color: colors.textSecondary, fontSize: 14, marginTop: 6 },
  categoryLink: { color: colors.primaryText, fontWeight: "700", marginTop: 8 },
  hero: { backgroundColor: colors.brandSurface, borderRadius: 28, marginTop: 24, padding: 24 },
  kicker: { color: colors.brandMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  heroTitle: { color: colors.onPrimary, fontSize: 28, fontWeight: "700", lineHeight: 34, marginTop: 12 },
  heroText: { color: colors.brandMuted, fontSize: 14, lineHeight: 20, marginTop: 12 },
  gold: { alignSelf: "flex-start", backgroundColor: colors.accentGold, borderRadius: 16, marginTop: 24, padding: 16 },
  goldText: { color: colors.onGold, fontWeight: "700" },
  disabled: { opacity: 0.65 },
  readinessCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 18, flexDirection: "row", gap: 12, justifyContent: "space-between", marginTop: 16, padding: 20 },
  readinessCopyColumn: { flex: 1 },
  readinessTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  readinessCopy: { color: colors.textSecondary, lineHeight: 19, marginTop: 4 },
  readinessValue: { color: colors.primaryText, fontSize: 24, fontWeight: "800" },
  resumeCard: { alignItems: "center", backgroundColor: colors.warningSurface, borderColor: colors.warningBorder, borderRadius: 18, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 16, padding: 18 },
  resumeTitle: { color: colors.warning, fontSize: 16, fontWeight: "800" },
  resumeCopy: { color: colors.warning, lineHeight: 19, marginTop: 4, maxWidth: 235 },
  resumeAction: { color: colors.warning, fontWeight: "800" },
  section: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 16, marginTop: 32 },
  card: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 20 },
  cardTitle: { color: colors.textPrimary, fontWeight: "600" },
  recommendedCard: { alignItems: "center", backgroundColor: colors.primarySurface, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 20 },
  recommendedKicker: { color: colors.primaryText, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  recommendedTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 4 },
  recommendedCopy: { color: colors.textSecondary, lineHeight: 19, marginTop: 4, maxWidth: 250 },
  chevron: { color: colors.textSecondary, fontSize: 24 },
  buttonText: { color: colors.onPrimary, fontWeight: "700" },
});
