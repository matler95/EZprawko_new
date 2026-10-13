import { useTranslation } from '@/hooks/use-translation';
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useDataMaintenance } from "@/context/data-maintenance-context";
import { resetUserProgress } from "@/database/user-data";
import { deleteLocalUserData, shareUserData } from "@/services/user-data";

export function UserDataCard() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const s = styles(colors);
  const run = useDataMaintenance();
  const [exporting, setExporting] = useState(false);
  const lock = useRef(false);
  const confirm = (all: boolean) => {
    if (lock.current) return;
    Alert.alert(all ? t("Usunąć wszystkie dane lokalne?") : t("Zresetować postępy?"), all
      ? t("Usuniemy postępy, ustawienia, przypomnienia, cache i lokalną sesję. Baza pytań pozostanie. Nie usuniemy konta Supabase ani danych serwerowych. Operacji nie można cofnąć; najpierw możesz wyeksportować dane.")
      : t("Usuniemy historię egzaminów i nauki, aktywny egzamin, opanowanie, oznaczenia i dni nauki. Ustawienia, konto i cache pozostaną. Operacji nie można cofnąć."), [
      { text: t("Anuluj"), style: "cancel" },
      { text: all ? t("Usuń dane lokalne") : t("Resetuj postępy"), style: "destructive", onPress: () => {
        run(async () => {
          if (all) return deleteLocalUserData(db);
          await resetUserProgress(db);
          return "Zresetowano postępy i historię. Zachowano ustawienia, konto i cache. Operacja jest nieodwracalna; zapisane wcześniej kopie eksportu nie zostały usunięte.";
        });
      } },
    ]);
  };
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.heading}>{t("Twoje dane")}</Text>
    <Text style={s.detail}>{t("Eksport dotyczy danych lokalnych, bez haseł, tokenów, konta w chmurze i multimediów. Plik zawiera historię odpowiedzi — udostępniaj go świadomie. Nie służy do przywracania kopii w aplikacji.")}</Text>
    <Pressable disabled={exporting} accessibilityRole="button" accessibilityState={{ disabled: exporting, busy: exporting }} style={s.button} onPress={() => {
      if (lock.current) return;
      lock.current = true; setExporting(true);
      void shareUserData(db).catch((error: unknown) => Alert.alert(t("Eksport nieudany"), error instanceof Error ? error.message : t("Spróbuj ponownie.")))
        .finally(() => { lock.current = false; setExporting(false); });
    }}><Text style={s.action}>{exporting ? t("Przygotowywanie eksportu…") : t("Eksportuj moje dane")}</Text></Pressable>
    <Pressable disabled={exporting} accessibilityRole="button" style={s.button} onPress={() => confirm(false)}><Text style={s.action}>{t("Resetuj postępy")}</Text></Pressable>
    <Pressable disabled={exporting} accessibilityRole="button" style={s.button} onPress={() => confirm(true)}><Text style={s.danger}>{t("Usuń wszystkie dane lokalne")}</Text></Pressable>
    <Text style={s.detail}>{t("Usunięcie konta Supabase wymaga odrębnej procedury u operatora. Lokalny reset nie usuwa konta, logów usług ani kopii systemowych.")}</Text>
  </View>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  card: { padding: 24, gap: 12, borderRadius: 24, backgroundColor: colors.surface },
  heading: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  detail: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  button: { minHeight: 48, justifyContent: "center", paddingVertical: 12 },
  action: { color: colors.primaryText, fontSize: 16, fontWeight: "700" },
  danger: { color: colors.error, fontSize: 16, fontWeight: "700" },
});
