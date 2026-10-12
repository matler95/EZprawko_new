import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const [weak, setWeak] = useState<
    { scope: string; attempted: number; correct: number }[]
  >([]);
  const [weakByCategory, setWeakByCategory] = useState<WeakCategory[]>([]);
  useEffect(() => {
    recentExams(db).then(setHistory);
    weakAreas(db).then(setWeak);
    weakCategories(db).then(setWeakByCategory);
  }, [db]);
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Postęp</Text>
        <Text style={s.sub}>Wyniki i obszary do powtórki.</Text>
        <View style={s.metric}>
          <Text style={s.big}>
            {history.length
              ? Math.round(
                  history.reduce((sum, item) => sum + item.score, 0) /
                    history.length,
                )
              : "—"}
          </Text>
          <Text style={{ color: colors.onPrimary }}>średni wynik z egzaminów</Text>
        </View>
        <Text style={s.heading}>Trend wyników</Text>
        {history.length ? (
          <View style={s.chart}>
            {history
              .slice(0, 7)
              .reverse()
              .map((item) => (
                <View key={item.id} style={s.barWrap}>
                  <View
                    style={[
                      s.bar,
                      {
                        height: Math.max(8, (item.score / 74) * 120),
                        backgroundColor: item.passed ? colors.accentGold : colors.error,
                      },
                    ]}
                  />
                  <Text style={s.barLabel}>{item.score}</Text>
                </View>
              ))}
          </View>
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
              <Text style={{ color: colors.textPrimary }}>Kat. {item.category}</Text>
              <Text style={s.score}>
                {item.score}/74 {item.passed ? "✓" : "—"}
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
  chart: {
    height: 154,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  bar: { width: "100%", maxWidth: 26, borderRadius: 8 },
  barLabel: { fontSize: 11, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  score: { fontWeight: "700", color: colors.primaryText },
  cardDetail: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  empty: { color: colors.textSecondary, paddingVertical: 16 },
});
