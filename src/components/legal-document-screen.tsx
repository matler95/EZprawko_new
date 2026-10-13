import { useTranslation } from '@/hooks/use-translation';
import { useState, type ReactNode } from "react";
import { router } from "expo-router";
import { openURL } from "expo-linking";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { legalNotice, legalRevision, type LegalDocument } from "@/content/legal";

export function LegalDocumentScreen({ document, children }: { document: LegalDocument; children?: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = styles(colors);
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.content}>
      <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/settings")} style={s.back}>
        <Text style={s.action}>{t("‹ Wróć")}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={s.title}>{t(document.title)}</Text>
      <Text style={s.detail}>{t('Dokument roboczy w języku polskim.')}</Text>
      <Text style={s.detail}>{legalRevision}</Text>
      <View style={s.notice}><Text selectable style={s.body}>{legalNotice}</Text></View>
      {document.sections.map((section) => <View key={section.title} style={s.section}>
        <Text accessibilityRole="header" style={s.heading}>{section.title}</Text>
        {section.paragraphs.map((paragraph) => <Text key={paragraph} selectable style={s.body}>{paragraph}</Text>)}
      </View>)}
      {children}
    </ScrollView>
  </SafeAreaView>;
}

export function LegalSourceLink({ title, url }: { title: string; url: string }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = styles(colors);
  const [failed, setFailed] = useState(false);
  return <View>
    <Pressable accessibilityRole="link" accessibilityHint={t("Otwiera przeglądarkę; wymaga internetu")} style={s.back} onPress={() => {
      setFailed(false);
      void openURL(url).catch(() => setFailed(true));
    }}><Text style={s.action}>{t(title)} ↗</Text></Pressable>
    {failed && <Text accessibilityRole="alert" style={s.detail}>{t("Nie udało się otworzyć strony. Spróbuj ponownie lub skopiuj adres.")}</Text>}
    <Text selectable style={s.detail}>{url}</Text>
  </View>;
}

const styles = (colors: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 16, maxWidth: 600, width: "100%", alignSelf: "center" },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: "700" },
  detail: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  heading: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  body: { color: colors.textPrimary, fontSize: 16, lineHeight: 24 },
  section: { gap: 12, marginTop: 8 },
  notice: { padding: 16, borderRadius: 16, backgroundColor: colors.primarySurface },
  back: { minHeight: 48, paddingVertical: 12, justifyContent: "center" },
  action: { color: colors.primaryText, fontSize: 16, fontWeight: "700" },
});
