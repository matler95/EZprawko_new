# Implementation progress

## Checkpoint — R2 folder-aware media access (2026-10-12)

- Mapped converted video references to `wideo/<basename>.mp4` and images to `zdjecia/<filename>`, matching the user-confirmed bucket folders.
- Grants and download URLs now use the same complete object key; URL encoding preserves folder separators and existing prefixes are not duplicated.
- Preserved database question references and existing on-device cache filenames. Missing-file errors now include the full requested object key for diagnosis.
- Physical-device verification of the folder mapping is pending; no new Worker or Supabase deployment is needed for this client-side mapping change.
- Validation passed: TypeScript, Expo lint, and six filename/URL round-trip assertions including converted WMV, JPG, existing prefixes, and filenames with spaces and Polish characters.

## Checkpoint — media download diagnosis and converted video mapping (2026-10-12)

- Verified public Supabase configuration responds successfully and the deployed token function exists. The project advertises ES256 session signing keys; moved authorization to the existing Supabase Auth user validation with `verify_jwt = false` and deployed the corrected function.
- Added explicit WMV → MP4 filename mapping before cache lookup, grant issuance, and download, preserving the database's original media names. Converted objects must preserve the original basename. JPG filenames are unchanged.
- The renderer and exam video classification now recognize converted WMV references as playable videos.
- Replaced generic media failures with actionable stage-specific messages and a retry action; no token or credential is displayed.
- Full authenticated device playback still requires retesting after refreshing the app. A missing R2 key, changed basename, or bucket folder prefix will now be reported distinctly.

## Checkpoint — mobile account login and authenticated cache (2026-10-12)

- Added email/password login, persisted-session status, local sign-out, loading states, and recoverable errors in Settings.
- Added successful-response-only media caching: downloads use a temporary file and move into the cache only after HTTP 200, so authorization errors cannot be mistaken for images/videos.
- User confirmed matching signing secrets are configured in Supabase and Cloudflare. A signed-in physical-device download is still pending and is not claimed as verified.
- Documented provisioning a private tester account and the existing limitation that the token issuer authorizes every authenticated Supabase user.
- Validation passed: TypeScript, Expo lint, and Expo Doctor (21/21). The sign-in and signed media download still require physical-device testing.

## Checkpoint — deployed media hostname connected (2026-10-12)

- Set the local Expo media origin to `https://ezprawko-media.mateusz-learn.workers.dev/media`.
- Corrected a transcription error in the public Supabase anon-key JWT header in ignored local configuration.
- Verified the deployed Worker returns HTTP 401 for an unauthenticated media request. This confirms authentication is enforced; valid grants and matching signing secrets still require an end-to-end signed-in download test.
- The mobile sign-in UI is still pending; an origin configured in Expo alone does not create a user session.

## Completed

1. Imported the official XLSX into a 3,518-question SQLite catalog and media manifest.
2. Implemented official 32-question / 74-point category-aware exam generation.
3. Added private CDN configuration, local media-cache service, and cache controls.
4. Added persistent exam history, progress queries, notifications, and core app tabs.
5. Implemented real study answers, haptics, flags, and saved practice attempts.
6. Added persistent AM/A/B/C/D category selection and an absolute 25-minute timer.

7. Persisted and resumed active exam sessions, including category, question order, answers, position, and deadline.
8. Added Study filters for all questions, 3-point questions, mistakes, and flagged questions.
9. Added automatic final scoring, history persistence, and active-session cleanup when an exam expires.
10. Added three-day challenge persistence, based on daily correct practice answers.

11. Added a dashboard challenge milestone card with daily progress and completion state.
12. Added a native score-trend chart with pass/fail coloring to the Progress screen.

## Remaining

- Detailed answer explanations. The imported official source contains no explanation field, so detailed explanations require a separately reviewed content source rather than generated legal/road-safety guidance.
- Configure a signed private CDN/media-token service and transcode source WMV videos to MP4 before private device testing.
- Physical-device QA, EAS configuration, and release-readiness review.

## Checkpoint — Phase 1: official WORD exam flow and routing (2026-10-12)

- Corrected the generator to always produce the official sequence: questions 1–20 are basic YES/NO (10×3, 6×2, 4×1), followed by questions 21–32 from the selected specialist category (6×3, 4×2, 2×1). Randomization now happens only inside those sections.
- Added per-question timing metadata: basic questions use a 20-second reading/media phase and 15-second answer phase; specialist questions use 50 seconds to answer.
- Moved the live exam into the dedicated full-screen `/exam/[id]` route. The dashboard now only starts or resumes an exam, and the tab bar is dynamically hidden throughout the exam route.
- Implemented the question state machine and two timers: a 25-minute global deadline, enforced reading/answering states, disabled answers before the answer phase, and automatic zero-point advancement on question timeout.
- In exam mode, MP4 video begins automatically once, does not loop, has no native controls, and unlocks the answer state when playback completes.
- Validation passed: `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` (21/21 checks).

## Checkpoint — Phase 2: exam review and mistake bank (2026-10-12)

- Added the `/exam/review` route, reached directly from the completed-exam result screen.
- The review gives the learner a 32-question outcome grid: green for correct, red for incorrect, and gray for a timed-out answer. Selecting a tile opens the full question, its media when available, every answer, the learner's choice, and the official key.
- Added a diagnostic card that quantifies lost high-value points and identifies missed 3-point basic questions. The review records and displays the actual active-exam duration.
- Exam errors are available immediately through the existing Study “Błędy” filter, which combines incorrect practice and completed-exam answers without duplicating question data.
- Validation passed: `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` (21/21 checks).

## Checkpoint — Phase 3: topic learning and spaced repetition foundation (2026-10-12)

- Added a local topic index for the complete official question catalog, generated deterministically from question text and stored in SQLite without changing source questions.
- Added thematic study cards with total, attempted, and mastered counts, plus one-tap filtering to a selected topic.
- Added persistent mastery tracking: a question reaches mastery after three correct practice answers separated by at least 24 hours; an incorrect answer resets the sequence.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — Phase 3: flashcard navigation (2026-10-12)

- Extended the Study question view into a free-navigation flashcard flow. Learners can move backward and forward through the current session without the forward-only restriction of the exam.
- Added the question's cached image or compatible video to the study card, along with a clear session position indicator and thumb-reachable previous/next controls.
- Answer feedback, flagging, and reviewed explanations remain intact when moving between cards.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — Phase 4: semantic theme foundation (2026-10-12)

- Replaced the minimal color palette with semantic light and dark tokens for backgrounds, surfaces, borders, primary action, text, success, and error states.
- Added a persisted appearance preference in SQLite (System, Light, or Dark) and exposed it in Settings. The selected preference now also controls the navigator's native theme and tab-bar colors.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.
- Remaining in Phase 4: replace remaining screen-local hardcoded colors with the semantic tokens, update tab icons, and add the timer/progress motion polish.

## Checkpoint — Phase 5: road-sign lexicon (2026-10-12)

- Added a new native-tab Road Signs lexicon with search, group filters, and compact sign-code cards for fast revision.
- Replaced repeated template tab artwork with distinct system-native icons for Home, Study, Progress, Settings, and Road Signs.
- Translation storage and official EN/UA/DE import remain pending the official multilingual source workbook.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — private R2 media gateway foundation (2026-10-12)

- Added a dedicated Cloudflare Worker template with an R2 binding, strict object-key validation, GET/HEAD-only media delivery, private cache headers, and no storage credentials in application code.
- Documented the Cloudflare Access deployment policy: protect all Worker traffic, allow only the tester identity, and keep the bucket and `r2.dev` endpoint private.
- The remaining external configuration is the real bucket name, Worker deployment, protected hostname, and a mobile Access sign-in/token hand-off. Expo cannot safely store a Cloudflare Access service token.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — production media authorization contract (2026-10-12)

- Replaced the planned per-user Cloudflare Access approach with a consumer-scale media grant contract. The private R2 Worker now requires a short-lived, HMAC-signed grant bound to one filename and authenticated user.
- Added a Supabase Edge Function reference that validates the user's Supabase session and mints a two-minute per-file grant. Neither R2 credentials nor signing secrets reach the Expo bundle.
- Cloudflare Access is no longer required for learner media traffic; it remains suitable for operational/admin endpoints.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — Supabase mobile foundation (2026-10-12)

- Added the configured Supabase client with persisted React Native session storage and the SDK-compatible dependencies.
- Added the protected-media grant resolver. Cached media downloads now obtain a user-bound grant from the `media-token` Edge Function and pass it as a Bearer token to the private R2 Worker.
- Added an ignored local public Expo configuration file and a tracked `.env.example`; no service-role, R2, or HMAC secret was written into the mobile app.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.
# Checkpoint — media foundation (2026-10-12)

- Installed SDK-compatible `expo-video`.
- Added lazy question-media rendering for cached images and MP4-compatible video, including an explicit disabled state until the private CDN is configured.
- Added serial bounded media preloading and a reusable offline-download card (maximum 250 media files per selected category).
- Mounted the media renderer in the active exam and the bounded preload control in Settings.
- Remaining for this phase: configure a signed private CDN and transcode the archive's WMV sources to MP4 before device validation.

## Checkpoint — internal-build readiness (2026-10-12)

- Added `expo-dev-client` and EAS development, preview, and production build profiles.
- Installed the required `expo-asset` peer dependency for native audio support.
- Validation passed: `npx expo-doctor` (21/21 checks), `npx tsc --noEmit`, and `npx expo lint`.
- Still requires your Expo account login and platform signing credentials to produce an installable internal build; no credentials were requested or stored.

## Checkpoint — analytics and QA (2026-10-12)

- Added category-level weak-spot analytics from saved practice attempts and rendered the three lowest-performing categories in Progress.
- Corrected category-based media preloading to use the imported JSON category field rather than a nonexistent database column.
- Added `QA_CHECKLIST.md` with official-exam, study, media, cache, notification, privacy, and build verification steps.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — answer feedback (2026-10-12)

- Added instant success/error audio feedback to Study and Exam answers through `expo-audio`, alongside the existing haptic response.
- Used tiny original generated WAV tones embedded in code; no third-party media or licensing dependency was introduced.
- Validation passed: `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` (21/21 checks).

## Checkpoint — exam fidelity and recovery flow (2026-10-12)

- Changed the Exam Simulator to lock a selected answer and move directly forward without revealing correctness; instant audio/haptic correctness feedback remains in Study only.
- Made the active exam question region scrollable so media-heavy or long questions remain usable on compact phones.
- Added an actionable failed-exam result card with points-to-pass and a direct route into mistake review.
- Expanded the Study Mistakes filter to include questions missed in completed exams as well as practice attempts.
- Added a dashboard shortcut to change the target category without detouring through tab navigation.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — first-run setup (2026-10-12)

- Added a focused first-run category selection before the dashboard; the learner must explicitly choose AM, A, B, C, or D.
- Persisted onboarding completion and the selected category in SQLite, then used that value for specialist exam questions.
- Kept category switching available from the dashboard for returning learners.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — guided dashboard (2026-10-12)

- Added a prominent, thumb-reachable dashboard recommendation that starts a focused 3-point question session.
- The recommendation opens Study directly in the matching filter, reducing the choice burden for new learners.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — readiness and focused sessions (2026-10-12)

- Added a readiness card based on the five most recent completed exams: average score, pass rate, and points remaining to the 68-point threshold.
- Converted the dashboard recommendation into a deliberately bounded five-question 3-point session.
- Added deep-link session sizing to Study while retaining the standard 12-question browsing set.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — study discovery and safe exit (2026-10-12)

- Added Basic and Specialist study filters alongside all, 3-point, mistakes, and flagged questions.
- Added local full-text-style question search that composes safely with every Study filter.
- Added an explicit confirmation before abandoning an active exam, preventing accidental session replacement or loss.
- Validation passed: `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` (21/21 checks).

## Checkpoint — reminder persistence (2026-10-12)

- Persisted the scheduled daily reminder identifier in SQLite.
- Restored the toggle state on app reopen and cancel the exact scheduled reminder when disabled, preventing duplicate reminders.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — release hardening (2026-10-12)

- Added explicit ignore rules for the locally stored government XLSX source and plain `.env` secrets.
- Verified the private source asset is ignored without removing it from the workspace.
- Validation passed: `npx expo-doctor` (21/21 checks), `npx tsc --noEmit`, `npx expo lint`, and `git diff --check`.

## Checkpoint — reviewed explanation pipeline (2026-10-12)

- Added an optional reviewed-explanation table and repository lookup; Study renders an explanation only when a reviewed record exists.
- Added `EXPLANATIONS_CONTENT.md`, defining the required editorial review, source provenance, and import format.
- Kept the app from generating unreviewed road-safety/legal guidance in the absence of an approved explanation pack.
- Validation passed: `npx tsc --noEmit` and `npx expo lint`.

## Checkpoint — Android bundle verification (2026-10-12)

- Completed a local Android `expo export` successfully (1,737 bundled modules).
- Verified the lightweight SQLite question catalog is bundled; the local source XLSX and multimedia archives are not part of the export.
- The generated `dist` output remains ignored by Git.

## Checkpoint — device launch (2026-10-12)

- Started the LAN-only Metro server on port 8083 for private physical-device testing.
- Public tunneling was intentionally not used; the machine and test phone must be on the same Wi-Fi network.

