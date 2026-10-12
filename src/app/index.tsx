export { default } from "@/components/dashboard-screen";

/* Historical implementation retained temporarily for source migration. It is
 * not part of the application bundle; the dashboard now lives in its own
 * component and the active exam in /exam/[id].
 */
/*
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import { QuestionMedia } from "@/components/question-media";
import {
  challengeStatus,
  clearActiveExam,
  completeOnboarding,
  examReadiness,
  hasCompletedOnboarding,
  resumeActiveExam,
  saveActiveProgress,
  saveCompletedExam,
  selectedCategory,
  setSelectedCategory,
  startActiveExam,
  type Question,
  type ExamReadiness,
} from "@/database/repository";

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    pointsShort: number;
    weakScopes: string[];
  } | null>(null);
  const [category, setCategory] = useState("B");
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState({
    daysCompleted: 0,
    correctToday: 0,
    complete: false,
  });
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [readiness, setReadiness] = useState<ExamReadiness | null>(null);
  const question = questions[index];
  const answered = Boolean(selected);
  useEffect(() => {
    if (!deadline) return;
    const tick = () =>
      setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  useEffect(() => {
    if (timeLeft !== 0 || questions.length === 0 || result) return;
    void (async () => {
      const completed = await saveCompletedExam(
        db,
        category,
        questions,
        selections,
      );
      await clearActiveExam(db);
      setSessionId(null);
      setResult({
        ...completed,
        pointsShort: Math.max(0, 68 - completed.score),
        weakScopes: [
          ...new Set(
            questions
              .filter((item) => selections[item.id] !== item.correctAnswer)
              .map((item) => item.scope),
          ),
        ],
      });
    })();
  }, [category, db, questions, result, selections, timeLeft]);
  useEffect(() => {
    resumeActiveExam(db).then((active) => {
      if (!active) return;
      setSessionId(active.id);
      setCategory(active.category);
      setQuestions(active.questions);
      setIndex(active.index);
      setSelections(active.selections);
      setDeadline(active.expiresAt);
    });
  }, [db]);
  useEffect(() => {
    challengeStatus(db).then(setChallenge);
  }, [db]);
  useEffect(() => {
    selectedCategory(db).then(setCategory);
  }, [db]);
  useEffect(() => {
    hasCompletedOnboarding(db).then((completed) => {
      setOnboardingComplete(completed);
      setOnboardingChecked(true);
    });
  }, [db]);
  useEffect(() => {
    examReadiness(db).then(setReadiness);
  }, [db, result]);
  const start = async () => {
    const currentCategory = await selectedCategory(db);
    const active = await startActiveExam(db, currentCategory);
    setSessionId(active.id);
    setCategory(active.category);
    setQuestions(active.questions);
    setIndex(0);
    setSelected(null);
    setSelections({});
    setResult(null);
    setDeadline(active.expiresAt);
    setTimeLeft(25 * 60);
  };
  const next = async () => {
    if (!question || !selected) return;
    const updated = { ...selections, [question.id]: selected };
    setSelections(updated);
    if (sessionId)
      await saveActiveProgress(db, sessionId, index + 1, question.id, selected);
    if (index === questions.length - 1) {
      const completed = await saveCompletedExam(db, category, questions, updated);
      setResult({
        ...completed,
        pointsShort: Math.max(0, 68 - completed.score),
        weakScopes: [
          ...new Set(
            questions
              .filter((item) => updated[item.id] !== item.correctAnswer)
              .map((item) => item.scope),
          ),
        ],
      });
      await clearActiveExam(db);
      setSessionId(null);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
  };
  const abandonExam = () => {
    Alert.alert(
      "Przerwać symulację?",
      "Bieżący wynik nie zostanie zapisany.",
      [
        { text: "Kontynuuj egzamin", style: "cancel" },
        {
          text: "Przerwij",
          style: "destructive",
          onPress: async () => {
            await clearActiveExam(db);
            setSessionId(null);
            setQuestions([]);
            setSelected(null);
            setDeadline(null);
          },
        },
      ],
    );
  };
  if (!onboardingChecked)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.muted}>Przygotowujemy Twoją naukę…</Text>
        </View>
      </SafeAreaView>
    );
  if (!onboardingComplete)
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.onboarding}>
          <Text style={styles.hello}>Zaczynamy</Text>
          <Text style={styles.onboardingTitle}>Jaką kategorię zdajesz?</Text>
          <Text style={styles.muted}>
            Dopasujemy pytania specjalistyczne i Twój egzamin próbny.
          </Text>
          <View style={styles.categoryGrid}>
            {["AM", "A", "B", "C", "D"].map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[
                  styles.categoryChoice,
                  category === item && styles.categoryChoiceSelected,
                ]}
              >
                <Text
                  style={
                    category === item
                      ? styles.categoryChoiceSelectedText
                      : styles.categoryChoiceText
                  }
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={async () => {
              await setSelectedCategory(db, category);
              await completeOnboarding(db);
              setOnboardingComplete(true);
            }}
            style={styles.onboardingButton}
          >
            <Text style={styles.buttonText}>Ustaw kategorię i kontynuuj</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  if (result)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.result}>
          <Text style={styles.badge}>{result.passed ? "✓" : "↗"}</Text>
          <Text style={styles.kicker}>EGZAMIN ZAKOŃCZONY</Text>
          <Text style={styles.resultTitle}>
            {result.passed ? "Zdane!" : "Spróbuj ponownie"}
          </Text>
          <Text style={styles.score}>{result.score}/74</Text>
          {!result.passed && (
            <View style={styles.recoveryCard}>
              <Text style={styles.recoveryTitle}>Następny najlepszy krok</Text>
              <Text style={styles.recoveryCopy}>
                Brakuje {result.pointsShort} pkt. Powtórz błędne pytania z: {result.weakScopes.join(" i ")}.
              </Text>
              <Pressable
                onPress={() => router.navigate("/study?filter=mistakes")}
                style={styles.recoveryButton}
              >
                <Text style={styles.recoveryButtonText}>Powtórz błędy</Text>
              </Pressable>
            </View>
          )}
          <Text style={styles.muted}>wymagane: 68 punktów</Text>
          <Pressable onPress={start} style={styles.button}>
            <Text style={styles.buttonText}>Nowy egzamin</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  if (question)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.examHead}>
          <Pressable onPress={abandonExam}>
            <Text style={styles.close}>×</Text>
          </Pressable>
          <Text style={styles.timer}>{`${Math.floor(timeLeft / 60)
            .toString()
            .padStart(
              2,
              "0",
            )}:${(timeLeft % 60).toString().padStart(2, "0")}`}</Text>
          <Text>{index + 1}/32</Text>
        </View>
        <View style={styles.progress}>
          <View
            style={[
              styles.progressFill,
              { width: `${((index + 1) / 32) * 100}%` },
            ]}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.exam}
          style={styles.examScroll}
        >
          <Text style={styles.kicker}>
            {question.scope} · {question.points} PKT
          </Text>
          <QuestionMedia filename={question.mediaFilename} />
          <Text style={styles.question}>{question.question}</Text>
          {question.answers.map((answer) => (
            <Pressable
              key={answer.label}
              disabled={timeLeft === 0}
              onPress={() => setSelected(answer.label)}
              style={[
                styles.answer,
                selected === answer.label && styles.selected,
              ]}
            >
              <Text style={styles.letter}>{answer.label}</Text>
              <Text style={styles.answerText}>{answer.answer}</Text>
            </Pressable>
          ))}
          {timeLeft === 0 && (
            <Text style={styles.hint}>Czas egzaminu minął.</Text>
          )}
        </ScrollView>
        <Pressable
          disabled={!selected || timeLeft === 0}
          onPress={next}
          style={[
            styles.button,
            (!selected || timeLeft === 0) && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {answered
              ? index === 31
                ? "Zakończ egzamin"
                : "Następne pytanie"
              : "Sprawdź odpowiedź"}
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hello}>Prawo Jazdy</Text>
        <Text style={styles.muted}>
          Oficjalna teoria · kategoria {category}
        </Text>
        <Pressable onPress={() => router.navigate("/settings")}>
          <Text style={styles.categoryLink}>Zmień kategorię</Text>
        </Pressable>
        <View style={styles.hero}>
          <Text style={styles.kicker}>EGZAMIN PAŃSTWOWY</Text>
          <Text style={styles.heroTitle}>
            32 pytania.{`\n`}25 minut. 74 punkty.
          </Text>
          <Text style={styles.heroText}>
            20 pytań podstawowych i 12 specjalistycznych. Próg zdania: 68
            punktów.
          </Text>
          <Pressable onPress={start} style={styles.gold}>
            <Text style={styles.goldText}>Rozpocznij egzamin próbny →</Text>
          </Pressable>
        </View>
        <View style={styles.readinessCard}>
          <View>
            <Text style={styles.readinessTitle}>Gotowość egzaminacyjna</Text>
            <Text style={styles.readinessCopy}>
              {readiness
                ? readiness.pointsToPass === 0
                  ? `Średnio ${readiness.averageScore}/74 · próg osiągnięty`
                  : `Średnio ${readiness.averageScore}/74 · brakuje ${readiness.pointsToPass} pkt`
                : "Ukończ pierwszy egzamin, aby ocenić gotowość."}
            </Text>
          </View>
          <Text style={styles.readinessValue}>
            {readiness ? `${readiness.passRate}%` : "—"}
          </Text>
        </View>
        <View style={styles.card}>
          <View>
            <Text>
              {challenge.complete
                ? "Wyzwanie ukończone!"
                : `Wyzwanie: ${challenge.daysCompleted}/3 dni`}
            </Text>
            <Text style={styles.muted}>
              {challenge.correctToday}/5 poprawnych odpowiedzi dzisiaj
            </Text>
          </View>
          <Text style={styles.chevron}>{challenge.complete ? "✓" : "★"}</Text>
        </View>
        <Text style={styles.section}>Dzisiejsza nauka</Text>
        <Pressable
          onPress={() => router.navigate("/study?filter=three&count=5")}
          style={styles.recommendedCard}
        >
          <View>
            <Text style={styles.recommendedKicker}>NAJLEPSZY KOLEJNY KROK</Text>
            <Text style={styles.recommendedTitle}>5 pytań za 3 punkty</Text>
            <Text style={styles.recommendedCopy}>
              Zacznij od pytań o największej wadze na egzaminie.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <View style={styles.card}>
          <Text>3-punktowe pytania bezpieczeństwa</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <View style={styles.card}>
          <Text>Powtórz błędne odpowiedzi</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyHomeScreen() {
  const questions = [
    [
      "Kto ma pierwszeństwo na skrzyżowaniu równorzędnym?",
      ["Pojazd z prawej strony", "Pojazd większy", "Pojazd szybszy"],
      0,
    ],
    [
      "Co oznacza znak z czerwoną obwódką i liczbą 50?",
      [
        "Prędkość zalecaną",
        "Zakaz przekraczania 50 km/h",
        "Koniec ograniczenia",
      ],
      1,
    ],
    ["Jaki numer alarmowy działa w całej UE?", ["997", "112", "999"], 1],
  ] as const;
  const [mode, setMode] = useState<"home" | "exam" | "result">("home");
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const start = () => {
    setIndex(0);
    setChoice(null);
    setAnswers([]);
    setChecked(false);
    setMode("exam");
  };
  const next = () => {
    if (choice === null) return;
    if (!checked) {
      setChecked(true);
      return;
    }
    const all = [...answers, choice];
    if (index === questions.length - 1) {
      setAnswers(all);
      setMode("result");
    } else {
      setAnswers(all);
      setIndex(index + 1);
      setChoice(null);
      setChecked(false);
    }
  };
  if (mode === "exam") {
    const q = questions[index];
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.examHead}>
          <Pressable onPress={() => setMode("home")}>
            <Text style={styles.close}>×</Text>
          </Pressable>
          <Text style={styles.timer}>04:57</Text>
          <Text>{index + 1}/3</Text>
        </View>
        <View style={styles.progress}>
          <View
            style={[styles.progressFill, { width: `${(index + 1) * 33}%` }]}
          />
        </View>
        <View style={styles.exam}>
          <Text style={styles.kicker}>EGZAMIN PRÓBNY</Text>
          <View style={styles.sign}>
            <Text style={styles.signText}>{index === 1 ? "50" : "?"}</Text>
          </View>
          <Text style={styles.question}>{q[0]}</Text>
          {q[1].map((answer, i) => (
            <Pressable
              key={answer}
              disabled={checked}
              onPress={() => setChoice(i)}
              style={[
                styles.answer,
                choice === i && styles.selected,
                checked && i === q[2] && styles.correct,
                checked && choice === i && i !== q[2] && styles.wrong,
              ]}
            >
              <Text style={styles.letter}>{String.fromCharCode(65 + i)}</Text>
              <Text style={styles.answerText}>{answer}</Text>
            </Pressable>
          ))}
          {checked && (
            <Text style={styles.hint}>
              Wskazówka: zawsze oceniaj sytuację i upewnij się, że manewr jest
              bezpieczny.
            </Text>
          )}
        </View>
        <Pressable
          disabled={choice === null}
          onPress={next}
          style={[styles.button, choice === null && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {checked
              ? index === 2
                ? "Zobacz wynik"
                : "Następne pytanie"
              : "Sprawdź odpowiedź"}
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  if (mode === "result") {
    const score = answers.reduce(
      (sum, answer, i) => sum + Number(answer === questions[i][2]),
      0,
    );
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.result}>
          <Text style={styles.badge}>{score >= 2 ? "✓" : "↗"}</Text>
          <Text style={styles.kicker}>EGZAMIN PRÓBNY ZAKOŃCZONY</Text>
          <Text style={styles.resultTitle}>
            {score >= 2 ? "Świetna robota!" : "Jeszcze jeden krok"}
          </Text>
          <Text style={styles.score}>{score}/3</Text>
          <Text style={styles.muted}>poprawnych odpowiedzi</Text>
          <Pressable onPress={start} style={styles.button}>
            <Text style={styles.buttonText}>Spróbuj ponownie</Text>
          </Pressable>
          <Pressable onPress={() => setMode("home")}>
            <Text style={styles.link}>Wróć do startu</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hello}>Dzień dobry, Mateusz</Text>
        <Text style={styles.muted}>Dziś zrób mały krok do celu</Text>
        <View style={styles.streak}>
          <Text style={styles.muted}>Twoja seria</Text>
          <Text style={styles.streakValue}>3 dni 🔥</Text>
          <Text style={styles.muted}>Gotowość</Text>
          <Text style={styles.streakValue}>42%</Text>
        </View>
        <View style={styles.hero}>
          <Text style={styles.kicker}>DZISIEJSZY CEL</Text>
          <Text style={styles.heroTitle}>
            Zrób krok w stronę{`\n`}prawa jazdy.
          </Text>
          <Text style={styles.heroText}>
            Krótka sesja pytań, która buduje pewność za kierownicą.
          </Text>
          <Pressable onPress={start} style={styles.gold}>
            <Text style={styles.goldText}>Rozpocznij egzamin próbny →</Text>
          </Pressable>
        </View>
        <Text style={styles.section}>Ucz się po swojemu</Text>
        {[
          "↪  Skrzyżowania     12 pytań",
          "⚠  Znaki drogowe     36 pytań",
          "♥  Pierwsza pomoc     18 pytań",
        ].map((item) => (
          <Pressable key={item} onPress={start} style={styles.card}>
            <Text>{item}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F5" },
  loading: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  onboarding: { flexGrow: 1, justifyContent: "center", padding: 24 },
  onboardingTitle: {
    color: "#18221D",
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
    marginTop: 12,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 32,
  },
  categoryChoice: {
    alignItems: "center",
    backgroundColor: "#E6F0E5",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 72,
    minWidth: 72,
  },
  categoryChoiceSelected: { backgroundColor: "#1F704C" },
  categoryChoiceText: { color: "#1F704C", fontSize: 18, fontWeight: "800" },
  categoryChoiceSelectedText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  onboardingButton: {
    alignItems: "center",
    backgroundColor: "#1F704C",
    borderRadius: 18,
    justifyContent: "center",
    marginTop: 32,
    minHeight: 56,
  },
  content: { padding: 24, paddingBottom: 48 },
  hello: { fontSize: 24, fontWeight: "700", color: "#18221D" },
  muted: { fontSize: 14, color: "#718076", marginTop: 6 },
  categoryLink: { color: "#397355", fontWeight: "700", marginTop: 8 },
  streak: {
    marginVertical: 24,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#E6F0E5",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  streakValue: { fontSize: 18, fontWeight: "700", color: "#1E3126" },
  hero: { padding: 24, borderRadius: 28, backgroundColor: "#216A49" },
  kicker: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    color: "#B9DABE",
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: "#FFF",
    marginTop: 12,
  },
  heroText: { fontSize: 14, lineHeight: 20, color: "#D8E9D8", marginTop: 12 },
  gold: {
    backgroundColor: "#F0C96A",
    padding: 16,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 24,
  },
  goldText: { fontWeight: "700", color: "#27301A" },
  section: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B2921",
    marginTop: 32,
    marginBottom: 16,
  },
  readinessCard: {
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    padding: 20,
  },
  readinessTitle: { color: "#18221D", fontSize: 16, fontWeight: "700" },
  readinessCopy: { color: "#718076", lineHeight: 19, marginTop: 4, maxWidth: 230 },
  readinessValue: { color: "#1F704C", fontSize: 24, fontWeight: "800" },
  card: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recommendedCard: {
    alignItems: "center",
    backgroundColor: "#E6F0E5",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 20,
  },
  recommendedKicker: {
    color: "#397355",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  recommendedTitle: { color: "#1E3126", fontSize: 18, fontWeight: "700", marginTop: 4 },
  recommendedCopy: { color: "#526358", lineHeight: 19, marginTop: 4, maxWidth: 250 },
  chevron: { fontSize: 24, color: "#718076" },
  examHead: {
    height: 68,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  close: { fontSize: 32 },
  timer: {
    backgroundColor: "#FFF0D8",
    padding: 8,
    borderRadius: 12,
    color: "#A65B0A",
    fontWeight: "700",
  },
  progress: { height: 5, marginHorizontal: 24, backgroundColor: "#DDE5DF" },
  progressFill: { height: "100%", backgroundColor: "#2B7A55" },
  examScroll: { flex: 1 },
  exam: { padding: 24, paddingBottom: 8 },
  sign: {
    height: 100,
    width: 100,
    borderRadius: 50,
    borderWidth: 9,
    borderColor: "#D23C3C",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    margin: 20,
  },
  signText: { fontSize: 32, fontWeight: "800" },
  question: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "700",
    marginBottom: 24,
  },
  answer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE3DE",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  selected: { borderColor: "#397D5B", backgroundColor: "#EDF7EF" },
  correct: { borderColor: "#2D9B5D", backgroundColor: "#E5F5E9" },
  wrong: { borderColor: "#D95A5A", backgroundColor: "#FCEBEC" },
  letter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EEF1EE",
    textAlign: "center",
    textAlignVertical: "center",
    marginRight: 12,
    fontWeight: "700",
  },
  answerText: { flex: 1, fontSize: 14 },
  hint: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#FFF7E2",
    borderRadius: 14,
    color: "#765B1B",
  },
  button: {
    margin: 24,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#1F704C",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { backgroundColor: "#B6C2BA" },
  buttonText: { color: "#FFF", fontWeight: "700" },
  result: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  badge: { fontSize: 52, color: "#287A50", marginBottom: 20 },
  resultTitle: { fontSize: 30, fontWeight: "700", marginTop: 10 },
  score: { fontSize: 42, fontWeight: "800", color: "#1F704C", marginTop: 28 },
  recoveryCard: {
    width: "100%",
    backgroundColor: "#E6F0E5",
    borderRadius: 18,
    gap: 8,
    marginTop: 24,
    padding: 20,
  },
  recoveryTitle: { color: "#1E3126", fontSize: 16, fontWeight: "700" },
  recoveryCopy: { color: "#526358", lineHeight: 20 },
  recoveryButton: {
    alignItems: "center",
    backgroundColor: "#1F704C",
    borderRadius: 12,
    marginTop: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  recoveryButtonText: { color: "#FFF", fontWeight: "700" },
  link: { color: "#397355", fontWeight: "700", padding: 16 },
});
*/
