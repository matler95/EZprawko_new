import { useTranslation } from '@/hooks/use-translation';
import { useState } from 'react';
import { AppButton } from '@/components/ui/app-controls';
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
    </> : !explanation ? <Text style={s.copy}>{t("Do tego pytania nie ma jeszcze zweryfikowanego wyjaśnienia. Klucz odpowiedzi pochodzi z bazy ministerialnej.")}</Text> : <ReviewedExplanation explanation={explanation} />}
  </View>;
}

// Mounted only for resolved content. Loading/retry removes the disclosure state.
function ReviewedExplanation({ explanation }: { explanation: QuestionExplanation }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = styles(colors);
  const [expanded, setExpanded] = useState(false);
  return <View style={s.content}>
    <Text style={s.copy}>{explanation.explanationText}</Text>
    <Text style={s.meta}>{t('Wyjaśnienie w języku polskim')}</Text>
    <AppButton variant='link' label={t(expanded ? 'Ukryj podstawę prawną i źródło' : 'Pokaż podstawę prawną i źródło')}
      accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} />
    {expanded && <View style={s.content}>
      <Text style={s.copy}>{t('Podstawa prawna:')} {explanation.legalBasis ?? t('nieuzupełniona w starszym rekordzie')}</Text>
      {explanation.sourceUrl ? <Link asChild href={explanation.sourceUrl as `https://${string}`}>
        <Pressable accessibilityRole='link' style={s.source}><Text style={s.retry}>{t('Otwórz źródło urzędowe ↗')}</Text></Pressable>
      </Link> : null}
    </View>}
  </View>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, marginTop: 12 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", lineHeight: 24 },
  content: { gap: 12 },
  copy: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 }, meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  source: { color: colors.primaryText, minHeight: 48, paddingVertical: 12, fontWeight: "700" },
  retry: { color: colors.primaryText, fontSize: 16, lineHeight: 24, fontWeight: '700' },
});
