import { cachedMediaUri } from '@/services/media-cache';

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
  const uniqueFilenames = [...new Set(filenames.filter(Boolean))];
  let completed = 0;

  for (const filename of uniqueFilenames) {
    if (!shouldContinue()) break;

    await cachedMediaUri(filename);
    completed += 1;
    onProgress?.({ completed, total: uniqueFilenames.length, filename });
  }

  return { completed, total: uniqueFilenames.length };
}
