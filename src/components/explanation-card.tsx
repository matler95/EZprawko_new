import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import type { QuestionExplanation } from "@/database/explanations";

export function ExplanationCard({ explanation, loading = false, failed = false }: { explanation: QuestionExplanation | null; loading?: boolean; failed?: boolean }) {
  const { colors } = useAppTheme();
  const s = styles(colors);
  return <View style={s.card}>
    <Text style={s.title}>Dlaczego ta odpowiedź jest poprawna?</Text>
    {loading ? <Text style={s.copy}>Wczytujemy wyjaśnienie…</Text> : failed ? <Text style={s.copy}>Nie udało się wczytać wyjaśnienia. Otwórz pytanie ponownie.</Text> : !explanation ? <Text style={s.copy}>Do tego pytania nie ma jeszcze zweryfikowanego wyjaśnienia. Klucz odpowiedzi pochodzi z bazy ministerialnej.</Text> : <>
      <Text style={s.copy}>{explanation.explanationText}</Text>
      <Text style={s.meta}>Wyjaśnienie w języku polskim</Text>
      <Text style={s.copy}>Podstawa prawna: {explanation.legalBasis ?? "nieuzupełniona w starszym rekordzie"}</Text>
      {explanation.sourceUrl ? <Link href={explanation.sourceUrl as `https://${string}`} style={s.source}>Otwórz źródło urzędowe ↗</Link> : null}
    </>}
  </View>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, marginTop: 12 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", lineHeight: 24 },
  copy: { color: colors.textSecondary, lineHeight: 22 }, meta: { color: colors.textSecondary, fontSize: 12 },
  source: { color: colors.primaryText, minHeight: 48, paddingVertical: 12, fontWeight: "700" },
});
