import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useMotionPreference() {
  // Avoid animation until the device's preference is known.
  const [preference, setPreference] = useState({ reduced: true, ready: false });
  useEffect(() => {
    let active = true;
    let changed = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active && !changed) setPreference({ reduced: value, ready: true });
    }).catch(() => { if (active && !changed) setPreference({ reduced: true, ready: true }); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      changed = true;
      if (active) setPreference({ reduced, ready: true });
    });
    return () => { active = false; subscription.remove(); };
  }, []);
  return preference;
}

export function useReducedMotion() {
  return useMotionPreference().reduced;
}
