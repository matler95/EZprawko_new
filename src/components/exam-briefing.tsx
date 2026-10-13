import { useTranslation } from '@/hooks/use-translation';
import { Modal, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { AppButton, AppCard, AppStatus } from '@/components/ui/app-controls';

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
      <AppCard><Text style={s.heading}>{t("32 pytania · 25 minut")}</Text><Text style={s.copy}>{t("Najpierw 20 pytań podstawowych TAK/NIE, następnie 12 specjalistycznych A/B/C.")}</Text></AppCard>
      <AppCard><Text style={s.heading}>{t("Próg: 68 z 74 punktów")}</Text><Text style={s.copy}>{t("Podstawowe: 20 s na zapoznanie i 15 s na odpowiedź. Specjalistyczne: 50 s. Brak odpowiedzi daje 0 punktów.")}</Text></AppCard>
      <AppCard tone="warning"><AppStatus tone="warning" message={t("Nie możesz wrócić do poprzedniego pytania. Wynik i poprawne odpowiedzi zobaczysz po zakończeniu próby.")} /></AppCard>
      {hasActiveExam ? <Text style={s.warningText}>{t("Masz próbę w toku. Rozpoczęcie nowej zastąpi tę próbę; anuluj, aby ją wznowić.")}</Text> : null}
      <Text style={s.copy}>{t('Materiały do następnej próby przygotowujemy wcześniej. Jeśli brakuje plików, dokończymy pobieranie przed uruchomieniem zegara.')}</Text>
      {starting ? <Text accessibilityLiveRegion="polite" style={s.copy}>{committing ? t("Materiały przygotowane. Zapisujemy i uruchamiamy próbę…") : progress ? t("Materiały: {0}/{1}. Zegar jeszcze nie działa.", [progress.completed, progress.total]) : t("Losujemy pytania i przygotowujemy materiały. Zegar jeszcze nie działa.")}</Text> : null}
      {error ? <AppStatus tone="error" message={t(error)} /> : null}
      {error && onSettings ? <AppButton variant="link" label={t("Przejdź do konta i multimediów")} onPress={onSettings} /> : null}
      <AppButton busy={starting} label={starting ? t("Przygotowujemy egzamin…") : t("Rozpocznij egzamin próbny")} onPress={onStart} />
      <AppButton variant="link" disabled={committing} label={committing ? t("Uruchamianie próby…") : starting ? t("Przerwij przygotowanie") : t("Anuluj i wróć do panelu")} onPress={onCancel} />
    </ScrollView></SafeAreaView>
  </Modal>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: 24, gap: 16 },
  kicker: { color: colors.primaryText, fontWeight: "700", marginTop: 16 }, title: { color: colors.textPrimary, fontSize: 30, fontWeight: "700" },
  copy: { color: colors.textSecondary, lineHeight: 22 }, heading: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  warningText: { color: colors.warning, lineHeight: 22 },
});
