import { StyleSheet, Text, View } from "react-native";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import type { LearningProgress } from "@/database/learning-progress";

export function LearningRewards({ progress, category, part = 'summary' }: { progress: LearningProgress; category: string; part?: 'summary' | 'achievements' }) {
  const { colors } = useAppTheme();
  const s = styles(colors);
  const earned = new Set(progress.achievements.map((item) => item.id));
  const badges = [
    { id: 'first', title: 'Pierwszy krok', icon: '🎯', goal: 'Ukończ pierwszy egzamin próbny.' },
    { id: 'streak', title: 'W ogniu nauki', icon: '🔥', goal: 'Ucz się przez 3 kolejne dni.' },
    { id: 'perfect', title: 'Mistrz przepisów', icon: '🏆', goal: 'Uzyskaj 74/74 pkt w egzaminie próbnym.' },
    { id: 'signs', title: 'Ekspert znaków', icon: '🛑', goal: `Kat. ${category}: opanowane ${progress.signs.mastered}/${progress.signs.total} powiązanych pytań o znaki.` },
  ];
  return <View style={s.group}>
    {part === 'summary' ? <>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>🔥 Seria nauki: {progress.streak.current} dni</Text>
      <Text style={s.body}>Rekord: {progress.streak.best} dni · {progress.streak.todayActive ? 'Dzisiaj zaliczone' : 'Dzisiaj jeszcze przed Tobą'}</Text>
      <Text style={s.detail}>Dzień zalicza odpowiedź w Nauce lub ukończony egzamin. Seria obejmuje wszystkie kategorie, według czasu telefonu; błędna odpowiedź też jest nauką.</Text>
    </View>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>{progress.challengeComplete ? 'Wyzwanie 3 dni ukończone ✓' : `Wyzwanie: ${progress.challenge}/3 kolejnych dni`}</Text>
      <Text style={s.body}>{progress.correctToday}/5 poprawnych odpowiedzi w Nauce dzisiaj</Text>
      <Text style={s.detail}>Cel: po 5 poprawnych odpowiedzi przez 3 kolejne dni. To osobny cel, nie warunek utrzymania serii nauki.</Text>
    </View>
    </> : <>
    <Text accessibilityRole="header" style={s.heading}>Twoje osiągnięcia · {earned.size}/4</Text>
    {badges.map((badge) => <View key={badge.id} style={[s.card, earned.has(badge.id) && s.earned]}>
      <Text style={s.heading}>{badge.icon} {badge.title}</Text>
      <Text style={earned.has(badge.id) ? s.status : s.detail}>{earned.has(badge.id) ? 'Zdobyta ✓' : 'Jeszcze przed Tobą'}</Text>
      <Text style={s.body}>{badge.goal}</Text>
      {badge.id === 'signs' && <Text style={s.detail}>{progress.signs.total ? 'Opanowanie: 3 zaliczone poprawne powtórki, co najmniej 24 h między zaliczeniami. Błąd resetuje opanowanie pytania, ale nie zabiera zdobytej odznaki.' : 'Brak powiązanych pytań dla tej kategorii — odznaka nie jest przyznawana.'}</Text>}
    </View>)}
    <Text style={s.detail}>Zdobyte odznaki pozostają do resetu postępów. Odznaka znaków dotyczy wybranej kategorii i pytań powiązanych w aplikacji, nie całego katalogu znaków.</Text>
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
