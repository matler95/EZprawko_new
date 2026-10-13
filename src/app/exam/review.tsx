import { useTranslation } from '@/hooks/use-translation';
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QuestionMedia } from "@/components/question-media";
import { BasicAnswerButtons, basicAnswerText } from "@/components/basic-answer-buttons";
import { examReview, type ExamReview, type ExamReviewQuestion } from "@/database/repository";
import { QuestionExplanation } from '@/components/question-explanation';
import { useTargetCategory } from '@/context/target-category-context';
import { isDrivingCategory } from '@/domain/driving-categories';

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
};

export default function ExamReviewScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const db = useSQLiteContext();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [review, setReview] = useState<ExamReview | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const { setCategory } = useTargetCategory();
  const navigationLock = useRef(false);
  const [selected, setSelected] = useState<ExamReviewQuestion | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let current = true;
    void examReview(db, sessionId).then(value => { if (current) { setReview(value); setFailed(!value); } })
      .catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [db, sessionId, reload]);

  const diagnosis = useMemo(() => {
    if (!review) return null;
    const incorrect = review.questions.filter((item) => !item.isCorrect);
    const lostHighPoints = incorrect
      .filter((item) => item.points === 3)
      .reduce((total, item) => total + item.points, 0);
    const basicHigh = incorrect.filter(
      (item) => item.points === 3 && item.scope === "PODSTAWOWY",
    ).length;
    return { incorrect: incorrect.length, lostHighPoints, basicHigh };
  }, [review]);

  if (!review) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><Text style={styles.muted}>{!sessionId || failed ? t("Nie udało się otworzyć wyniku tej próby.") : t("Wczytujemy podsumowanie…")}</Text>
          {sessionId && failed && <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => setReload(value => value + 1)}><Text style={styles.primaryButtonText}>{t("Spróbuj ponownie")}</Text></Pressable>}
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.replace('/')}><Text style={styles.primaryButtonText}>{t("Wróć do panelu")}</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView accessibilityElementsHidden={Boolean(selected)} importantForAccessibility={selected ? 'no-hide-descendants' : 'auto'} contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" style={styles.backButton} onPress={() => router.replace("/")}><Text style={styles.back}>{t("← Panel główny")}</Text></Pressable>
        <Text accessibilityRole="header" style={styles.kicker}>{t("PODSUMOWANIE EGZAMINU")}</Text>
        <View style={[styles.hero, review.passed ? styles.heroPassed : styles.heroFailed]}>
          <Text style={styles.verdict}>{review.passed ? t("POZYTYWNY") : t("NEGATYWNY")}</Text>
          <Text accessibilityLabel={t('Wynik egzaminu: {0} z 74 punktów', [review.score])} style={styles.score}>{review.score}/74</Text>
          <Text style={styles.heroCopy}>{t("Kategoria")} {review.category} {t("· czas")} {formatDuration(review.durationSeconds)}</Text>
        </View>

        {diagnosis ? (
          <View style={styles.diagnosis}>
            <Text style={styles.diagnosisTitle}>{t("Co warto powtórzyć")}</Text>
            <Text style={styles.diagnosisCopy}>
              {diagnosis.incorrect === 0
                ? t("Perfekcyjna próba — nie masz pytań do powtórki.")
                : t('Stracono {0} pkt w pytaniach za 3 punkty. Błędy w części podstawowej za 3 pkt: {1}.', [diagnosis.lostHighPoints, diagnosis.basicHigh])}
            </Text>
            {!review.passed ? <Text style={styles.diagnosisCopy}>{t("Do zaliczenia zabrakło")} {68 - review.score} {t("pkt.")}</Text> : null}
          </View>
        ) : null}

        <Text accessibilityRole="header" style={styles.section}>{t("Twoje odpowiedzi")}</Text>
        <Text style={styles.muted}>{t("Dotknij numeru, aby zobaczyć treść i porównać odpowiedzi.")}</Text>
        <View style={styles.grid}>
          {review.questions.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Pytanie {0}, {1}', [item.position + 1, item.isCorrect ? t('poprawna odpowiedź') : item.selectedAnswer ? t('błędna odpowiedź') : t('bez odpowiedzi')])}
              key={item.id}
              onPress={() => setSelected(item)}
              style={[
                styles.tile,
                item.isCorrect ? styles.tileCorrect : item.selectedAnswer ? styles.tileWrong : styles.tileSkipped,
              ]}
            >
              <Text style={styles.tileText}>{item.position + 1} {item.isCorrect ? '✓' : item.selectedAnswer ? '×' : '—'}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendCorrect}>{t("● poprawna")}</Text><Text style={styles.legendWrong}>{t("● błędna")}</Text><Text style={styles.legendSkipped}>{t("● brak odpowiedzi")}</Text>
        </View>
        {diagnosis && diagnosis.incorrect > 0 && <Pressable accessibilityRole="button" onPress={() => {
          if (navigationLock.current || !isDrivingCategory(review.category)) return;
          navigationLock.current = true;
          void setCategory(review.category).then(saved => {
            if (saved) router.navigate({ pathname: '/study', params: { filter: 'mistakes', session: review.id, topic: undefined, sign: undefined, count: undefined, start: '1' } });
            else setFailed(true);
          }).finally(() => { navigationLock.current = false; });
        }} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{t("Powtórz błędy tej próby · kat.")} {review.category}</Text>
        </Pressable>}
        {failed && <Text accessibilityRole="alert" style={styles.muted}>{t("Nie udało się rozpocząć powtórki. Spróbuj ponownie.")}</Text>}
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setSelected(null)} transparent visible={Boolean(selected)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={() => setSelected(null)} style={styles.sheet}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Zamknij podgląd pytania')} onPress={() => setSelected(null)} style={styles.closeButton}><Text style={styles.close}>×</Text></Pressable>
            {selected ? (
              <ScrollView contentContainerStyle={styles.sheetContent}>
                <Text style={styles.kicker}>{t("PYTANIE")} {selected.position + 1} · {selected.points} {t("PKT")}</Text>
                <QuestionMedia filename={selected.mediaFilename} />
                <Text style={styles.question}>{selected.question}</Text>
                {selected.contentLanguage !== review.language ? <Text style={styles.muted}>{t("Brak oficjalnego tłumaczenia — pytanie w języku polskim.")}</Text> : null}
                {selected.scope === "PODSTAWOWY" ? <BasicAnswerButtons answers={selected.answers} selectedAnswer={selected.selectedAnswer} correctAnswer={selected.correctAnswer} /> : selected.answers.map((answer) => {
                  const wasSelected = selected.selectedAnswer === answer.label;
                  const isCorrect = selected.correctAnswer === answer.label;
                  return (
                    <View accessible accessibilityLabel={[answer.label, answer.answer, wasSelected ? t('Twój wybór') : '', isCorrect ? t('✓ Klucz MI') : ''].filter(Boolean).join(', ')} key={answer.label} style={[styles.answer, isCorrect && styles.answerCorrect, wasSelected && !isCorrect && styles.answerWrong]}>
                      <Text style={styles.answerLetter}>{answer.label}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.answerText}>{answer.answer}</Text>
                        {isCorrect ? <Text style={styles.answerMark}>{t('✓ Klucz MI')}</Text> : null}
                        {wasSelected ? <Text style={styles.muted}>{t('Twój wybór')}</Text> : null}
                      </View>
                    </View>
                  );
                })}
                <Text style={styles.answerSummary}>
                  {selected.selectedAnswer ? t("Twoja odpowiedź: {0}", [selected.scope === "PODSTAWOWY" ? basicAnswerText(selected.answers, selected.selectedAnswer) : selected.selectedAnswer]) : t("Nie udzielono odpowiedzi")} {t("· poprawna:")} {selected.scope === "PODSTAWOWY" ? basicAnswerText(selected.answers, selected.correctAnswer) : selected.correctAnswer}
                </Text>
                <QuestionExplanation key={selected.id} questionId={selected.id} />
              </ScrollView>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { padding: 24, paddingBottom: 48, maxWidth: 600, width: '100%', alignSelf: 'center' },
  back: { color: colors.primaryText, fontWeight: "800" },
  backButton: { minHeight: 48, justifyContent: 'center', marginBottom: 16 },
  kicker: { color: colors.primaryText, fontSize: 11, fontWeight: "800", letterSpacing: 0.9 },
  hero: { borderRadius: 24, marginTop: 12, padding: 24 },
  heroPassed: { backgroundColor: colors.brandSurface }, heroFailed: { backgroundColor: colors.dangerSolid },
  verdict: { color: colors.onPrimary, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  score: { color: colors.onPrimary, fontSize: 44, fontVariant: ["tabular-nums"], fontWeight: "800", marginTop: 8 },
  heroCopy: { color: colors.brandMuted, marginTop: 4 },
  diagnosis: { backgroundColor: colors.warningSurface, borderRadius: 18, marginTop: 16, padding: 20 },
  diagnosisTitle: { color: colors.warning, fontSize: 16, fontWeight: "800" },
  diagnosisCopy: { color: colors.warning, lineHeight: 20, marginTop: 6 },
  section: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", marginTop: 32 },
  muted: { color: colors.textSecondary, lineHeight: 20, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  tile: { alignItems: "center", borderRadius: 12, minHeight: 48, minWidth: 64, paddingVertical: 12, paddingHorizontal: 4, justifyContent: "center", width: "21%" },
  tileCorrect: { backgroundColor: colors.successSurface }, tileWrong: { backgroundColor: colors.errorSurface }, tileSkipped: { backgroundColor: colors.disabledSurface },
  tileText: { color: colors.textPrimary, fontVariant: ["tabular-nums"], fontWeight: "800" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 18 },
  legendCorrect: { color: colors.primaryText, fontSize: 12, fontWeight: "700" }, legendWrong: { color: colors.error, fontSize: 12, fontWeight: "700" }, legendSkipped: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 18, justifyContent: "center", marginTop: 32, minHeight: 56 },
  primaryButtonText: { color: colors.onPrimary, fontWeight: "800" },
  modalBackdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88%" },
  closeButton: { alignSelf: "flex-end", minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, close: { color: colors.textPrimary, fontSize: 30 },
  sheetContent: { padding: 24, paddingTop: 0 },
  question: { color: colors.textPrimary, fontSize: 21, fontWeight: "800", lineHeight: 29, marginBottom: 20, marginTop: 14 },
  answer: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", marginBottom: 10, minHeight: 60, padding: 14 },
  answerCorrect: { backgroundColor: colors.successSurface, borderColor: colors.success }, answerWrong: { backgroundColor: colors.errorSurface, borderColor: colors.error },
  answerLetter: { backgroundColor: colors.primarySurface, borderRadius: 14, color: colors.primaryText, fontWeight: "800", minHeight: 32, marginRight: 12, padding: 4, textAlign: "center", minWidth: 32 },
  answerText: { color: colors.textPrimary, lineHeight: 20 }, answerMark: { color: colors.primaryText, fontSize: 14, fontWeight: "700" },
  answerSummary: { color: colors.textSecondary, lineHeight: 20, marginTop: 12 },
});
