# Private media delivery setup

The application database ships only question metadata and media filenames. It deliberately does not include the government archive or a signing secret.

## Required private infrastructure

1. Transcode all playable source videos to H.264/AAC MP4. Preserve each database media filename in the manifest, or update the manifest mapping during the import step. Legacy `.wmv` files are not a supported delivery format for the mobile player.
2. Put the output in a private object store/CDN. Keep the bucket private; do not put a storage secret or permanent signing key in the Expo app.
3. Provide an authenticated backend endpoint that issues a short-lived URL or signed cookie for a requested filename after authorization. Connect that resolver to `mediaUrl` in `src/config/media.ts` before enabling production media.
4. For a private manual test only, set `EXPO_PUBLIC_MEDIA_BASE_URL` to a temporary, read-only test origin. Expo public variables are visible in the app bundle and must never contain a secret.

## Mobile behavior already implemented

- Download only when a question is rendered.
- Store downloads in the app cache and evict least-recently-used files above the 1 GB limit.
- Render images and MP4-compatible video from the cache.
- Use bounded serial preloading for a category batch (currently capped at 250 files).

## Validation checklist

- Test a fresh install on Android and iOS with no cache.
- Verify a cached question works after airplane mode is enabled.
- Check that an expired signed URL fails gracefully and that retrying obtains a refreshed URL.
- Verify cache clearing removes both image/video files and native video cache.
- Validate the final content permissions and license before any external distribution.
