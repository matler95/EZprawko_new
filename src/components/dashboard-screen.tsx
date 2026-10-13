import { useTranslation } from '@/hooks/use-translation';
import { UiTokens } from '@/constants/ui-tokens';
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTargetCategory } from "@/context/target-category-context";
import { categoryLabel as baseCategoryLabel } from "@/domain/driving-categories";
import { OnboardingFlow } from '@/components/onboarding-flow';
import { SafeAreaView } from "react-native-safe-area-context";
import { ReadinessRing } from "@/components/readiness-ring";
import { ExamBriefing } from "@/components/exam-briefing";
import { LoadingError, LoadingSkeleton } from "@/components/skeleton";
import { type MediaPreloadProgress } from '@/services/media-preload';
import { ensurePreparedExam, consumePreparedExam, verifyPreparedMedia } from '@/services/prepared-exam';
import { mediaErrorMessage } from '@/domain/media-error';
import { learningInsights } from '@/database/learning-insights';
import { learningRecommendation, type TopicInsight } from '@/domain/learning-recommendation';
import { AppButton, AppHeading } from '@/components/ui/app-controls';

import {
  clearActiveExam,
  examReadiness,
  hasCompletedOnboarding,
  resumeActiveExam,
  startActiveExam,
  type ExamReadiness,
} from "@/database/repository";

export default function DashboardScreen() {
  const { t, language } = useTranslation();
  const categoryLabel = (value: string) => baseCategoryLabel(value, language);
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
  const [topics, setTopics] = useState<TopicInsight[]>([]);
  const [historicalMistakes, setHistoricalMistakes] = useState(0);
  const recommendation = learningRecommendation(topics, historicalMistakes);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    let request = 0;
    setFailedRevision(null);
    const refresh = () => { const current = ++request; void Promise.all([
      hasCompletedOnboarding(db),
      examReadiness(db, category),
      resumeActiveExam(db),
      learningInsights(db, category),
    ]).then(([completed, nextReadiness, active, insights]) => {
      if (!mounted || current !== request) return;
      setOnboardingComplete(completed);
      setReadiness(nextReadiness);
      setActiveExamId(active?.id ?? null);
      setTopics(insights.topics); setHistoricalMistakes(insights.historicalMistakes);
      setOnboardingChecked(true);
    }).catch(() => { if (mounted && current === request) setFailedRevision(reload); }); };
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
      const prepared = await ensurePreparedExam(db, category, progress => { if (!prepareCancelled.current) setMediaProgress(progress); });
      if (prepareCancelled.current) return;
      const active = await startActiveExam(db, category,
        async (questions) => { await verifyPreparedMedia(questions);
          if (prepareCancelled.current) throw new Error('Przygotowanie przerwane.');
          commitLock.current = true; setIsCommitting(true);
        },
        () => !prepareCancelled.current,
        prepared,
      );
      consumePreparedExam(active.questions);
      setActiveExamId(active.id);
      setBriefing(false);
      router.push({ pathname: "/exam/[id]", params: { id: active.id } });
    } catch (reason) {
      if (!prepareCancelled.current) setStartError(mediaErrorMessage(reason));
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
          {readError ? <LoadingError onRetry={() => setReload((value) => value + 1)} /> : <LoadingSkeleton variant="dashboard" label={t("Wczytywanie panelu kursanta")} />}
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
        <AppHeading level='screen'>EZprawko</AppHeading>
        <Text style={styles.muted}>{t("Oficjalna teoria ·")} {categoryLabel(category)}</Text>
        <Pressable accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => router.navigate("/settings")}>
          <Text style={styles.categoryLink}>{t("Zmień kategorię")}</Text>
        </Pressable>

        {activeExamId ? (
          <Pressable
            onPress={async () => {
              try {
                const active = await resumeActiveExam(db);
                setActiveExamId(active?.id ?? null);
                if (active) router.push({ pathname: "/exam/[id]", params: { id: active.id } });
                else setStartError(t("Ta próba wygasła lub ma niepełny zapis. Możesz rozpocząć nowy egzamin."));
              } catch { setStartError(t("Nie udało się odczytać próby. Możesz ją porzucić i rozpocząć nową.")); }
            }}
            accessibilityRole="button"
            style={styles.resumeCard}
          >
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={styles.resumeTitle}>{t("Masz egzamin w toku")}</Text>
              <Text style={styles.resumeCopy}>{t("Wróć dokładnie do miejsca, w którym przerwałeś.")}</Text>
            </View>
            <Text style={styles.resumeAction}>{t("Wznów")}</Text>
          </Pressable>
        ) : null}
        {activeExamId && <Pressable accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => Alert.alert(t("Porzucić próbę?"), t("Usuniemy tylko niezakończoną próbę. Historia ukończonych egzaminów i nauki pozostanie bez zmian."), [
          { text: t("Anuluj"), style: "cancel" },
          { text: t("Porzuć próbę"), style: "destructive", onPress: () => { void clearActiveExam(db).then(() => setActiveExamId(null)).catch(() => setStartError(t("Nie udało się porzucić próby. Spróbuj ponownie."))); } },
        ])}><Text style={styles.categoryLink}>{t("Porzuć egzamin w toku")}</Text></Pressable>}
        {(startError || categoryError) && <Text accessibilityRole="alert" style={styles.resumeCopy}>{t(startError || categoryError)}</Text>}

        <AppHeading style={styles.section}>{t("Dzisiejsza nauka")}</AppHeading>
        {!activeExamId && <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/study', params: {
          filter: recommendation.kind === 'topic' ? 'all' : recommendation.kind === 'mistakes' ? 'mistakes' : 'three', count: '5', start: '1',
          topic: recommendation.kind === 'topic' ? recommendation.topic.topic : undefined,
          sign: undefined, session: undefined,
        } })} style={styles.recommendedCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.recommendedKicker}>{t("NAJLEPSZY KOLEJNY KROK")}</Text>
            <Text style={styles.recommendedTitle}>{recommendation.kind === 'topic' ? t('Ćwicz dział: {0}', [t(recommendation.topic.topic)]) : recommendation.kind === 'mistakes' ? t('Pytania z historycznymi błędami: {0}', [recommendation.count]) : t("5 pytań za 3 punkty")}</Text>
            <Text style={styles.recommendedCopy}>{recommendation.kind === 'topic'
              ? t('Ostatnie odpowiedzi: {0}/{1} poprawnych. Zacznij krótką powtórkę.', [recommendation.topic.correct, recommendation.topic.answered])
              : recommendation.kind === 'mistakes' ? t('Wróć do pytań, w których zdarzyła się pomyłka. Historia pozostaje także po poprawieniu odpowiedzi.') : t("Zacznij od pytań o największej wadze na egzaminie.")}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>}
        {historicalMistakes > 0 && (activeExamId || recommendation.kind !== 'mistakes') && <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/study', params: { filter: 'mistakes', topic: undefined, sign: undefined, session: undefined, count: undefined } })} style={styles.card}>
          <Text style={[styles.cardTitle, { flex: 1 }]}>{t('Pytania z historycznymi błędami: {0}', [historicalMistakes])}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>}

        <View style={styles.hero}>
          <Text style={styles.kicker}>{t("SYMULACJA EGZAMINU WORD")}</Text>
          <Text style={styles.heroTitle}>{t("32 pytania.")}{"\n"}{t("25 minut. 74 punkty.")}</Text>
          <Text style={styles.heroText}>{t("20 pytań podstawowych i 12 specjalistycznych. Próg zdania: 68 punktów.")}</Text>
          <AppButton variant="gold" busy={isStarting} label={isStarting ? t("Przygotowujemy…") : t("Rozpocznij egzamin próbny →")} style={{ marginTop: 24 }} onPress={() => { setStartError(null); setBriefing(true); }} />
        </View>

        <View style={styles.readinessCard}>
          <View style={styles.readinessCopyColumn}>
            <Text style={styles.readinessTitle}>{t("Zdane ostatnie próby ·")} {category}</Text>
            <Text style={styles.readinessCopy}>
              {readiness
                ? readiness.pointsToPass === 0
                  ? t("Średnio {0}/74 · próg osiągnięty", [readiness.averageScore])
                  : t("Średnio {0}/74 · brakuje {1} pkt", [readiness.averageScore, readiness.pointsToPass])
                : t("Ukończ pierwszy egzamin tej kategorii, aby zobaczyć wyniki.")}
            </Text>
            <Text style={styles.readinessCopy}>{t("Ostatnie")} {readiness?.attempts ?? 0} {t("prób. Wskaźnik nie oznacza opanowania całej bazy.")}</Text>
          </View>
          <ReadinessRing value={readiness?.passRate ?? null} />
        </View>

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
  content: { padding: 24, paddingBottom: 48, maxWidth: 600, width: '100%', alignSelf: 'center' },
  muted: { color: colors.textSecondary, ...UiTokens.text.detail, marginTop: 8 },
  categoryLink: { color: colors.primaryText, fontWeight: "700", marginTop: 8 },
  hero: { backgroundColor: colors.brandSurface, borderRadius: 28, marginTop: 24, padding: 24 },
  kicker: { color: colors.brandMuted, ...UiTokens.text.label, letterSpacing: 1 },
  heroTitle: { color: colors.onPrimary, fontSize: 28, fontWeight: "700", lineHeight: 34, marginTop: 12 },
  heroText: { color: colors.brandMuted, ...UiTokens.text.detail, marginTop: 12 },
  readinessCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 18, flexDirection: "row", gap: 12, justifyContent: "space-between", marginTop: 16, padding: 20 },
  readinessCopyColumn: { flex: 1 },
  readinessTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  readinessCopy: { color: colors.textSecondary, ...UiTokens.text.body, marginTop: 4 },
  readinessValue: { color: colors.primaryText, fontSize: 24, fontWeight: "800" },
  resumeCard: { alignItems: "center", backgroundColor: colors.warningSurface, borderColor: colors.warningBorder, borderRadius: 18, borderWidth: 1, flexDirection: "row", flexWrap: 'wrap', gap: 12, justifyContent: "space-between", marginTop: 16, padding: 18 },
  resumeTitle: { color: colors.warning, fontSize: 16, fontWeight: "800" },
  resumeCopy: { color: colors.warning, ...UiTokens.text.body, marginTop: 4, maxWidth: 235 },
  resumeAction: { color: colors.warning, fontWeight: "800" },
  section: { marginBottom: 16, marginTop: 32 },
  card: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 20 },
  cardTitle: { color: colors.textPrimary, fontWeight: "600" },
  recommendedCard: { alignItems: "center", backgroundColor: colors.primarySurface, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 20 },
  recommendedKicker: { color: colors.primaryText, ...UiTokens.text.label, letterSpacing: 0.8 },
  recommendedTitle: { color: colors.textPrimary, ...UiTokens.text.heading, marginTop: 4 },
  recommendedCopy: { color: colors.textSecondary, ...UiTokens.text.body, marginTop: 4, maxWidth: 250 },
  chevron: { color: colors.textSecondary, fontSize: 24 },
  buttonText: { color: colors.onPrimary, fontWeight: "700" },
});
