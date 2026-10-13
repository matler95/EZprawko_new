import { useTranslation } from '@/hooks/use-translation';
import { UiTokens } from '@/constants/ui-tokens';
import * as Application from "expo-application";
import Constants from "expo-constants";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { mediaRightsNotice, ministrySource } from "@/content/legal";
import { appMetadata } from "@/domain/app-metadata";
import { LegalSourceLink } from "@/components/legal-document-screen";
import { AppCard } from '@/components/ui/app-controls';

export function AppAboutCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = styles(colors);
  const metadata = appMetadata({ isExpoGo: Constants.executionEnvironment === "storeClient", configVersion: Constants.expoConfig?.version,
    nativeVersion: Application.nativeApplicationVersion, nativeBuild: Application.nativeBuildVersion });
  return <AppCard>
    <Text accessibilityRole="header" style={s.heading}>{t("O aplikacji")}</Text>
    <Text style={s.body}>{t("EZprawko · prywatne testy")}</Text>
    <Text selectable style={s.detail}>{t("Wersja:")} {metadata.version}{"\n"}{t("Build:")} {metadata.build}</Text>
    <Text style={s.detail}>{mediaRightsNotice}</Text>
    <LegalSourceLink title={t("Źródło bazy ministerialnej")} url={ministrySource} />
    <Link href="/legal/privacy" asChild><Pressable accessibilityRole="link" style={s.link}><Text style={s.action}>{t("Polityka prywatności ›")}</Text></Pressable></Link>
    <Link href="/legal/terms" asChild><Pressable accessibilityRole="link" style={s.link}><Text style={s.action}>{t("Regulamin ›")}</Text></Pressable></Link>
    <Text style={s.detail}>{t("Dokumenty robocze. Wymagają uzupełnienia i zatwierdzenia przed publicznym wydaniem.")}</Text>
  </AppCard>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  heading: { color: colors.textPrimary, ...UiTokens.text.heading },
  body: { color: colors.textPrimary, fontSize: 16 },
  detail: { color: colors.textSecondary, ...UiTokens.text.detail },
  link: { minHeight: 48, paddingVertical: 12, justifyContent: "center" },
  action: { color: colors.primaryText, fontSize: 16, fontWeight: "700" },
});
