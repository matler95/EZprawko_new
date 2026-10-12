# Private media delivery setup

## Current mobile test flow (Supabase grants + R2)

WMV references in SQLite map to the same basename with `.mp4` inside the R2 `wideo/` folder (for example, `clip.wmv` → `wideo/clip.mp4`). Image references map to the `zdjecia/` folder (for example, `photo.jpg` → `zdjecia/photo.jpg`). Existing folder prefixes are preserved without being added twice. The grant and download URL use the exact same full R2 object key. File names and folder names are case-sensitive.

The `media-token` function is deployed with platform `verify_jwt = false`; its handler independently validates the Bearer session with Supabase Auth before signing a grant. An unauthenticated request remains unauthorized.

The mobile app now has an email/password sign-in card under Settings. Create the private tester account in Supabase Dashboard → Authentication → Users → Add user, using an email and a password chosen outside this repository. Sign in on the phone with that account. The database catalog remains usable without signing in; new protected media downloads require a valid Supabase session.

Restart Metro after editing `.env.local`. Open a study question with a known image or MP4 in the R2 bucket. Its filename must match the database reference exactly. The application invokes `media-token`, downloads through the Worker using the returned Bearer grant, and caches only successful HTTP 200 responses. A matching signing secret must exist on both services.

Private testing requires restricting new user registration in Supabase Auth settings and provisioning only approved tester accounts. The current token function authorizes any authenticated Supabase user; subscription/entitlement checks and rate limiting remain required before a commercial release. Do not enable Cloudflare Access on learner media traffic for this architecture.

The application database ships only question metadata and media filenames. It deliberately does not include the government archive or a signing secret.

## Required private infrastructure

### Cloudflare R2 + Access deployment

The repository now contains a Worker template in `infrastructure/cloudflare-media-worker`.

1. Replace `REPLACE_WITH_YOUR_R2_BUCKET_NAME` in `wrangler.jsonc` with the exact existing R2 bucket name. Do not make the R2 bucket public and do not enable an `r2.dev` public URL.
2. From that directory, install the Worker development dependencies and deploy with `npx wrangler deploy` after logging in to the intended Cloudflare account. The Worker has one R2 binding and permits only `GET` and `HEAD` requests under `/media/<filename>`.
3. In Cloudflare Dashboard, open **Workers & Pages → ezprawko-media → Access** and choose **Protect this Worker behind Access** for all traffic. Create an Allow policy for only the tester identity. Set a short session duration and disable broad identity-provider groups.
4. Add a custom hostname such as `media.example.com` to the Worker. Configure `EXPO_PUBLIC_MEDIA_BASE_URL=https://media.example.com/media` only after the mobile authentication hand-off is implemented.

Cloudflare Access correctly protects the Worker and the R2 binding, but an Expo background download cannot complete an interactive browser sign-in by itself. The next required integration is a mobile sign-in/token hand-off for the chosen Access identity provider, or a separate authenticated token-issuer API. Never place an Access service token, R2 API token, or Worker secret in an `EXPO_PUBLIC_*` variable.

1. Transcode all playable source videos to H.264/AAC MP4. Preserve each database media filename in the manifest, or update the manifest mapping during the import step. Legacy `.wmv` files are not a supported delivery format for the mobile player.
2. Put the output in a private object store/CDN. Keep the bucket private; do not put a storage secret or permanent signing key in the Expo app.
3. Provide an authenticated backend endpoint that issues a short-lived media token for a requested filename after authorization. The reference Supabase Edge Function is in `infrastructure/supabase/functions/media-token`; it validates the Supabase user token and returns a 120-second HMAC grant for exactly one R2 key.
4. Set the same `MEDIA_TOKEN_SECRET` as a Cloudflare Worker secret and a Supabase Edge Function secret. Never expose it to Expo. The next mobile step will exchange the user's Supabase session for a grant immediately before a cache download.

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

# Security regression checkpoint (2026-10-12)

The active Worker (`src/index.js`, selected by `wrangler.jsonc`) now rejects
missing/non-integer/expired expiry claims, expiries more than five minutes ahead,
invalid subjects, oversized tokens and malformed URL-encoded object paths.
The current Supabase issuer's two-minute grants remain compatible; no new secret
or mobile configuration is needed.

Run `node scripts/test-media-worker.cjs` from the project root. These tests use
local generated credentials and a mock bucket; they do not verify the deployed
service. To activate the correction, deploy from the Worker directory:

```powershell
cd C:\Users\Mateusz\Desktop\EZprawko_new\infrastructure\cloudflare-media-worker
npx wrangler@latest deploy
```

Then retest an authenticated image/video on the phone. Supabase does not need
redeployment for this checkpoint. Entitlement checks, rate limiting and full R2
inventory/integrity validation remain separate production work.
