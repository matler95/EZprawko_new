import { DarkTheme, DefaultTheme, ThemeProvider, router, useRootNavigationState, useNavigationContainerRef } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useColorScheme, View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { TabBarContext } from '@/context/tab-bar-context';
import { AppThemeContext } from '@/context/app-theme-context';
import { initializeDatabase, setThemePreference, themePreference, type ThemePreference } from '@/database/repository';
import { Colors } from '@/constants/theme';
import { ErrorBoundary, ScreenErrorBoundary } from '@/components/error-boundary';

export const unstable_settings = { screenErrorBoundary: ScreenErrorBoundary };

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <ErrorBoundary>{(recoverHome) => (
      <SQLiteProvider databaseName="prawo-jazdy.db" assetSource={{ assetId: require('@/assets/database/questions.db') }} onInit={initializeDatabase}>
        <AppAppearance recoverHome={recoverHome} />
      </SQLiteProvider>
    )}</ErrorBoundary>
  );
}

function AppAppearance({ recoverHome }: { recoverHome: boolean }) {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [appearanceLoaded, setAppearanceLoaded] = useState(false);
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const navigation = useNavigationContainerRef();
  const rootState = useRootNavigationState();
  const recoveryHandled = useRef(false);
  useEffect(() => {
    if (recoverHome && !recoveryHandled.current && appearanceLoaded && rootState?.key && navigation.isReady()) {
      recoveryHandled.current = true;
      router.replace('/');
    }
  }, [appearanceLoaded, navigation, recoverHome, rootState?.key]);
  useEffect(() => {
    let active = true;
    void themePreference(db).then((value) => { if (active) setPreference(value); })
      .catch(() => undefined)
      .finally(() => { if (active) setAppearanceLoaded(true); });
    return () => { active = false; };
  }, [db]);
  const dark = preference === 'dark' || (preference === 'system' && colorScheme === 'dark');
  const colors = Colors[dark ? 'dark' : 'light'];
  if (!appearanceLoaded) return null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={() => { void SplashScreen.hideAsync(); }}>
      <ThemeProvider value={{ ...(dark ? DarkTheme : DefaultTheme), colors: { ...(dark ? DarkTheme : DefaultTheme).colors, background: colors.background, card: colors.surface, text: colors.textPrimary, border: colors.border, primary: colors.primaryText } }}>
        <AppThemeContext value={{ preference, setPreference: (value) => { setPreference(value); void setThemePreference(db, value); }, colors }}>
        <TabBarContext value={{ isTabBarHidden, setIsTabBarHidden }}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <AppTabs />
        </TabBarContext>
        </AppThemeContext>
      </ThemeProvider>
    </View>
  );
}
