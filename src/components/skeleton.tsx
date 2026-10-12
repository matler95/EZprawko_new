import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type DimensionValue } from "react-native";
import { useIsFocused } from "expo-router";
import { useAppTheme, type AppTheme } from "@/context/app-theme-context";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function Skeleton({ width = "100%", height = 16, radius = 8 }: { width?: DimensionValue; height?: number; radius?: number }) {
  const { colors } = useAppTheme();
  return <View accessible={false} style={{ width, height, borderRadius: radius, backgroundColor: colors.disabledSurface }} />;
}

export function LoadingSkeleton({ variant, label }: { variant: "dashboard" | "study" | "progress"; label?: string }) {
  const { colors } = useAppTheme();
  const s = styles(colors);
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    opacity.setValue(1);
    if (reduced || !focused) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.55, duration: 800, useNativeDriver: true, isInteraction: false }),
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); opacity.setValue(1); };
  }, [focused, opacity, reduced]);
  return <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={label ?? "Wczytywanie danych"} accessibilityState={{ busy: true }} style={{ opacity }}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.group}>
      {variant === "dashboard" ? <>
        <Skeleton width="48%" height={28} /><Skeleton width="64%" />
        <View style={s.card}><Skeleton width="44%" /><Skeleton height={32} width="84%" /><Skeleton height={32} width="64%" /><Skeleton height={56} radius={16} /></View>
        <View style={s.row}><View style={s.column}><Skeleton width="88%" height={20} /><Skeleton width="76%" /></View><Skeleton width={72} height={72} radius={36} /></View>
      </> : variant === "progress" ? <>
        <View style={s.card}><Skeleton width="28%" height={40} /><Skeleton width="64%" /></View>
        <Skeleton width="48%" height={20} /><Skeleton height={154} radius={16} />
      </> : <><Skeleton width="56%" height={20} /><View style={s.card}><Skeleton width="84%" /><Skeleton width="60%" /></View></>}
      {[0, 1, 2].map((key) => <View key={key} style={s.card}><Skeleton width="32%" height={12} /><Skeleton width="92%" /><Skeleton width="68%" /></View>)}
    </View>
  </Animated.View>;
}

export function LoadingError({ onRetry }: { onRetry: () => void }) {
  const { colors } = useAppTheme();
  const s = styles(colors);
  return <View style={s.card}>
    <Text accessibilityRole="alert" style={s.copy}>Nie udało się wczytać danych. Spróbuj ponownie.</Text>
    <Pressable accessibilityRole="button" onPress={onRetry} style={s.retry}><Text style={s.retryText}>Ponów odczyt</Text></Pressable>
  </View>;
}
const styles = (colors: AppTheme) => StyleSheet.create({
  group: { gap: 16 }, card: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 16, padding: 24, backgroundColor: colors.surface, borderRadius: 20 },
  column: { flex: 1, gap: 12 }, copy: { color: colors.textSecondary, lineHeight: 22 },
  retry: { minHeight: 48, backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center" },
  retryText: { color: colors.onPrimary, fontWeight: "700" },
});
