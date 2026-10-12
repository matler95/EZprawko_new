import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '@/context/app-theme-context';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function ExamTimer({ seconds, question = false, active = true }: { seconds: number; question?: boolean; active?: boolean }) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(1));
  const critical = seconds > 0 && seconds <= (question ? 5 : 30);
  const warning = seconds <= (question ? 10 : 60);

  useEffect(() => {
    if (!critical || !active || reducedMotion) { pulse.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.65, duration: 450, useNativeDriver: true, isInteraction: false }),
      Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.setValue(1); };
  }, [active, critical, pulse, reducedMotion]);

  const text = question ? `${seconds}s` : `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  return (
    <Animated.View style={[styles.badge, { opacity: pulse, backgroundColor: critical ? colors.errorSurface : warning ? colors.warningSurface : colors.primarySurface }]}>
      <Text accessibilityLabel={`${question ? 'Czas pytania' : 'Czas egzaminu'}: ${text}`} style={[styles.text, { color: critical ? colors.error : warning ? colors.warning : colors.primaryText }]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', minHeight: 44, minWidth: 48, paddingHorizontal: 12 },
  text: { fontVariant: ['tabular-nums'], fontWeight: '700' },
});
