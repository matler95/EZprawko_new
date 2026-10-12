import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
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
import { questionTimerSeconds } from "@/domain/timer-presentation";
import { QuestionTransition } from "@/components/question-transition";
import { LoadingError } from "@/components/skeleton";
import { userDataRevision, userDataWritable } from "@/domain/data-maintenance";
import { AnimatedExamScore, SuccessBadge } from "@/components/exam-result-motion";
import type { QuestionLanguage } from "@/database/translations";
import { TabBarContext } from "@/context/tab-bar-context";
import {
  clearActiveExam,
  resumeActiveExam,
  saveActiveProgress,
  saveCompletedExam,
  type Question,
} from "@/database/repository";

type ExamPhase = "MEDIA_PLAYING" | "READING" | "ANSWERING";

const isVideoQuestion = (question: Question) =>
  Boolean(question.mediaFilename?.toLowerCase().match(/\.(wmv|mp4|m4v|mov)$/));

const initialPhaseFor = (question: Question): ExamPhase => {
  if (question.scope === "SPECJALISTYCZNY") return "ANSWERING";
  return isVideoQuestion(question) ? "MEDIA_PLAYING" : "READING";
};

export default function ExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ActiveExamScreen key={id} id={id} />;
}

function ActiveExamScreen({ id }: { id: string }) {
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
  const [phase, setPhase] = useState<ExamPhase>("READING");
  const [globalSeconds, setGlobalSeconds] = useState(25 * 60);
  const [questionClock, setQuestionClock] = useState({ key: '', seconds: 0 });
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [result, setResult] = useState<{ id: string; score: number; passed: boolean } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);

  const question = questions[index];
  const clockKey = question ? `${question.id}:${phase}` : '';
  const questionSeconds = questionTimerSeconds(questionClock, clockKey,
    question ? (phase === 'ANSWERING' ? question.answeringTimeSeconds : question.readingTimeSeconds) : 0);

  useFocusEffect(
    useCallback(() => {
      setIsTabBarHidden(true);
      return () => setIsTabBarHidden(false);
    }, [setIsTabBarHidden]),
  );

  useEffect(() => {
    let active = true;
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
      setPhase(initialPhaseFor(current));
      setLoadFailed(false);
    }).catch(() => { if (active) setLoadFailed(true); });
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

  const finishExam = useCallback(
    async (answers: Record<number, string>) => {
      if (isFinishing || !questions.length || !userDataWritable()) return;
      const revision = userDataRevision();
      setIsFinishing(true);
      const startedAt = expiresAt ? expiresAt - 25 * 60 * 1000 : Date.now();
      const completed = await saveCompletedExam(db, category, questions, answers, startedAt, language);
      if (!userDataWritable(revision)) return;
      await clearActiveExam(db);
      setSessionId(null);
      setResult(completed);
    },
    [category, db, expiresAt, isFinishing, language, questions],
  );

  const advance = useCallback(
    async (answer: string | null) => {
      if (!question || isAdvancing || result || !userDataWritable()) return;
      const revision = userDataRevision();
      setIsAdvancing(true);
      const updated = answer ? { ...selections, [question.id]: answer } : selections;
      if (sessionId) {
        await saveActiveProgress(db, sessionId, index + 1, question.id, answer);
      }
      if (!userDataWritable(revision)) return;
      if (index === questions.length - 1) {
        setSelections(updated);
        await finishExam(updated);
        return;
      }
      const nextQuestion = questions[index + 1];
      setSelections(updated);
      setIndex((value) => value + 1);
      setPhase(initialPhaseFor(nextQuestion));
      setIsAdvancing(false);
    },
    [db, finishExam, index, isAdvancing, question, questions, result, selections, sessionId],
  );

  useEffect(() => {
    if (globalSeconds !== 0 || !questions.length || result) return;
    const completion = setTimeout(() => void finishExam(selections), 0);
    return () => clearTimeout(completion);
  }, [finishExam, globalSeconds, questions.length, result, selections]);

  useEffect(() => {
    if (!question || result) return;
    const seconds =
      phase === "ANSWERING"
        ? question.answeringTimeSeconds
        : question.readingTimeSeconds;
    if (seconds === 0) {
      const transition = setTimeout(() => setPhase("ANSWERING"), 0);
      return () => clearTimeout(transition);
    }
    const deadline = Date.now() + seconds * 1000;
    const key = `${question.id}:${phase}`;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setQuestionClock((previous) => previous.key === key && previous.seconds === remaining ? previous : { key, seconds: remaining });
    };
    tick();
    const interval = setInterval(tick, 250);
    const timeout = setTimeout(() => {
      if (phase === "ANSWERING") void advance(null);
      else setPhase("ANSWERING");
    }, seconds * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [advance, phase, question, result]);

  const abandonExam = () => {
    Alert.alert("Przerwać egzamin?", "Bieżąca próba nie zostanie zapisana.", [
      { text: "Kontynuuj", style: "cancel" },
      {
        text: "Przerwij",
        style: "destructive",
        onPress: () => {
          void clearActiveExam(db).then(() => router.replace("/"));
        },
      },
    ]);
  };

  if (result) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.result}>
          {result.passed ? <SuccessBadge key={result.id} /> : <Text style={styles.resultIcon}>↗</Text>}
          <Text style={styles.kicker}>EGZAMIN ZAKOŃCZONY</Text>
          <Text style={styles.resultTitle}>{result.passed ? "Zdane!" : "Spróbuj ponownie"}</Text>
          <AnimatedExamScore key={result.id} score={result.score} sessionId={result.id} style={styles.resultScore} />
          <Text style={styles.muted}>
            {result.passed ? "Wynik spełnia próg 68 punktów." : `Brakuje ${68 - result.score} pkt do zaliczenia.`}
          </Text>
          <Pressable
            onPress={() => router.replace({ pathname: "/exam/review", params: { sessionId: result.id } })}
            style={styles.reviewButton}
          >
            <Text style={styles.reviewButtonText}>Przejrzyj odpowiedzi</Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Wróć do panelu</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!question || !sessionId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          {loadFailed ? <>
            <LoadingError onRetry={() => setReload((value) => value + 1)} />
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.replace("/")}><Text style={styles.primaryButtonText}>Wróć do panelu</Text></Pressable>
          </> : <Text style={styles.muted}>Przygotowujemy egzamin…</Text>}
        </View>
      </SafeAreaView>
    );
  }

  const canAnswer = phase === "ANSWERING" && globalSeconds > 0 && !isAdvancing;
  const phaseCopy =
    phase === "ANSWERING"
      ? "Wybierz odpowiedź"
      : "Zapoznaj się z pytaniem";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Przerwij egzamin" hitSlop={12} onPress={abandonExam}>
          <Text style={styles.close}>×</Text>
        </Pressable>
        <View style={styles.timerGroup}>
          <ExamTimer seconds={globalSeconds} />
          <ExamTimer key={clockKey} seconds={questionSeconds} question active={phase === "ANSWERING" && globalSeconds > 0 && !isAdvancing && !isFinishing} />
        </View>
        <Text style={styles.position}>{index + 1}/32</Text>
      </View>
      <AnimatedProgress progress={(index + 1) / 32} />
      <ScrollView key={`${sessionId}:${question.id}`} contentContainerStyle={styles.content} style={styles.scroll}>
        <QuestionTransition>
        <Text style={styles.kicker}>
          {question.scope === "PODSTAWOWY" ? "WIEDZA PODSTAWOWA" : `KATEGORIA ${category}`} · {question.points} PKT
        </Text>
        <View style={styles.phaseNotice}>
          <Text style={styles.phaseNoticeText}>{phaseCopy}</Text>
        </View>
        <QuestionMedia
          examMode
          filename={question.mediaFilename}
          onVideoEnd={() => {
            if (question.scope === "PODSTAWOWY") setPhase("ANSWERING");
          }}
        />
        <Text style={styles.question}>{question.question}</Text>
        {language !== question.contentLanguage ? <Text style={styles.muted}>Brak oficjalnego tłumaczenia — pytanie w języku polskim.</Text> : null}
        <View style={styles.answers}>
          {question.scope === "PODSTAWOWY" ? <BasicAnswerButtons answers={question.answers} disabled={!canAnswer} locked={phase !== "ANSWERING"} onAnswer={(key) => void advance(key)} /> : question.answers.map((answer) => (
            <Pressable
              accessibilityState={{ disabled: !canAnswer }}
              disabled={!canAnswer}
              key={answer.label}
              onPress={() => void advance(answer.label)}
              style={[styles.answer, !canAnswer && styles.answerDisabled]}
            >
              <Text style={styles.answerLetter}>{answer.label}</Text>
              <Text style={styles.answerText}>{answer.answer}</Text>
            </Pressable>
          ))}
        </View>
        </QuestionTransition>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", flexDirection: "row", height: 64, justifyContent: "space-between", paddingHorizontal: 24 },
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
  answer: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", minHeight: 68, padding: 16 },
  answerDisabled: { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
  answerLetter: { backgroundColor: colors.primarySurface, borderRadius: 16, color: colors.primaryText, fontWeight: "800", height: 32, marginRight: 12, overflow: "hidden", paddingTop: 7, textAlign: "center", width: 32 },
  answerText: { color: colors.textPrimary, flex: 1, fontSize: 15, lineHeight: 21 },
  result: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  resultIcon: { color: colors.primaryText, fontSize: 52, marginBottom: 20 },
  resultTitle: { color: colors.textPrimary, fontSize: 30, fontWeight: "800", marginTop: 10 },
  resultScore: { color: colors.primaryText, fontSize: 42, fontVariant: ["tabular-nums"], fontWeight: "800", marginTop: 28 },
  muted: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 18, justifyContent: "center", marginTop: 28, minHeight: 56, paddingHorizontal: 24 },
  primaryButtonText: { color: colors.onPrimary, fontWeight: "800" },
  reviewButton: { alignItems: "center", borderColor: colors.primaryText, borderRadius: 18, borderWidth: 1, justifyContent: "center", marginTop: 24, minHeight: 56, paddingHorizontal: 24 },
  reviewButtonText: { color: colors.primaryText, fontWeight: "800" },
});
