import { useTranslation } from '@/hooks/use-translation';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack, router, useRootNavigationState, useNavigationContainerRef, usePathname } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, useColorScheme, View } from 'react-native';
import { DataMaintenanceContext } from '@/context/data-maintenance-context';
import { withDataMaintenance } from '@/domain/data-maintenance';

import { TabBarContext } from '@/context/tab-bar-context';
import { AppThemeContext } from '@/context/app-theme-context';
import { initializeDatabase, selectedCategory, setSelectedCategory, setThemePreference, themePreference, hasCompletedOnboarding, type ThemePreference } from '@/database/repository';
import { TargetCategoryContext } from '@/context/target-category-context';
import type { DrivingCategory } from '@/domain/driving-categories';
import { Colors } from '@/constants/theme';
import { ErrorBoundary, ScreenErrorBoundary } from '@/components/error-boundary';
import { ExamPreparation } from '@/components/exam-preparation';
import { readUiLanguage } from '@/database/ui-language';
import { setUiLanguage } from '@/domain/ui-language';
import { refreshDailyReminderLanguage } from '@/services/reminders';

export const unstable_settings = { initialRouteName: '(tabs)', screenErrorBoundary: ScreenErrorBoundary };

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const { t } = useTranslation();
  const [maintenance, setMaintenance] = useState(false);
  const [dataEpoch, setDataEpoch] = useState(0);
  const maintenanceLock = useRef(false);
  return (
    <DataMaintenanceContext value={(operation) => {
      if (maintenanceLock.current) return;
      maintenanceLock.current = true; setMaintenance(true);
      void withDataMaintenance(operation)
        .then((message) => Alert.alert(t('Dane aplikacji'), t(message)))
        .catch(() => Alert.alert(t('Operacja nie została ukończona'), t('Część kroków mogła zostać wykonana. Nie potwierdzamy pełnego usunięcia. Spróbuj ponownie; nie usuwamy konta ani danych serwerowych.')))
        .finally(() => { maintenanceLock.current = false; setDataEpoch((value) => value + 1); setMaintenance(false); });
    }}>
    <ErrorBoundary>{(recoverHome) => (
      <SQLiteProvider databaseName="prawo-jazdy.db" assetSource={{ assetId: require('@/assets/database/questions.db') }} onInit={initializeDatabase}>
        {maintenance ? <MaintenanceIndicator />
          : <AppAppearance key={dataEpoch} recoverHome={recoverHome || dataEpoch > 0} />}
      </SQLiteProvider>
    )}</ErrorBoundary>
    </DataMaintenanceContext>
  );
}

function MaintenanceIndicator() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: colors.background }}>
    <ActivityIndicator color={colors.primaryText} /><Text accessibilityRole="alert" style={{ color: colors.textPrimary, fontSize: 16 }}>{t("Porządkowanie danych lokalnych…")}</Text>
  </View>;
}

function AppAppearance({ recoverHome }: { recoverHome: boolean }) {
  const { t, language } = useTranslation();
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [appearanceLoaded, setAppearanceLoaded] = useState(false);
  const [initialReadFailed, setInitialReadFailed] = useState(false);
  const [category, setCategory] = useState<DrivingCategory>('B');
  const [categoryChanging, setCategoryChanging] = useState(false);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const categoryLock = useRef(false);
  const themeLock = useRef(false);
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const navigation = useNavigationContainerRef();
  const rootState = useRootNavigationState();
  const pathname = usePathname();
  const recoveryHandled = useRef(false);
  useEffect(() => {
    if (appearanceLoaded) void refreshDailyReminderLanguage(db).catch(() => undefined);
  }, [appearanceLoaded, db, language]);
  useEffect(() => {
    let active = true;
    const guarded = pathname === '/study' || pathname === '/progress' || pathname === '/signs' || pathname.startsWith('/exam/');
    if (onboardingRequired && rootState?.key && navigation.isReady()) {
      void Promise.all([hasCompletedOnboarding(db), selectedCategory(db)]).then(([completed, persisted]) => {
        if (!active) return;
        if (completed) { setCategory(persisted); setOnboardingRequired(false); }
        else if (guarded) router.replace('/');
      }).catch(() => { if (active) setInitialReadFailed(true); });
    }
    return () => { active = false; };
  }, [db, navigation, onboardingRequired, pathname, rootState?.key]);
  useEffect(() => {
    if (recoverHome && !recoveryHandled.current && appearanceLoaded && rootState?.key && navigation.isReady()) {
      recoveryHandled.current = true;
      router.replace('/');
    }
  }, [appearanceLoaded, navigation, recoverHome, rootState?.key]);
  useEffect(() => {
    let active = true;
    void Promise.all([themePreference(db), selectedCategory(db), hasCompletedOnboarding(db), readUiLanguage(db)]).then(([value, target, completed, locale]) => { if (active) { setUiLanguage(locale); setPreference(value); setCategory(target); setOnboardingRequired(!completed); } })
      .catch(() => { if (active) setInitialReadFailed(true); })
      .finally(() => { if (active) setAppearanceLoaded(true); });
    return () => { active = false; };
  }, [db]);
  const dark = preference === 'dark' || (preference === 'system' && colorScheme === 'dark');
  const colors = Colors[dark ? 'dark' : 'light'];
  if (!appearanceLoaded) return null;
  if (initialReadFailed) throw new Error(t("Nie udało się odczytać ustawień aplikacji. Spróbuj ponownie."));
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={() => { void SplashScreen.hideAsync(); }}>
      <ThemeProvider value={{ ...(dark ? DarkTheme : DefaultTheme), colors: { ...(dark ? DarkTheme : DefaultTheme).colors, background: colors.background, card: colors.surface, text: colors.textPrimary, border: colors.border, primary: colors.primaryText } }}>
        <AppThemeContext value={{ preference, setPreference: async (value) => {
          if (themeLock.current) return false;
          themeLock.current = true;
          try { await setThemePreference(db, value); setPreference(value); return true; }
          catch { return false; }
          finally { themeLock.current = false; }
        }, colors }}>
        <TargetCategoryContext value={{ category, changing: categoryChanging, error: categoryError, setCategory: async (value) => {
          if (categoryLock.current) return false;
          categoryLock.current = true; setCategoryChanging(true); setCategoryError(null);
          try { await setSelectedCategory(db, value); setCategory(value); return true; }
          catch { setCategoryError('Nie udało się zapisać kategorii. Spróbuj ponownie.'); return false; }
          finally { categoryLock.current = false; setCategoryChanging(false); }
        }, acceptPersistedCategory: (value) => { setCategory(value); setCategoryError(null); setOnboardingRequired(false); } }}>
        <TabBarContext value={{ isTabBarHidden: isTabBarHidden || onboardingRequired, setIsTabBarHidden }}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="exam/[id]" options={{ gestureEnabled: false }} />
            <Stack.Screen name="exam/review" />
            <Stack.Screen name="legal/privacy" />
            <Stack.Screen name="legal/terms" />
          </Stack>
          <ExamPreparation />
        </TabBarContext>
        </TargetCategoryContext>
        </AppThemeContext>
      </ThemeProvider>
    </View>
  );
}
