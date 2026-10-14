import delivery from '@/assets/data/media-delivery.json';
import { mediaDeliveryVersion } from '@/domain/media-version';

const baseUrl = process.env.EXPO_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '');
const deliveryApproved = (delivery as {published?: boolean; qualityApproved?: boolean}).published !== false &&
  (delivery as {qualityApproved?: boolean}).qualityApproved !== false;

export const mediaConfig = {
  baseUrl,
  manifestVersion: mediaDeliveryVersion,
  accessMode: process.env.EXPO_PUBLIC_MEDIA_ACCESS_MODE ?? 'development',
  enabled: Boolean(baseUrl && process.env.EXPO_PUBLIC_SUPABASE_URL),
};

export const mediaUrl = (filename: string) =>
  baseUrl ? `${baseUrl}/${filename.split('/').map(encodeURIComponent).join('/')}` : undefined;

/** R2 uses canonical Unicode names; preserve official source references in SQLite.
 * All cache/grant/URL paths derive from this same delivery-only normalization. */
export const deliveredMediaFilename = (filename: string) =>
  filename.normalize('NFC').replace(/\.wmv$/i, '.mp4');

/** Full object key, shared by the media grant and the R2 download request. */
export function deliveredMediaKey(sourceFilename: string) {
  const filename = deliveredMediaFilename(sourceFilename);
  const base = filename.includes('/') ? filename : /\.(mp4|m4v|mov)$/i.test(filename) ? `wideo/${filename}` : /\.(jpg|jpeg|png|webp)$/i.test(filename) ? `zdjecia/${filename}` : filename;
  const paths = (delivery as { paths?: Record<string, string> }).paths;
  return deliveryApproved && mediaDeliveryVersion === delivery.deliveryVersion ? paths?.[base] ?? base : base;
}

const legacyOwners = new Map<string, string[]>();
const variantKeys = new Set(Object.values((delivery as { paths?: Record<string, string> }).paths ?? {}));
for (const key of Object.keys(delivery.sizes)) {
  if (variantKeys.has(key)) continue;
  const name = key.split('/').pop()!.replace(/[^a-zA-Z0-9._-]/g, '_');
  legacyOwners.set(name, [...(legacyOwners.get(name) ?? []), key]);
}

/** Collision-free, versioned identity; source/full-key references coalesce. */
export function mediaCacheName(source: string) {
  const key = deliveredMediaKey(source);
  let hex = '';
  // Lowercase UTF-8 hex stays a single native file-URI component, including on
  // case-insensitive filesystems. No percent escapes that can decode to slashes.
  for (const char of `${mediaDeliveryVersion}:${key}`) {
    const cp = char.codePointAt(0)!;
    const bytes = cp < 128 ? [cp] : cp < 2048 ? [192 | cp >> 6,128 | cp & 63]
      : cp < 65536 ? [224 | cp >> 12,128 | cp >> 6 & 63,128 | cp & 63]
      : [240 | cp >> 18,128 | cp >> 12 & 63,128 | cp >> 6 & 63,128 | cp & 63];
    hex += bytes.map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  return `${hex}.${key.split('.').pop()?.toLowerCase() ?? 'bin'}`;
}
/** Keep already downloaded originals usable without a blanket cache reset/copy. */
export function legacyMediaCacheName(source: string) {
  const key = deliveredMediaKey(source);
  const name = key.split('/').pop()!.replace(/[^a-zA-Z0-9._-]/g, '_');
  const owners = legacyOwners.get(name);
  return owners?.length === 1 && owners[0] === key ? name : undefined;
}


/** Inventory-derived bytes, not estimates of the source WMV. */
export function mediaSizeBytes(sourceFilename: string) {
  if (!deliveryApproved || mediaConfig.manifestVersion !== delivery.deliveryVersion) return undefined;
  const bytes = (delivery.sizes as Record<string, number>)[deliveredMediaKey(sourceFilename)];
  return Number.isSafeInteger(bytes) && bytes > 0 ? bytes : undefined;
}
