import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QuestionMedia } from "@/components/question-media";
import { examReview, type ExamReview, type ExamReviewQuestion } from "@/database/repository";

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
};

export default function ExamReviewScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const db = useSQLiteContext();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [review, setReview] = useState<ExamReview | null>(null);
  const [selected, setSelected] = useState<ExamReviewQuestion | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    void examReview(db, sessionId).then(setReview);
  }, [db, sessionId]);

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
        <View style={styles.loading}><Text style={styles.muted}>Wczytujemy podsumowanie…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.replace("/")}><Text style={styles.back}>← Panel główny</Text></Pressable>
        <Text style={styles.kicker}>PODSUMOWANIE EGZAMINU</Text>
        <View style={[styles.hero, review.passed ? styles.heroPassed : styles.heroFailed]}>
          <Text style={styles.verdict}>{review.passed ? "POZYTYWNY" : "NEGATYWNY"}</Text>
          <Text style={styles.score}>{review.score}/74</Text>
          <Text style={styles.heroCopy}>Kategoria {review.category} · czas {formatDuration(review.durationSeconds)}</Text>
        </View>

        {diagnosis ? (
          <View style={styles.diagnosis}>
            <Text style={styles.diagnosisTitle}>Co warto powtórzyć</Text>
            <Text style={styles.diagnosisCopy}>
              {diagnosis.incorrect === 0
                ? "Perfekcyjna próba — nie masz pytań do powtórki."
                : `Stracono ${diagnosis.lostHighPoints} pkt w pytaniach za 3 punkty${diagnosis.basicHigh ? `, w tym ${diagnosis.basicHigh} z części podstawowej` : ""}.`}
            </Text>
            {!review.passed ? <Text style={styles.diagnosisCopy}>Do zaliczenia zabrakło {68 - review.score} pkt.</Text> : null}
          </View>
        ) : null}

        <Text style={styles.section}>Twoje odpowiedzi</Text>
        <Text style={styles.muted}>Dotknij numeru, aby zobaczyć treść i porównać odpowiedzi.</Text>
        <View style={styles.grid}>
          {review.questions.map((item) => (
            <Pressable
              accessibilityLabel={`Pytanie ${item.position + 1}`}
              key={item.id}
              onPress={() => setSelected(item)}
              style={[
                styles.tile,
                item.isCorrect ? styles.tileCorrect : item.selectedAnswer ? styles.tileWrong : styles.tileSkipped,
              ]}
            >
              <Text style={styles.tileText}>{item.position + 1}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendCorrect}>● poprawna</Text><Text style={styles.legendWrong}>● błędna</Text><Text style={styles.legendSkipped}>● brak odpowiedzi</Text>
        </View>
        <Pressable onPress={() => router.navigate("/study?filter=mistakes")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Powtórz błędy w nauce</Text>
        </Pressable>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setSelected(null)} transparent visible={Boolean(selected)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Pressable onPress={() => setSelected(null)} style={styles.closeButton}><Text style={styles.close}>×</Text></Pressable>
            {selected ? (
              <ScrollView contentContainerStyle={styles.sheetContent}>
                <Text style={styles.kicker}>PYTANIE {selected.position + 1} · {selected.points} PKT</Text>
                <QuestionMedia filename={selected.mediaFilename} />
                <Text style={styles.question}>{selected.question}</Text>
                {selected.answers.map((answer) => {
                  const wasSelected = selected.selectedAnswer === answer.label;
                  const isCorrect = selected.correctAnswer === answer.label;
                  return (
                    <View key={answer.label} style={[styles.answer, isCorrect && styles.answerCorrect, wasSelected && !isCorrect && styles.answerWrong]}>
                      <Text style={styles.answerLetter}>{answer.label}</Text>
                      <Text style={styles.answerText}>{answer.answer}</Text>
                      {isCorrect ? <Text style={styles.answerMark}>✓</Text> : null}
                    </View>
                  );
                })}
                <Text style={styles.answerSummary}>
                  {selected.selectedAnswer ? `Twoja odpowiedź: ${selected.selectedAnswer}` : "Nie udzielono odpowiedzi"} · poprawna: {selected.correctAnswer}
                </Text>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { padding: 24, paddingBottom: 48 },
  back: { color: colors.primaryText, fontWeight: "800", marginBottom: 28 },
  kicker: { color: colors.primaryText, fontSize: 11, fontWeight: "800", letterSpacing: 0.9 },
  hero: { borderRadius: 24, marginTop: 12, padding: 24 },
  heroPassed: { backgroundColor: colors.brandSurface }, heroFailed: { backgroundColor: colors.error },
  verdict: { color: colors.onPrimary, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  score: { color: colors.onPrimary, fontSize: 44, fontVariant: ["tabular-nums"], fontWeight: "800", marginTop: 8 },
  heroCopy: { color: colors.brandMuted, marginTop: 4 },
  diagnosis: { backgroundColor: colors.warningSurface, borderRadius: 18, marginTop: 16, padding: 20 },
  diagnosisTitle: { color: colors.warning, fontSize: 16, fontWeight: "800" },
  diagnosisCopy: { color: colors.warning, lineHeight: 20, marginTop: 6 },
  section: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", marginTop: 32 },
  muted: { color: colors.textSecondary, lineHeight: 20, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  tile: { alignItems: "center", borderRadius: 12, height: 48, justifyContent: "center", width: "21%" },
  tileCorrect: { backgroundColor: colors.successSurface }, tileWrong: { backgroundColor: colors.errorSurface }, tileSkipped: { backgroundColor: colors.disabledSurface },
  tileText: { color: colors.textPrimary, fontVariant: ["tabular-nums"], fontWeight: "800" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 18 },
  legendCorrect: { color: colors.primaryText, fontSize: 12, fontWeight: "700" }, legendWrong: { color: colors.error, fontSize: 12, fontWeight: "700" }, legendSkipped: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 18, justifyContent: "center", marginTop: 32, minHeight: 56 },
  primaryButtonText: { color: colors.onPrimary, fontWeight: "800" },
  modalBackdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88%" },
  closeButton: { alignSelf: "flex-end", paddingHorizontal: 24, paddingTop: 14 }, close: { color: colors.textPrimary, fontSize: 30 },
  sheetContent: { padding: 24, paddingTop: 0 },
  question: { color: colors.textPrimary, fontSize: 21, fontWeight: "800", lineHeight: 29, marginBottom: 20, marginTop: 14 },
  answer: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", marginBottom: 10, minHeight: 60, padding: 14 },
  answerCorrect: { backgroundColor: colors.successSurface, borderColor: colors.success }, answerWrong: { backgroundColor: colors.errorSurface, borderColor: colors.error },
  answerLetter: { backgroundColor: colors.primarySurface, borderRadius: 14, color: colors.primaryText, fontWeight: "800", height: 28, marginRight: 12, paddingTop: 5, textAlign: "center", width: 28 },
  answerText: { color: colors.textPrimary, flex: 1, lineHeight: 20 }, answerMark: { color: colors.primaryText, fontSize: 20, fontWeight: "800" },
  answerSummary: { color: colors.textSecondary, lineHeight: 20, marginTop: 12 },
});
