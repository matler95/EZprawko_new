# EAS: private preview first, production later

## What is ready locally

- iOS bundleIdentifier / Android package: `pl.ezprawko.app`.
- `development`: internal dev client + development environment/channel.
- `preview`: standalone internal app, Android APK + preview environment/channel.
- `production`: store distribution, Android AAB + production environment/channel.
- Preview/production use remote auto-incrementing build numbers. One package ID
  intentionally means these variants replace one another on a device; they are
  not separate side-by-side apps. Do not uninstall merely to switch variants if
  you want to retain SQLite progress. Export first and verify native upgrade QA.
  A previous development app with another package ID, or Expo Go, has a separate
  sandbox; configuring this new identifier does not automatically migrate its
  local data. The existing JSON export is not a restore/import implementation.
- `expo-updates` installed; fingerprint runtime policy guards native compatibility.
  OTA is **disabled until a real project UUID is linked**. Local Metro still works.
  Once linked, updates download at launch without delaying startup and apply on a
  subsequent restart; we never force reload during an exam.
- `.easignore` excludes the 9GB ZIPs, Excel, source videos, cloud infrastructure,
  local env/credentials and generated native/tool folders. Official SQLite,
  translations, sign graphics and branding PNGs remain included.

No cloud build, upload, project creation, OTA publication, store submission or
signing credential generation is performed by these local changes.

## 1. Owner login and project link

From the project root in PowerShell:

```powershell
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest init
```

Choose the intended owner and existing project or explicitly create the private
EZprawko project. With dynamic `app.config.ts`, EAS may ask you to add its real
project UUID manually: add `"extra": { "eas": { "projectId": "REAL_UUID" } }`
under `expo` in app.json (preserve any other extra fields). The value is a project
identifier, not a secret. Send that UUID if you want help applying it; do not send
passwords, access tokens or Apple signing files. `app.config.ts` derives the exact
update URL automatically. No placeholder UUID is checked into this repo.

Do not run `eas update:configure` as a blind rewrite: our dynamic config already
derives URL/enabled and enforces fingerprint. The missing step is the real EAS
project link, not another OTA architecture.

## 2. EAS environments (required for cloud media)

In the project's Expo dashboard, create these variables in **development**, then
**preview**, then **production**. Use plain-text visibility; these public client
values are bundled in the app, not protected secrets:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable/anon only, NEVER service-role)
- `EXPO_PUBLIC_MEDIA_BASE_URL`

Use your existing values from .env.local, not values copied into eas.json. The
file is deliberately not uploaded. You may initially use the same private backend
for all environments, but review access/entitlements and production ownership
before opening registration. Bucket/API/service-role/HMAC secrets stay exclusively
in R2/Worker/Supabase server-side configuration. Channel isolation does not isolate
the backend or change its authentication/authorization rules.

`node scripts/check-eas-readiness.cjs` validates local prerequisites and reports
missing values by name only. It does not inspect remote environment definitions,
log credentials or certify account/signing readiness. Use it after setting local
public variables; Expo's CLI handles .env.local for its own commands.

## 3. Native private build (owner action)

```powershell
npx eas-cli@latest build --platform android --profile preview
# For the iPhone: first register its UDID, then create an ad-hoc build.
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

Android: choose/create the correct remotely managed keystore; keep it for future
updates. iOS physical-device ad-hoc signing requires the owner's Apple Developer
membership, team/signing authorization and registered device. Approve these
prompts yourself; we have not created any credentials. Production distribution
later uses store credentials and is not private-install approval.

Install the EAS result and execute QA_CHECKLIST.md. A successful JS export or
expo-doctor result is **not** a successful native build/device test.

## 4. Private OTA, only after a validated preview build

```powershell
npx eas-cli@latest update --channel preview --environment preview --message "Private QA fix"
```

SDK57 requires the explicit environment for OTA. Check the runtime/fingerprint
matches the installed native build; a native package/config change needs a new
build, not just an OTA. Test two cold launches, airplane-mode fallback, media,
SQLite migrations, onboarding, and preservation of exam progress. Do not weaken
fingerprint or disable anti-bricking protections to force an incompatible update.

Production OTA/build commands are intentionally not automated here. Production
remains gated by media permissions, reviewed explanations/legal documents,
account-deletion requirements, dependency security review and device QA. Native
store signing is separate from optional cryptographic OTA code signing, which
has not been configured or represented as already enabled.

References: [EAS Update](https://docs.expo.dev/eas-update/getting-started/),
[runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/),
[build profiles](https://docs.expo.dev/build/eas-json/),
[upload exclusions](https://docs.expo.dev/build-reference/easignore/).
