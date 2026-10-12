import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  questionExplanation,
  recordPracticeAnswer,
  toggleFlag,
} from "@/database/repository";
import { playAnswerSound } from "@/services/answer-feedback";

type StudyQuestion = {
  id: number;
  question: string;
  points: number;
  scope: string;
  correct_answer: string;
};
type Answer = { label: string; answer: string };
type StudyFilter = "all" | "three" | "basic" | "specialist" | "mistakes" | "flags";

function isStudyFilter(value: string | undefined): value is StudyFilter {
  return ["all", "three", "basic", "specialist", "mistakes", "flags"].includes(value ?? "");
}

export default function StudyScreen() {
  const db = useSQLiteContext();
  const { filter: requestedFilter, count: requestedCount } = useLocalSearchParams<{
    filter?: string;
    count?: string;
  }>();
  const [items, setItems] = useState<StudyQuestion[]>([]);
  const [active, setActive] = useState<StudyQuestion | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [filter, setFilter] = useState<StudyFilter>("all");
  const [search, setSearch] = useState("");
  const activeFilter = isStudyFilter(requestedFilter) ? requestedFilter : filter;
  const sessionLimit = requestedCount === "5" ? 5 : 12;
  useEffect(() => {
    let joins = "";
    let where = "1 = 1";
    let order = "RANDOM()";

    if (activeFilter === "three") where = "q.points = 3";
    if (activeFilter === "basic") where = "q.scope = 'PODSTAWOWY'";
    if (activeFilter === "specialist") where = "q.scope = 'SPECJALISTYCZNY'";
    if (activeFilter === "mistakes") {
      where = "EXISTS (SELECT 1 FROM practice_attempts p WHERE p.question_id = q.id AND p.is_correct = 0) OR EXISTS (SELECT 1 FROM exam_answers e WHERE e.question_id = q.id AND e.is_correct = 0)";
      order = "q.id DESC";
    }
    if (activeFilter === "flags") {
      joins = "JOIN flags f ON f.question_id = q.id";
      order = "f.created_at DESC";
    }

    const trimmedSearch = search.trim();
    const searchClause = trimmedSearch ? " AND q.question LIKE ?" : "";
    const query = `SELECT DISTINCT q.id, q.question, q.points, q.scope, q.correct_answer FROM questions q ${joins} WHERE (${where})${searchClause} ORDER BY ${order} LIMIT ${sessionLimit}`;
    const params = trimmedSearch ? [`%${trimmedSearch}%`] : [];
    db.getAllAsync<StudyQuestion>(query, params).then(setItems);
  }, [activeFilter, db, search, sessionLimit]);
  const open = async (item: StudyQuestion) => {
    setActive(item);
    setExplanation(null);
    setAnswers(
      await db.getAllAsync<Answer>(
        "SELECT label, answer FROM answers WHERE question_id = ? ORDER BY label",
        item.id,
      ),
    );
    setSelected(null);
    setFlagged(
      Boolean(
        await db.getFirstAsync(
          "SELECT question_id FROM flags WHERE question_id = ?",
          item.id,
        ),
      ),
    );
    setExplanation(await questionExplanation(db, item.id));
  };
  const answer = async (label: string) => {
    if (!active || selected) return;
    setSelected(label);
    const correct = label === active.correct_answer;
    await Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
    playAnswerSound(correct);
    await recordPracticeAnswer(db, active.id, label, correct);
  };
  if (active)
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content}>
          <Pressable onPress={() => setActive(null)}>
            <Text style={s.link}>← Wróć do pytań</Text>
          </Pressable>
          <View style={s.row}>
            <Text style={s.badge}>{active.points} pkt</Text>
            <Pressable
              onPress={async () => setFlagged(await toggleFlag(db, active.id))}
            >
              <Text style={s.link}>{flagged ? "★ Zapisane" : "☆ Oznacz"}</Text>
            </Pressable>
          </View>
          <Text style={s.question}>{active.question}</Text>
          {answers.map((item) => (
            <Pressable
              key={item.label}
              disabled={Boolean(selected)}
              onPress={() => answer(item.label)}
              style={[
                s.answer,
                selected === item.label && s.selected,
                selected && item.label === active.correct_answer && s.correct,
                selected === item.label &&
                  item.label !== active.correct_answer &&
                  s.wrong,
              ]}
            >
              <Text style={s.letter}>{item.label}</Text>
              <Text style={s.answerText}>{item.answer}</Text>
            </Pressable>
          ))}
          {selected && (
            <View style={s.feedback}>
              <Text style={s.feedbackTitle}>
                {selected === active.correct_answer
                  ? "Dobra odpowiedź!"
                  : "Sprawdź tę zasadę ponownie."}
              </Text>
              <Text style={s.sub}>
                Poprawna odpowiedź: {active.correct_answer}
              </Text>
              {explanation ? (
                <Text style={s.explanation}>{explanation}</Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Nauka</Text>
        <Text style={s.sub}>
          {sessionLimit === 5
            ? "Krótka sesja: 5 pytań o największej wadze."
            : "Wybierz pytanie z oficjalnej bazy."}
        </Text>
        <TextInput
          accessibilityLabel="Szukaj w pytaniach"
          onChangeText={setSearch}
          placeholder="Szukaj w pytaniach"
          placeholderTextColor="#718076"
          style={s.search}
          value={search}
        />
        <View style={s.filters}>
          {(
            [
              ["all", "Wszystkie"],
              ["three", "3 punkty"],
              ["basic", "Podstawowe"],
              ["specialist", "Specjalistyczne"],
              ["mistakes", "Błędy"],
              ["flags", "Zapisane"],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => {
                setFilter(key);
                router.setParams({ filter: key });
              }}
            >
              <Text style={[s.filter, activeFilter === key && s.filterActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {items.length ? (
          items.map((item) => (
            <Pressable key={item.id} onPress={() => open(item)} style={s.card}>
              <View style={s.row}>
                <Text style={s.badge}>{item.points} pkt</Text>
                <Text style={s.scope}>{item.scope}</Text>
              </View>
              <Text style={s.question}>{item.question}</Text>
              <Text style={s.link}>Otwórz pytanie →</Text>
            </Pressable>
          ))
        ) : (
          <Text style={s.empty}>Brak pytań w tym zestawie.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F5" },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: "700", color: "#18221D" },
  sub: { color: "#718076", marginBottom: 12 },
  search: {
    backgroundColor: "#FFF",
    borderColor: "#DCE3DE",
    borderRadius: 14,
    borderWidth: 1,
    color: "#18221D",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  filters: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  filter: {
    backgroundColor: "#E6F0E5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    color: "#1F704C",
  },
  filterActive: { backgroundColor: "#1F704C", color: "#FFF" },
  card: { backgroundColor: "#FFF", padding: 18, borderRadius: 18, gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  badge: { color: "#1F704C", fontWeight: "700" },
  scope: { color: "#718076", fontSize: 12 },
  question: {
    fontSize: 18,
    lineHeight: 25,
    color: "#26332B",
    marginVertical: 8,
  },
  link: { color: "#397355", fontWeight: "700" },
  answer: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DCE3DE",
    flexDirection: "row",
    gap: 12,
  },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E6F0E5",
    textAlign: "center",
    textAlignVertical: "center",
    color: "#1F704C",
    fontWeight: "700",
  },
  answerText: { flex: 1, lineHeight: 20 },
  selected: { borderColor: "#397D5B" },
  correct: { backgroundColor: "#E5F5E9", borderColor: "#2D9B5D" },
  wrong: { backgroundColor: "#FCEBEC", borderColor: "#D95A5A" },
  feedback: {
    backgroundColor: "#FFF7E2",
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  feedbackTitle: { fontSize: 17, fontWeight: "700", color: "#634D18" },
  explanation: { color: "#526358", lineHeight: 20, marginTop: 8 },
  empty: { color: "#718076", paddingTop: 20 },
});
