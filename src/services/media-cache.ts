import * as FileSystem from 'expo-file-system/legacy';
import { deliveredMediaFilename, deliveredMediaKey, mediaConfig, mediaUrl } from '@/config/media';
import { mediaGrant } from '@/services/media-auth';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { MediaAccountRequiredError } from '@/domain/account';
import { t } from '@/domain/ui-copy';
import { promoteMediaDownload, withMediaDownloadSlot, type MediaDownloadPriority } from '@/services/media-download-queue';

const CACHE_DIRECTORY = `${FileSystem.cacheDirectory}question-media/`;
const MAX_CACHE_BYTES = 1024 * 1024 * 1024;

const safeName = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, '_');
const downloads = new Map<string, Promise<string | undefined>>();
const downloadPriorities = new Map<string, MediaDownloadPriority>();
let clearing = false;
const protectedMedia = new Map<string, Set<string>>();
export function protectMedia(group: string, filenames: readonly string[]) {
  protectedMedia.set(group, new Set(filenames.map(name => safeName(deliveredMediaFilename(name)))));
}
export function releaseProtectedMedia(group: string) { protectedMedia.delete(group); }

export async function cachedMediaUri(sourceFilename: string, cacheOnly = false, priority: MediaDownloadPriority = 'foreground') {
  if (clearing) throw new Error('Trwa czyszczenie materiałów. Spróbuj ponownie za chwilę.');
  if (cacheOnly) return fetchCachedMedia(sourceFilename, true);
  const key = `${userDataRevision()}:${safeName(deliveredMediaFilename(sourceFilename))}`;
  const previous = downloads.get(key);
  if (previous) {
    if (priority === 'foreground') { downloadPriorities.set(key, priority); promoteMediaDownload(key); }
    return previous;
  }
  downloadPriorities.set(key, priority);
  const request = fetchCachedMedia(sourceFilename, false, priority, key);
  downloads.set(key, request);
  try { return await request; }
  finally { if (downloads.get(key) === request) { downloads.delete(key); downloadPriorities.delete(key); } }
}

async function fetchCachedMedia(sourceFilename: string, cacheOnly: boolean, priority: MediaDownloadPriority = 'foreground', key?: string) {
  const revision = userDataRevision();
  if (!userDataWritable(revision)) return undefined;
  const filename = deliveredMediaFilename(sourceFilename);
  const objectKey = deliveredMediaKey(sourceFilename);
  if (!mediaConfig.enabled) return undefined;
  await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
  const uri = `${CACHE_DIRECTORY}${safeName(filename)}`;
  const current = await FileSystem.getInfoAsync(uri);
  if (current.exists && !current.isDirectory && 'size' in current && current.size > 0) return uri;
  if (cacheOnly) return undefined;
  if (current.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  const remote = mediaUrl(objectKey);
  if (!remote) return undefined;
  return withMediaDownloadSlot(async () => {
    if (!userDataWritable(revision)) return undefined;
    const token = await mediaGrant(objectKey);
    const temporaryUri = `${uri}.${revision}.download`;
    try {
      const result = await FileSystem.downloadAsync(remote, temporaryUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (result.status === 401) throw new MediaAccountRequiredError(true);
      if (result.status === 403) throw new Error(t('Dostęp do materiału nie został przyznany.'));
      if (result.status !== 200) throw new Error(t('Zdjęcie lub film jest teraz niedostępny. Spróbuj później.'));
      const downloaded = await FileSystem.getInfoAsync(temporaryUri);
      if (!downloaded.exists || downloaded.isDirectory || !('size' in downloaded) || downloaded.size <= 0) throw new Error('Pobrany materiał jest pusty. Spróbuj ponownie.');
      if (downloaded.size > MAX_CACHE_BYTES) throw new Error('Materiał przekracza limit cache 1 GB. Nie można przygotować tej próby.');
      if (!userDataWritable(revision)) throw new Error("Pobieranie przerwane przez usunięcie danych lokalnych.");
      await FileSystem.moveAsync({ from: temporaryUri, to: uri });
    } catch (error) {
      await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
      throw error;
    }
    await evictOldMedia();
    return uri;
  }, (key && downloadPriorities.get(key)) || priority, key);
}

export async function cacheSizeBytes() {
  const directory = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
  if (!directory.exists) return 0;
  const names = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
  const stats = await Promise.all(names.map((name) => FileSystem.getInfoAsync(`${CACHE_DIRECTORY}${name}`)));
  return stats.reduce((total, stat) => total + (stat.exists && 'size' in stat ? stat.size ?? 0 : 0), 0);
}

export async function clearMediaCache() {
  if (!userDataWritable()) await Promise.allSettled([...downloads.values()]);
  if (clearing || downloads.size) throw new Error('Trwa pobieranie lub czyszczenie materiałów. Poczekaj na zakończenie i spróbuj ponownie.');
  clearing = true;
  try { await FileSystem.deleteAsync(CACHE_DIRECTORY, { idempotent: true }); }
  finally { clearing = false; }
}

async function evictOldMedia() {
  const names = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY).catch(() => []);
  const entries = await Promise.all(names.filter(name => !name.endsWith('.download')).map(async (name) => ({ name, info: await FileSystem.getInfoAsync(`${CACHE_DIRECTORY}${name}`) })));
  let total = entries.reduce((sum, entry) => sum + (entry.info.exists && 'size' in entry.info ? entry.info.size ?? 0 : 0), 0);
  const modified = (entry: (typeof entries)[number]) =>
    entry.info.exists && 'modificationTime' in entry.info ? entry.info.modificationTime ?? 0 : 0;
  for (const entry of entries.sort((a, b) => modified(a) - modified(b))) {
    if (total <= MAX_CACHE_BYTES) break;
    if ([...protectedMedia.values()].some(names => names.has(entry.name))) continue;
    const size = entry.info.exists && 'size' in entry.info ? entry.info.size ?? 0 : 0;
    await FileSystem.deleteAsync(`${CACHE_DIRECTORY}${entry.name}`, { idempotent: true });
    total -= size;
  }
  if (total > MAX_CACHE_BYTES) throw new Error('Brak miejsca na przygotowanie materiałów. Usuń pobrane materiały i spróbuj ponownie.');
}
