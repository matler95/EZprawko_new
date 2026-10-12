# Implementation progress

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 3.3: question entries and result motion (2026-10-12)

- Implemented only the user-approved point 3.3. Added a short 180ms, 16px native-driver question-entry slide; no animation callback gates answer submission or clock progression.
- The question scroll region is keyed by session/question, not reading/answer phase. New questions reset scroll and media playback instances; changing phase does not remount/replay the same film. Question/media visibility and answer controls are not delayed behind animation completion.
- Added a shared 900ms score reveal in the result and completed-exam review, clamped to the recorded score. Screen readers receive the true final score immediately, not successive count values. Interruption/Reduce Motion/focus changes resolve to the correct final score; listeners and animations clean up.
- Passed attempts receive one restrained 650ms themed halo/check celebration; failed attempts have no success animation. The mobile UI guidance informed short, non-blocking transitions and a readable, non-flashing result treatment. No new packages or bitmap assets were required.
- Extended the motion-preference hook with readiness information while preserving the existing boolean useReducedMotion API. Unknown/failed preference reads remain conservative; Reduce Motion disables the new slide, counting and success animation.
- Native-stub contracts passed for live controls, durations/drivers, true-score accessibility, count clamping, interruption/focus recovery, listener cleanup, success animation and reduced motion. Timer contracts, all 5,000 exam-engine trials and skeleton tests passed. Phone animation/media QA remains separate.
- Final validation passed: `npx tsc --noEmit`, `npx expo lint`, motion-preference race/unmount/failure tests, Phase 1 UI, explanation and translation regressions, and Android export (1,716 modules, 6.4 MB bundle). `git diff --check` passed.
- Exam selection, 20+12 ordering, 74-point scoring, deadlines, auto-advance, translations, SQLite records and cache services were not changed. Point 3.4 progress-chart improvements await explicit user confirmation; approved explanation content remains an independent open dependency.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 3.2: timer warnings and one-shot haptics (2026-10-12)

- Completed only the approved timer-warning point after resuming the interrupted tool-approval attempt. Question answering time is neutral above 10 seconds, warning at 5–10, critical below 5, and static red when expired. Reading/video phases remain neutral.
- Added a single best-effort Warning haptic per keyed question/answer phase, not on every tick. No warning haptic is requested during reading/advancing/finishing, for the global clock, off-focus, in the background or under Reduce Motion. Unsupported-device/rejected haptic promises are caught.
- Kept the existing global-clock warning thresholds (60/30 seconds) and all actual exam durations, scoring and auto-advance rules. Bound displayed question time to question ID plus phase so the preceding question's low countdown cannot trigger a spurious warning on the next one.
- Critical warnings pulse the red outline with native non-interaction animation while text remains fully opaque/readable; Reduce Motion/off-focus disables the loop and cleanup stops it. The mobile UI guidance informed restraint, theme-aware contrast and accessible warning labels.
- Contract tests cover exact 11/10/5/4/1/0 thresholds, both themes, one warning per question, new-question reset, stale-clock isolation, global quiet mode, reduced-motion/focus/background suppression, haptic failure and animation cleanup. Engine (5,000 trials), Phase 1 UI and skeleton regression tests passed.
- Final validation passed: `npx tsc --noEmit`, `npx expo lint`, 24 semantic contrast checks, `git diff --check` and Android export (1,714 modules, 6.4 MB bundle). The outline uses the RN 0.86-compatible StyleSheet.absoluteFill API; text is not faded by the animation.
- No dependencies, native directories, question bank, translations, sign lexicon or cache were changed. Native vibration feel and visual warnings still require phone QA. Work on 3.3 awaits the user's explicit confirmation.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 3.1: loading skeletons (2026-10-12)

- Implemented only the user-approved point 3.1. Added reusable themed Skeleton, LoadingSkeleton and retry/error components without new dependencies.
- Dashboard initial loading now uses card/statistic placeholders instead of the raw preparation text. Study renders placeholders for topic/question reads and new filter/search requests, and does not mistake pending results for an empty bank. Progress waits for history/weak-area/category reads before showing metrics or empty states and refreshes on tab focus.
- Added explicit read-failure/retry states and cancellation guards so rejected or obsolete SQLite promises do not leave a permanent skeleton or replace newer results. Existing populated Dashboard data is retained during normal focus refreshes.
- Pulsing uses one native-driver opacity loop per placeholder group with non-interaction animations. Reduce Motion and unfocused screens disable the loop; cleanup stops it. Screen readers receive one busy loading label, not every decorative shape.
- Mobile UI guidance informed card-shaped layouts, 16/24px spacing, semantic light/dark surfaces, accessible busy/error states and 48px retry controls. The native exam timer, engine, question bank, translations, sign lexicon and cache were not changed.
- Contract tests passed for three layouts/two themes, loading accessibility, animation configuration/cleanup, reduced-motion/focus guards and retry; Phase 1 UI, explanation migration/ranking and translation regression tests also passed. TypeScript and Expo lint passed without errors/warnings.
- Android export passed (1,713 modules, 6.4 MB bundle). No dependency upgrades or infrastructure deployments were performed in this point.
- Physical-device appearance, slow-read/error injection, screen-reader and Reduce Motion QA remain in QA_CHECKLIST.md. No claim of native visual QA is made from stubbed component tests.
- Remaining: point 3.2 timer/haptic polish, 3.3 transitions/results and 3.4 progress charts. Work on the next point awaits the user's explicit confirmation. Reviewed explanation content remains an independent open dependency.

## Checkpoint — PLAN_IMPLEMENTACJI.md, Phase 2: reviewed-content infrastructure and hardest filter (2026-10-12)

- Added a backwards-compatible, in-place explanation-table migration with teaching text, legal basis, review identity and original question/key/media snapshots. Preserved the legacy explanation column/getter and user data; added an index for per-question practice failures.
- Added validated, versioned, transactional offline pack import. Unknown/mismatched question snapshots roll back the entire content update; unsafe links, missing review metadata, duplicate IDs and future dates are rejected. Existing reviewed records are retained and newer review timestamps are protected from downgrade. Snapshot-backed content is hidden if source questions change.
- Added shared, theme-aware explanation cards in Study (after answering only) and completed-exam Review: text, legal basis, official-source link, Polish-language notice, and explicit missing/loading/error states. The mobile UI skill informed legibility, themed surfaces and source-link target sizing. Active exam behavior is unchanged.
- Added Najtrudniejsze: all three-point questions plus questions with at least two incorrect practice attempts, ranked by failure frequency, point value and stable ID. The filter composes with language, topic, sign and search, with a visible explanation of ranking.
- Added editorial CLI/report/template generation. The priority queue has 1,882 question IDs, including all 1,699 three-point questions. The ignored `.expo/explanations-review-template.json` contains original question/key/media snapshots and empty editorial fields, not invented explanations.
- Passed explanation migration/import/idempotence/rollback/source-mismatch/data-preservation/ranking tests, translation integration, Phase 1 UI contracts, all 5,000 exam-engine tests and road-sign tests. No changes to exam-engine.ts, road-signs.ts, the original question database, translation data or media cache.
- Final validation passed: `npx tsc --noEmit`, `npx expo lint`, explanation-card missing/loading/error/legal-link UI contracts, `git diff --check`, and Android export (1,712 modules, 6.4 MB bundle). No claim of physical-device QA or approved content coverage is made.
- CONTENT BLOCKER: the workspace has no qualified-reviewer-approved explanation pack. The shipped package intentionally contains zero entries; source-link/reviewer metadata validation does not constitute legal review. Phase 2 is therefore not fully complete and cannot satisfy its content acceptance criteria until approved explanations/legal bases are supplied.

## Checkpoint — PLAN_IMPLEMENTACJI.md, Phase 1: basic-answer UI, briefing and recovery (2026-10-12)

- Read the complete new PLAN_IMPLEMENTACJI.md; this checkpoint follows its Phase 1 numbering, distinct from the earlier IMPLEMENTATION_PLAN.md phases.
- Added shared basic-answer controls in Exam, Study and Review: two 80px-minimum targets with success/error accents, no T/N prefixes, and official translated labels (TAK/NIE, YES/NO, JA/NEIN, ТАК/НІ). Internal ministerial T/N keys remain unchanged.
- Exam disables the controls during reading/video and while advancing; the locked phase has a neutral appearance and an explicit notice. Study retains immediate answer feedback; review marks both the learner's choice and the MI key with text, not color alone. Specialist A/B/C controls are unchanged.
- Added a themed, scrollable pre-exam briefing on Dashboard with category, 32 questions, 20+12 split, 25 minutes, 68/74 threshold and forward-only rules. No session/deadline is created until confirmation. Cancellation preserves any active exam; replacement is explicitly disclosed, duplicate start taps are guarded, and startup failures can be retried.
- Added src/components/error-boundary.tsx: an outer React boundary protects provider/startup rendering, and SDK 57 screen boundaries retain the navigator during route failures. Retry/Home recovery does not delete SQLite data or media and warns that an active exam clock continues. Raw exception details are not displayed. Error boundaries cover render/lifecycle errors, not arbitrary asynchronous/event-handler failures.
- The mobile UI skill informed the 80px targets, readable lock/selection labels, semantic theme colors and scrollable briefing/recovery layouts. No new dependencies or manual native-directory changes were introduced; exam-engine.ts, translations, SQLite schema, media cache and road-signs.ts were not modified.
- Passed component contract tests (native primitives stubbed), all 5,000 exam-engine trials, translation integration tests and the 235-sign/26-link tests. TypeScript and Expo lint passed. Physical-device visual/render-error injection QA remains on QA_CHECKLIST.md; contract tests are not claimed as native end-to-end tests.
- Android export passed (1,707 modules, 6.4 MB bundle). Protected domain/database files have no diff; `git diff --check` is clean.
- Additional Expo Doctor run: 20/21 checks passed. The dependency-version check now recommends newer SDK 57 patch versions for expo, @expo/ui, expo-dev-client, expo-router and expo-splash-screen. Existing pinned versions were not changed as part of this UI phase; native dependency upgrades and rebuilt-client validation remain separate maintenance work. TypeScript/lint and the Android export are clean.
- Remaining in the new plan: Phase 2 reviewed explanations/legal bases/hardest-question filter, then Phases 3–6. No unreviewed road-safety explanation content was generated in this phase.

## Checkpoint — Phase 6: media-grant negative tests (2026-10-12)

- Fixed the active Cloudflare Worker (src/index.js): grants must have an integer expiry in the future and no more than five minutes ahead, plus a nonempty string subject. Existing two-minute Supabase grants remain compatible.
- Missing/null/string/nonfinite expiry values no longer bypass expiration. Malformed percent-encoded paths and control characters return 404 instead of throwing; oversized tokens are rejected.
- Added local tests of the actual Worker: valid GET/HEAD, bad signatures/audience/object keys, expired/missing-exp claims, malformed paths, missing objects and unsupported methods. Rejected grants do not access R2.
- Worker tests, 235-sign tests, translation integration tests and 5,000-exam tests passed. No secrets were used and no remote deployment was performed.
- Final code validation passed: `npx tsc --noEmit` and `npx expo lint`; Expo Doctor reported 21/21 checks with no issues.
- Deployment action remaining: run `npx wrangler@latest deploy` in infrastructure/cloudflare-media-worker to activate this security correction. Supabase and the mobile authentication protocol require no change. This checkpoint does not claim rate limiting, entitlement checks, R2 inventory verification or physical-device offline QA complete.

## Checkpoint — Phase 6: deterministic exam-engine regression tests (2026-10-12)

- Added `scripts/test-exam-engine.cjs`, exercising the actual TypeScript engine against the bundled SQLite bank with a reproducible random seed.
- All 5,000 generated exams passed (1,000 each for AM/A/B/C/D): exact 20+12 section order, point quotas, 74-point maximum, 25-minute duration, question timing metadata, category eligibility, no duplicate IDs and no mutation of the bank.
- Verified scoring at 74, 68, 67 and 0 points; rejected empty/insufficient pools, unsupported category and duplicate-ID inputs.
- Validation passed: engine tests, `npx tsc --noEmit` and `npx expo lint`. This closes the planned generator-test item, not physical-device/offline QA or release readiness.

## Checkpoint — Phase 5: offline official sign lexicon (2026-10-12)

- Replaced the 12-item demo with 235 official entries in the planned A/B/C/D/T groups. Names and graphics were extracted from the government regulation annex and checked against the four subsequent amendments, including 2026/133; repealed T-22 is excluded.
- Bundled approximately 1.5 MB of WebP artwork, generated reproducibly with source-page and document SHA-256 provenance. The gallery does not depend on CDN, credentials, or connectivity.
- Added a virtualized list, group filters, accent-insensitive/name/code search (including B20), enlarged sign details, source links, Android detail-back handling, empty states and direct Study entry. Mobile UI guidance informed readable cards and 44–58 px controls; official artwork intentionally retains its white source background in dark mode.
- Added a versioned SQLite question_signs migration and a bound Study filter. The 26 mappings use exact code evidence from question text/media filenames, not guessed image classifications. Missing links are disclosed with a fallback to the signs topic.
- Tests passed: catalogue/assets/search/current names, mapping migration/idempotence/preservation of records, bound SQL filter, and translation/exam regression checks. TypeScript, Expo lint and Expo Doctor (21/21) passed; Android export bundled all 235 sign assets (1,704 modules, 6.4 MB JS bundle).
- Remaining: physical-device/offline/accessibility QA, comprehensive human-reviewed sign annotations of question images/videos, and optional groups outside A/B/C/D/T. The planned lexicon functionality is implemented; comprehensive multimedia annotation and release QA are not claimed complete.

## Checkpoint — Phase 5: official EN/DE/UA question content (2026-10-12)

- Inspected the local government workbook and reconciled all 3,518 question IDs with the existing SQLite catalog. The workbook contains the official language columns; no additional translation source is required for the records available there.
- Extended the importer to extract only complete translated question/answer sets. Imported EN: 3,518; DE: 3,517; UA (`uk` internally): 2,303, totaling 9,338 entries in an approximately 2.6 MB offline package with source SHA-256 provenance.
- Added a versioned, transactional SQLite translation migration that upgrades existing installations without replacing question records, flags, practice records, settings, or exam history.
- Added a persisted question-language selector in Settings. Study browsing/search and flashcards, new exams, resumed exams, and review now read official translated content. Missing translations fall back to a complete Polish question/answer set with an explicit notice; the app interface remains Polish.
- Active and completed exams retain their selected language independently of later changes in Settings. Point values, answer labels, correct keys, and media routing are unchanged.
- Added a repository integration test against in-memory SQLite: migration/idempotence, all 9,338 answer keys, language display/fallback, session resume, 74-point scoring, and translated review passed.
- Validation passed: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` (21/21), translation integration checks, and Android export (1,452 modules, 6.3 MB bundle).
- Remaining in Phase 5: complete verified sign artwork/catalog and sign-to-question links. Physical-device language/upgrade/offline QA is listed separately in QA_CHECKLIST.md. Translation import and mobile language selection are implemented; the entire Phase 5 is not yet declared complete.

## Checkpoint — Phase 4: screen themes, ergonomics, and motion (2026-10-12)

- Connected semantic palettes to Dashboard/onboarding, Study/flashcards, Progress, Settings, sign lexicon, active exam, review, and media/account/download cards. Search inputs, secondary text, feedback, and modal surfaces now follow the selected theme.
- Fixed the nested theme-provider bug that bypassed saving the manual preference. Appearance is loaded from SQLite before revealing the app; native tabs, navigator, status bar, and shared themed components use the same selection.
- Added an animated exam progress bar and timer warnings (yellow at 10 seconds, red/pulsing at 5 seconds for questions). Motion respects the device's Reduce Motion setting. Answer targets in Study are at least 60 px high.
- Added a compact dashboard ring showing the actual pass rate of recent attempts. Dashboard data refreshes on focus after returning from exams, Study, or Settings.
- Removed the unused Explore route and commented LegacyHomeScreen/exam monolith from the index route. Replaced the web starter navigation with EZprawko tabs and removed the Expo logo overlay from startup. Native splash appearance changes require a new binary.
- Added repeatable theme contrast checks: 24 semantic foreground/background pairs pass at least 4.5:1. The mobile UI guidance informed control sizing, compact-screen layout, and reduced-motion handling.
- Validation passed: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` (21/21), contrast checks, and Android export (1,450 bundled modules). Physical-device visual verification remains on the QA checklist; no claim of visual QA is made from the bundle checks.

## Checkpoint — private CDN device confirmation (2026-10-12)

- The tester confirmed media now loads after the R2 folder mapping correction. The Supabase session → per-object grant → Worker → private R2 delivery path is confirmed by the user.
- Full offline, expired-token, and media-bank integrity checks are still pending.

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
- Harden production media access (user entitlements and rate limiting), audit the complete converted media bank, and test offline behavior. Private CDN delivery is now working and confirmed by the tester.
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

