import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";

export function ExamBriefing({ visible, category, hasActiveExam, starting, error, onCancel, onStart }: {
  visible: boolean; category: string; hasActiveExam: boolean; starting: boolean;
  error: string | null; onCancel: () => void; onStart: () => void;
}) {
  const { colors } = useAppTheme();
  const s = styles(colors);
  return <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!starting) onCancel(); }}>
    <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
      <Text style={s.kicker}>ODPRAWA · KATEGORIA {category}</Text>
      <Text style={s.title}>Zanim rozpoczniesz</Text>
      <Text style={s.copy}>To egzamin próbny w EZprawko, nie państwowy egzamin WORD.</Text>
      <View style={s.card}><Text style={s.heading}>32 pytania · 25 minut</Text><Text style={s.copy}>Najpierw 20 pytań podstawowych TAK/NIE, następnie 12 specjalistycznych A/B/C.</Text></View>
      <View style={s.card}><Text style={s.heading}>Próg: 68 z 74 punktów</Text><Text style={s.copy}>Podstawowe: 20 s na zapoznanie i 15 s na odpowiedź. Specjalistyczne: 50 s. Brak odpowiedzi daje 0 punktów.</Text></View>
      <View style={s.warning}><Text style={s.warningText}>Nie możesz wrócić do poprzedniego pytania. Wynik i poprawne odpowiedzi zobaczysz po zakończeniu próby.</Text></View>
      {hasActiveExam ? <Text style={s.warningText}>Masz próbę w toku. Rozpoczęcie nowej zastąpi tę próbę; anuluj, aby ją wznowić.</Text> : null}
      <Text style={s.copy}>Zegar ruszy dopiero po naciśnięciu przycisku poniżej.</Text>
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={starting} style={[s.cta, starting && s.disabled]} onPress={onStart}><Text style={s.ctaText}>{starting ? "Przygotowujemy egzamin…" : "Rozpocznij egzamin próbny"}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={starting} style={s.cancel} onPress={onCancel}><Text style={s.link}>Anuluj i wróć do panelu</Text></Pressable>
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
