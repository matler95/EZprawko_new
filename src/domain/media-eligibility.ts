/** Confirmed absent in R2 and the official archives. Keep source rows/history intact. */
export const quarantinedMediaQuestionIds = [11150, 13074] as const;
export const eligibleQuestionMediaSql = `q.id NOT IN (${quarantinedMediaQuestionIds.join(',')})`;
export const hasAvailableQuestionMedia = (id: number) =>
  !quarantinedMediaQuestionIds.some(missing => missing === id);
