import * as Application from "expo-application";
import Constants from "expo-constants";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { mediaRightsNotice, ministrySource } from "@/content/legal";
import { appMetadata } from "@/domain/app-metadata";
import { LegalSourceLink } from "@/components/legal-document-screen";

export function AppAboutCard() {
  const { colors } = useAppTheme();
  const s = styles(colors);
  const metadata = appMetadata({ isExpoGo: Constants.executionEnvironment === "storeClient", configVersion: Constants.expoConfig?.version,
    nativeVersion: Application.nativeApplicationVersion, nativeBuild: Application.nativeBuildVersion });
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.heading}>O aplikacji</Text>
    <Text style={s.body}>EZprawko · prywatne testy</Text>
    <Text selectable style={s.detail}>Wersja: {metadata.version}{"\n"}Build: {metadata.build}</Text>
    <Text style={s.detail}>{mediaRightsNotice}</Text>
    <LegalSourceLink title="Źródło bazy ministerialnej" url={ministrySource} />
    <Link href="/legal/privacy" asChild><Pressable accessibilityRole="link" style={s.link}><Text style={s.action}>Polityka prywatności ›</Text></Pressable></Link>
    <Link href="/legal/terms" asChild><Pressable accessibilityRole="link" style={s.link}><Text style={s.action}>Regulamin ›</Text></Pressable></Link>
    <Text style={s.detail}>Dokumenty robocze. Wymagają uzupełnienia i zatwierdzenia przed publicznym wydaniem.</Text>
  </View>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  card: { padding: 24, gap: 12, borderRadius: 24, backgroundColor: colors.surface },
  heading: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  body: { color: colors.textPrimary, fontSize: 16 },
  detail: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  link: { minHeight: 48, paddingVertical: 12, justifyContent: "center" },
  action: { color: colors.primaryText, fontSize: 16, fontWeight: "700" },
});
