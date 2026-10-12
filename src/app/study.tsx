import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  recordPracticeAnswer,
  topicProgress,
  toggleFlag,
  type TopicProgress,
} from "@/database/repository";
import { playAnswerSound } from "@/services/answer-feedback";
import { QuestionMedia } from "@/components/question-media";
import { BasicAnswerButtons, basicAnswerText } from "@/components/basic-answer-buttons";
import { questionContent, selectedQuestionLanguage, type QuestionLanguage } from "@/database/translations";
import { getQuestionExplanation, type QuestionExplanation } from "@/database/explanations";
import { isStudyFilter, studyFilterSql, type StudyFilter } from "@/database/study-filters";
import { ExplanationCard } from "@/components/explanation-card";
import { LoadingError, LoadingSkeleton } from "@/components/skeleton";

type StudyQuestion = {
  id: number;
  question: string;
  points: number;
  scope: string;
  correct_answer: string;
  media_filename: string | null;
  contentLanguage: QuestionLanguage;
};
type Answer = { label: string; answer: string };
export default function StudyScreen() {
  const { colors } = useAppTheme();
  const s = createStyles(colors);
  const db = useSQLiteContext();
  const { filter: requestedFilter, count: requestedCount, topic: requestedTopic, sign: requestedSign } = useLocalSearchParams<{
    filter?: string;
    count?: string;
    topic?: string;
    sign?: string;
  }>();
  const [items, setItems] = useState<StudyQuestion[]>([]);
  const [active, setActive] = useState<StudyQuestion | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [explanation, setExplanation] = useState<QuestionExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationFailed, setExplanationFailed] = useState(false);
  const openRequest = useRef(0);
  const [filter, setFilter] = useState<StudyFilter>("all");
  const [search, setSearch] = useState("");
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [languageReady, setLanguageReady] = useState(false);
  const [language, setLanguage] = useState<QuestionLanguage>('pl');
  useFocusEffect(useCallback(() => {
    let current = true;
    void selectedQuestionLanguage(db).then((value) => {
      if (current) { setLanguage(value); setActive(null); setLanguageReady(true); }
    }).catch(() => { if (current) setFailedQuery(`language:${reload}`); });
    return () => { current = false; };
  }, [db, reload, setActive]));
  const activeFilter = isStudyFilter(requestedFilter) ? requestedFilter : filter;
  const sessionLimit = requestedCount === "5" ? 5 : 12;
  const queryKey = JSON.stringify([activeFilter, language, reload, requestedSign, requestedTopic, search, sessionLimit]);
  const loading = !languageReady || loadedQuery !== queryKey;
  const readError = failedQuery === queryKey || failedQuery === `language:${reload}`;
  useEffect(() => {
    if (!languageReady) return;
    let current = true;
    const { joins, where, order } = studyFilterSql(activeFilter);

    const trimmedSearch = search.trim();
    const topicClause = requestedTopic ? " AND EXISTS (SELECT 1 FROM question_topics t WHERE t.question_id = q.id AND t.topic = ?)" : "";
    const signClause = requestedSign ? " AND EXISTS (SELECT 1 FROM question_signs s WHERE s.question_id = q.id AND s.sign_code = ?)" : "";
    const searchClause = trimmedSearch ? " AND COALESCE(tr.question, q.question) LIKE ?" : "";
    const query = `SELECT DISTINCT q.id, COALESCE(tr.question, q.question) AS question, CASE WHEN tr.question IS NULL THEN 'pl' ELSE tr.language END AS contentLanguage, q.points, q.scope, q.correct_answer, q.media_filename FROM questions q LEFT JOIN question_translations tr ON tr.question_id = q.id AND tr.language = ? ${joins} WHERE (${where})${topicClause}${signClause}${searchClause} ORDER BY ${order} LIMIT ${sessionLimit}`;
    const params = [language, ...(requestedTopic ? [requestedTopic] : []), ...(requestedSign ? [requestedSign] : []), ...(trimmedSearch ? [`%${trimmedSearch}%`] : [])];
    void Promise.all([db.getAllAsync<StudyQuestion>(query, params), topicProgress(db)]).then(([rows, nextTopics]) => {
      if (current) { setItems(rows); setTopics(nextTopics); setFailedQuery(null); }
    }).catch(() => { if (current) setFailedQuery(queryKey); })
      .finally(() => { if (current) setLoadedQuery(queryKey); });
    return () => { current = false; };
  }, [activeFilter, db, language, languageReady, queryKey, requestedSign, requestedTopic, search, sessionLimit]);
  const open = async (item: StudyQuestion, itemIndex = items.findIndex((value) => value.id === item.id)) => {
    const request = ++openRequest.current;
    const content = await questionContent(db, item.id, language);
    if (request !== openRequest.current) return;
    setActiveIndex(itemIndex);
    setActive({ ...item, question: content.question, contentLanguage: content.contentLanguage });
    setExplanation(null);
    setExplanationLoading(true);
    setExplanationFailed(false);
    setAnswers(content.answers);
    setSelected(null);
    const flag = await db.getFirstAsync("SELECT question_id FROM flags WHERE question_id = ?", item.id);
    if (request !== openRequest.current) return;
    setFlagged(Boolean(flag));
    try {
      const details = await getQuestionExplanation(db, item.id);
      if (request === openRequest.current) setExplanation(details);
    } catch {
      if (request === openRequest.current) setExplanationFailed(true);
    } finally {
      if (request === openRequest.current) setExplanationLoading(false);
    }
  };
  const move = (direction: -1 | 1) => {
    const nextIndex = activeIndex + direction;
    if (nextIndex >= 0 && nextIndex < items.length) void open(items[nextIndex], nextIndex);
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
          <Text style={s.cardPosition}>{activeIndex + 1} z {items.length}</Text>
          <QuestionMedia filename={active.media_filename} />
          <Text style={s.question}>{active.question}</Text>
          {active.contentLanguage !== language ? <Text style={s.sub}>Brak oficjalnego tłumaczenia — pytanie w języku polskim.</Text> : null}
          {active.scope === "PODSTAWOWY" ? <BasicAnswerButtons answers={answers} disabled={Boolean(selected)} selectedAnswer={selected} correctAnswer={selected ? active.correct_answer : undefined} onAnswer={(key) => void answer(key)} /> : answers.map((item) => (
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
                Poprawna odpowiedź: {active.scope === "PODSTAWOWY" ? basicAnswerText(answers, active.correct_answer) : active.correct_answer}
              </Text>
              <ExplanationCard explanation={explanation} loading={explanationLoading} failed={explanationFailed} />
            </View>
          )}
          <View style={s.navigator}>
            <Pressable disabled={activeIndex <= 0} onPress={() => move(-1)} style={[s.navButton, activeIndex <= 0 && s.navButtonDisabled]}>
              <Text style={s.navButtonText}>← Poprzednie</Text>
            </Pressable>
            <Pressable disabled={activeIndex >= items.length - 1} onPress={() => move(1)} style={[s.navButton, activeIndex >= items.length - 1 && s.navButtonDisabled]}>
              <Text style={s.navButtonText}>Następne →</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Nauka</Text>
        {requestedSign ? <View style={s.row}><Text style={s.badge}>Znak {requestedSign}</Text><Pressable onPress={() => { setActive(null); router.setParams({ sign: undefined }); }}><Text style={s.link}>Usuń filtr znaku</Text></Pressable></View> : null}
        <Text style={s.sub}>
          {sessionLimit === 5
            ? "Krótka sesja: 5 pytań o największej wadze."
            : "Wybierz pytanie z oficjalnej bazy."}
        </Text>
        {!loading && !readError && !requestedTopic && !requestedSign ? (
          <View style={s.topicSection}>
            <Text style={s.topicTitle}>Ucz się według działów</Text>
            {topics.map((topic) => (
              <Pressable key={topic.topic} onPress={() => router.setParams({ topic: topic.topic })} style={s.topicCard}>
                <View><Text style={s.topicName}>{topic.topic}</Text><Text style={s.topicMeta}>Opanowane {topic.mastered}/{topic.total} · przerobione {topic.practiced}</Text></View>
                <Text style={s.link}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : requestedTopic ? (
          <Pressable onPress={() => router.setParams({ topic: undefined })}><Text style={s.link}>← Wszystkie działy</Text></Pressable>
        ) : null}
        <TextInput
          accessibilityLabel="Szukaj w pytaniach"
          onChangeText={setSearch}
          placeholder="Szukaj w pytaniach"
          placeholderTextColor={colors.textSecondary}
          style={s.search}
          value={search}
        />
        <View style={s.filters}>
          {(
            [
              ["all", "Wszystkie"],
              ["three", "3 punkty"],
              ["hardest", "Najtrudniejsze"],
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
        {activeFilter === "hardest" ? <Text style={s.sub}>Najpierw pytania z największą liczbą pomyłek w nauce (co najmniej 2), następnie pozostałe pytania za 3 punkty.</Text> : null}
        {readError ? <LoadingError onRetry={() => setReload((value) => value + 1)} /> : loading ? <LoadingSkeleton variant="study" label="Wczytywanie działów i pytań" /> : items.length ? (
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
const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: "700", color: colors.textPrimary },
  sub: { color: colors.textSecondary, marginBottom: 12 },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  filters: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  topicSection: { gap: 8, marginBottom: 8 },
  topicTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 8 },
  topicCard: { alignItems: "center", backgroundColor: colors.primarySurface, borderRadius: 16, flexDirection: "row", justifyContent: "space-between", padding: 14 },
  topicName: { color: colors.textPrimary, fontWeight: "700" },
  topicMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  filter: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    color: colors.primaryText,
  },
  filterActive: { backgroundColor: colors.primary, color: colors.onPrimary },
  card: { backgroundColor: colors.surface, padding: 18, borderRadius: 18, gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  badge: { color: colors.primaryText, fontWeight: "700" },
  scope: { color: colors.textSecondary, fontSize: 12 },
  question: {
    fontSize: 18,
    lineHeight: 25,
    color: colors.textPrimary,
    marginVertical: 8,
  },
  cardPosition: { alignSelf: "center", color: colors.textSecondary, fontSize: 13, fontVariant: ["tabular-nums"], marginTop: 4 },
  link: { color: colors.primaryText, fontWeight: "700" },
  answer: {
    minHeight: 60,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: 12,
  },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySurface,
    textAlign: "center",
    textAlignVertical: "center",
    color: colors.primaryText,
    fontWeight: "700",
  },
  answerText: { flex: 1, lineHeight: 20, color: colors.textPrimary },
  selected: { borderColor: colors.primaryText },
  correct: { backgroundColor: colors.successSurface, borderColor: colors.success },
  wrong: { backgroundColor: colors.errorSurface, borderColor: colors.error },
  feedback: {
    backgroundColor: colors.warningSurface,
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  navigator: { flexDirection: "row", gap: 12, marginTop: 16 },
  navButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 14, flex: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: 8 },
  navButtonDisabled: { backgroundColor: colors.disabledSurface },
  navButtonText: { color: colors.onPrimary, fontWeight: "700" },
  feedbackTitle: { fontSize: 17, fontWeight: "700", color: colors.warning },
  explanation: { color: colors.textSecondary, lineHeight: 20, marginTop: 8 },
  empty: { color: colors.textSecondary, paddingTop: 20 },
});
