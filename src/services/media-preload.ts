import { cachedMediaUri } from '@/services/media-cache';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { deliveredMediaFilename } from '@/config/media';
import type { MediaDownloadPriority } from '@/services/media-download-queue';

export type MediaPreloadProgress = {
  completed: number;
  total: number;
  filename: string;
};

/**
 * Two workers, backed by the shared transfer queue. Cancellation stops new work
 * and progress; already running downloads settle before releasing the caller.
 */
export async function preloadMedia(
  filenames: readonly string[],
  onProgress?: (progress: MediaPreloadProgress) => void,
  shouldContinue: () => boolean = () => true,
  priority: MediaDownloadPriority = 'background',
) {
  const revision = userDataRevision();
  const uniqueFilenames = [...new Set(filenames.filter(Boolean).map(deliveredMediaFilename))];
  let completed = 0;
  let next = 0;
  let stopped = false;
  onProgress?.({ completed, total: uniqueFilenames.length, filename: '' });

  const worker = async () => {
    while (next < uniqueFilenames.length && !stopped && shouldContinue() && userDataWritable(revision)) {
      const filename = uniqueFilenames[next++];
      try {
        const uri = await cachedMediaUri(filename, false, priority);
        if (!uri) throw new Error('Nie udało się przygotować materiału. Sprawdź konfigurację i zaloguj się w Ustawieniach.');
        if (!shouldContinue() || !userDataWritable(revision)) break;
        completed += 1;
        onProgress?.({ completed, total: uniqueFilenames.length, filename });
      } catch (error) { stopped = true; throw error; }
    }
  };
  const results = await Promise.allSettled([worker(), worker()]);
  const failed = results.find(result => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;

  return { completed, total: uniqueFilenames.length };
}

/** Warm only the exact exam pool before the new session clock is committed.
 * Final cache-only verification detects eviction during preparation; no claim
 * is made about native decoding or the OS preserving cache forever. */
export async function prepareExamMedia(
  questions: readonly { mediaFilename: string | null }[],
  onProgress?: (progress: MediaPreloadProgress) => void,
  shouldContinue: () => boolean = () => true,
  priority: MediaDownloadPriority = 'foreground',
) {
  const revision = userDataRevision();
  const files = [...new Set(questions.map(q => q.mediaFilename).filter((name): name is string => Boolean(name)))];
  const result = await preloadMedia(files, onProgress, shouldContinue, priority);
  if (!shouldContinue() || !userDataWritable(revision) || result.completed !== result.total) throw new Error('Przygotowanie egzaminu zostało przerwane.');
  for (const file of files) {
    if (!shouldContinue() || !userDataWritable(revision)) throw new Error('Przygotowanie egzaminu zostało przerwane.');
    if (!await cachedMediaUri(file, true)) throw new Error('Nie wszystkie materiały mieszczą się w cache lub są dostępne. Zwolnij miejsce i spróbuj ponownie.');
  }
  return result;
}
