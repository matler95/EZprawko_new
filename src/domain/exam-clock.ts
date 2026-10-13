export type ExamClock = { index: number; readingEndsAt: number; answeringEndsAt: number };
export function newExamClock(index: number, reading: number, answering: number, now = Date.now()): ExamClock {
  return { index, readingEndsAt: now + reading * 1000, answeringEndsAt: now + (reading + answering) * 1000 };
}
export function examClockState(clock: ExamClock, now = Date.now()) {
  const reading = now < clock.readingEndsAt;
  return { phase: reading ? 'READING' as const : 'ANSWERING' as const,
    seconds: Math.max(0, Math.ceil(((reading ? clock.readingEndsAt : clock.answeringEndsAt) - now) / 1000)),
    expired: now >= clock.answeringEndsAt };
}
