export type ExamClock = { index: number; readingEndsAt: number; answeringEndsAt: number; videoDurationSeconds?: number; videoFinishedAt?: number };
export function newExamClock(index: number, reading: number, answering: number, now = Date.now()): ExamClock {
  return { index, readingEndsAt: now + reading * 1000, answeringEndsAt: now + (reading + answering) * 1000 };
}
export function examClockState(clock: ExamClock, now = Date.now()) {
  const reading = now < clock.readingEndsAt;
  if (!reading && clock.videoDurationSeconds !== undefined && clock.videoFinishedAt === undefined) {
    return { phase: 'MEDIA' as const,
      seconds: clock.videoDurationSeconds < 0 ? 0 : Math.max(0, Math.ceil((clock.readingEndsAt + clock.videoDurationSeconds * 1000 - now) / 1000)),
      expired: false };
  }
  return { phase: reading ? 'READING' as const : 'ANSWERING' as const,
    seconds: Math.max(0, Math.ceil(((reading ? clock.readingEndsAt : clock.answeringEndsAt) - now) / 1000)),
    expired: now >= clock.answeringEndsAt };
}

export const isExamVideo = (filename?: string | null) => Boolean(filename && /\.(wmv|mp4|m4v|mov)$/i.test(filename));
