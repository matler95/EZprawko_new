import { useTranslation } from '@/hooks/use-translation';
import { Component, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { router, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Colors } from "@/constants/theme";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";

function RecoveryScreen({ onRetry, onHome, colors }: { onRetry: () => void; onHome: () => void; colors: AppTheme }) {
  const { t } = useTranslation();
  const s = styles(colors);
  return <View style={s.safe} onLayout={() => { void SplashScreen.hideAsync().catch(() => undefined); }}>
    <ScrollView contentContainerStyle={s.content}>
      <Text accessibilityRole="header" style={s.title}>{t("Nie udało się wyświetlić aplikacji")}</Text>
      <Text style={s.copy}>{t("Spróbuj ponownie lub wróć do panelu. Te przyciski nie kasują bazy pytań, zapisanych postępów ani multimediów.")}</Text>
      <Text style={s.copy}>{t("Jeśli egzamin jest w toku, jego czas nadal upływa.")}</Text>
      <Pressable accessibilityRole="button" style={s.button} onPress={onHome}><Text style={s.buttonText}>{t("Wróć do panelu")}</Text></Pressable>
      <Pressable accessibilityRole="button" style={s.secondary} onPress={onRetry}><Text style={s.link}>{t("Spróbuj ponownie")}</Text></Pressable>
    </ScrollView>
  </View>;
}

/** Outer protection for provider/startup errors; recovery only remounts React. */
export class ErrorBoundary extends Component<{ children: (recoverHome: boolean) => ReactNode }, { failed: boolean; recoverHome: boolean }> {
  state = { failed: false, recoverHome: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <StartupRecovery onRetry={() => this.setState({ failed: false, recoverHome: false })} onHome={() => this.setState({ failed: false, recoverHome: true })} />;
    return this.props.children(this.state.recoverHome);
  }
}
function StartupRecovery({ onRetry, onHome }: { onRetry: () => void; onHome: () => void }) {
  const scheme = useColorScheme();
  return <RecoveryScreen colors={Colors[scheme === "dark" ? "dark" : "light"]} onRetry={onRetry} onHome={onHome} />;
}

/** SDK 57 screen boundary keeps the navigator mounted, so Home is safe. */
export function ScreenErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { colors } = useAppTheme();
  return <RecoveryScreen colors={colors} onRetry={() => { void retry(); }} onHome={() => router.replace("/")} />;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 64, gap: 24 },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: "700", lineHeight: 34 }, copy: { color: colors.textSecondary, lineHeight: 22 },
  button: { backgroundColor: colors.primary, minHeight: 58, padding: 16, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { color: colors.onPrimary, fontWeight: "700" }, secondary: { minHeight: 48, alignItems: "center", justifyContent: "center" }, link: { color: colors.primaryText, fontWeight: "700" },
});
