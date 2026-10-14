import * as FileSystem from 'expo-file-system/legacy';
import { deliveredMediaFilename, deliveredMediaKey, mediaConfig, mediaUrl, mediaSizeBytes, mediaCacheName, legacyMediaCacheName } from '@/config/media';
import { mediaGrant } from '@/services/media-auth';
import { userDataRevision, userDataWritable } from '@/domain/data-maintenance';
import { MediaAccountRequiredError } from '@/domain/account';
import { t } from '@/domain/ui-copy';
import { promoteMediaDownload, withMediaDownloadSlot, type MediaDownloadPriority } from '@/services/media-download-queue';
import { MEDIA_POLICY } from '@/domain/media-policy';
import { recordMediaDiagnostic } from '@/services/media-diagnostics';

const CACHE_DIRECTORY = `${FileSystem.cacheDirectory}question-media/`;
const MAX_CACHE_BYTES = MEDIA_POLICY.cacheBytes;
const reservations = new Map<string, number>();
const speculativeReservations = new Set<string>();
const temporaryFiles = new Set<string>();

const safeName = (filename: string) => filename.replace(/[^a-zA-Z0-9._-]/g, '_');
const cacheName = (source: string) => mediaCacheName?.(source) ?? safeName(deliveredMediaFilename(source));
const downloads = new Map<string, Promise<string | undefined>>();
const committing = new Set<string>();
const downloadPriorities = new Map<string, MediaDownloadPriority>();
const adoptedDownloads = new Set<string>();
let clearing = false;
const protectedMedia = new Map<string, Set<string>>();
type CacheEntry = { size: number; modified: number };
let inventory: Promise<Map<string, CacheEntry>> | undefined;
let eviction: Promise<void> = Promise.resolve();
export function protectMedia(group: string, filenames: readonly string[]) {
  protectedMedia.set(group, new Set(filenames.flatMap(name => [cacheName(name), legacyMediaCacheName?.(name)].filter((value): value is string => Boolean(value)))));
}
export function releaseProtectedMedia(group: string) { protectedMedia.delete(group); }

export async function cachedMediaUri(sourceFilename: string, cacheOnly = false, priority: MediaDownloadPriority = 'foreground', shouldContinue: () => boolean = () => true) {
  if (clearing) throw new Error('Trwa czyszczenie materiałów. Spróbuj ponownie za chwilę.');
  if (cacheOnly) return fetchCachedMedia(sourceFilename, true);
  const key = `${userDataRevision()}:${cacheName(sourceFilename)}`;
  const previous = downloads.get(key);
  if (previous) {
    if (priority === 'foreground') {
      if (downloadPriorities.get(key) === 'background') adoptedDownloads.add(key);
      downloadPriorities.set(key, priority); promoteMediaDownload(key);
    }
    return previous;
  }
  downloadPriorities.set(key, priority);
  const request = fetchCachedMedia(sourceFilename, false, priority, key, shouldContinue);
  downloads.set(key, request);
  try { return await request; }
  finally { if (downloads.get(key) === request) { downloads.delete(key); downloadPriorities.delete(key); adoptedDownloads.delete(key); } }
}

async function fetchCachedMedia(sourceFilename: string, cacheOnly: boolean, priority: MediaDownloadPriority = 'foreground', key?: string, shouldContinue: () => boolean = () => true) {
  const revision = userDataRevision();
  if (!userDataWritable(revision)) return undefined;
  const filename = deliveredMediaFilename(sourceFilename);
  const objectKey = deliveredMediaKey(sourceFilename);
  if (!mediaConfig.enabled) return undefined;
  await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
  const name = cacheName(sourceFilename);
  const uri = `${CACHE_DIRECTORY}${name}`;
  const current = await FileSystem.getInfoAsync(uri);
  const expectedSize = mediaSizeBytes?.(sourceFilename);
  const kind = /\.mp4$/i.test(filename) ? 'video' : 'image';
  if (current.exists && !current.isDirectory && 'size' in current && current.size > 0 &&
    (expectedSize === undefined || current.size === expectedSize) && !committing.has(uri)) {
    recordMediaDiagnostic({stage:'cache',kind,elapsedMs:0,bytes:current.size,status:'ok'});
    void inventory?.then(entries => { const entry = entries.get(name); if (entry) entry.modified = Date.now() / 1000; }).catch(() => {});
    return uri;
  }
  const legacyName = legacyMediaCacheName?.(sourceFilename);
  if (legacyName && expectedSize) {
    const legacyUri = `${CACHE_DIRECTORY}${legacyName}`;
    const legacy = await FileSystem.getInfoAsync(legacyUri);
    if (legacy.exists && !legacy.isDirectory && 'size' in legacy && legacy.size === expectedSize) {
      void inventory?.then(entries => { const entry = entries.get(legacyName); if (entry) entry.modified = Date.now()/1000; }).catch(() => {});
      return legacyUri;
    }
  }
  if (cacheOnly) return undefined;
  if (current.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  if (current.exists) await inventory?.then(entries => entries.delete(name));
  const remote = mediaUrl(objectKey);
  if (!remote) return undefined;
  const queuedAt = Date.now();
  return withMediaDownloadSlot(async () => {
    if (!userDataWritable(revision)) return undefined;
    const effectivePriority = (key && downloadPriorities.get(key)) || priority;
    const canProceed = () => userDataWritable(revision) && (shouldContinue() || Boolean(key && adoptedDownloads.has(key)));
    if (!canProceed()) return undefined;
    if (!expectedSize && effectivePriority === 'background') return undefined;
    recordMediaDiagnostic({stage:'queue',kind,elapsedMs:Date.now()-queuedAt,status:'ok'});
    const reserved = expectedSize ?? MEDIA_POLICY.unknownForegroundBytes;
    await reserveDownload(name, reserved, effectivePriority === 'background' && !protectedMedia.get('prepared')?.has(name));
    const temporaryUri = `${uri}.${revision}.download`;
    let downloadedSize = 0;
    let stage: 'grant' | 'download' | 'commit' = 'grant';
    let started = Date.now();
    try {
      const token = await mediaGrant(objectKey);
      if (!canProceed()) return undefined;
      recordMediaDiagnostic({stage,kind,elapsedMs:Date.now()-started,status:'ok'});
      stage = 'download'; started = Date.now();
      temporaryFiles.add(temporaryUri);
      const result = await downloadWithLimit(remote, temporaryUri, token, reserved, canProceed);
      recordMediaDiagnostic({stage:'download',kind,elapsedMs:Date.now()-started,httpStatus:result.status,status:result.status===200?'ok':'error'});
      if (result.status === 401) throw new MediaAccountRequiredError(true);
      if (result.status === 403) throw new Error(t('Dostęp do materiału nie został przyznany.'));
      if (result.status !== 200) throw new Error(t('Zdjęcie lub film jest teraz niedostępny. Spróbuj później.'));
      const downloaded = await FileSystem.getInfoAsync(temporaryUri);
      if (!downloaded.exists || downloaded.isDirectory || !('size' in downloaded) || downloaded.size <= 0) throw new Error('Pobrany materiał jest pusty. Spróbuj ponownie.');
      if (downloaded.size > reserved || (expectedSize !== undefined && downloaded.size !== expectedSize)) throw new Error('Rozmiar materiału nie zgadza się z katalogiem. Spróbuj ponownie po aktualizacji aplikacji.');
      if (!userDataWritable(revision)) throw new Error("Pobieranie przerwane przez usunięcie danych lokalnych.");
      committing.add(uri);
      recordMediaDiagnostic({stage,kind,elapsedMs:Date.now()-started,bytes:downloaded.size,status:'ok'});
      stage = 'commit'; started = Date.now();
      await FileSystem.moveAsync({ from: temporaryUri, to: uri });
      downloadedSize = downloaded.size;
    } catch (error) {
      recordMediaDiagnostic({stage,kind,elapsedMs:Date.now()-started,status:'error'});
      committing.delete(uri);
      await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
      throw error;
    } finally {
      temporaryFiles.delete(temporaryUri);
      if (!downloadedSize) { reservations.delete(name); speculativeReservations.delete(name); }
    }
    try { await registerDownloaded(name, downloadedSize); }
    catch (error) {
      // This request owned a cache miss: do not leave a failed over-budget commit
      // that a subsequent cache-only check could mistake for successful preparation.
      await FileSystem.deleteAsync(uri, { idempotent: true });
      inventory = undefined;
      throw error;
    } finally { committing.delete(uri); reservations.delete(name); speculativeReservations.delete(name); }
    recordMediaDiagnostic({stage:'commit',kind,elapsedMs:Date.now()-started,bytes:downloadedSize,status:'ok'});
    return uri;
  }, (key && downloadPriorities.get(key)) || priority, key);
}

async function downloadWithLimit(remote: string, uri: string, token: string, maxBytes: number, canProceed: () => boolean) {
  let result = await downloadAttempt(remote, uri, token, maxBytes);
  if ((result.status === 429 || result.status >= 500) && canProceed()) {
    await FileSystem.deleteAsync(uri, {idempotent:true});
    await new Promise<void>(resolve => setTimeout(resolve,250));
    if (!canProceed()) throw new Error('Pobieranie materiału zostało przerwane.');
    result = await downloadAttempt(remote, uri, token, maxBytes);
  }
  return result;
}

async function downloadAttempt(remote: string, uri: string, token: string, maxBytes: number) {
  // Native cancellable transfer: timing out must stop writes before cleanup/retry.
  // The fallback keeps web/older filesystem implementations usable.
  if (!FileSystem.createDownloadResumable) return FileSystem.downloadAsync(remote, uri, {headers:{Authorization:`Bearer ${token}`}});
  let timedOut = false, oversized = false;
  const task = FileSystem.createDownloadResumable(remote, uri, {headers:{Authorization:`Bearer ${token}`}}, progress => {
    if (progress.totalBytesWritten > maxBytes || progress.totalBytesExpectedToWrite > maxBytes) {
      oversized = true; void task.cancelAsync().catch(() => {});
    }
  });
  const timer = setTimeout(() => { timedOut = true; void task.cancelAsync().catch(() => {}); }, MEDIA_POLICY.downloadTimeoutMs);
  try {
    const result = await task.downloadAsync();
    if (timedOut) throw new Error('Pobieranie trwało zbyt długo. Sprawdź połączenie i spróbuj ponownie.');
    if (oversized || !result) throw new Error('Pobieranie materiału zostało przerwane. Spróbuj ponownie.');
    return result;
  } finally { clearTimeout(timer); }
}

/** Serialize admission before either worker starts writing a temporary file. */
function reserveDownload(name: string, bytes: number, speculative: boolean) {
  const operation = eviction.catch(() => {}).then(async () => {
    if (speculative && bytes + [...speculativeReservations].reduce((sum,key)=>sum+(reservations.get(key)??0),0) > MEDIA_POLICY.speculationBytes) throw new Error('Budżet przygotowania w tle jest zajęty.');
    const entries = await cacheInventory();
    let total = [...entries.values()].reduce((sum,e) => sum+e.size,0) + [...reservations.values()].reduce((sum,b) => sum+b,0);
    for (const [candidate, entry] of [...entries].sort((a,b) => a[1].modified-b[1].modified)) {
      if (total + bytes <= MAX_CACHE_BYTES) break;
      if ([...protectedMedia.values()].some(names => names.has(candidate)) || reservations.has(candidate) || committing.has(`${CACHE_DIRECTORY}${candidate}`)) continue;
      await FileSystem.deleteAsync(`${CACHE_DIRECTORY}${candidate}`, {idempotent:true});
      entries.delete(candidate); total -= entry.size;
    }
    if (total + bytes > MAX_CACHE_BYTES) throw new Error('Brak miejsca na przygotowanie materiałów. Usuń pobrane materiały i spróbuj ponownie.');
    if (FileSystem.getFreeDiskStorageAsync && await FileSystem.getFreeDiskStorageAsync() < bytes + [...reservations.values()].reduce((sum,b)=>sum+b,0) + MEDIA_POLICY.transferReserveBytes) throw new Error('Brak miejsca na telefonie. Zwolnij miejsce i spróbuj ponownie.');
    reservations.set(name,bytes);
    if (speculative) speculativeReservations.add(name);
  });
  eviction = operation;
  return operation;
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
  finally { inventory = undefined; clearing = false; }
}

function cacheInventory() {
  if (!inventory) {
    inventory = (async () => {
      const names = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
      for (const name of names.filter(name => name.endsWith('.download'))) {
        const uri = `${CACHE_DIRECTORY}${name}`;
        if (!temporaryFiles.has(uri)) await FileSystem.deleteAsync(uri, {idempotent:true});
      }
      const entries = new Map<string, CacheEntry>();
      await Promise.all(names.filter(name => !name.endsWith('.download')).map(async name => {
        const info = await FileSystem.getInfoAsync(`${CACHE_DIRECTORY}${name}`);
        if (info.exists && !info.isDirectory && 'size' in info) entries.set(name, {
          size: info.size, modified: 'modificationTime' in info ? info.modificationTime ?? 0 : 0,
        });
      }));
      return entries;
    })().catch(error => { inventory = undefined; throw error; });
  }
  return inventory;
}

/** Non-destructive migration: active pins win over reaching the target immediately. */
export function trimMediaCache() {
  const operation = eviction.catch(() => {}).then(async () => {
    await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, {intermediates:true});
    const entries = await cacheInventory();
    let bytes = [...entries.values()].reduce((sum,e) => sum+e.size,0);
    for (const [name,entry] of [...entries].sort((a,b)=>a[1].modified-b[1].modified)) {
      if (bytes <= MAX_CACHE_BYTES) break;
      if (reservations.has(name) || committing.has(`${CACHE_DIRECTORY}${name}`) || [...protectedMedia.values()].some(names=>names.has(name))) continue;
      await FileSystem.deleteAsync(`${CACHE_DIRECTORY}${name}`, {idempotent:true});
      entries.delete(name); bytes -= entry.size;
    }
    return bytes;
  });
  eviction = operation.then(()=>{});
  return operation;
}

/** Scan once, register each commit, and serialize eviction across both download workers. */
function registerDownloaded(name: string, size: number) {
  const operation = eviction.catch(() => {}).then(async () => {
    const entries = await cacheInventory();
    entries.set(name, { size, modified: Date.now() / 1000 });
    reservations.delete(name);
    speculativeReservations.delete(name);
    let total = [...entries.values()].reduce((sum, entry) => sum + entry.size, 0);
    for (const [candidate, entry] of [...entries].sort((a,b) => a[1].modified - b[1].modified)) {
      if (total <= MAX_CACHE_BYTES) break;
      if ([...protectedMedia.values()].some(names => names.has(candidate)) || candidate === name) continue;
      await FileSystem.deleteAsync(`${CACHE_DIRECTORY}${candidate}`, { idempotent: true });
      entries.delete(candidate); total -= entry.size;
    }
    if (total > MAX_CACHE_BYTES) throw new Error('Brak miejsca na przygotowanie materiałów. Usuń pobrane materiały i spróbuj ponownie.');
  });
  eviction = operation;
  return operation;
}
