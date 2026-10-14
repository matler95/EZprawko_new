import { cachedMediaUri } from '@/services/media-cache';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { deliveredMediaFilename, deliveredMediaKey, mediaSizeBytes } from '@/config/media';
import { MEDIA_POLICY } from '@/domain/media-policy';
import type { MediaDownloadPriority } from '@/services/media-download-queue';
import { primeMediaGrants } from '@/services/media-auth';

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
  backgroundBytes: number = MEDIA_POLICY.speculationBytes,
  getPriority: () => MediaDownloadPriority = () => priority,
) {
  const revision = userDataRevision();
  const uniqueFilenames = [...new Map(filenames.filter(Boolean).map(deliveredMediaFilename).map(name => [deliveredMediaKey?.(name) ?? name,name])).values()];
  if (priority === 'background' && mediaSizeBytes) {
    let admittedBytes = 0;
    for (let i = 0; i < uniqueFilenames.length;) {
      const filename = uniqueFilenames[i];
      if (await cachedMediaUri(filename, true)) { i++; continue; }
      const size = mediaSizeBytes(filename);
      if (!size || admittedBytes + size > backgroundBytes) { uniqueFilenames.splice(i); break; }
      admittedBytes += size; i++;
    }
  }
  const total = uniqueFilenames.length;
  let completed = 0;
  const missingFilenames: string[] = [];
  for (const filename of uniqueFilenames) {
    if (!shouldContinue() || !userDataWritable(revision)) break;
    if (await cachedMediaUri(filename, true)) completed++;
    else missingFilenames.push(filename);
  }
  let next = 0;
  let stopped = false;
  const grantGroups = new Map<number, Promise<void>>();
  const primeGroup = (index: number) => {
    if (!primeMediaGrants) return Promise.resolve();
    const group = Math.floor(index/8);
    const previous = grantGroups.get(group);
    if (previous) return previous;
    const request = (async () => {
      const keys = await Promise.all(missingFilenames.slice(group*8,group*8+8).map(async name =>
        await cachedMediaUri(name,true) ? undefined : deliveredMediaKey?.(name) ?? name));
      const missing = keys.filter((key): key is string => Boolean(key));
      if (missing.length && shouldContinue() && userDataWritable(revision)) await primeMediaGrants(missing);
    })();
    grantGroups.set(group,request);
    return request;
  };
  if (shouldContinue() && userDataWritable(revision)) onProgress?.({ completed, total, filename: '' });

  const worker = async () => {
    while (next < missingFilenames.length && !stopped && shouldContinue() && userDataWritable(revision)) {
      const fileIndex = next++;
      const filename = missingFilenames[fileIndex];
      try {
        await primeGroup(fileIndex);
        if (!shouldContinue() || !userDataWritable(revision)) break;
        const uri = await cachedMediaUri(filename, false, getPriority(), shouldContinue);
        if (!shouldContinue() || !userDataWritable(revision)) break;
        if (!uri) throw new Error('Nie udało się przygotować materiału. Sprawdź konfigurację i zaloguj się w Ustawieniach.');
        if (!shouldContinue() || !userDataWritable(revision)) break;
        completed += 1;
        onProgress?.({ completed, total, filename });
      } catch (error) { stopped = true; throw error; }
    }
  };
  const results = await Promise.allSettled([worker(), worker()]);
  const failed = results.find(result => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;

  return { completed, total };
}

/** Warm only the exact exam pool before the new session clock is committed.
 * Final cache-only verification detects eviction during preparation; no claim
 * is made about native decoding or the OS preserving cache forever. */
export async function prepareExamMedia(
  questions: readonly { mediaFilename: string | null }[],
  onProgress?: (progress: MediaPreloadProgress) => void,
  shouldContinue: () => boolean = () => true,
  priority: MediaDownloadPriority = 'foreground',
  getPriority: () => MediaDownloadPriority = () => priority,
) {
  const revision = userDataRevision();
  const files = [...new Set(questions.map(q => q.mediaFilename).filter((name): name is string => Boolean(name)))];
  const unique = [...new Map(files.map(name => [deliveredMediaKey?.(name) ?? deliveredMediaFilename(name),name])).values()];
  const knownBytes = unique.reduce((sum,file) => sum + (mediaSizeBytes?.(file) ?? 0),0);
  if (knownBytes > MEDIA_POLICY.cacheBytes) throw new Error('Materiały tego egzaminu przekraczają dostępny budżet cache.');
  const result = await preloadMedia(files, onProgress, shouldContinue, priority, MEDIA_POLICY.cacheBytes, getPriority);
  if (!shouldContinue() || !userDataWritable(revision) || result.completed !== result.total) throw new Error('Przygotowanie egzaminu zostało przerwane.');
  for (const file of files) {
    if (!shouldContinue() || !userDataWritable(revision)) throw new Error('Przygotowanie egzaminu zostało przerwane.');
    if (!await cachedMediaUri(file, true)) throw new Error('Nie wszystkie materiały mieszczą się w cache lub są dostępne. Zwolnij miejsce i spróbuj ponownie.');
  }
  return result;
}
