import { useTranslation } from '@/hooks/use-translation';
import { useRef, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useDataMaintenance } from "@/context/data-maintenance-context";
import { resetUserProgress } from "@/database/user-data";
import { deleteLocalUserData, shareUserData } from "@/services/user-data";
import { AppButton, AppCard } from '@/components/ui/app-controls';

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
  return <AppCard>
    <Text accessibilityRole="header" style={s.heading}>{t("Twoje dane")}</Text>
    <Text style={s.detail}>{t("Eksport dotyczy danych lokalnych, bez haseł, tokenów, konta w chmurze i multimediów. Plik zawiera historię odpowiedzi — udostępniaj go świadomie. Nie służy do przywracania kopii w aplikacji.")}</Text>
    <AppButton variant="secondary" busy={exporting} label={exporting ? t("Przygotowywanie eksportu…") : t("Eksportuj moje dane")} onPress={() => {
      if (lock.current) return;
      lock.current = true; setExporting(true);
      void shareUserData(db).catch((error: unknown) => Alert.alert(t("Eksport nieudany"), error instanceof Error ? error.message : t("Spróbuj ponownie.")))
        .finally(() => { lock.current = false; setExporting(false); });
    }} />
    <AppButton variant="danger" disabled={exporting} label={t("Resetuj postępy")} onPress={() => confirm(false)} />
    <AppButton variant="danger" disabled={exporting} label={t("Usuń wszystkie dane lokalne")} onPress={() => confirm(true)} />
    <Text style={s.detail}>{t("Usunięcie konta Supabase wymaga odrębnej procedury u operatora. Lokalny reset nie usuwa konta, logów usług ani kopii systemowych.")}</Text>
  </AppCard>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  heading: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  detail: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
});
