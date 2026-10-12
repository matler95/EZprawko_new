export function localDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function ordinal(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, date) / 86400000);
}
export function learningStreak(days: string[], today: string) {
  const end = ordinal(today);
  const ordered = [...new Set(days)].filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    new Date(ordinal(day) * 86400000).toISOString().slice(0, 10) === day && ordinal(day) <= end).map(ordinal).sort((a, b) => a - b);
  let run = 0, best = 0, previous = -Infinity;
  for (const day of ordered) { run = day === previous + 1 ? run + 1 : 1; best = Math.max(best, run); previous = day; }
  return { current: previous === end || previous === end - 1 ? run : 0, best, todayActive: previous === end };
}
