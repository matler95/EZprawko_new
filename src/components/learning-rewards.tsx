import { useTranslation } from '@/hooks/use-translation';
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import type { LearningProgress } from "@/database/learning-progress";

export function LearningRewards({ progress, category, part = 'summary' }: { progress: LearningProgress; category: string; part?: 'summary' | 'achievements' }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = styles(colors);
  const earned = new Set(progress.achievements.map((item) => item.id));
  const badges = [
    { id: 'first', title: t("Pierwszy krok"), icon: '🎯', goal: t("Ukończ pierwszy egzamin próbny.") },
    { id: 'streak', title: t("W ogniu nauki"), icon: '🔥', goal: t("Ucz się przez 3 kolejne dni.") },
    { id: 'perfect', title: t("Mistrz przepisów"), icon: '🏆', goal: t("Uzyskaj 74/74 pkt w egzaminie próbnym.") },
    { id: 'signs', title: t("Ekspert znaków"), icon: '🛑', goal: t("Kat. {0}: opanowane {1}/{2} powiązanych pytań o znaki.", [category, progress.signs.mastered, progress.signs.total]) },
  ];
  return <View style={s.group}>
    {part === 'summary' ? <>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>{t("🔥 Seria nauki:")} {progress.streak.current} {t("dni")}</Text>
      <Text style={s.body}>{t("Rekord:")} {progress.streak.best} {t("dni ·")} {progress.streak.todayActive ? t("Dzisiaj zaliczone") : t("Dzisiaj jeszcze przed Tobą")}</Text>
      <Text style={s.detail}>{t("Dzień zalicza odpowiedź w Nauce lub ukończony egzamin. Seria obejmuje wszystkie kategorie, według czasu telefonu; błędna odpowiedź też jest nauką.")}</Text>
    </View>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>{progress.challengeComplete ? t("Wyzwanie 3 dni ukończone ✓") : `Wyzwanie: ${progress.challenge}/3 kolejnych dni`}</Text>
      <Text style={s.body}>{progress.correctToday}{t("/5 poprawnych odpowiedzi w Nauce dzisiaj")}</Text>
      <Text style={s.detail}>{t("Cel: po 5 poprawnych odpowiedzi przez 3 kolejne dni. To osobny cel, nie warunek utrzymania serii nauki.")}</Text>
    </View>
    </> : <>
    <Text accessibilityRole="header" style={s.heading}>{t("Twoje osiągnięcia ·")} {earned.size}/4</Text>
    {badges.map((badge) => <View key={badge.id} style={[s.card, earned.has(badge.id) && s.earned]}>
      <Text style={s.heading}>{badge.icon} {badge.title}</Text>
      <Text style={earned.has(badge.id) ? s.status : s.detail}>{earned.has(badge.id) ? t("Zdobyta ✓") : t("Jeszcze przed Tobą")}</Text>
      <Text style={s.body}>{badge.goal}</Text>
      {badge.id === 'signs' && <Text style={s.detail}>{progress.signs.total ? t("Opanowanie: 3 zaliczone poprawne powtórki, co najmniej 24 h między zaliczeniami. Błąd resetuje opanowanie pytania, ale nie zabiera zdobytej odznaki.") : t("Brak powiązanych pytań dla tej kategorii — odznaka nie jest przyznawana.")}</Text>}
    </View>)}
    <Text style={s.detail}>{t("Zdobyte odznaki pozostają do resetu postępów. Odznaka znaków dotyczy wybranej kategorii i pytań powiązanych w aplikacji, nie całego katalogu znaków.")}</Text>
    </>}
  </View>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  group: { gap: 12, marginTop: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 8 },
  earned: { borderWidth: 1, borderColor: colors.success },
  heading: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  body: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  detail: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  status: { color: colors.success, fontSize: 14, fontWeight: '700' },
});
