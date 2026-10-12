# EZprawko launch identity

The original mark is a road bending into a success check. It represents learning
and progress, not an official WORD/ministerial logo, traffic sign or government
endorsement. No third-party images, fonts or official emblems are used.

`ezprawko-mark.svg` is the editable master. Run
`node scripts/generate-brand-assets.cjs` from the repository root to rebuild the
seven project PNGs. Rendering uses Sharp already present in Expo's toolchain;
there is no runtime image generation or extra mobile dependency.

- General/iOS light icon: opaque 1024×1024 PNG, evergreen `#143D2C`, mint
  `#82D6A6` and existing gold `#F0C96A`. No text or pre-rounded corners; the OS masks it.
- iOS dark icon: opaque 1024×1024 PNG on the app's dark background `#111613`.
- Android adaptive foreground: transparent 1024×1024, scaled to 76% of the
  master around the center. All painted pixels fit inside the central 66/108
  safe-zone circle. The solid background is supplied by app.json, not a baked-in
  rounded square. A separate white/alpha silhouette supports themed icons.
- Splash images: transparent 1024×1024, drawn at 200 logical pixels using the
  expo-splash-screen plugin. Light uses green/dark-gold on `#F7F8F5`; dark uses
  mint/gold on `#111613`. The platform chooses its system appearance before
  SQLite preferences are available; a saved in-app theme can differ.
- Web favicon: 64×64 PNG of the same mark.

Old Expo/template files are preserved but no longer referenced by app.json.
No artificial launch delay or change to database/auth readiness is introduced.
Launcher/splash changes need a new native build; Metro reload/OTA/Expo Go do not
validate the resulting installed-app icons and production splash screen.

Run `node scripts/test-brand-assets.cjs` for raster/config/safe-zone checks.
Preview images under `.expo/branding-preview/` are local QA artifacts, not
shipping assets. Native cold-start/device QA is tracked in QA_CHECKLIST.md.
