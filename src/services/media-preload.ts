import { cachedMediaUri } from '@/services/media-cache';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';

export type MediaPreloadProgress = {
  completed: number;
  total: number;
  filename: string;
};

/**
 * Downloads a bounded set of question assets one at a time. Serial delivery
 * avoids competing with the active exam player's network and keeps progress
 * meaningful on limited mobile connections.
 */
export async function preloadMedia(
  filenames: readonly string[],
  onProgress?: (progress: MediaPreloadProgress) => void,
  shouldContinue: () => boolean = () => true,
) {
  const revision = userDataRevision();
  const uniqueFilenames = [...new Set(filenames.filter(Boolean))];
  let completed = 0;
  onProgress?.({ completed, total: uniqueFilenames.length, filename: '' });

  for (const filename of uniqueFilenames) {
    if (!shouldContinue() || !userDataWritable(revision)) break;

    const uri = await cachedMediaUri(filename);
    if (!uri) throw new Error('Nie udało się przygotować materiału. Sprawdź konfigurację i zaloguj się w Ustawieniach.');
    if (!shouldContinue() || !userDataWritable(revision)) break;
    completed += 1;
    onProgress?.({ completed, total: uniqueFilenames.length, filename });
  }

  return { completed, total: uniqueFilenames.length };
}

/** Warm only the exact exam pool before the new session clock is committed.
 * Final cache-only verification detects eviction during preparation; no claim
 * is made about native decoding or the OS preserving cache forever. */
export async function prepareExamMedia(
  questions: readonly { mediaFilename: string | null }[],
  onProgress?: (progress: MediaPreloadProgress) => void,
  shouldContinue: () => boolean = () => true,
) {
  const revision = userDataRevision();
  const files = [...new Set(questions.map(q => q.mediaFilename).filter((name): name is string => Boolean(name)))];
  const result = await preloadMedia(files, onProgress, shouldContinue);
  if (!shouldContinue() || !userDataWritable(revision) || result.completed !== result.total) throw new Error('Przygotowanie egzaminu zostało przerwane.');
  for (const file of files) {
    if (!shouldContinue() || !userDataWritable(revision)) throw new Error('Przygotowanie egzaminu zostało przerwane.');
    if (!await cachedMediaUri(file, true)) throw new Error('Nie wszystkie materiały mieszczą się w cache lub są dostępne. Zwolnij miejsce i spróbuj ponownie.');
  }
  return result;
}
