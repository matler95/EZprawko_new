import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/context/app-theme-context';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function AnimatedProgress({ progress }: { progress: number }) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const value = Math.max(0, Math.min(1, progress));
  const [animated] = useState(() => new Animated.Value(value));
  useEffect(() => {
    const animation = Animated.timing(animated, { toValue: value, duration: reducedMotion ? 0 : 250, useNativeDriver: false, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [animated, reducedMotion, value]);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={[styles.track, { backgroundColor: colors.disabledSurface }]}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.primaryText, width: animated.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}
const styles = StyleSheet.create({ track: { borderRadius: 4, height: 6, marginHorizontal: 24, overflow: 'hidden' }, fill: { height: '100%' } });
