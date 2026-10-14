import { useTranslation } from '@/hooks/use-translation';
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QuestionMedia } from "@/components/question-media";
import { BasicAnswerButtons } from "@/components/basic-answer-buttons";
import { AnimatedProgress } from "@/components/animated-progress";
import { ExamTimer } from "@/components/exam-timer";
import { examClockState, isExamVideo, type ExamClock } from "@/domain/exam-clock";
import { QuestionTransition } from "@/components/question-transition";
import { LoadingError } from "@/components/skeleton";
import { userDataRevision, userDataWritable } from "@/domain/data-maintenance";
import type { QuestionLanguage } from "@/database/translations";
import { TabBarContext } from "@/context/tab-bar-context";
import { recordMediaDiagnostic } from '@/services/media-diagnostics';
import {
  clearActiveExam,
  resumeActiveExam,
  saveActiveProgress,
  saveActiveChoice,
  questionClock,
  finishExamReading,
  configureExamVideoClock,
  completeExamVideoClock,
  saveCompletedExam,
  type Question,
} from "@/database/repository";

export default function ExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActiveExamScreen key={id} id={id} />;
}

function ActiveExamScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const db = useSQLiteContext();
  const { setIsTabBarHidden } = useContext(TabBarContext);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [category, setCategory] = useState("B");
  const [language, setLanguage] = useState<QuestionLanguage>('pl');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [clock, setClock] = useState<ExamClock | null>(null);
  const [now, setNow] = useState(Date.now);
  const [actionError, setActionError] = useState<string | null>(null);
  const advanceLock = useRef(false);
  const finishLock = useRef(false);
  const retryAction = useRef<{ type: 'finish'; answers: Record<number, string> } | { type: 'advance'; answer: string | null } | { type: 'choice'; answer: string } | { type: 'reading' } | { type: 'videoDuration'; duration: number } | { type: 'videoEnd'; finishedAt: number } | null>(null);
  const [globalSeconds, setGlobalSeconds] = useState(25 * 60);

  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [result, setResult] = useState<{ id: string; score: number; passed: boolean } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);

  const question = questions[index];
  const [readyMedia, setReadyMedia] = useState<number | null>(null);
  const [completedVideo, setCompletedVideo] = useState<number | null>(null);
  const configuringVideo = useRef<string | null>(null);
  const visibleMedia = useRef('');
  useLayoutEffect(() => {
    visibleMedia.current = `${sessionId}:${index}`;
    return () => { visibleMedia.current = ''; };
  }, [sessionId, index]);
  const hasVideo = isExamVideo(question?.mediaFilename);
  const mediaReady = !question?.mediaFilename || readyMedia === question.id;
  const clockReady = clock?.index === index;
  const timing = clockReady && clock ? examClockState(clock, now) : { phase: 'READING' as const, seconds: 0, expired: false };
  const phase = timing.phase;
  const clockKey = question ? `${question.id}:${phase}` : '';
  const questionSeconds = timing.seconds;
  const configureVideo = useCallback(async (duration: number) => {
    if (!sessionId || !clock || clock.videoDurationSeconds !== -1) return;
    const key = `${sessionId}:${index}`;
    if (configuringVideo.current === key) return;
    configuringVideo.current = key;
    try {
      const value = await configureExamVideoClock(db, sessionId, index, duration);
      if (visibleMedia.current === key) { setClock(value); setNow(Date.now()); if (retryAction.current?.type === 'videoDuration') retryAction.current = null; }
    } catch {
      if (visibleMedia.current === key) { retryAction.current = { type: 'videoDuration', duration }; setActionError(t('Nie udało się odczytać czasu pytania. Wróć do panelu i wznów próbę.')); }
    } finally { if (configuringVideo.current === key) configuringVideo.current = null; }
  }, [clock, db, index, sessionId, t]);
  const finishVideo = useCallback(async (finishedAt?: number) => {
    if (!sessionId || !question) return;
    const key = `${sessionId}:${index}`;
    const endedAt = finishedAt ?? Date.now();
    if (clock?.videoDurationSeconds === undefined) { setCompletedVideo(question.id); return; }
    try {
      const value = await completeExamVideoClock(db, sessionId, index, endedAt);
      if (visibleMedia.current === key) { setClock(value); setCompletedVideo(question.id); setNow(Date.now()); if (retryAction.current?.type === 'videoEnd') retryAction.current = null; }
    } catch {
      if (visibleMedia.current === key) { retryAction.current = { type: 'videoEnd', finishedAt: endedAt }; setActionError(t('Nie udało się odczytać czasu pytania. Wróć do panelu i wznów próbę.')); }
    }
  }, [clock, db, index, question, sessionId, t]);

  useFocusEffect(
    useCallback(() => {
      setIsTabBarHidden(true);
      return () => setIsTabBarHidden(false);
    }, [setIsTabBarHidden]),
  );

  useEffect(() => {
    let active = true;
    const startedAt = Date.now();
    void resumeActiveExam(db).then((exam) => {
      if (!active) return;
      if (!exam || exam.id !== id) {
        router.replace("/");
        return;
      }
      const current = exam.questions[exam.index];
      if (!current) {
        router.replace("/");
        return;
      }
      setSessionId(exam.id);
      setCategory(exam.category);
      setLanguage(exam.language);
      setExpiresAt(exam.expiresAt);
      setIndex(exam.index);
      setQuestions(exam.questions);
      setSelections(exam.selections);

      setLoadFailed(false);
      recordMediaDiagnostic({stage:'screen-load',kind:'mixed',items:exam.questions.length,elapsedMs:Date.now()-startedAt,status:'ok'});
    }).catch(() => { if (active) {
      recordMediaDiagnostic({stage:'screen-load',kind:'mixed',elapsedMs:Date.now()-startedAt,status:'error'});
      setLoadFailed(true);
    } });
    return () => {
      active = false;
    };
  }, [db, id, reload]);

  useEffect(() => {
    if (!expiresAt || result) return;
    const tick = () =>
      setGlobalSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, result]);

  useEffect(() => {
    if (!sessionId || !question || result) return;
    let current = true;
    void questionClock(db, sessionId, index, question).then(value => {
      if (current) { setClock(value); setNow(Date.now()); setActionError(null); }
    }).catch(() => { if (current) setActionError(t("Nie udało się odczytać czasu pytania. Wróć do panelu i wznów próbę.")); });
    return () => { current = false; };
  }, [db, index, question, result, sessionId, t]);

  const finishExam = useCallback(async (answers: Record<number, string>) => {
    if (finishLock.current || !questions.length || !sessionId || !userDataWritable()) return;
    finishLock.current = true; setIsFinishing(true); setActionError(null);
    const revision = userDataRevision();
    try {
      const startedAt = expiresAt ? expiresAt - 25 * 60 * 1000 : Date.now();
      const completed = await saveCompletedExam(db, category, questions, answers, startedAt, language, sessionId);
      if (!userDataWritable(revision)) return;
      retryAction.current = null; setSessionId(null); setResult(completed);
    } catch {
      retryAction.current = { type: 'finish', answers };
      setActionError(t("Nie udało się zapisać wyniku. Twoje odpowiedzi pozostają w tej próbie. Ponów zapis."));
    } finally { finishLock.current = false; setIsFinishing(false); }
  }, [category, db, expiresAt, language, questions, sessionId, t]);

  const advance = useCallback(async (answer: string | null) => {
    if (!question || advanceLock.current || finishLock.current || result || !userDataWritable()) return;
    advanceLock.current = true; setIsAdvancing(true); setActionError(null);
    const revision = userDataRevision();
    const updated = answer ? { ...selections, [question.id]: answer } : selections;
    try {
      if (index === questions.length - 1) {
        setSelections(updated); await finishExam(updated); return;
      }
      if (!sessionId) return;
      await saveActiveProgress(db, sessionId, index + 1, question.id, answer);
      if (!userDataWritable(revision)) return;
      retryAction.current = null; setSelections(updated); setIndex(index + 1);
    } catch {
      retryAction.current = { type: 'advance', answer };
      setActionError(t("Nie udało się zapisać odpowiedzi. Ponów zapis — zachowamy wybrany wariant."));
    } finally { advanceLock.current = false; setIsAdvancing(false); }
  }, [db, finishExam, index, question, questions.length, result, selections, sessionId, t]);

  useEffect(() => {
    if (result || !questions.length) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [questions.length, result]);
  useEffect(() => {
    if (result || actionError || isAdvancing || isFinishing) return;
    const transition = setTimeout(() => {
      if (advanceLock.current || finishLock.current) return;
      if (globalSeconds === 0 && questions.length) void finishExam(selections);
      else if (clockReady && timing.expired && question) void advance(selections[question.id] ?? null);
    }, 0);
    return () => clearTimeout(transition);
  }, [actionError, advance, clockReady, finishExam, globalSeconds, isAdvancing, isFinishing, question, questions.length, result, selections, timing.expired]);

  const abandonExam = useCallback(() => {
    if (advanceLock.current || finishLock.current) return;
    Alert.alert(t("Przerwać egzamin?"), t("Bieżąca próba nie zostanie zapisana."), [
      { text: t("Kontynuuj"), style: "cancel" },
      {
        text: t("Przerwij"),
        style: "destructive",
        onPress: () => {
          void clearActiveExam(db).then(() => router.replace("/")).catch(() => setActionError(t("Nie udało się porzucić próby. Spróbuj ponownie.")));
        },
      },
    ]);
  }, [db, t]);
  useFocusEffect(useCallback(() => {
    if (result) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { abandonExam(); return true; });
    return () => back.remove();
  }, [abandonExam, result]));

  const persistChoice = useCallback(async (answer: string) => {
    if (!question || !sessionId || advanceLock.current || finishLock.current || !userDataWritable()) return;
    advanceLock.current = true; setIsAdvancing(true); setActionError(null);
    const revision = userDataRevision();
    setSelections(previous => ({ ...previous, [question.id]: answer }));
    try {
      await saveActiveChoice(db, sessionId, index, question.id, answer);
      if (userDataWritable(revision)) retryAction.current = null;
    } catch {
      retryAction.current = { type: 'choice', answer };
      setActionError(t('Nie udało się zapisać odpowiedzi. Ponów zapis — zachowamy wybrany wariant.'));
    } finally { advanceLock.current = false; setIsAdvancing(false); }
  }, [db, index, question, sessionId, t]);
  const startQuestionMedia = useCallback(async () => {
    if (!sessionId || !clockReady || !clock || !question || question.scope !== 'PODSTAWOWY' || advanceLock.current || finishLock.current) return;
    if (expiresAt && Date.now() >= expiresAt) { void finishExam(selections); return; }
    if (phase !== 'READING') {
      if (retryAction.current?.type === 'reading') { retryAction.current = null; setActionError(null); }
      return;
    }
    if (!mediaReady || (hasVideo && !(clock.videoDurationSeconds && clock.videoDurationSeconds > 0))) return;
    advanceLock.current = true; setIsAdvancing(true); setActionError(null);
    const key = `${sessionId}:${index}`;
    try {
      const value = await finishExamReading(db, sessionId, index);
      if (visibleMedia.current === key) { retryAction.current = null; setClock(value); setNow(Date.now()); }
    } catch {
      if (visibleMedia.current === key) {
        retryAction.current = { type: 'reading' };
        setActionError(t('Nie udało się rozpocząć tego etapu. Spróbuj ponownie.'));
      }
    } finally { advanceLock.current = false; setIsAdvancing(false); }
  }, [clock, clockReady, db, expiresAt, finishExam, hasVideo, index, mediaReady, phase, question, selections, sessionId, t]);
  const chooseAnswer = useCallback((answer: string) => {
    if (advanceLock.current || finishLock.current) return;
    if (!clockReady || phase !== 'ANSWERING' || !mediaReady || (hasVideo && completedVideo !== question?.id) || actionError || isAdvancing || isFinishing || !clock || !expiresAt) return;
    const timestamp = Date.now();
    if (timestamp >= expiresAt) void finishExam(selections);
    else if (timestamp < clock.answeringEndsAt) void persistChoice(answer);
  }, [actionError, clock, clockReady, completedVideo, expiresAt, finishExam, hasVideo, isAdvancing, isFinishing, mediaReady, persistChoice, phase, question?.id, selections]);

  if (result) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.result}>
          <Text style={styles.kicker}>{t("EGZAMIN ZAKOŃCZONY")}</Text>
          <Text style={styles.resultTitle}>{result.passed ? t("POZYTYWNY") : t("NEGATYWNY")}</Text>
          <Text accessibilityLabel={t('Wynik egzaminu: {0} z 74 punktów', [result.score])} style={styles.resultScore}>{result.score}/74</Text>
          <Text style={styles.muted}>
            {result.passed ? t("Wynik spełnia próg 68 punktów.") : t("Brakuje {0} pkt do zaliczenia.", [68 - result.score])}
          </Text>
          <Pressable
            onPress={() => router.replace({ pathname: "/exam/review", params: { sessionId: result.id } })}
            style={styles.reviewButton}
          >
            <Text style={styles.reviewButtonText}>{t("Przejrzyj odpowiedzi")}</Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t("Wróć do panelu")}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!question || !sessionId || !clockReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          {loadFailed || actionError ? <>
            <LoadingError onRetry={() => setReload((value) => value + 1)} />
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.replace("/")}><Text style={styles.primaryButtonText}>{t("Wróć do panelu")}</Text></Pressable>
          </> : <Text style={styles.muted}>{t("Przygotowujemy egzamin…")}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  const canAnswer = clockReady && phase === "ANSWERING" && mediaReady && (!hasVideo || completedVideo === question.id) && globalSeconds > 0 && !isAdvancing && !isFinishing && !actionError;
  const phaseCopy =
    phase === "ANSWERING"
      ? t("Wybierz odpowiedź")
      : phase === 'MEDIA' ? t('Oglądaj film') : t("Zapoznaj się z pytaniem");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityLabel={t("Przerwij egzamin")} hitSlop={12} onPress={abandonExam}>
          <Text style={styles.close}>×</Text>
        </Pressable>
        <View style={styles.timerGroup}>
          <ExamTimer seconds={globalSeconds} />
          {phase !== 'MEDIA' && <ExamTimer key={clockKey} seconds={questionSeconds} question active={phase === "ANSWERING" && globalSeconds > 0 && !isAdvancing && !isFinishing} />}
        </View>
        <Text style={styles.position}>{index + 1}/32</Text>
      </View>
      <AnimatedProgress progress={(index + 1) / 32} />
      <ScrollView key={`${sessionId}:${question.id}`} contentContainerStyle={styles.content} style={styles.scroll}>
        <QuestionTransition>
        <Text style={styles.kicker}>
          {question.scope === "PODSTAWOWY" ? t("WIEDZA PODSTAWOWA") : t("KATEGORIA {0}", [category])} · {question.points}{t("PKT")}</Text>
        <View style={styles.phaseNotice}>
          <Text style={styles.phaseNoticeText}>{t(phaseCopy)}</Text>
        </View>
        <Text style={styles.question}>{question.question}</Text>
        {language !== question.contentLanguage ? <Text style={styles.muted}>{t("Brak oficjalnego tłumaczenia — pytanie w języku polskim.")}</Text> : null}
        {phase === 'READING' && <View style={styles.readingAction}>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !mediaReady || isAdvancing || isFinishing || Boolean(actionError) || (hasVideo && !(clock.videoDurationSeconds && clock.videoDurationSeconds > 0)) }}
            disabled={!mediaReady || isAdvancing || isFinishing || Boolean(actionError) || (hasVideo && !(clock.videoDurationSeconds && clock.videoDurationSeconds > 0))}
            onPress={() => void startQuestionMedia()} style={[styles.primaryButton, styles.readingButton, (!mediaReady || isAdvancing || isFinishing || Boolean(actionError) || (hasVideo && !(clock.videoDurationSeconds && clock.videoDurationSeconds > 0))) && styles.readingButtonDisabled]}>
            <Text style={styles.primaryButtonText}>{t(hasVideo ? 'Odtwórz film' : 'Przejdź do odpowiedzi')}</Text>
          </Pressable>
          <Text style={styles.readingHint}>{t(hasVideo ? 'Film ruszy także automatycznie po czasie na czytanie.' : 'Po czasie na czytanie automatycznie przejdziesz do odpowiedzi.')}</Text>
        </View>}
        <View style={hasVideo && phase === 'READING' && mediaReady ? styles.hiddenMedia : undefined} accessibilityElementsHidden={hasVideo && phase === 'READING' && mediaReady}>
        {clockReady && <QuestionMedia questionId={question.id} examMode filename={question.mediaFilename}
          examPlayback={phase === 'READING' ? 'waiting' : hasVideo && completedVideo !== question.id && clock?.videoFinishedAt === undefined ? 'playing' : 'finished'}
          videoStartedAt={clock?.readingEndsAt} onVideoDuration={configureVideo}
          onReadyChange={ready => { if (visibleMedia.current === `${sessionId}:${index}`) setReadyMedia(ready ? question.id : null); }}
          onVideoEnd={finishVideo} />}
        </View>
        {actionError && <View style={styles.phaseNotice}>
          <Text accessibilityRole="alert" style={styles.muted}>{t(actionError)}</Text>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => {
            const retry = retryAction.current;
            if (retry?.type === 'finish') void finishExam(retry.answers);
            else if (retry?.type === 'advance') void advance(retry.answer);
            else if (retry?.type === 'choice') void persistChoice(retry.answer);
            else if (retry?.type === 'reading') void startQuestionMedia();
            else if (retry?.type === 'videoDuration') { setActionError(null); void configureVideo(retry.duration); }
            else if (retry?.type === 'videoEnd') { setActionError(null); void finishVideo(retry.finishedAt); }
            else setReload(value => value + 1);
          }}>
            <Text style={styles.primaryButtonText}>{t("Ponów zapis")}</Text>
          </Pressable>
        </View>}
        {phase === 'ANSWERING' && <><View style={styles.answers}>
          {question.scope === "PODSTAWOWY" ? <BasicAnswerButtons neutral answers={question.answers} selectedAnswer={selections[question.id]} disabled={!canAnswer} locked={phase !== "ANSWERING"} onAnswer={chooseAnswer} /> : question.answers.map((answer) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canAnswer, selected: selections[question.id] === answer.label }}
              disabled={!canAnswer}
              key={answer.label}
              onPress={() => chooseAnswer(answer.label)}
              style={[styles.answer, !canAnswer && styles.answerDisabled, selections[question.id] === answer.label && styles.answerSelected]}
            >
              <Text style={[styles.answerLetter, selections[question.id] === answer.label && styles.answerLetterSelected]}>{answer.label}</Text>
              <Text style={styles.answerText}>{answer.answer}</Text>
              <View accessible={false} style={[styles.selectionRing, selections[question.id] === answer.label && styles.selectionRingActive]}>
                {selections[question.id] === answer.label ? <View style={styles.selectionDot} /> : null}
              </View>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" disabled={!canAnswer} accessibilityState={{ disabled: !canAnswer }}
          onPress={() => void advance(selections[question.id] ?? null)} style={[styles.primaryButton, !canAnswer && styles.answerDisabled]}>
          <Text style={[styles.primaryButtonText, !canAnswer && { color: colors.textSecondary }]}>{t('Następne pytanie')}</Text>
        </Pressable>
        </>}
        </QuestionTransition>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", flexDirection: "row", flexWrap: 'wrap', minHeight: 64, gap: 8, justifyContent: "space-between", paddingHorizontal: 24 },
  close: { color: colors.textPrimary, fontSize: 32, lineHeight: 34 },
  timerGroup: { alignItems: "center", flexDirection: "row", gap: 8 },
  globalTimer: { backgroundColor: colors.warningSurface, borderRadius: 12, color: colors.warning, fontVariant: ["tabular-nums"], fontWeight: "800", paddingHorizontal: 10, paddingVertical: 7 },
  questionTimer: { backgroundColor: colors.primarySurface, borderRadius: 12, color: colors.primaryText, fontVariant: ["tabular-nums"], fontWeight: "800", minWidth: 42, paddingHorizontal: 8, paddingVertical: 7, textAlign: "center" },
  position: { color: colors.textSecondary, fontVariant: ["tabular-nums"], fontWeight: "700" },
  progressTrack: { backgroundColor: colors.disabledSurface, height: 5, marginHorizontal: 24 },
  progressFill: { backgroundColor: colors.primaryText, height: "100%" },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  kicker: { color: colors.primaryText, fontSize: 11, fontWeight: "800", letterSpacing: 0.9 },
  phaseNotice: { alignSelf: "flex-start", backgroundColor: colors.primarySurface, borderRadius: 10, marginTop: 14, paddingHorizontal: 10, paddingVertical: 7 },
  phaseNoticeText: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
  question: { color: colors.textPrimary, fontSize: 23, fontWeight: "700", lineHeight: 31, marginBottom: 24, marginTop: 4 },
  answers: { gap: 12 },
  readingAction: { gap: 8, marginBottom: 16 },
  readingButton: { marginTop: 0 },
  readingButtonDisabled: { opacity: 0.45 },
  hiddenMedia: { height: 0, overflow: 'hidden' },
  readingHint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  answer: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", minHeight: 68, padding: 16 },
  answerDisabled: { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
  answerSelected: { borderColor: colors.selection, borderWidth: 3, backgroundColor: colors.selectionSurface },
  answerLetterSelected: { backgroundColor: colors.selection, color: colors.background },
  selectionRing: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  selectionRingActive: { borderColor: colors.selection },
  selectionDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.selection },
  answerLetter: { backgroundColor: colors.primarySurface, borderRadius: 16, color: colors.primaryText, fontWeight: "800", height: 32, marginRight: 12, overflow: "hidden", paddingTop: 7, textAlign: "center", width: 32 },
  answerText: { color: colors.textPrimary, flex: 1, fontSize: 15, lineHeight: 21 },
  result: { alignItems: "center", flexGrow: 1, justifyContent: "center", padding: 32 },
  resultTitle: { color: colors.textPrimary, fontSize: 30, fontWeight: "800", marginTop: 10 },
  resultScore: { color: colors.primaryText, fontSize: 42, fontVariant: ["tabular-nums"], fontWeight: "800", marginTop: 28 },
  muted: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 18, justifyContent: "center", marginTop: 28, minHeight: 56, paddingHorizontal: 24 },
  primaryButtonText: { color: colors.onPrimary, fontWeight: "800" },
  reviewButton: { alignItems: "center", borderColor: colors.primaryText, borderRadius: 18, borderWidth: 1, justifyContent: "center", marginTop: 24, minHeight: 56, paddingHorizontal: 24 },
  reviewButtonText: { color: colors.primaryText, fontWeight: "800" },
});
