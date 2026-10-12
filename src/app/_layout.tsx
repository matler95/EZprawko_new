import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { TabBarContext } from '@/context/tab-bar-context';
import { AppThemeContext } from '@/context/app-theme-context';
import { initializeDatabase, setThemePreference, themePreference, type ThemePreference } from '@/database/repository';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  return (
    <SQLiteProvider databaseName="prawo-jazdy.db" assetSource={{ assetId: require('@/assets/database/questions.db') }} onInit={initializeDatabase}>
      <ThemePreferenceLoader preference={preference} setPreference={setPreference}>
      <ThemeProvider value={(preference === 'dark' || (preference === 'system' && colorScheme === 'dark')) ? DarkTheme : DefaultTheme}>
        <AppThemeContext value={{ preference, setPreference: (value) => { setPreference(value); }, colors: Colors[(preference === 'dark' || (preference === 'system' && colorScheme === 'dark')) ? 'dark' : 'light'] }}>
        <TabBarContext value={{ isTabBarHidden, setIsTabBarHidden }}>
          <AnimatedSplashOverlay />
          <AppTabs />
        </TabBarContext>
        </AppThemeContext>
      </ThemeProvider>
      </ThemePreferenceLoader>
    </SQLiteProvider>
  );
}

function ThemePreferenceLoader({ children, preference, setPreference }: { children: React.ReactNode; preference: ThemePreference; setPreference: (value: ThemePreference) => void }) {
  const db = useSQLiteContext();
  useEffect(() => { void themePreference(db).then(setPreference); }, [db, setPreference]);
  return <AppThemeContext value={{ preference, setPreference: (value) => { setPreference(value); void setThemePreference(db, value); }, colors: Colors.light }}>{children}</AppThemeContext>;
}
