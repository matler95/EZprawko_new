import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  challengeStatus,
  completeOnboarding,
  examReadiness,
  hasCompletedOnboarding,
  resumeActiveExam,
  selectedCategory,
  setSelectedCategory,
  startActiveExam,
  type ExamReadiness,
} from "@/database/repository";

const categories = ["AM", "A", "B", "C", "D"];

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const db = useSQLiteContext();
  const [category, setCategory] = useState("B");
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ExamReadiness | null>(null);
  const [challenge, setChallenge] = useState({
    daysCompleted: 0,
    correctToday: 0,
    complete: false,
  });

  useEffect(() => {
    void Promise.all([
      selectedCategory(db),
      hasCompletedOnboarding(db),
      challengeStatus(db),
      examReadiness(db),
      resumeActiveExam(db),
    ]).then(([storedCategory, completed, nextChallenge, nextReadiness, active]) => {
      setCategory(storedCategory);
      setOnboardingComplete(completed);
      setChallenge(nextChallenge);
      setReadiness(nextReadiness);
      setActiveExamId(active?.id ?? null);
      setOnboardingChecked(true);
    });
  }, [db]);

  const startExam = async () => {
    if (isStarting) return;
    setIsStarting(true);
    const active = await startActiveExam(db, category);
    setActiveExamId(active.id);
    router.push({ pathname: "/exam/[id]", params: { id: active.id } });
  };

  if (!onboardingChecked) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.muted}>Przygotowujemy Twoją naukę…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!onboardingComplete) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.onboarding}>
          <Text style={styles.hello}>Zaczynamy</Text>
          <Text style={styles.onboardingTitle}>Jaką kategorię zdajesz?</Text>
          <Text style={styles.muted}>
            Dopasujemy pytania specjalistyczne i egzamin próbny.
          </Text>
          <View style={styles.categoryGrid}>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.categoryChoice, category === item && styles.categoryChoiceSelected]}
              >
                <Text style={category === item ? styles.categoryChoiceSelectedText : styles.categoryChoiceText}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => {
              void (async () => {
                await setSelectedCategory(db, category);
                await completeOnboarding(db);
                setOnboardingComplete(true);
              })();
            }}
            style={styles.onboardingButton}
          >
            <Text style={styles.buttonText}>Ustaw kategorię i kontynuuj</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hello}>Prawo Jazdy</Text>
        <Text style={styles.muted}>Oficjalna teoria · kategoria {category}</Text>
        <Pressable onPress={() => router.navigate("/settings")}>
          <Text style={styles.categoryLink}>Zmień kategorię</Text>
        </Pressable>

        {activeExamId ? (
          <Pressable
            onPress={() => router.push({ pathname: "/exam/[id]", params: { id: activeExamId } })}
            style={styles.resumeCard}
          >
            <View>
              <Text style={styles.resumeTitle}>Masz egzamin w toku</Text>
              <Text style={styles.resumeCopy}>Wróć dokładnie do miejsca, w którym przerwałeś.</Text>
            </View>
            <Text style={styles.resumeAction}>Wznów</Text>
          </Pressable>
        ) : null}

        <View style={styles.hero}>
          <Text style={styles.kicker}>EGZAMIN PAŃSTWOWY</Text>
          <Text style={styles.heroTitle}>32 pytania.{"\n"}25 minut. 74 punkty.</Text>
          <Text style={styles.heroText}>
            20 pytań podstawowych i 12 specjalistycznych. Próg zdania: 68 punktów.
          </Text>
          <Pressable disabled={isStarting} onPress={() => void startExam()} style={[styles.gold, isStarting && styles.disabled]}>
            <Text style={styles.goldText}>{isStarting ? "Przygotowujemy…" : "Rozpocznij egzamin próbny →"}</Text>
          </Pressable>
        </View>

        <View style={styles.readinessCard}>
          <View>
            <Text style={styles.readinessTitle}>Gotowość egzaminacyjna</Text>
            <Text style={styles.readinessCopy}>
              {readiness
                ? readiness.pointsToPass === 0
                  ? `Średnio ${readiness.averageScore}/74 · próg osiągnięty`
                  : `Średnio ${readiness.averageScore}/74 · brakuje ${readiness.pointsToPass} pkt`
                : "Ukończ pierwszy egzamin, aby ocenić gotowość."}
            </Text>
          </View>
          <Text style={styles.readinessValue}>{readiness ? `${readiness.passRate}%` : "—"}</Text>
        </View>

        <View style={styles.card}>
          <View>
            <Text style={styles.cardTitle}>
              {challenge.complete ? "Wyzwanie ukończone!" : `Wyzwanie: ${challenge.daysCompleted}/3 dni`}
            </Text>
            <Text style={styles.muted}>{challenge.correctToday}/5 poprawnych odpowiedzi dzisiaj</Text>
          </View>
          <Text style={styles.chevron}>{challenge.complete ? "✓" : "◌"}</Text>
        </View>

        <Text style={styles.section}>Dzisiejsza nauka</Text>
        <Pressable onPress={() => router.navigate("/study?filter=three&count=5")} style={styles.recommendedCard}>
          <View>
            <Text style={styles.recommendedKicker}>NAJLEPSZY KOLEJNY KROK</Text>
            <Text style={styles.recommendedTitle}>5 pytań za 3 punkty</Text>
            <Text style={styles.recommendedCopy}>Zacznij od pytań o największej wadze na egzaminie.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable onPress={() => router.navigate("/study?filter=mistakes")} style={styles.card}>
          <Text style={styles.cardTitle}>Powtórz błędne odpowiedzi</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  onboarding: { flexGrow: 1, justifyContent: "center", padding: 24 },
  onboardingTitle: { color: colors.textPrimary, fontSize: 30, fontWeight: "700", lineHeight: 36, marginTop: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 32 },
  categoryChoice: { alignItems: "center", backgroundColor: colors.primarySurface, borderRadius: 16, justifyContent: "center", minHeight: 72, minWidth: 72 },
  categoryChoiceSelected: { backgroundColor: colors.primary },
  categoryChoiceText: { color: colors.primaryText, fontSize: 18, fontWeight: "800" },
  categoryChoiceSelectedText: { color: colors.onPrimary, fontSize: 18, fontWeight: "800" },
  onboardingButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 18, justifyContent: "center", marginTop: 32, minHeight: 56 },
  content: { padding: 24, paddingBottom: 48 },
  hello: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  muted: { color: colors.textSecondary, fontSize: 14, marginTop: 6 },
  categoryLink: { color: colors.primaryText, fontWeight: "700", marginTop: 8 },
  hero: { backgroundColor: colors.brandSurface, borderRadius: 28, marginTop: 24, padding: 24 },
  kicker: { color: colors.brandMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  heroTitle: { color: colors.onPrimary, fontSize: 28, fontWeight: "700", lineHeight: 34, marginTop: 12 },
  heroText: { color: colors.brandMuted, fontSize: 14, lineHeight: 20, marginTop: 12 },
  gold: { alignSelf: "flex-start", backgroundColor: colors.accentGold, borderRadius: 16, marginTop: 24, padding: 16 },
  goldText: { color: colors.onGold, fontWeight: "700" },
  disabled: { opacity: 0.65 },
  readinessCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginTop: 16, padding: 20 },
  readinessTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  readinessCopy: { color: colors.textSecondary, lineHeight: 19, marginTop: 4, maxWidth: 230 },
  readinessValue: { color: colors.primaryText, fontSize: 24, fontWeight: "800" },
  resumeCard: { alignItems: "center", backgroundColor: colors.warningSurface, borderColor: colors.warningBorder, borderRadius: 18, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 16, padding: 18 },
  resumeTitle: { color: colors.warning, fontSize: 16, fontWeight: "800" },
  resumeCopy: { color: colors.warning, lineHeight: 19, marginTop: 4, maxWidth: 235 },
  resumeAction: { color: colors.warning, fontWeight: "800" },
  section: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 16, marginTop: 32 },
  card: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 20 },
  cardTitle: { color: colors.textPrimary, fontWeight: "600" },
  recommendedCard: { alignItems: "center", backgroundColor: colors.primarySurface, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 20 },
  recommendedKicker: { color: colors.primaryText, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  recommendedTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 4 },
  recommendedCopy: { color: colors.textSecondary, lineHeight: 19, marginTop: 4, maxWidth: 250 },
  chevron: { color: colors.textSecondary, fontSize: 24 },
  buttonText: { color: colors.onPrimary, fontWeight: "700" },
});
