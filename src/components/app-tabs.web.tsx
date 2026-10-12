import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/context/app-theme-context';
import { TabBarContext } from '@/context/tab-bar-context';

export default function AppTabs() {
  const { colors } = useAppTheme();
  const { isTabBarHidden } = useContext(TabBarContext);
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.background }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={[styles.list, { display: isTabBarHidden ? 'none' : 'flex', backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.brand}><Text style={{ color: colors.primaryText, fontWeight: '700' }}>EZprawko</Text></View>
        <TabTrigger name="home" href="/" asChild><Pressable style={styles.tab}><Text style={{ color: colors.textPrimary }}>Start</Text></Pressable></TabTrigger>
        <TabTrigger name="study" href="/study" asChild><Pressable style={styles.tab}><Text style={{ color: colors.textPrimary }}>Nauka</Text></Pressable></TabTrigger>
        <TabTrigger name="progress" href="/progress" asChild><Pressable style={styles.tab}><Text style={{ color: colors.textPrimary }}>Postęp</Text></Pressable></TabTrigger>
        <TabTrigger name="settings" href="/settings" asChild><Pressable style={styles.tab}><Text style={{ color: colors.textPrimary }}>Ustawienia</Text></Pressable></TabTrigger>
        <TabTrigger name="signs" href="/signs" asChild><Pressable style={styles.tab}><Text style={{ color: colors.textPrimary }}>Znaki</Text></Pressable></TabTrigger>
      </TabList>
    </Tabs>
  );
}
const styles = StyleSheet.create({ list: { alignItems: 'center', borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 8 }, brand: { marginHorizontal: 16 }, tab: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 } });
