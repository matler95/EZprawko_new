import { useEffect, useState, type ReactNode } from "react";
import { Animated } from "react-native";
import { useIsFocused } from "expo-router";
import { useMotionPreference } from "@/hooks/use-reduced-motion";

/** Visual-only entry: no completion callback controls answering or the clock. */
export function QuestionTransition({ children }: { children: ReactNode }) {
  const { reduced, ready } = useMotionPreference();
  const focused = useIsFocused();
  const [offset] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!ready || reduced || !focused) { offset.setValue(0); return; }
    offset.setValue(16);
    const animation = Animated.timing(offset, { toValue: 0, duration: 180, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => { animation.stop(); offset.setValue(0); };
  }, [focused, offset, ready, reduced]);
  return <Animated.View style={{ transform: [{ translateX: offset }] }}>{children}</Animated.View>;
}
