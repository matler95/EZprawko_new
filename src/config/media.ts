const baseUrl = process.env.EXPO_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '');

export const mediaConfig = {
  baseUrl,
  manifestVersion: process.env.EXPO_PUBLIC_MEDIA_MANIFEST_VERSION ?? 'local',
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
  if (filename.includes('/')) return filename;
  if (/\.(mp4|m4v|mov)$/i.test(filename)) return `wideo/${filename}`;
  if (/\.(jpg|jpeg|png|webp)$/i.test(filename)) return `zdjecia/${filename}`;
  return filename;
}
