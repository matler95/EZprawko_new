export const MEDIA_POLICY = {
  // R2 inventory: conservative maximum official set is 113,357,276 bytes.
  cacheBytes: 200 * 1024 * 1024,
  speculationBytes: 12 * 1024 * 1024,
  unknownForegroundBytes: 16 * 1024 * 1024,
  downloadTimeoutMs: 90_000,
  transferReserveBytes: 10 * 1024 * 1024,
} as const;
