export type TimerLevel = "normal" | "warning" | "critical" | "expired";
export function questionTimerSeconds(clock: { key: string; seconds: number }, key: string, initialSeconds: number) {
  return clock.key === key ? clock.seconds : initialSeconds;
}
export function timerLevel(seconds: number, question: boolean, active: boolean): TimerLevel {
  if (!active) return "normal";
  if (seconds <= 0) return "expired";
  if (question ? seconds < 5 : seconds <= 30) return "critical";
  return seconds <= (question ? 10 : 60) ? "warning" : "normal";
}
