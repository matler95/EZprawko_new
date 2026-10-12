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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F5" },
  loading: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  onboarding: { flexGrow: 1, justifyContent: "center", padding: 24 },
  onboardingTitle: { color: "#18221D", fontSize: 30, fontWeight: "700", lineHeight: 36, marginTop: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 32 },
  categoryChoice: { alignItems: "center", backgroundColor: "#E6F0E5", borderRadius: 16, justifyContent: "center", minHeight: 72, minWidth: 72 },
  categoryChoiceSelected: { backgroundColor: "#1F704C" },
  categoryChoiceText: { color: "#1F704C", fontSize: 18, fontWeight: "800" },
  categoryChoiceSelectedText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  onboardingButton: { alignItems: "center", backgroundColor: "#1F704C", borderRadius: 18, justifyContent: "center", marginTop: 32, minHeight: 56 },
  content: { padding: 24, paddingBottom: 48 },
  hello: { color: "#18221D", fontSize: 24, fontWeight: "700" },
  muted: { color: "#718076", fontSize: 14, marginTop: 6 },
  categoryLink: { color: "#397355", fontWeight: "700", marginTop: 8 },
  hero: { backgroundColor: "#216A49", borderRadius: 28, marginTop: 24, padding: 24 },
  kicker: { color: "#B9DABE", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  heroTitle: { color: "#FFF", fontSize: 28, fontWeight: "700", lineHeight: 34, marginTop: 12 },
  heroText: { color: "#D8E9D8", fontSize: 14, lineHeight: 20, marginTop: 12 },
  gold: { alignSelf: "flex-start", backgroundColor: "#F0C96A", borderRadius: 16, marginTop: 24, padding: 16 },
  goldText: { color: "#27301A", fontWeight: "700" },
  disabled: { opacity: 0.65 },
  readinessCard: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginTop: 16, padding: 20 },
  readinessTitle: { color: "#18221D", fontSize: 16, fontWeight: "700" },
  readinessCopy: { color: "#718076", lineHeight: 19, marginTop: 4, maxWidth: 230 },
  readinessValue: { color: "#1F704C", fontSize: 24, fontWeight: "800" },
  resumeCard: { alignItems: "center", backgroundColor: "#FFF0D8", borderColor: "#E8C77B", borderRadius: 18, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 16, padding: 18 },
  resumeTitle: { color: "#573A08", fontSize: 16, fontWeight: "800" },
  resumeCopy: { color: "#765B1B", lineHeight: 19, marginTop: 4, maxWidth: 235 },
  resumeAction: { color: "#8A520A", fontWeight: "800" },
  section: { color: "#1B2921", fontSize: 18, fontWeight: "700", marginBottom: 16, marginTop: 32 },
  card: { alignItems: "center", backgroundColor: "#FFF", borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 20 },
  cardTitle: { color: "#18221D", fontWeight: "600" },
  recommendedCard: { alignItems: "center", backgroundColor: "#E6F0E5", borderRadius: 18, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 20 },
  recommendedKicker: { color: "#397355", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  recommendedTitle: { color: "#1E3126", fontSize: 18, fontWeight: "700", marginTop: 4 },
  recommendedCopy: { color: "#526358", lineHeight: 19, marginTop: 4, maxWidth: 250 },
  chevron: { color: "#718076", fontSize: 24 },
  buttonText: { color: "#FFF", fontWeight: "700" },
});
