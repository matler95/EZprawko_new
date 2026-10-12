const baseUrl = process.env.EXPO_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '');

export const mediaConfig = {
  baseUrl,
  manifestVersion: process.env.EXPO_PUBLIC_MEDIA_MANIFEST_VERSION ?? 'local',
  accessMode: process.env.EXPO_PUBLIC_MEDIA_ACCESS_MODE ?? 'development',
  enabled: Boolean(baseUrl),
};

export const mediaUrl = (filename: string) =>
  baseUrl ? `${baseUrl}/${encodeURIComponent(filename)}` : undefined;
