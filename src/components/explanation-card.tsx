import { useTranslation } from '@/hooks/use-translation';
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import type { QuestionExplanation } from "@/database/explanations";

export function ExplanationCard({ explanation, loading = false, failed = false, onRetry }: { explanation: QuestionExplanation | null; loading?: boolean; failed?: boolean; onRetry?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = styles(colors);
  if (!loading && !failed && !explanation) return <Text style={s.copy}>{t('Do tego pytania nie ma jeszcze zweryfikowanego wyjaśnienia. Klucz odpowiedzi pochodzi z bazy ministerialnej.')}</Text>;
  return <View style={s.card}>
    <Text style={s.title}>{t("Dlaczego ta odpowiedź jest poprawna?")}</Text>
    {loading ? <Text accessibilityLiveRegion="polite" style={s.copy}>{t("Wczytujemy wyjaśnienie…")}</Text> : failed ? <>
      <Text accessibilityRole="alert" style={s.copy}>{t('Nie udało się wczytać wyjaśnienia. Spróbuj ponownie.')}</Text>
      {onRetry && <Pressable accessibilityRole="button" style={s.source} onPress={onRetry}><Text style={s.retry}>{t('Spróbuj ponownie')}</Text></Pressable>}
    </> : !explanation ? <Text style={s.copy}>{t("Do tego pytania nie ma jeszcze zweryfikowanego wyjaśnienia. Klucz odpowiedzi pochodzi z bazy ministerialnej.")}</Text> : <>
      <Text style={s.copy}>{explanation.explanationText}</Text>
      <Text style={s.meta}>{t("Wyjaśnienie w języku polskim")}</Text>
      <Text style={s.copy}>{t("Podstawa prawna:")} {explanation.legalBasis ?? t("nieuzupełniona w starszym rekordzie")}</Text>
      {explanation.sourceUrl ? <Link href={explanation.sourceUrl as `https://${string}`} style={s.source}>{t("Otwórz źródło urzędowe ↗")}</Link> : null}
    </>}
  </View>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, marginTop: 12 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", lineHeight: 24 },
  copy: { color: colors.textSecondary, lineHeight: 22 }, meta: { color: colors.textSecondary, fontSize: 12 },
  source: { color: colors.primaryText, minHeight: 48, paddingVertical: 12, fontWeight: "700" },
  retry: { color: colors.primaryText, fontWeight: '700' },
});
