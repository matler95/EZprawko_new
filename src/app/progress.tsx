import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingError, LoadingSkeleton } from "@/components/skeleton";
import { ExamScoreChart } from "@/components/exam-score-chart";
import { bankProgress, type BankProgress } from "@/database/bank-progress";
import { coveragePercent, examDateLabels } from "@/domain/progress-presentation";
import {
  recentExams,
  weakCategories,
  weakAreas,
  type ExamHistoryItem,
  type WeakCategory,
} from "@/database/repository";

export default function ProgressScreen() {
  const { colors } = useAppTheme();
  const s = createStyles(colors);
  const db = useSQLiteContext();
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [coverage, setCoverage] = useState<BankProgress>({ total: 0, answered: 0 });
  const [weak, setWeak] = useState<
    { scope: string; attempted: number; correct: number }[]
  >([]);
  const [weakByCategory, setWeakByCategory] = useState<WeakCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedRevision, setFailedRevision] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const readError = failedRevision === reload;
  useFocusEffect(useCallback(() => {
    let current = true;
    setLoading(true);
    setFailedRevision(null);
    void Promise.all([recentExams(db), weakAreas(db), weakCategories(db), bankProgress(db)]).then(([nextHistory, nextWeak, nextCategories, nextCoverage]) => {
      if (!current) return;
      setHistory(nextHistory); setWeak(nextWeak); setWeakByCategory(nextCategories);
      setCoverage(nextCoverage);
    }).catch(() => { if (current) setFailedRevision(reload); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [db, reload]));
  if (loading || readError) return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <Text style={s.title}>Postęp</Text>
    {loading ? <LoadingSkeleton variant="progress" label="Wczytywanie wyników i historii" /> : <LoadingError onRetry={() => setReload((value) => value + 1)} />}
  </ScrollView></SafeAreaView>;
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Postęp</Text>
        <Text style={s.sub}>Wyniki i obszary do powtórki.</Text>
        <View style={s.coverage}>
          <Text style={s.heading}>Przerobiona baza</Text>
          <Text style={s.coverageNumber}>{coveragePercent(coverage.answered, coverage.total)}%</Text>
          <Text style={{ color: colors.textPrimary }}>Przerobiono {coverage.answered.toLocaleString("pl-PL")} z {coverage.total.toLocaleString("pl-PL")} pytań</Text>
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Przerobiona baza pytań" accessibilityValue={{ min: 0, max: coverage.total, now: coverage.answered, text: `${coveragePercent(coverage.answered, coverage.total)} procent` }} style={s.coverageTrack}>
            <View style={[s.coverageFill, { width: `${coveragePercent(coverage.answered, coverage.total)}%` }]} />
          </View>
          <Text style={s.cardDetail}>Cała baza, wszystkie kategorie. Unikalne pytania z odpowiedzią w Nauce lub ukończonym egzaminie — nie oznacza opanowania materiału.</Text>
        </View>
        <View style={s.metric}>
          <Text style={s.big}>
            {history.length
              ? Math.round(
                  history.reduce((sum, item) => sum + item.score, 0) /
                    history.length,
                )
              : "—"}
          </Text>
          <Text style={{ color: colors.onPrimary }}>średni wynik z ostatnich {history.length} egzaminów</Text>
        </View>
        <Text style={s.heading}>Trend wyników</Text>
        {history.length ? (
          <ExamScoreChart history={history} />
        ) : (
          <Text style={s.empty}>Wykres pojawi się po pierwszym egzaminie.</Text>
        )}
        <Text style={s.heading}>Słabsze obszary</Text>
        {weak.map((item) => (
          <View key={item.scope} style={s.card}>
            <Text style={{ color: colors.textPrimary }}>{item.scope}</Text>
            <Text style={s.score}>
              {item.attempted
                ? Math.round((item.correct / item.attempted) * 100)
                : 0}
              %
            </Text>
          </View>
        ))}
        <Text style={s.heading}>Kategorie do utrwalenia</Text>
        {weakByCategory.length ? (
          weakByCategory.slice(0, 3).map((item) => (
            <View key={item.category} style={s.card}>
              <View>
                <Text style={{ color: colors.textPrimary }}>Kategoria {item.category}</Text>
                <Text style={s.cardDetail}>{item.attempted} odpowiedzi w nauce</Text>
              </View>
              <Text style={s.score}>
                {Math.round((item.correct / item.attempted) * 100)}%
              </Text>
            </View>
          ))
        ) : (
          <Text style={s.empty}>
            Odpowiedz na kilka pytań w trybie Nauka, aby zobaczyć wskazówki.
          </Text>
        )}
        <Text style={s.heading}>Historia</Text>
        {history.length ? (
          history.map((item) => (
            <View key={item.id} style={s.card}>
              <View style={s.historyDetail}>
                <Text style={{ color: colors.textPrimary }}>Kat. {item.category}</Text>
                <Text style={s.cardDetail}>{examDateLabels(item.completedAt).date}.{examDateLabels(item.completedAt).year} · {examDateLabels(item.completedAt).time}</Text>
              </View>
              <Text style={s.score}>
                {item.score}/74 {item.passed ? "Zdany" : "Niezdany"}
              </Text>
            </View>
          ))
        ) : (
          <Text style={s.empty}>
            Ukończ pierwszy egzamin, aby zobaczyć historię.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: "700", color: colors.textPrimary },
  sub: { color: colors.textSecondary },
  metric: {
    backgroundColor: colors.primary,
    padding: 24,
    borderRadius: 24,
    marginVertical: 12,
  },
  big: { fontSize: 40, color: colors.onPrimary, fontWeight: "800" },
  heading: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 12 },
  coverage: { backgroundColor: colors.surface, padding: 24, borderRadius: 24, gap: 12 },
  coverageNumber: { fontSize: 40, color: colors.primaryText, fontWeight: "700", fontVariant: ["tabular-nums"] },
  coverageTrack: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: "hidden" },
  coverageFill: { height: 8, backgroundColor: colors.primaryText },
  historyDetail: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  score: { fontWeight: "700", color: colors.primaryText },
  cardDetail: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  empty: { color: colors.textSecondary, paddingVertical: 16 },
});
