import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { TabBarContext } from '@/context/tab-bar-context';
import { initializeDatabase } from '@/database/repository';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  return (
    <SQLiteProvider databaseName="prawo-jazdy.db" assetSource={{ assetId: require('@/assets/database/questions.db') }} onInit={initializeDatabase}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <TabBarContext value={{ isTabBarHidden, setIsTabBarHidden }}>
          <AnimatedSplashOverlay />
          <AppTabs />
        </TabBarContext>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
