import { useTranslation } from '@/hooks/use-translation';
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { cacheSizeBytes, clearMediaCache } from "@/services/media-cache";
import { MediaDownloadCard } from "@/components/media-download-card";
import { ReminderCard } from "@/components/reminder-card";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { MediaAccountCard } from "@/components/media-account-card";
import { AppAboutCard } from "@/components/app-about-card";
import { UserDataCard } from "@/components/user-data-card";
import { useTargetCategory } from "@/context/target-category-context";
import { categoryLabel as baseCategoryLabel, drivingCategories } from "@/domain/driving-categories";
import { userDataRevision, userDataWritable } from "@/domain/data-maintenance";
import { questionLanguages, selectedQuestionLanguage, setQuestionLanguage, translationCoverage, type QuestionLanguage } from "@/database/translations";
import { saveUiLanguage } from '@/database/ui-language';
import { useUiLanguage } from '@/hooks/use-ui-language';
import { AppButton, AppCard, AppStatus } from '@/components/ui/app-controls';

export default function SettingsScreen() {
  const { t, language: interfaceLanguage } = useTranslation();
  const categoryLabel = (value: string) => baseCategoryLabel(value, interfaceLanguage);
  const db = useSQLiteContext();
  const locale = useUiLanguage();
  const { preference, setPreference, colors } = useAppTheme();
  const { category, setCategory, changing, error: categoryError } = useTargetCategory();
  const s = createStyles(colors);
  const [language, setLanguage] = useState<QuestionLanguage | null>(null);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [cache, setCache] = useState<number | null>(null);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [cacheReading, setCacheReading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cacheDetails, setCacheDetails] = useState(false);
  const focused = useRef(false);
  const reads = useRef(0);
  const cacheReads = useRef(0);
  const saveLock = useRef(false);
  const clearLock = useRef(false);
  const downloadLock = useRef(false);
  const downloadCount = useRef(0);

  const refreshCache = useCallback(async () => {
    const request = ++cacheReads.current;
    setCacheReading(true);
    try {
      const size = await cacheSizeBytes();
      if (focused.current && request === cacheReads.current) { setCache(size); setCacheError(null); }
    } catch {
      if (focused.current && request === cacheReads.current) setCacheError(t("Nie udało się odczytać zajętości materiałów."));
    } finally {
      if (focused.current && request === cacheReads.current) setCacheReading(false);
    }
  }, [t]);
  const refreshLanguage = useCallback(async () => {
    if (saveLock.current) return;
    setSaving(null);
    const request = ++reads.current;
    try {
      const value = await selectedQuestionLanguage(db);
      if (focused.current && request === reads.current) { setLanguage(value); setLanguageError(null); }
    } catch {
      if (focused.current && request === reads.current) setLanguageError(t("Nie udało się odczytać języka pytań."));
    }
  }, [db, t]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    void refreshCache(); void refreshLanguage();
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") { void refreshCache(); void refreshLanguage(); }
    });
    return () => { focused.current = false; listener.remove(); };
  }, [refreshCache, refreshLanguage]));

  const save = async (label: string, operation: () => Promise<boolean>) => {
    if (saveLock.current || changing) return;
    saveLock.current = true; ++reads.current;
    const revision = userDataRevision();
    setSaving(label); setSaveError(null); setSaveStatus(null);
    try {
      if (!userDataWritable(revision) || !await operation()) throw new Error("save");
      if (focused.current && userDataWritable(revision)) setSaveStatus(label);
    } catch {
      if (focused.current && userDataWritable(revision)) setSaveError(label);
    } finally {
      saveLock.current = false;
      if (focused.current) setSaving(null);
    }
  };
  const changeLanguage = (value: QuestionLanguage) => save("Język pytań", async () => {
    const revision = userDataRevision();
    await setQuestionLanguage(db, value);
    if (focused.current && userDataWritable(revision)) setLanguage(value);
    return true;
  });
  const downloadChanged = useCallback((value: boolean) => {
    downloadCount.current += value ? 1 : -1;
    downloadLock.current = downloadCount.current > 0;
    setDownloading(downloadLock.current);
    if (!downloadLock.current && focused.current) void refreshCache();
  }, [refreshCache]);
  const confirmClear = () => {
    if (clearLock.current || downloadLock.current) return;
    clearLock.current = true; setClearing(true); setCacheError(null);
    const finish = () => { clearLock.current = false; if (focused.current) setClearing(false); };
    let executing = false;
    const revision = userDataRevision();
    Alert.alert(t("Usunąć pobrane materiały?"), t("Zdjęcia i filmy trzeba będzie pobrać ponownie. Pytania, postępy, ustawienia i konto pozostaną."), [
      { text: t("Anuluj"), style: "cancel", onPress: finish },
      { text: t("Usuń materiały"), style: "destructive", onPress: () => {
        if (!focused.current || !userDataWritable(revision)) { finish(); return; }
        executing = true;
        void clearMediaCache().then(() => {
          if (focused.current) { setCache(null); void refreshCache(); }
        }).catch(() => {
          if (focused.current) setCacheError(t("Nie udało się usunąć materiałów. Poczekaj na zakończenie pobierania i spróbuj ponownie."));
        }).finally(finish);
      } },
    ], { cancelable: true, onDismiss: () => { if (!executing) finish(); } });
  };
  const disabled = saving !== null || changing;
  return <SafeAreaView style={s.safe}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text accessibilityRole="header" style={s.title}>{t("Ustawienia")}</Text>
        <Text style={s.sub}>{t("Dostosuj naukę i korzystanie z aplikacji na tym urządzeniu.")}</Text>
        <Text accessibilityRole="header" style={s.heading}>{t("Nauka")}</Text>
        <AppCard>
          <Text style={s.label}>{t('Język aplikacji')}</Text>
          <View style={s.options}>{questionLanguages.map(item => <Pressable key={item.code} disabled={disabled}
            accessibilityRole="radio" accessibilityLabel={`${t('Język aplikacji')}: ${item.label}`} accessibilityState={{ checked: locale === item.code, disabled }}
            onPress={() => void save("Język aplikacji", async () => { await saveUiLanguage(db, item.code); setLanguage(item.code); return true; })}
            style={[s.option, locale === item.code && s.active, disabled && s.disabled]}>
            <Text style={locale === item.code ? s.activeText : s.optionText}>{item.label}</Text>
          </Pressable>)}</View>
          <Text style={s.sub}>{t('Zmienia interfejs i domyślny język pytań. Poniżej możesz wybrać inny język pytań.')}</Text>
          <Text style={s.label}>{t("Twoja kategoria")}</Text>
          <View style={s.options}>{drivingCategories.map(item => <Pressable key={item} disabled={disabled}
            accessibilityRole="radio" accessibilityLabel={categoryLabel(item)} accessibilityState={{ checked: category === item, disabled, busy: changing }}
            onPress={() => void save("Kategoria", () => setCategory(item))}
            style={[s.option, category === item && s.active, disabled && s.disabled]}>
            <Text style={category === item ? s.activeText : s.optionText}>{item}</Text>
          </Pressable>)}</View>
          <Text style={s.sub}>{categoryLabel(category)}{t(". Jedna kategoria dla Nauki i nowych egzaminów. PT to pozwolenie na tramwaj. Rozpoczęty egzamin zachowuje swoją kategorię.")}</Text>
          {categoryError && <AppStatus tone="error" message={t(categoryError)} />}
          <Text style={s.label}>{t("Język pytań")}</Text>
          {languageError ? <><AppStatus tone="error" message={t(languageError)} /><AppButton variant="link" label={t("Ponów odczyt języka")} onPress={() => void refreshLanguage()} /></> : language === null ? <AppStatus message={t("Odczytywanie języka…")} /> : <>
            <View style={s.options}>{questionLanguages.map(item => <Pressable key={item.code} disabled={disabled}
              accessibilityRole="radio" accessibilityState={{ checked: language === item.code, disabled }}
              onPress={() => void changeLanguage(item.code)} style={[s.option, language === item.code && s.active, disabled && s.disabled]}>
              <Text style={language === item.code ? s.activeText : s.optionText}>{item.label}</Text>
            </Pressable>)}</View>
            <Text style={s.sub}>{language === "pl" ? t("Pełny oficjalny katalog po polsku.") : t("Oficjalne tłumaczenia: {0}/3518 pytań. Brakujące pokażemy po polsku z oznaczeniem.", [translationCoverage[language]])} {t("Język rozpoczętego egzaminu pozostaje bez zmian.")}</Text>
          </>}
        </AppCard>
        <Text accessibilityRole="header" style={s.heading}>{t("Wygląd")}</Text>
        <AppCard>
          <View style={s.options}>{(["system", "light", "dark"] as const).map(item => <Pressable key={item} disabled={disabled}
            accessibilityRole="radio" accessibilityState={{ checked: preference === item, disabled }}
            onPress={() => void save("Wygląd", () => setPreference(item))} style={[s.option, preference === item && s.active, disabled && s.disabled]}>
            <Text style={preference === item ? s.activeText : s.optionText}>{item === "system" ? t("Systemowy") : item === "light" ? t("Jasny") : t("Ciemny")}</Text>
          </Pressable>)}</View>
          <Text style={s.sub}>{t("Systemowy dopasowuje wygląd do ustawień telefonu.")}</Text>
        </AppCard>
        {saving && <AppStatus message={`${t("Zapisywanie:")} ${t(saving).toLowerCase()}…`} />}
        {saveStatus && <AppStatus tone="success" message={t('{0}: zapisano.', [t(saveStatus)])} />}
        {saveError && <AppStatus tone="error" message={t('Nie udało się zapisać: {0}. Wybierz opcję ponownie, aby spróbować jeszcze raz.', [t(saveError).toLowerCase()])} />}
        <Text accessibilityRole="header" style={s.heading}>{t("Konto")}</Text>
        <MediaAccountCard />
        <Text accessibilityRole="header" style={s.heading}>{t("Multimedia")}</Text>
        <MediaDownloadCard disabled={clearing} canStart={() => !clearLock.current} onBusyChange={downloadChanged} />
        <AppCard>
          <Text style={s.label}>{t("Pobrane materiały")}</Text>
          <Text style={s.sub}>{cacheReading ? t("Sprawdzanie zajętości…") : cacheError ? t("Zajętość aktualnie niedostępna.") : cache === null ? t("Zajętość nieznana.") : t("{0} MB · limit 1 GB", [(cache / 1024 / 1024).toFixed(1)])}</Text>
          <AppButton variant='link' label={t(cacheDetails ? 'Ukryj informacje o materiałach offline' : 'Jak działają materiały offline?')}
            accessibilityState={{ expanded: cacheDetails }} onPress={() => setCacheDetails(value => !value)} />
          {cacheDetails && <Text style={s.sub}>{t('Pobrane materiały działają offline, dopóki są w pamięci podręcznej. Mogą zostać usunięte, aby zwolnić miejsce; wtedy wymagają ponownego pobrania.')}</Text>}
          {cacheError && <AppStatus tone="error" message={t(cacheError)} />}
          <AppButton variant="link" disabled={clearing} label={t("Odśwież zajętość")} onPress={() => void refreshCache()} />
          <AppButton variant="danger" disabled={downloading} busy={clearing} label={clearing ? t("Czyszczenie materiałów…") : t("Usuń pobrane materiały")} onPress={confirmClear} />
          {downloading && <Text style={s.sub}>{t("Czyszczenie będzie dostępne po zakończeniu lub przerwaniu pobierania.")}</Text>}
        </AppCard>
        <Text accessibilityRole="header" style={s.heading}>{t("Przypomnienia")}</Text>
        <ReminderCard />
        <Text accessibilityRole="header" style={s.heading}>{t("Dane")}</Text>
        <UserDataCard />
        <Text accessibilityRole="header" style={s.heading}>{t("Informacje")}</Text>
        <AppAboutCard />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const createStyles = (colors: AppTheme) => StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 48, gap: 12, width: "100%", maxWidth: 600, alignSelf: "center" },
  title: { fontSize: 30, fontWeight: "700", color: colors.textPrimary },
  heading: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 16 },
  label: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { backgroundColor: colors.primarySurface, padding: 12, borderRadius: 12, minHeight: 48, minWidth: 48, justifyContent: "center", alignItems: "center" },
  active: { backgroundColor: colors.primary },
  disabled: { opacity: 0.6 },
  optionText: { color: colors.primaryText, fontSize: 16, fontWeight: "700" },
  activeText: { color: colors.onPrimary, fontSize: 16, fontWeight: "700" },
  sub: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
});
