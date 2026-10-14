import { useTranslation } from '@/hooks/use-translation';
import { t } from '@/domain/ui-copy';
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";

type Answer = { label: string; answer: string };
type Props = {
  answers: Answer[];
  disabled?: boolean;
  locked?: boolean;
  selectedAnswer?: string | null;
  correctAnswer?: string;
  neutral?: boolean;
  onAnswer?: (label: string) => void;
};

/** Display translated wording while keeping the ministerial T/N answer keys. */
export function basicAnswerText(answers: Answer[], key: string | null | undefined) {
  if (!key) return t("Brak odpowiedzi");
  return (answers.find((answer) => answer.label === key)?.answer ?? (key === "T" ? "Tak" : "Nie")).toLocaleUpperCase();
}

export function BasicAnswerButtons({ answers, disabled = false, locked = false, selectedAnswer, correctAnswer, neutral = false, onAnswer }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = styles(colors);
  const review = Boolean(correctAnswer);
  return <View style={s.container}>
    {locked ? <Text style={s.notice}>{t("Odpowiedzi zablokowane — trwa czytanie lub wideo.")}</Text> : null}
    <View style={s.row}>{["T", "N"].map((key) => {
      const selected = selectedAnswer === key;
      const correct = correctAnswer === key;
      const marks = [selected ? t("Twój wybór") : "", correct ? t("✓ Klucz MI") : ""].filter(Boolean).join(" · ");
      const unavailable = disabled || review || !onAnswer;
      return <Pressable key={key} accessibilityRole={review ? "text" : "button"}
        accessibilityLabel={[basicAnswerText(answers, key), marks].filter(Boolean).join(", ")}
        accessibilityState={{ disabled: unavailable, selected }} disabled={unavailable}
        onPress={() => { if (!unavailable) onAnswer?.(key); }}
        style={[s.button, key === "T" ? s.yes : s.no, neutral && s.neutral, selected && s.selected, neutral && selected && s.examSelected, review && correct && s.correct, review && selected && !correct && s.wrong, locked && s.locked]}>
        {neutral && !review ? <View accessible={false} style={[s.selectionRing, selected && s.selectionRingActive]}>
          {selected ? <View style={s.selectionDot} /> : null}
        </View> : null}
        <Text style={[s.label, key === "T" ? s.yesText : s.noText, neutral && s.neutralText, neutral && selected && s.examSelectedText, locked && s.lockedText]}>{basicAnswerText(answers, key)}</Text>
        {marks && (!neutral || review) ? <Text style={s.mark}>{marks}</Text> : null}
      </Pressable>;
    })}</View>
  </View>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  container: { gap: 12 }, row: { flexDirection: "row", flexWrap: 'wrap', gap: 12 },
  notice: { color: colors.textSecondary, lineHeight: 20 },
  button: { flex: 1, flexBasis: 120, minWidth: 120, minHeight: 80, padding: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderRadius: 16, gap: 8 },
  yes: { backgroundColor: colors.successSurface, borderColor: colors.success },
  no: { backgroundColor: colors.errorSurface, borderColor: colors.error },
  label: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  yesText: { color: colors.success }, noText: { color: colors.error },
  neutral: { backgroundColor: colors.surface, borderColor: colors.border }, neutralText: { color: colors.textPrimary },
  selected: { borderWidth: 4 }, correct: { backgroundColor: colors.successSurface, borderColor: colors.success },
  examSelected: { borderWidth: 4, borderColor: colors.selection, backgroundColor: colors.selectionSurface },
  examSelectedText: { color: colors.selectionText },
  selectionRing: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  selectionRingActive: { borderColor: colors.selection },
  selectionDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.selection },
  wrong: { backgroundColor: colors.errorSurface, borderColor: colors.error },
  mark: { color: colors.textPrimary, fontSize: 12, textAlign: "center", lineHeight: 18 },
  locked: { backgroundColor: colors.disabledSurface, borderColor: colors.border }, lockedText: { color: colors.textSecondary },
});
