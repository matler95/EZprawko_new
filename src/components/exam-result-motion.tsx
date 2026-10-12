import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { useIsFocused } from "expo-router";
import { useMotionPreference } from "@/hooks/use-reduced-motion";
import { useAppTheme } from "@/context/app-theme-context";

export function AnimatedExamScore({ score, sessionId, style }: { score: number; sessionId: string; style?: StyleProp<TextStyle> }) {
  const { reduced, ready } = useMotionPreference();
  const focused = useIsFocused();
  const [value] = useState(() => new Animated.Value(0));
  const [displayed, setDisplayed] = useState(0);
  const lastSession = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const listener = value.addListener(({ value: current }) => setDisplayed(Math.max(0, Math.min(score, Math.round(current)))));
    if (reduced || !focused || lastSession.current === sessionId) {
      lastSession.current = sessionId;
      value.setValue(score);
      return () => value.removeListener(listener);
    }
    lastSession.current = sessionId;
    value.setValue(0);
    const animation = Animated.timing(value, { toValue: score, duration: 900, useNativeDriver: false, isInteraction: false });
    animation.start(({ finished }) => { if (finished) setDisplayed(score); });
    return () => { animation.stop(); value.removeListener(listener); };
  }, [focused, ready, reduced, score, sessionId, value]);
  return <Text style={style} accessibilityLabel={`Wynik egzaminu: ${score} z 74 punktów`}>
    {!ready ? "—" : reduced || !focused ? score : displayed}/74
  </Text>;
}

/** One restrained green/gold halo; no full-screen flashes or particle pack. */
export function SuccessBadge({ inverse = false }: { inverse?: boolean }) {
  const { colors } = useAppTheme();
  const { reduced, ready } = useMotionPreference();
  const focused = useIsFocused();
  const played = useRef(false);
  const [halo] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!ready) return;
    if (reduced || !focused || played.current) { played.current = true; halo.setValue(1); return; }
    played.current = true;
    halo.setValue(0);
    const animation = Animated.timing(halo, { toValue: 1, duration: 650, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => { animation.stop(); halo.setValue(1); };
  }, [focused, halo, ready, reduced]);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.badge}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.halo, {
      backgroundColor: inverse ? colors.accentGold : colors.successSurface,
      opacity: halo.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.6, 0] }),
      transform: [{ scale: halo.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1] }) }],
    }]} />
    <Text style={[styles.check, { color: inverse ? colors.onPrimary : colors.success }]}>✓</Text>
  </View>;
}
const styles = StyleSheet.create({
  badge: { height: 80, width: 80, alignItems: "center", justifyContent: "center" },
  halo: { borderRadius: 40 }, check: { fontSize: 48, fontWeight: "700" },
});
