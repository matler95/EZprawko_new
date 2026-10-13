import { useTranslation } from '@/hooks/use-translation';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";

export function ExamBriefing({ visible, category, hasActiveExam, starting, committing = false, progress, error, onCancel, onSettings, onStart }: {
  visible: boolean; category: string; hasActiveExam: boolean; starting: boolean;
  error: string | null; onCancel: () => void; onStart: () => void;
  progress?: { completed: number; total: number } | null; onSettings?: () => void;
  committing?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = styles(colors);
  return <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!committing) onCancel(); }}>
    <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
      <Text style={s.kicker}>{t("ODPRAWA · KATEGORIA")} {category}</Text>
      <Text style={s.title}>{t("Zanim rozpoczniesz")}</Text>
      <Text style={s.copy}>{t("To egzamin próbny w EZprawko, nie państwowy egzamin WORD.")}</Text>
      <View style={s.card}><Text style={s.heading}>{t("32 pytania · 25 minut")}</Text><Text style={s.copy}>{t("Najpierw 20 pytań podstawowych TAK/NIE, następnie 12 specjalistycznych A/B/C.")}</Text></View>
      <View style={s.card}><Text style={s.heading}>{t("Próg: 68 z 74 punktów")}</Text><Text style={s.copy}>{t("Podstawowe: 20 s na zapoznanie i 15 s na odpowiedź. Specjalistyczne: 50 s. Brak odpowiedzi daje 0 punktów.")}</Text></View>
      <View style={s.warning}><Text style={s.warningText}>{t("Nie możesz wrócić do poprzedniego pytania. Wynik i poprawne odpowiedzi zobaczysz po zakończeniu próby.")}</Text></View>
      {hasActiveExam ? <Text style={s.warningText}>{t("Masz próbę w toku. Rozpoczęcie nowej zastąpi tę próbę; anuluj, aby ją wznowić.")}</Text> : null}
      <Text style={s.copy}>{t('Materiały do następnej próby przygotowujemy wcześniej. Jeśli brakuje plików, dokończymy pobieranie przed uruchomieniem zegara.')}</Text>
      {starting ? <Text accessibilityLiveRegion="polite" style={s.copy}>{committing ? t("Materiały przygotowane. Zapisujemy i uruchamiamy próbę…") : progress ? t("Materiały: {0}/{1}. Zegar jeszcze nie działa.", [progress.completed, progress.total]) : t("Losujemy pytania i przygotowujemy materiały. Zegar jeszcze nie działa.")}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={s.error}>{t(error)}</Text> : null}
      {error && onSettings ? <Pressable accessibilityRole="button" style={s.cancel} onPress={onSettings}><Text style={s.link}>{t("Przejdź do konta i multimediów")}</Text></Pressable> : null}
      <Pressable accessibilityRole="button" disabled={starting} style={[s.cta, starting && s.disabled]} onPress={onStart}><Text style={s.ctaText}>{starting ? t("Przygotowujemy egzamin…") : t("Rozpocznij egzamin próbny")}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={committing} style={s.cancel} onPress={onCancel}><Text style={s.link}>{committing ? t("Uruchamianie próby…") : starting ? t("Przerwij przygotowanie") : t("Anuluj i wróć do panelu")}</Text></Pressable>
    </ScrollView></SafeAreaView>
  </Modal>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: 24, gap: 16 },
  kicker: { color: colors.primaryText, fontWeight: "700", marginTop: 16 }, title: { color: colors.textPrimary, fontSize: 30, fontWeight: "700" },
  copy: { color: colors.textSecondary, lineHeight: 22 }, heading: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  card: { backgroundColor: colors.surface, padding: 24, borderRadius: 20, gap: 8 },
  warning: { backgroundColor: colors.warningSurface, borderRadius: 16, padding: 16 }, warningText: { color: colors.warning, lineHeight: 22 },
  error: { color: colors.error, lineHeight: 22 }, cta: { backgroundColor: colors.primary, minHeight: 58, borderRadius: 16, alignItems: "center", justifyContent: "center", padding: 16, marginTop: 8 },
  ctaText: { color: colors.onPrimary, fontWeight: "700", textAlign: "center" }, cancel: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  link: { color: colors.primaryText, fontWeight: "700" }, disabled: { opacity: 0.65 },
});
