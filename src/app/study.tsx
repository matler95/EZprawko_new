import { useTranslation } from '@/hooks/use-translation';
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
import { useTargetCategory } from "@/context/target-category-context";
import { categoryClause, categoryLabel as baseCategoryLabel } from "@/domain/driving-categories";
import { userDataRevision, userDataWritable } from "@/domain/data-maintenance";
import { studySummary, type StudyAnswers } from '@/domain/study-session';
import { studyMastery, type MasterySnapshot } from '@/database/study-session';

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
  const { category } = useTargetCategory();
  const params = useLocalSearchParams<{ filter?: string; topic?: string; sign?: string; count?: string; session?: string }>();
  return <StudySession key={JSON.stringify([category, params.filter, params.topic, params.sign, params.count, params.session])} />;
}

function StudySession() {
  const { t, language: interfaceLanguage } = useTranslation();
  const categoryLabel = (value: string) => baseCategoryLabel(value, interfaceLanguage);
  const { colors } = useAppTheme();
  const s = createStyles(colors);
  const db = useSQLiteContext();
  const { category } = useTargetCategory();
  const { filter: requestedFilter, count: requestedCount, topic: requestedTopic, sign: requestedSign, start: requestedStart, session: requestedSession } = useLocalSearchParams<{
    filter?: string;
    count?: string;
    topic?: string;
    sign?: string;
    start?: string;
    session?: string;
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
  const autoOpened = useRef<string | null>(null);
  const ledger = useRef<StudyAnswers>({});
  const writing = useRef(false);
  const flagLock = useRef(false);
  const baseline = useRef<MasterySnapshot | null>(null);
  const [roundItems, setRoundItems] = useState<StudyQuestion[] | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof studySummary> | null>(null);
  const [masteryAfter, setMasteryAfter] = useState<MasterySnapshot | null>(null);
  const [masteryDelta, setMasteryDelta] = useState<number | null>(null);
  const [masteryFailed, setMasteryFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StudyFilter>("all");
  const [search, setSearch] = useState("");
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [languageReady, setLanguageReady] = useState(false);
  const [language, setLanguage] = useState<QuestionLanguage>('pl');
  const previousLanguage = useRef<QuestionLanguage | null>(null);
  useEffect(() => () => { openRequest.current++; }, []);
  useFocusEffect(useCallback(() => {
    let current = true;
    void selectedQuestionLanguage(db).then((value) => {
      if (current) {
        if (previousLanguage.current !== null && previousLanguage.current !== value) {
          openRequest.current++; setActive(null); setSummary(null); setRoundItems(null); ledger.current = {}; baseline.current = null;
        }
        previousLanguage.current = value;
        setLanguage(value); setBusy(writing.current); setActionError(null); setLanguageReady(true);
      }
    }).catch(() => { if (current) setFailedQuery(`language:${reload}`); });
    return () => { current = false; };
  }, [db, reload, setActive]));
  const activeFilter = isStudyFilter(requestedFilter) ? requestedFilter : filter;
  const sessionLimit = requestedCount === "5" ? 5 : 12;
  const queryKey = JSON.stringify([activeFilter, category, language, reload, requestedSign, requestedTopic, requestedSession, search, sessionLimit]);
  const loading = !languageReady || loadedQuery !== queryKey;
  const readError = failedQuery === queryKey || failedQuery === `language:${reload}`;
  useEffect(() => {
    if (!languageReady) return;
    let current = true;
    const { joins, where, order } = studyFilterSql(activeFilter);

    const trimmedSearch = search.trim();
    const topicClause = requestedTopic ? " AND EXISTS (SELECT 1 FROM question_topics t WHERE t.question_id = q.id AND t.topic = ?)" : "";
    const signClause = requestedSign ? " AND EXISTS (SELECT 1 FROM question_signs s WHERE s.question_id = q.id AND s.sign_code = ?)" : "";
    const sessionClause = requestedSession ? " AND EXISTS (SELECT 1 FROM exam_answers e WHERE e.question_id = q.id AND e.session_id = ? AND e.is_correct = 0)" : "";
    const searchClause = trimmedSearch ? " AND COALESCE(tr.question, q.question) LIKE ?" : "";
    const query = `SELECT DISTINCT q.id, COALESCE(tr.question, q.question) AS question, CASE WHEN tr.question IS NULL THEN 'pl' ELSE tr.language END AS contentLanguage, q.points, q.scope, q.correct_answer, q.media_filename FROM questions q LEFT JOIN question_translations tr ON tr.question_id = q.id AND tr.language = ? ${joins} WHERE (${where}) AND ${categoryClause}${topicClause}${signClause}${sessionClause}${searchClause} ORDER BY ${order} LIMIT ${requestedSession ? 32 : sessionLimit}`;
    const params = [language, category, ...(requestedTopic ? [requestedTopic] : []), ...(requestedSign ? [requestedSign] : []), ...(requestedSession ? [requestedSession] : []), ...(trimmedSearch ? [`%${trimmedSearch}%`] : [])];
    void Promise.all([db.getAllAsync<StudyQuestion>(query, params), topicProgress(db, category)]).then(([rows, nextTopics]) => {
      if (current) { setItems(rows); setTopics(nextTopics); setFailedQuery(null); }
    }).catch(() => { if (current) setFailedQuery(queryKey); })
      .finally(() => { if (current) setLoadedQuery(queryKey); });
    return () => { current = false; };
  }, [activeFilter, category, db, language, languageReady, queryKey, requestedSign, requestedTopic, requestedSession, search, sessionLimit]);
  const batch = roundItems ?? items;
  const open = useCallback(async (item: StudyQuestion, itemIndex = batch.findIndex((value) => value.id === item.id)) => {
    if (writing.current) return;
    const request = ++openRequest.current;
    setBusy(true);
    setActionError(null);
    let content: Awaited<ReturnType<typeof questionContent>>;
    let nextBaseline: MasterySnapshot;
    try {
      nextBaseline = baseline.current ?? await studyMastery(db, category);
      content = await questionContent(db, item.id, language);
    } catch {
      if (request === openRequest.current) { setActionError(t("Nie udało się otworzyć pytania. Spróbuj ponownie.")); setBusy(false); }
      return;
    }
    if (request !== openRequest.current) return;
    baseline.current = nextBaseline;
    setBusy(false);
    setRoundItems((previous) => previous ?? batch);
    setActiveIndex(itemIndex);
    setMediaReady(!item.media_filename);
    setActive({ ...item, question: content.question, contentLanguage: content.contentLanguage });
    setExplanation(null);
    setExplanationLoading(true);
    setExplanationFailed(false);
    setAnswers(content.answers);
    setSelected(ledger.current[item.id]?.label ?? null);
    setFlagged(false);
    try {
      const flag = await db.getFirstAsync("SELECT question_id FROM flags WHERE question_id = ?", item.id);
      if (request !== openRequest.current) return;
      setFlagged(Boolean(flag));
      const details = await getQuestionExplanation(db, item.id);
      if (request === openRequest.current) setExplanation(details);
    } catch {
      if (request === openRequest.current) setExplanationFailed(true);
    } finally {
      if (request === openRequest.current) setExplanationLoading(false);
    }
  }, [batch, category, db, language, setActive, t]);
  useEffect(() => {
    if (requestedStart !== '1' || loading || readError || !items.length || autoOpened.current === queryKey) return;
    autoOpened.current = queryKey;
    void open(items[0], 0);
    router.setParams({ start: undefined });
  }, [items, loading, open, queryKey, readError, requestedStart]);
  const move = (direction: -1 | 1) => {
    const nextIndex = activeIndex + direction;
    if (nextIndex >= 0 && nextIndex < batch.length) void open(batch[nextIndex], nextIndex);
  };
  const answer = async (label: string) => {
    const revision = userDataRevision();
    if (!active || selected || writing.current || busy || !mediaReady || ledger.current[active.id]) return;
    writing.current = true;
    setBusy(true);
    setActionError(null);
    const request = openRequest.current;
    const correct = label === active.correct_answer;
    try {
      await recordPracticeAnswer(db, active.id, label, correct);
      if (!userDataWritable(revision) || request !== openRequest.current) return;
      ledger.current = { ...ledger.current, [active.id]: { label, correct } };
      setSelected(label);
      playAnswerSound(correct);
      void Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    } catch {
      if (request === openRequest.current) setActionError(t("Nie zapisano odpowiedzi. Wybierz ją ponownie, aby spróbować jeszcze raz."));
    } finally {
      writing.current = false;
      if (request === openRequest.current) setBusy(false);
    }
  };
  const finish = async () => {
    if (writing.current || busy) return;
    const request = ++openRequest.current;
    setSummary(studySummary(batch.map((item) => item.id), ledger.current));
    setActive(null);
    setMasteryAfter(null);
    setMasteryDelta(null);
    setMasteryFailed(false);
    try {
      const snapshot = await studyMastery(db, category);
      if (request === openRequest.current) { setMasteryAfter(snapshot); setMasteryDelta(baseline.current ? snapshot.mastered - baseline.current.mastered : null); }
    } catch { if (request === openRequest.current) setMasteryFailed(true); }
  };
  const exit = () => {
    openRequest.current++;
    ledger.current = {};
    baseline.current = null;
    setSummary(null); setActive(null); setRoundItems(null); setActionError(null);
    setReload((value) => value + 1);
  };
  const replay = async () => {
    if (!summary || busy) return;
    const mistakes = batch.filter((item) => summary.mistakes.includes(item.id));
    if (!mistakes.length) return;
    setBusy(true);
    const request = ++openRequest.current;
    try {
      const snapshot = await studyMastery(db, category);
      if (request !== openRequest.current) return;
      baseline.current = snapshot;
      ledger.current = {};
      setRoundItems(mistakes); setSummary(null);
      await open(mistakes[0], 0);
    } catch { if (request === openRequest.current) setActionError(t("Nie udało się rozpocząć powtórki. Spróbuj ponownie.")); }
    finally { if (request === openRequest.current) setBusy(false); }
  };
  if (summary) return (
    <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>{t("Podsumowanie nauki")}</Text>
      <Text style={s.sub}>{categoryLabel(category)} · {summary.total} {t("pytań w tej partii")}</Text>
      <View style={s.card}>
        <Text style={s.topicTitle}>{summary.unanswered ? t("Sesja zakończona wcześniej") : t("Partia ukończona!")}</Text>
        <Text style={s.question}>{t("Poprawne:")} {summary.correct} {t("· Błędne:")} {summary.incorrect}</Text>
        <Text style={s.sub}>{t("Bez odpowiedzi:")} {summary.unanswered}{t(". Samo obejrzenie pytania nie liczy się jako rozwiązanie.")}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.topicTitle}>{t("Opanowanie materiału kategorii")}</Text>
        {masteryAfter && masteryDelta !== null ? <>
          <Text style={s.question}>{masteryAfter.mastered}/{masteryAfter.total} {t("opanowanych pytań")}</Text>
          <Text style={s.sub}>{t("Zmiana w tej sesji:")} {masteryDelta > 0 ? '+' : ''}{masteryDelta} {t("pytań.")}</Text>
        </> : masteryFailed ? <LoadingError onRetry={() => void finish()} /> : <Text style={s.sub}>{t("Odczyt postępu…")}</Text>}
        <Text style={s.sub}>{t("Opanowanie wymaga 3 poprawnych powtórek zaliczanych nie częściej niż co 24 godziny. Błąd zeruje serię danego pytania.")}</Text>
      </View>
      {actionError ? <Text accessibilityRole="alert" style={s.sub}>{t(actionError)}</Text> : null}
      {summary.incorrect ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void replay()} style={s.navButton}><Text style={s.navButtonText}>{busy ? t("Przygotowanie…") : t("Powtórz błędy ({0})", [summary.incorrect])}</Text></Pressable> : <Text style={s.sub}>{t("Brak błędnych odpowiedzi w tej sesji.")}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={exit} style={s.navButton}><Text style={s.navButtonText}>{t("Wróć do menu Nauki")}</Text></Pressable>
    </ScrollView></SafeAreaView>
  );
  if (active)
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content}>
          <Pressable disabled={busy} onPress={() => void finish()} style={s.endButton}>
            <Text style={s.link}>{t("Zakończ sesję i zobacz podsumowanie")}</Text>
          </Pressable>
          <View style={s.row}>
            <Text style={s.badge}>{active.points} {t("pkt")}</Text>
            <Pressable
              accessibilityRole="button"
              style={s.endButton}
              onPress={() => {
                if (flagLock.current) return;
                flagLock.current = true;
                const request = openRequest.current;
                void toggleFlag(db, active.id).then(value => { if (request === openRequest.current) setFlagged(value); })
                  .catch(() => { if (request === openRequest.current) setActionError(t('Nie udało się zmienić oznaczenia. Spróbuj ponownie.')); })
                  .finally(() => { flagLock.current = false; });
              }}
            >
              <Text style={s.link}>{flagged ? t("★ Zapisane") : t("☆ Oznacz")}</Text>
            </Pressable>
          </View>
          <Text style={s.cardPosition}>{activeIndex + 1} {t("z")} {batch.length}</Text>
          <QuestionMedia filename={active.media_filename} onReadyChange={setMediaReady} />
          {!mediaReady && <Text style={s.sub}>{t("Poczekaj na materiał albo pomiń pytanie przyciskiem „Następne”.")}</Text>}
          <Text style={s.question}>{active.question}</Text>
          {active.contentLanguage !== language ? <Text style={s.sub}>{t("Brak oficjalnego tłumaczenia — pytanie w języku polskim.")}</Text> : null}
          {actionError ? <Text accessibilityRole="alert" style={s.sub}>{t(actionError)}</Text> : null}
          {busy ? <Text style={s.sub}>{t("Zapisywanie lub wczytywanie…")}</Text> : null}
          {active.scope === "PODSTAWOWY" ? <BasicAnswerButtons answers={answers} disabled={Boolean(selected) || busy || !mediaReady} selectedAnswer={selected} correctAnswer={selected ? active.correct_answer : undefined} onAnswer={(key) => void answer(key)} /> : answers.map((item) => (
            <Pressable
              key={item.label}
              disabled={Boolean(selected) || busy || !mediaReady}
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
                  ? t("Dobra odpowiedź!")
                  : t("Sprawdź tę zasadę ponownie.")}
              </Text>
              <Text style={s.sub}>{t("Poprawna odpowiedź:")}{' '}{active.scope === "PODSTAWOWY" ? basicAnswerText(answers, active.correct_answer) : active.correct_answer}
              </Text>
              <ExplanationCard explanation={explanation} loading={explanationLoading} failed={explanationFailed} />
            </View>
          )}
          <View style={s.navigator}>
            <Pressable disabled={activeIndex <= 0 || busy} onPress={() => move(-1)} style={[s.navButton, activeIndex <= 0 && s.navButtonDisabled]}>
              <Text style={s.navButtonText}>{t("← Poprzednie")}</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => activeIndex >= batch.length - 1 ? void finish() : move(1)} style={s.navButton}>
              <Text style={s.navButtonText}>{activeIndex >= batch.length - 1 ? t("Podsumowanie") : t("Następne →")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{t("Nauka")}</Text>
        {actionError ? <Text accessibilityRole="alert" style={s.sub}>{t(actionError)}</Text> : null}
        <Text style={s.sub}>{categoryLabel(category)} {t("· wspólna z egzaminem")}</Text>
        {requestedTopic && <Text style={s.topicTitle}>{t(requestedTopic)}</Text>}
        {requestedSession && <View style={s.row}><Text style={s.badge}>{t("Błędy wybranego egzaminu")}</Text><Pressable accessibilityRole="button" style={s.endButton} onPress={() => router.setParams({ session: undefined })}><Text style={s.link}>{t("Wszystkie błędy")}</Text></Pressable></View>}
        {requestedSign ? <View style={s.row}><Text style={s.badge}>{t("Znak")} {requestedSign}</Text><Pressable onPress={() => { setActive(null); router.setParams({ sign: undefined }); }}><Text style={s.link}>{t("Usuń filtr znaku")}</Text></Pressable></View> : null}
        <Text style={s.sub}>
          {sessionLimit === 5
            ? t("Krótka sesja: 5 pytań o największej wadze.")
            : requestedSession ? t("Powtórz błędne i pominięte pytania tej próby.") : t("Losowa partia: do 12 pytań z wybranego zakresu.")}
        </Text>
        {!loading && !readError && !requestedTopic && !requestedSign ? (
          <View style={s.topicSection}>
            <Text style={s.topicTitle}>{t("Ucz się według działów")}</Text>
            {topics.map((topic) => (
              <Pressable key={topic.topic} onPress={() => router.setParams({ topic: topic.topic })} style={s.topicCard}>
                <View style={{ flex: 1 }}><Text style={s.topicName}>{t(topic.topic)}</Text><Text style={s.topicMeta}>{t("Opanowane")} {topic.mastered}/{topic.total} {t("· przerobione")} {topic.practiced}</Text></View>
                <Text style={s.link}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : requestedTopic ? (
          <Pressable onPress={() => router.setParams({ topic: undefined })}><Text style={s.link}>{t("← Wszystkie działy")}</Text></Pressable>
        ) : null}
        <TextInput
          accessibilityLabel={t("Szukaj w pytaniach")}
          onChangeText={setSearch}
          placeholder={t("Szukaj w pytaniach")}
          placeholderTextColor={colors.textSecondary}
          style={s.search}
          value={search}
        />
        <View style={s.filters}>
          {(
            [
              ["all", t("Wszystkie")],
              ["three", t("3 punkty")],
              ["hardest", t("Najtrudniejsze")],
              ["basic", t("Podstawowe")],
              ["specialist", t("Specjalistyczne")],
              ["mistakes", t("Błędy")],
              ["flags", t("Zapisane")],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFilter === key }}
              style={{ minHeight: 48, justifyContent: 'center' }}
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
        {activeFilter === "hardest" ? <Text style={s.sub}>{t("Najpierw pytania z największą liczbą pomyłek w nauce (co najmniej 2), następnie pozostałe pytania za 3 punkty.")}</Text> : null}
        {readError ? <LoadingError onRetry={() => setReload((value) => value + 1)} /> : loading ? <LoadingSkeleton variant="study" label={t("Wczytywanie działów i pytań")} /> : items.length ? (
          items.map((item) => (
            <Pressable key={item.id} onPress={() => open(item)} style={s.card}>
              <View style={s.row}>
                <Text style={s.badge}>{item.points} {t("pkt")}</Text>
                <Text style={s.scope}>{t(item.scope === 'PODSTAWOWY' ? 'Wiedza podstawowa' : 'Wiedza specjalistyczna')}</Text>
              </View>
              <Text style={s.question}>{item.question}</Text>
              <Text style={s.link}>{t("Otwórz pytanie →")}</Text>
            </Pressable>
          ))
        ) : (
          <View><Text style={s.empty}>{activeFilter === 'flags' ? t("Nie masz zapisanych pytań w tym zakresie.") : activeFilter === 'mistakes' ? t("Brak pytań do powtórki w tym zakresie.") : t("Brak pytań pasujących do wybranych filtrów.")}</Text>
          <Pressable accessibilityRole="button" style={s.endButton} onPress={() => { setSearch(''); setFilter('all'); router.setParams({ filter: 'all', topic: undefined, sign: undefined, session: undefined, count: undefined }); }}><Text style={s.link}>{t("Pokaż pytania kategorii")} {category}</Text></Pressable></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 48, gap: 12, maxWidth: 600, width: '100%', alignSelf: 'center' },
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
  topicMeta: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
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
  endButton: { minHeight: 48, justifyContent: 'center' },
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
