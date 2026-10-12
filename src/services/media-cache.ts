import * as FileSystem from 'expo-file-system/legacy';
import { deliveredMediaFilename, deliveredMediaKey, mediaConfig, mediaUrl } from '@/config/media';
import { mediaGrant } from '@/services/media-auth';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';

const CACHE_DIRECTORY = `${FileSystem.cacheDirectory}question-media/`;
const MAX_CACHE_BYTES = 1024 * 1024 * 1024;

const safeName = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, '_');

export async function cachedMediaUri(sourceFilename: string) {
  const revision = userDataRevision();
  if (!userDataWritable(revision)) return undefined;
  const filename = deliveredMediaFilename(sourceFilename);
  const objectKey = deliveredMediaKey(sourceFilename);
  if (!mediaConfig.enabled) return undefined;
  await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
  const uri = `${CACHE_DIRECTORY}${safeName(filename)}`;
  const current = await FileSystem.getInfoAsync(uri);
  if (current.exists) return uri;
  const remote = mediaUrl(objectKey);
  if (!remote) return undefined;
  const token = await mediaGrant(objectKey);
  const temporaryUri = `${uri}.download`;
  try {
    const result = await FileSystem.downloadAsync(remote, temporaryUri, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (result.status === 401 || result.status === 403) throw new Error("Serwer multimediów odrzucił token dostępu. Sprawdź zgodność sekretów Supabase i Cloudflare.");
    if (result.status === 404) throw new Error(`Nie znaleziono pliku w R2: ${objectKey}`);
    if (result.status !== 200) throw new Error(`Błąd serwera multimediów (HTTP ${result.status}). Spróbuj ponownie.`);
    if (!userDataWritable(revision)) throw new Error("Pobieranie przerwane przez usunięcie danych lokalnych.");
    await FileSystem.moveAsync({ from: temporaryUri, to: uri });
  } catch (error) {
    await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
    throw error;
  }
  await evictOldMedia();
  return uri;
}

export async function cacheSizeBytes() {
  const names = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY).catch(() => []);
  const stats = await Promise.all(names.map((name) => FileSystem.getInfoAsync(`${CACHE_DIRECTORY}${name}`)));
  return stats.reduce((total, stat) => total + (stat.exists && 'size' in stat ? stat.size ?? 0 : 0), 0);
}

export async function clearMediaCache() {
  await FileSystem.deleteAsync(CACHE_DIRECTORY, { idempotent: true });
}

async function evictOldMedia() {
  const names = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY).catch(() => []);
  const entries = await Promise.all(names.map(async (name) => ({ name, info: await FileSystem.getInfoAsync(`${CACHE_DIRECTORY}${name}`) })));
  let total = entries.reduce((sum, entry) => sum + (entry.info.exists && 'size' in entry.info ? entry.info.size ?? 0 : 0), 0);
  const modified = (entry: (typeof entries)[number]) =>
    entry.info.exists && 'modificationTime' in entry.info ? entry.info.modificationTime ?? 0 : 0;
  for (const entry of entries.sort((a, b) => modified(a) - modified(b))) {
    if (total <= MAX_CACHE_BYTES) break;
    const size = entry.info.exists && 'size' in entry.info ? entry.info.size ?? 0 : 0;
    await FileSystem.deleteAsync(`${CACHE_DIRECTORY}${entry.name}`, { idempotent: true });
    total -= size;
  }
}
