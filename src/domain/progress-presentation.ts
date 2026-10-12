export const SCORE_MAX = 74;
export const SCORE_PASS = 68;
export const SCORE_PLOT_HEIGHT = 160;

export function scoreHeight(score: number) {
  return (Math.min(SCORE_MAX, Math.max(0, score)) / SCORE_MAX) * SCORE_PLOT_HEIGHT;
}

export function coveragePercent(answered: number, total: number) {
  return total > 0 ? Math.floor(Math.min(total, Math.max(0, answered)) / total * 100) : 0;
}

export function examDateLabels(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`,
    year: String(date.getFullYear()),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}
