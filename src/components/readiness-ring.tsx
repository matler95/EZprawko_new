import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/context/app-theme-context';

export function ReadinessRing({ value }: { value: number | null }) {
  const { colors } = useAppTheme();
  const percentage = Math.max(0, Math.min(100, value ?? 0));
  return (
    <View accessible accessibilityLabel={value === null ? 'Brak ukończonych egzaminów' : `Zdawalność ostatnich prób: ${percentage}%`} style={styles.ring}>
      {Array.from({ length: 32 }, (_, index) => {
        const angle = index * Math.PI / 16;
        return <View key={index} style={[styles.segment, { backgroundColor: index < Math.round(percentage * 32 / 100) ? colors.primaryText : colors.disabledSurface, left: 42 + 35 * Math.sin(angle) - 2, top: 42 - 35 * Math.cos(angle) - 4, transform: [{ rotate: `${index * 360 / 32}deg` }] }]} />;
      })}
      <Text style={[styles.value, { color: colors.primaryText }]}>{value === null ? '—' : `${percentage}%`}</Text>
    </View>
  );
}
const styles = StyleSheet.create({ ring: { alignItems: 'center', height: 84, justifyContent: 'center', width: 84 }, segment: { borderRadius: 2, height: 8, position: 'absolute', width: 4 }, value: { fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '700' } });
