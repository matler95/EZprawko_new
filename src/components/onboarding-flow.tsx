import { useTranslation } from '@/hooks/use-translation';
import { UiTokens } from '@/constants/ui-tokens';
import { useCallback, useContext, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppTheme } from '@/context/app-theme-context';
import { TabBarContext } from '@/context/tab-bar-context';
import { drivingCategories, categoryLabel as baseCategoryLabel, type DrivingCategory } from '@/domain/driving-categories';
import { questionLanguages } from '@/database/translations';
import { setUiLanguage } from '@/domain/ui-language';
import { emptyOnboarding, readOnboardingDraft, saveOnboardingDraft, finishOnboarding, type OnboardingDraft } from '@/database/onboarding';
import { LoadingError, LoadingSkeleton } from '@/components/skeleton';
import { AppButton, AppCard, AppStatus, AppHeading } from '@/components/ui/app-controls';
import { MediaAccountCard } from '@/components/media-account-card';

export type OnboardingDestination = 'study' | 'dashboard' | 'settings';
export function OnboardingFlow({ onComplete }: { onComplete: (category: DrivingCategory, destination: OnboardingDestination) => void }) {
  const { t, language } = useTranslation();
  const categoryLabel = (value: string) => baseCategoryLabel(value, language);
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const { setIsTabBarHidden } = useContext(TabBarContext);
  const [draft, setDraft] = useState<OnboardingDraft>({ ...emptyOnboarding });
  const [ready, setReady] = useState(false);
  const [failedRevision, setFailedRevision] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const readFailed = failedRevision === reload;
  const locked = useRef(false);
  const epoch = useRef(0);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    const request = ++epoch.current;
    focused.current = true;
    setReady(false); setBusy(locked.current);
    setIsTabBarHidden(true);
    void readOnboardingDraft(db).then(value => {
      if (request === epoch.current) { setUiLanguage(value.language); setDraft(value); setReady(true); setFailedRevision(null); }
    }).catch(() => { if (request === epoch.current) setFailedRevision(reload); });
    return () => { focused.current = false; epoch.current++; setIsTabBarHidden(false); };
  }, [db, reload, setIsTabBarHidden]));
  const changeStep = async (step: number) => {
    if (locked.current || (step > 1 && !draft.category)) return;
    locked.current = true; setBusy(true); setError(null);
    const request = epoch.current;
    try {
      const next = { ...draft, step };
      await saveOnboardingDraft(db, next);
      if (request === epoch.current) { setDraft(next); setDetailsExpanded(false); }
    } catch { if (request === epoch.current) setError(t("Nie zapisano tego kroku. Spróbuj ponownie.")); }
    finally { locked.current = false; if (focused.current) setBusy(false); }
  };
  const finish = async (destination: OnboardingDestination) => {
    if (locked.current || !draft.category) return;
    locked.current = true; setBusy(true); setError(null);
    const request = epoch.current;
    try {
      const category = await finishOnboarding(db, draft);
      if (request === epoch.current) onComplete(category, destination);
    } catch { if (request === epoch.current) setError(t("Nie udało się zakończyć konfiguracji. Ustawienia nie zostały zatwierdzone — spróbuj ponownie.")); }
    finally { locked.current = false; if (focused.current) setBusy(false); }
  };
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, gap: 16, flexGrow: 1, maxWidth: 600, width: '100%', alignSelf: 'center' },
    copy: { ...UiTokens.text.body, color: colors.textSecondary },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, choice: { minHeight: 64, minWidth: 72, padding: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primarySurface },
    chosen: { backgroundColor: colors.primary }, choiceText: { ...UiTokens.text.label, color: colors.primaryText }, chosenText: { color: colors.onPrimary },
  });
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <Text style={s.copy}>{t("EZprawko · Krok")} {draft.step + 1} {t("z 4")}</Text>
    {readFailed ? <LoadingError onRetry={() => setReload(value => value + 1)} /> : !ready ? <LoadingSkeleton variant="study" label={t("Wczytywanie konfiguracji")} /> : <>
      {draft.step === 1 ? <>
        <AppHeading level='screen'>{t("Jaką kategorię zdajesz?")}</AppHeading>
        <Text style={s.copy}>{t('Kategoria obowiązuje w Nauce i nowych egzaminach. Zmienisz ją później. PT to pozwolenie na tramwaj.')}</Text>
        <View style={s.grid}>{drivingCategories.map(category => <Pressable key={category} accessibilityRole="radio" accessibilityLabel={categoryLabel(category)} accessibilityState={{ checked: draft.category === category, disabled: busy }} disabled={busy} onPress={() => setDraft(value => ({ ...value, category }))} style={[s.choice, draft.category === category && s.chosen]}><Text style={[s.choiceText, draft.category === category && s.chosenText]}>{category}</Text></Pressable>)}</View>
      </> : draft.step === 0 ? <>
        <AppHeading level='screen'>{t('Wybierz język aplikacji')}</AppHeading>
        <View style={s.grid}>{questionLanguages.map(language => <Pressable key={language.code} accessibilityRole="radio" accessibilityState={{ checked: draft.language === language.code, disabled: busy }} disabled={busy} onPress={() => { setUiLanguage(language.code); setDraft(value => ({ ...value, language: language.code })); }} style={[s.choice, draft.language === language.code && s.chosen]}><Text style={[s.choiceText, draft.language === language.code && s.chosenText]}>{language.label}</Text></Pressable>)}</View>
        <Text style={s.copy}>{t('Ten język będzie używany w aplikacji i domyślnie w pytaniach. Język pytań możesz później ustawić osobno.')}</Text>
      </> : draft.step === 2 ? <>
        <AppHeading level='screen'>{t("Ucz się, potem sprawdź wynik")}</AppHeading>
        <AppCard><AppHeading>{t("Nauka — bez presji czasu")}</AppHeading><Text style={s.copy}>{t("Po odpowiedzi zobaczysz poprawny wybór i dostępne wyjaśnienie. Wracaj do pytań i powtarzaj błędy.")}</Text></AppCard>
        <AppCard><AppHeading>{t("Egzamin próbny — jak w WORD")}</AppHeading><Text style={s.copy}>{t("32 pytania, 25 minut, próg 68/74. Nie wracasz do poprzednich pytań; wynik i odpowiedzi zobaczysz na końcu.")}</Text></AppCard>
        <Text style={s.copy}>{t('Pobieranie zdjęć i filmów wymaga logowania.')}</Text>
        <Text style={s.copy}>{t('Zaloguj się teraz, aby przygotować egzamin w tle. Możesz też zrobić to później.')}</Text>
        <MediaAccountCard />
        <Text style={s.copy}>{t("Postępy zapisują się tylko na tym urządzeniu. Logowanie nie tworzy kopii ani synchronizacji w chmurze.")}</Text>
        <AppButton variant='link' label={t(detailsExpanded ? 'Ukryj informacje o materiałach offline' : 'Jak działają materiały offline?')}
          accessibilityState={{ expanded: detailsExpanded }} onPress={() => setDetailsExpanded(value => !value)} />
        {detailsExpanded && <Text style={s.copy}>{t('Pobrane materiały działają offline, dopóki są w pamięci podręcznej. Mogą zostać usunięte, aby zwolnić miejsce; wtedy wymagają ponownego pobrania.')}</Text>}
      </> : <>
        <AppHeading level='screen'>{t("Zacznij od pięciu pytań")}</AppHeading>
        <AppCard><AppHeading>{categoryLabel(draft.category ?? '')}</AppHeading><Text style={s.copy}>{t("Pytania:")} {questionLanguages.find(value => value.code === draft.language)?.label}{t(". Krótka sesja pytań za 3 punkty — bez zegara.")}</Text></AppCard>
        <Text style={s.copy}>{t("Przypomnienia są opcjonalne. Możesz ustawić godzinę w Ustawieniach i dopiero wtedy zdecydować o zgodzie na powiadomienia.")}</Text>
        <View style={{ flexGrow: 1 }} />
        <AppButton busy={busy} label={busy ? t("Zapisywanie…") : t("Zacznij pierwsze 5 pytań")} onPress={() => void finish('study')} />
        <AppButton variant="link" disabled={busy} label={t("Na razie przejdź do panelu")} onPress={() => void finish('dashboard')} />
        <AppButton variant="link" disabled={busy} label={t("Ustaw konto lub przypomnienie")} onPress={() => void finish('settings')} />
      </>}
      {draft.step < 3 && <View style={{ flexGrow: 1 }} />}
      {error ? <AppStatus tone="error" message={t(error)} /> : null}
      {draft.step < 3 ? <AppButton busy={busy} disabled={draft.step === 1 && !draft.category} label={busy ? t("Zapisywanie…") : t("Dalej")} onPress={() => void changeStep(draft.step + 1)} /> : null}
      {draft.step > 0 ? <AppButton variant="link" disabled={busy} label={t("Wstecz")} onPress={() => void changeStep(draft.step - 1)} /> : null}
    </>}
  </ScrollView></SafeAreaView>;
}
