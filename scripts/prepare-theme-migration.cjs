// Produces an apply_patch document; it never writes application source files.
const fs = require('node:fs');
const targets = [
  ['src/components/dashboard-screen.tsx', 'DashboardScreen', 'styles'],
  ['src/app/study.tsx', 'StudyScreen', 's'],
  ['src/app/settings.tsx', 'SettingsScreen', 's'],
  ['src/app/progress.tsx', 'ProgressScreen', 's'],
  ['src/app/signs.tsx', 'SignsScreen', 's'],
  ['src/app/exam/[id].tsx', 'ExamScreen', 'styles'],
  ['src/app/exam/review.tsx', 'ExamReviewScreen', 'styles'],
  ['src/components/question-media.tsx', 'QuestionMedia', 'styles'],
  ['src/components/media-download-card.tsx', 'MediaDownloadCard', 'styles'],
];
const groups = {
  textPrimary: ['#18221D', '#1E3126', '#1B2921', '#26332B', '#F4F7FA'],
  textSecondary: ['#718076', '#526358', '#65756B', '#AAB5C2'],
  primaryText: ['#397355', '#287A50', '#216A49', '#1F704C', '#2B7A55', '#397D5B'],
  border: ['#DCE3DE', '#DDE5DF', '#E4E8E4'],
  primarySurface: ['#E6F0E5', '#EDF7EF', '#EEF1EE'],
  warning: ['#765B1B', '#573A08', '#8A520A', '#634D18', '#A65B0A'],
  warningSurface: ['#FFF0D8', '#FFF7E2'],
  warningBorder: ['#E8C77B'],
  successSurface: ['#E5F5E9', '#DDF3E4'],
  success: ['#2D9B5D'],
  errorSurface: ['#FCEBEC', '#FCE1E1'],
  error: ['#D95A5A', '#BA3636', '#F28B82', '#D23C3C', '#D96A6A'],
  disabledSurface: ['#B6C2BA', '#E7EAE8', '#43505C'],
  onPrimary: ['#FFF', '#FFFFFF'],
  brandMuted: ['#B9DABE', '#D8E9D8', '#E1F0E4'],
  onGold: ['#27301A', '#11202C'],
  accentGold: ['#F0C96A'],
  scrim: ['rgba(24,34,29,0.45)'],
};
function token(value, property) {
  value = value.toUpperCase();
  if (property === 'backgroundColor') {
    if (['#FFF', '#FFFFFF', '#18202A'].includes(value)) return 'surface';
    if (value === '#F7F8F5') return 'background';
    if (value === '#F0F2EF') return 'surfaceElevated';
    if (value === '#216A49') return 'brandSurface';
    if (value === '#1F704C') return 'primary';
    if (value === '#7F3131') return 'error';
    if (value === '#DDE5DF') return 'disabledSurface';
  }
  const group = Object.entries(groups).find(([, values]) => values.some((color) => color.toUpperCase() === value));
  if (!group) throw new Error(`Unmapped color ${value}`);
  return group[0];
}
function patchFile(path, before, after) {
  if (before === after) return '';
  return `*** Update File: ${path}\n@@\n${before.trimEnd().split('\n').map((line) => '-' + line).join('\n')}\n${after.trimEnd().split('\n').map((line) => '+' + line).join('\n')}\n`;
}
let patch = '*** Begin Patch\n';
for (const [path, component, styleName] of targets) {
  const before = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  if (before.includes('const createStyles =')) continue;
  let after = before;
  if (after.includes('import { useAppTheme }')) {
    after = after.replace('import { useAppTheme }', 'import { useAppTheme, type AppTheme }');
    after = after.replace('const { preference, setPreference } = useAppTheme();', `const { preference, setPreference, colors } = useAppTheme();\n  const ${styleName} = createStyles(colors);`);
  } else {
    after = `import { useAppTheme, type AppTheme } from "@/context/app-theme-context";\n${after}`;
    const start = after.indexOf('{', after.indexOf(`function ${component}(`));
    // QuestionMedia has destructured props; its body starts after the type.
    const bodyStart = component === 'QuestionMedia' ? after.indexOf('{', after.indexOf('}: QuestionMediaProps)')) : start;
    after = after.slice(0, bodyStart + 1) + `\n  const { colors } = useAppTheme();\n  const ${styleName} = createStyles(colors);` + after.slice(bodyStart + 1);
  }
  after = after.replace(`const ${styleName} = StyleSheet.create({`, 'const createStyles = (colors: AppTheme) => StyleSheet.create({');
  after = after.replace(/(color|backgroundColor|borderColor):\s*(['"])(#[0-9a-f]+|rgba\([^)]*\))\2/gi, (_, property, quote, value) => `${property}: colors.${token(value, property)}`);
  after = after.replace(/(placeholderTextColor|color)="(#[0-9a-f]+)"/gi, (_, property, value) => `${property}={colors.${token(value, 'color')}}`);
  // Conditional chart colors are expressions, not static style properties.
  after = after.replace(/item.passed \? "#F0C96A" : "#D96A6A"/g, 'item.passed ? colors.accentGold : colors.error');
  if (component === 'QuestionMedia') {
    after = after.replace('  const player = useVideoPlayer', '  const { colors } = useAppTheme();\n  const styles = createStyles(colors);\n  const player = useVideoPlayer');
  }
  patch += patchFile(path, before, after);
}
const indexPath = 'src/app/index.tsx';
const beforeIndex = fs.readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n');
if (beforeIndex.includes('Historical implementation retained temporarily')) {
  patch += patchFile(indexPath, beforeIndex, 'export { default } from "@/components/dashboard-screen";\n');
}
const webPath = 'src/components/app-tabs.web.tsx';
const webBefore = fs.readFileSync(webPath, 'utf8').replace(/\r\n/g, '\n');
const webAfter = `import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
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
`;
patch += patchFile(webPath, webBefore, webAfter);
process.stdout.write(patch + '*** End Patch\n');
