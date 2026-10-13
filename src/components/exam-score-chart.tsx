import { useTranslation } from '@/hooks/use-translation';
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import type { ExamHistoryItem } from "@/database/repository";
import { examDateLabels, scoreHeight, SCORE_MAX, SCORE_PASS, SCORE_PLOT_HEIGHT } from "@/domain/progress-presentation";

export function ExamScoreChart({ history }: { history: ExamHistoryItem[] }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = styles(colors);
  const attempts = history.slice(0, 7).reverse();
  return <View style={s.card}>
    <Text style={s.legend}>{t("Próg zaliczenia:")} {SCORE_PASS}/{SCORE_MAX} {t("pkt")}</Text>
    <Text style={s.detail}>{t("Ostatnie")} {attempts.length} {t("podejść · od najstarszego · czas lokalny")}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel={t("Wykres ostatnich wyników egzaminu")}>
      <View style={s.columns}>
        {attempts.map((item) => {
          const date = examDateLabels(item.completedAt);
          return <View key={item.id} style={s.column} accessible accessibilityLabel={t('Kategoria {0}, {1}.{2}, godzina {3}, {4} z {5} punktów, {6}', [item.category, date.date, date.year, date.time, item.score, SCORE_MAX, item.passed ? t('Zdany') : t('Niezdany')])}>
            <Text style={s.score}>{item.score}/{SCORE_MAX}</Text>
            <View style={s.plot}>
              <View style={[s.bar, { height: scoreHeight(item.score), backgroundColor: item.passed ? colors.success : colors.error }]} />
              <View pointerEvents="none" style={s.threshold} />
            </View>
            <Text style={s.date}>{date.date}</Text>
            <Text style={s.detail}>{date.year}</Text>
            <Text style={s.detail}>{date.time}</Text>
            <Text style={s.detail}>{t("Kat.")} {item.category} · {item.passed ? t("Zdany") : t("Niezdany")}</Text>
          </View>;
        })}
      </View>
    </ScrollView>
    <Text style={s.detail}>{t("Linia przerywana = 68 pkt · skala 0–74 pkt. Przesuń wykres, aby zobaczyć kolejne wyniki.")}</Text>
  </View>;
}

const styles = (colors: AppTheme) => StyleSheet.create({
  card: { padding: 16, gap: 12, backgroundColor: colors.surface, borderRadius: 16 },
  legend: { color: colors.primaryText, fontWeight: "700" },
  detail: { color: colors.textSecondary, fontSize: 12 },
  columns: { flexDirection: "row", paddingVertical: 8 },
  column: { width: 112, alignItems: "center", gap: 4 },
  score: { color: colors.textPrimary, fontWeight: "700", fontVariant: ["tabular-nums"] },
  plot: { height: SCORE_PLOT_HEIGHT, width: "100%", justifyContent: "flex-end", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.textSecondary },
  bar: { width: 32, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  threshold: { position: "absolute", left: 0, right: 0, bottom: scoreHeight(SCORE_PASS), borderTopWidth: 2, borderStyle: "dashed", borderColor: colors.primaryText },
  date: { color: colors.textPrimary, fontSize: 14, marginTop: 4 },
});
