import { useTranslation } from '@/hooks/use-translation';
import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';

import { useAppTheme } from '@/context/app-theme-context';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { timerLevel } from '@/domain/timer-presentation';

export function ExamTimer({ seconds, question = false, active = true }: { seconds: number; question?: boolean; active?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const warned = useRef(false);
  const [pulse] = useState(() => new Animated.Value(1));
  const level = timerLevel(seconds, question, active);
  const critical = level === 'critical';
  const warning = level === 'warning';
  const danger = critical || level === 'expired';

  useEffect(() => {
    if (!question || !critical || !active || !focused || reducedMotion || warned.current || AppState.currentState !== 'active') return;
    warned.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  }, [active, critical, focused, question, reducedMotion, seconds]);

  useEffect(() => {
    if (!critical || !active || !focused || reducedMotion) { pulse.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.8, duration: 450, useNativeDriver: true, isInteraction: false }),
      Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.setValue(1); };
  }, [active, critical, focused, pulse, reducedMotion]);

  const text = question ? `${seconds}s` : `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  return (
    <View style={[styles.badge, { backgroundColor: danger ? colors.errorSurface : warning ? colors.warningSurface : colors.primarySurface }]}>
      {danger ? <Animated.View accessible={false} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, { opacity: pulse, borderColor: colors.error }]} /> : null}
      <Text accessibilityLabel={`${question ? t("Czas pytania") : t("Czas egzaminu")}: ${text}${level === 'expired' ? t(", czas upłynął") : danger ? t(", czas na ukończeniu") : warning ? t(", kończy się czas") : ''}`} style={[styles.text, { color: danger ? colors.error : warning ? colors.warning : colors.primaryText }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', minHeight: 44, minWidth: 48, paddingHorizontal: 12 },
  text: { fontVariant: ['tabular-nums'], fontWeight: '700' },
  outline: { borderRadius: 12, borderWidth: 2 },
});
