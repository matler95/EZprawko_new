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
import { TabBarContext } from "@/context/tab-bar-context";
import {
  clearActiveExam,
  resumeActiveExam,
  saveActiveProgress,
  saveCompletedExam,
  type Question,
} from "@/database/repository";

type ExamPhase = "MEDIA_PLAYING" | "READING" | "ANSWERING";

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

const isVideoQuestion = (question: Question) =>
  Boolean(question.mediaFilename?.toLowerCase().match(/\.(mp4|m4v|mov)$/));

const initialPhaseFor = (question: Question): ExamPhase => {
  if (question.scope === "SPECJALISTYCZNY") return "ANSWERING";
  return isVideoQuestion(question) ? "MEDIA_PLAYING" : "READING";
};

export default function ExamScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setIsTabBarHidden } = useContext(TabBarContext);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [category, setCategory] = useState("B");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<ExamPhase>("READING");
  const [globalSeconds, setGlobalSeconds] = useState(25 * 60);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [result, setResult] = useState<{ id: string; score: number; passed: boolean } | null>(null);

  const question = questions[index];

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
      setExpiresAt(exam.expiresAt);
      setIndex(exam.index);
      setQuestions(exam.questions);
      setSelections(exam.selections);
      setPhase(initialPhaseFor(current));
    });
    return () => {
      active = false;
    };
  }, [db, id]);

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
      if (isFinishing || !questions.length) return;
      setIsFinishing(true);
      const startedAt = expiresAt ? expiresAt - 25 * 60 * 1000 : Date.now();
      const completed = await saveCompletedExam(db, category, questions, answers, startedAt);
      await clearActiveExam(db);
      setSessionId(null);
      setResult(completed);
    },
    [category, db, expiresAt, isFinishing, questions],
  );

  const advance = useCallback(
    async (answer: string | null) => {
      if (!question || isAdvancing || result) return;
      setIsAdvancing(true);
      const updated = answer ? { ...selections, [question.id]: answer } : selections;
      if (sessionId) {
        await saveActiveProgress(db, sessionId, index + 1, question.id, answer);
      }
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
    const tick = () =>
      setQuestionSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
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
          <Text style={styles.resultIcon}>{result.passed ? "✓" : "↗"}</Text>
          <Text style={styles.kicker}>EGZAMIN ZAKOŃCZONY</Text>
          <Text style={styles.resultTitle}>{result.passed ? "Zdane!" : "Spróbuj ponownie"}</Text>
          <Text style={styles.resultScore}>{result.score}/74</Text>
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
          <Text style={styles.muted}>Przygotowujemy egzamin…</Text>
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
          <Text style={styles.globalTimer}>{formatTime(globalSeconds)}</Text>
          <Text style={styles.questionTimer}>{questionSeconds}s</Text>
        </View>
        <Text style={styles.position}>{index + 1}/32</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((index + 1) / 32) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
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
        <View style={styles.answers}>
          {question.answers.map((answer) => (
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F5" },
  loading: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", flexDirection: "row", height: 64, justifyContent: "space-between", paddingHorizontal: 24 },
  close: { color: "#18221D", fontSize: 32, lineHeight: 34 },
  timerGroup: { alignItems: "center", flexDirection: "row", gap: 8 },
  globalTimer: { backgroundColor: "#FFF0D8", borderRadius: 12, color: "#A65B0A", fontVariant: ["tabular-nums"], fontWeight: "800", paddingHorizontal: 10, paddingVertical: 7 },
  questionTimer: { backgroundColor: "#E6F0E5", borderRadius: 12, color: "#216A49", fontVariant: ["tabular-nums"], fontWeight: "800", minWidth: 42, paddingHorizontal: 8, paddingVertical: 7, textAlign: "center" },
  position: { color: "#526358", fontVariant: ["tabular-nums"], fontWeight: "700" },
  progressTrack: { backgroundColor: "#DDE5DF", height: 5, marginHorizontal: 24 },
  progressFill: { backgroundColor: "#2B7A55", height: "100%" },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  kicker: { color: "#397355", fontSize: 11, fontWeight: "800", letterSpacing: 0.9 },
  phaseNotice: { alignSelf: "flex-start", backgroundColor: "#E6F0E5", borderRadius: 10, marginTop: 14, paddingHorizontal: 10, paddingVertical: 7 },
  phaseNoticeText: { color: "#1E3126", fontSize: 13, fontWeight: "700" },
  question: { color: "#18221D", fontSize: 23, fontWeight: "700", lineHeight: 31, marginBottom: 24, marginTop: 4 },
  answers: { gap: 12 },
  answer: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#DCE3DE", borderRadius: 16, borderWidth: 1, flexDirection: "row", minHeight: 68, padding: 16 },
  answerDisabled: { backgroundColor: "#F0F2EF", borderColor: "#E4E8E4" },
  answerLetter: { backgroundColor: "#E6F0E5", borderRadius: 16, color: "#216A49", fontWeight: "800", height: 32, marginRight: 12, overflow: "hidden", paddingTop: 7, textAlign: "center", width: 32 },
  answerText: { color: "#18221D", flex: 1, fontSize: 15, lineHeight: 21 },
  result: { alignItems: "center", flex: 1, justifyContent: "center", padding: 32 },
  resultIcon: { color: "#287A50", fontSize: 52, marginBottom: 20 },
  resultTitle: { color: "#18221D", fontSize: 30, fontWeight: "800", marginTop: 10 },
  resultScore: { color: "#1F704C", fontSize: 42, fontVariant: ["tabular-nums"], fontWeight: "800", marginTop: 28 },
  muted: { color: "#718076", fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: "#1F704C", borderRadius: 18, justifyContent: "center", marginTop: 28, minHeight: 56, paddingHorizontal: 24 },
  primaryButtonText: { color: "#FFF", fontWeight: "800" },
  reviewButton: { alignItems: "center", borderColor: "#1F704C", borderRadius: 18, borderWidth: 1, justifyContent: "center", marginTop: 24, minHeight: 56, paddingHorizontal: 24 },
  reviewButtonText: { color: "#1F704C", fontWeight: "800" },
});
