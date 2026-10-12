# Private device and release QA checklist

Run this checklist on a physical Android device and, before public release, an iPhone. Record the app version, device model, OS version, and outcome for every failed item.

## New plan — point 6.2 EAS linkage, signing and OTA

- [ ] Owner explicitly chooses personal/team project and records the real UUID in app.json. Read-only account check found a logged-in owner with two available accounts; no project was selected or created during implementation.
- [ ] Verify resolved Expo config: both native IDs pl.ezprawko.app; linked update URL exactly https://u.expo.dev/{projectId}; fingerprint policy; no placeholder endpoint. Unlinked local development keeps OTA disabled.
- [ ] Set/verify three public client variables in EAS development, preview and production environments. No Worker HMAC, R2 credential or Supabase service-role key enters the client/upload. Local .env.local availability does not certify remote EAS definitions.
- [ ] Inspect the actual EAS upload/archive before approving cloud build. ZIPs, Excel, source videos, tool state, server infrastructure and credentials are excluded; official SQLite, translation/sign catalogs, graphics, app config and post-install validator are present.
- [ ] Confirm profile channel/environment match: development/dev client, preview/internal APK/ad-hoc iOS, production/store AAB. Preview/production remote version numbers increase; retain the correct signing identity for upgrades.
- [ ] Complete Android keystore / Apple team and ad-hoc device signing with the owner. Native package-ID change from an older dev app/Expo Go does not migrate its sandbox automatically; export first. JSON import is not implemented.
- [ ] Build/install preview and run native launch/media/exam/offline QA. Bundling exports and doctor 21/21 do not certify native build success or device behavior.
- [ ] Publish a private preview OTA with --channel preview --environment preview only after validated native build. Verify channel/runtime isolation, two cold launches, airplane-mode embedded fallback and SQLite/exam preservation. No automatic reload during an active exam.
- [ ] Native-library/config change produces a different runtime fingerprint and requires a new matching binary. Confirm incompatible updates are not delivered; never disable anti-bricking safeguards to force them.
- [ ] Before any production publication, close legal/media/content/account-deletion/device gates and dependency security findings. Native store code signing is distinct from optional OTA cryptographic signing; the latter was not configured here.

## New plan — point 6.1 launcher identity and splash

- [ ] Install a newly built native app (not only Metro reload/OTA/Expo Go). Confirm EZprawko road/check icon, not the Expo template, in launcher, app settings and recent-app contexts.
- [ ] iOS: inspect light/dark appearance and system tinting; opaque icon edges are correctly masked by the OS, with no pre-rounded white corners. Verify recognizability at ordinary home-screen/search icon sizes.
- [ ] Android: inspect circle, squircle and supported alternative launcher masks; no cropped mark edges. Android 13+ themed icons use the white/alpha silhouette tinted by the system, not a solid square or the old Expo artwork.
- [ ] Cold launch in system light/dark mode shows the corresponding centered mark/background, then transitions to the loaded app without an added delay. Test offline and slow database initialization. Saved in-app theme overrides can differ from the system-selected native splash; record any distracting transition.
- [ ] Confirm existing database/auth/cache onboarding and data-maintenance recovery still reach the expected screen; this branding phase must not introduce a new route or launch blocker.
- [ ] Check web favicon in a fresh browser context without a stale favicon cache.
- [ ] Before release: resolve five newer SDK57 patch recommendations reported by expo-doctor during 6.1 and rerun typecheck/lint/doctor. Do not mark native build/device QA complete from local mask previews alone.

## New plan — point 5.3 Study-session summaries

- [ ] Complete a selected five-question quick session and a twelve-question batch; final Next opens summary. Correct + incorrect + unanswered equals the actual batch size, not the whole topic/category bank.
- [ ] End early or browse without answers: summary explicitly reports unanswered questions and partial completion. Starting at a later card does not imply earlier cards were answered.
- [ ] Revisit answered cards and tap answers rapidly: one history write per question per round, original choice restored/locked. Test TAK/NIE and A/B/C, all languages and both themes.
- [ ] Repeat mistakes contains only incorrect questions from that round, not all historical mistakes or unanswered cards. A successful replay has no repeat-errors button. Each new round can create its own genuine attempt rows.
- [ ] Check mastery delta after a third eligible correct repetition, a same-day repeat (no increase), and a wrong answer resetting mastery (possible decrease). Exact selected category pool remains shared with exams.
- [ ] Simulate write/read failures: failed write offers retry without credit; mastery read retry does not duplicate attempts. Denied/unavailable haptics do not lose the answer. Late callbacks after blur/category change/reset do not update a new round.
- [ ] Check compact phone, large system fonts and screen reader: scrollable summary, readable counts, no color-only statuses and reachable ending/replay/menu controls. Cached question media works in airplane mode.
- [ ] Leaving/reopening Study resets the in-memory round; existing persisted attempts/mastery remain. This point does not add durable resumable Study-session summaries.

## New plan — point 5.2 learning streaks and achievements

- [ ] Upgrade a copy of an older installation: practice/exam counts, answers/results, flags, translations and sign data remain. local_day is backfilled once from timestamps in the migration device's timezone; subsequent upgrades must not rewrite the stored days.
- [ ] One correct OR incorrect Study answer or one completed exam qualifies a learning day; repeated actions that day do not create extra days. Incomplete/abandoned exams do not count. All driving categories contribute to the global streak.
- [ ] Verify yesterday grace, a genuinely missed day resetting current streak to zero, and best streak retention. Check local midnight/DST/year/leap transitions; foreground Dashboard refreshes within a minute and on returning from background.
- [ ] Check the separate challenge: five correct Study answers on each of three consecutive days. Three nonconsecutive qualifying days must not falsely complete it; an already completed challenge remains completed until reset.
- [ ] Verify first-completed and 74/74 badges from existing and new exams; repeatedly reopen Dashboard without duplicating awards. Streak badge uses three consecutive learning days, not the separate five-answer target.
- [ ] Expert sign badge is per selected category, using unique questions with sign links and current mastery >=3. No award for a category with no linked questions. A third credit must respect the existing 24h spacing; repeated same-day correct answers cannot instantly master the bank.
- [ ] Complete the final required sign question: award persists even if the next attempt is incorrect. Changing category shows that category's expert status while global badges remain. Label must not imply verified mastery of every sign in the full lexicon.
- [ ] Export includes user_achievements and local_day history fields. Both reset flows clear streaks/awards without deleting questions or sign links. Pending old practice/exam work must not restore awards after reset.
- [ ] Check compact phones, large font, light/dark and VoiceOver/TalkBack. Earned/locked states are textual, and daily-study shortcuts appear before the achievement list. Travel/timezone changes must not rewrite historical local_day; current-day projection/grace should be checked explicitly.
- [ ] Run `node scripts/test-learning-rewards.cjs` in Europe/Warsaw and America/Los_Angeles, plus `node scripts/test-session-categories.cjs`. Tests use synthetic/in-memory fixtures, not the tester's actual progress.

## New plan — point 4.3 configurable daily reminder time

- [ ] Android uses a native 24-hour dialog; iOS uses a themed native time spinner with explicit Save/Cancel. Opening or cancelling must not save or schedule. Test 00:00, 08:35 and 23:59 with large font and screen readers in both themes.
- [ ] While reminders are off, save a time: preference persists after tab switching/restart, but no notification or permission request is created. Enable explicitly, grant permission and confirm one daily schedule with correct hour/minute.
- [ ] Change time repeatedly while enabled; inspect pending OS requests: exactly one owned daily reminder remains. Migrate a previous random-ID reminder without leaving a duplicate. Other unrelated notification requests remain untouched by a normal time change/disable.
- [ ] Deny permissions and verify a clear error/system-settings route, not a false enabled state. Revoke/restore permission outside the app and return: card refreshes from OS permissions/scheduled requests rather than trusting a stored ID.
- [ ] Disable then re-enable: remembered time is retained. Ordinary progress reset preserves time/schedule; full local-data removal cancels notifications and restores the default 19:00 preference. Export JSON includes daily-reminder-minutes.
- [ ] Inject scheduling/cancellation/SQLite failure: no success claim, prior schedule is restored where possible, and failed compensation is visible. Remove injection afterwards. Leave/re-enter Settings while a save is pending: busy state must recover.
- [ ] Begin a delayed enable/change and then full local deletion: queued cancellation wins, with no recreated notification or preference after wipe.
- [ ] Verify actual background delivery around the chosen minute on iOS/Android, and behavior under Focus/DND/battery-saving, reboot, local time-zone and DST changes. System delivery is not guaranteed exact; stubbed tests cannot establish it.
- [ ] Rebuild a development client if it lacks datetimepicker 9.1.0/config-plugin changes; no manual native edits. Web explicitly reports unsupported local reminders.
- [ ] Run `node scripts/test-reminders.cjs` and `node scripts/test-reminder-ui.cjs` (real SQLite preferences plus stubbed OS/picker contracts).

## New plan — point 4.2 user data management

- [ ] Before destructive testing, export a JSON copy and inspect it: version/date/scope, all local session/answer/practice/mastery/flag/challenge records and known preferences are present; no auth tokens, password, multimedia or question-bank content. No import/restore capability is promised.
- [ ] Share the JSON to Files/a trusted destination on iOS and Android; verify destination can read the complete UTF-8 file, including Polish characters. Cancel sharing or inject sharing/write failure: no success claim or persistent temporary JSON. Web/unavailable sharing shows an actionable failure.
- [ ] Open both destructive confirmations and cancel: no data changes. Confirm reset: active/completed exam history, practice, mastery, flags and challenge days become empty, while selected category/language/theme, reminder, login, cache and all official content remain.
- [ ] Confirm local deletion: postęp/preferences/onboarding, managed media/export cache, locally scheduled reminders and local session disappear. App returns to onboarding/default settings; all 3,518 questions/translations/signs remain usable offline. Cloud account is NOT deleted.
- [ ] Inject SQLite failure halfway through reset: all progress changes roll back. Inject cache/auth/filesystem failure in full deletion: it must report incomplete work, not success; retry must be possible even if earlier steps succeeded.
- [ ] Test deletion while offline and with expired/invalid session. Verify local session removal; inability to revoke a server session is explicitly reported. If session cannot be removed, full deletion must not claim success. Verify other-device sessions/account are not deliberately deleted.
- [ ] Trigger delayed practice answer, exam-save and media download, then delete/reset: previous operations must not recreate progress/cache. All mounted screens are discarded during maintenance and refreshed afterwards, without old timers or selections.
- [ ] No local operation can remove copies already shared to other apps or OS backups; copy and confirmations must remain explicit about this limitation.
- [ ] Verify 48px controls, confirmations and maintenance indicator in both themes/large font/screen reader. Rebuild a development client if expo-sharing is absent from its binary; JS export does not validate the native share sheet.
- [ ] Run `node scripts/test-user-data.cjs` and `node scripts/test-session-categories.cjs`. These tests use isolated SQLite and stubs, not actual deletion on the tester's device.

## Reported fixes — resume loop and global category

- [ ] On the affected phone, restart updated Metro/build, open the panel and confirm a new exam starts from question 1 with a fresh timer. A corrupt/expired attempt must not cause repeated Resume → Dashboard navigation. If needed, confirm "Porzuć egzamin w toku"; only the unfinished attempt is discarded, not history or learning progress.
- [ ] Finish one exam, return, start another and verify previous result, selections and timers are not reused. Start twice rapidly from briefing: only one attempt is created.
- [ ] Simulate resume read failure in development: Retry/Home are available, not an indefinite preparation label. Simulate new-session hydration failure: previous resumable attempt remains intact. Remove injected failures afterwards.
- [ ] Choose each of AM/A1/A2/A/B1/B/C1/C/D1/D/T/PT: exactly one checked selection. Settings, Dashboard, Study and offline-download category agree, including when tabs were already mounted. Restart and verify persistence.
- [ ] With B then B1, A then A1, C then C1, verify exact category membership rather than substring matches. Test All/3-point/Mistakes/Hardest, translated search, topics and sign-linked Study routes.
- [ ] Change category with a Study question open: stale question/session closes and new questions/topic counts match the new category. Existing exam retains its category; starting a new exam uses the selected category.
- [ ] PT is described as a tram permit. Check all category controls at large system font size on a compact phone and with VoiceOver/TalkBack.
- [ ] Run `node scripts/test-session-categories.cjs`; fixtures use an isolated in-memory copy, never the user's on-device database.

## New plan — point 4.1 about and legal documents

- [ ] Settings shows project version, installed-binary build number and ministry source/rights notice. Compare version/build with the installed EAS binary; Expo Go must not show its host build as EZprawko's build. Missing/web metadata is explicitly unavailable.
- [ ] Open Privacy and Terms from Settings in both themes; verify full Polish text, visible draft/revision notices, readable paragraphs, selectable text and 48px navigation/link controls at large font size on a compact phone.
- [ ] Read both documents in airplane mode without an account: local text must remain available. External links may fail but must not crash the screen; address can be copied.
- [ ] Verify Back returns from each document; a cold deep link without history falls back to Settings. Android system Back also leaves the document without resetting SQLite or logging out.
- [ ] Documents must not imply a granted ministry/media licence, completed export/account deletion, guaranteed exam success or a legally approved public release. Follow LEGAL_RELEASE_CHECKLIST.md before changing draft status.
- [ ] If the current development-client binary lacks expo-application, rebuild it using Expo/EAS (no manual native edits). Do not treat the Android JS export as a successful native build.
- [ ] Run `node scripts/test-legal-ui.cjs`; contract tests are not legal review or device QA.

## New plan — point 3.4 progress chart and coverage

- [ ] In light/dark mode, verify 0, 67, 68 and 74-point bars against the dashed 68/74 threshold. Zero must not be drawn as a nonzero score; dates, years, local times and categories remain visible below columns.
- [ ] On a compact phone and at large font size, horizontally scroll all seven chart columns; verify labels, history timestamps and coverage text do not clip or overlap.
- [ ] With VoiceOver/TalkBack, verify chart columns announce date/year/time, category, true score and pass/fail; verify the coverage bar announces its current count/percentage.
- [ ] Repeat one question several times in Study and then answer it in a completed exam: full-bank coverage increases only once. Incorrect answers count as answered, not mastered; skipped exam questions and incomplete exams do not increase this coverage.
- [ ] Return to Progress after practice/exam completion, then restart offline: values refresh/persist correctly. Reset progress through the existing flow and verify coverage returns to zero without deleting the question bank.
- [ ] Check an empty history: no fake chart/results appear; bank coverage may still reflect practice. Inject a temporary read failure: skeleton ends in retry, and retry recovers. Remove injection afterwards.
- [ ] Run `node scripts/test-bank-progress.cjs` (real in-memory SQLite and stubbed native chart contracts, not device visual QA).

## New plan — Phase 1 UI and recovery

- [ ] Open the briefing, wait, then cancel: no new active session is created and no timer is started. An existing exam remains available to resume.
- [ ] Confirm start: the briefing disappears, the exam timer begins, and rapid repeated taps do not create multiple sessions.
- [ ] Verify category, 32 questions, 25 minutes, 68/74 and no-return instructions are visible on a compact phone and at large system font size.
- [ ] Basic questions display two large TAK/NIE controls without T/N prefixes. During reading/video they are disabled and visibly marked as locked; specialist questions retain A/B/C.
- [ ] Repeat the basic-control check in English, German and Ukrainian; missing official translations must still use the complete Polish fallback.
- [ ] In Study and exam Review, verify chosen and correct basic answers have distinct textual markers, including an incorrect choice and unanswered question.
- [ ] Inject a temporary development-only render error in a screen: the recovery UI appears, Retry retries, and Home reaches Dashboard without resetting SQLite or media. Remove the injected error before building.
- [ ] Test a startup/provider render failure separately; the splash must not obscure recovery and Home waits for navigator readiness after reinitialization.
- [ ] Verify active exam expiry continues across recovery/backgrounding. Error Boundary must not be treated as an async/network-error handler.
- [ ] Run `node scripts/test-phase1-ui.cjs`; these are component contract tests with native primitives stubbed, not physical-device QA.

## New plan — Phase 2 explanations and difficulty

- [ ] Import a genuinely reviewed pack following EXPLANATIONS_CONTENT.md; never use synthetic test fixtures as teaching content.
- [ ] Verify Study does not reveal explanations before an answer, then shows teaching text, legal basis and source link afterwards.
- [ ] Verify completed-exam Review shows the same explanation for correct, incorrect and unanswered questions; active exams must not expose it.
- [ ] Confirm missing entries show an honest missing-content message rather than a fabricated explanation. Non-Polish questions must identify the explanation as Polish.
- [ ] Move quickly between questions and ensure asynchronous explanation reads cannot replace a newer question's explanation.
- [ ] Test source links online; explanation text and legal citation must remain available offline once bundled/imported.
- [ ] Create repeated errors on a low-point question and verify Najtrudniejsze ranks it above unattempted three-point questions. Verify topic/sign/language/search composition.
- [ ] Upgrade an existing installation with legacy explanations and verify history, flags and translations are preserved.
- [ ] Run `node scripts/test-explanations.cjs` and `node scripts/prepare-explanations.cjs --report`.

## New plan — point 3.1 loading skeletons

- [ ] Delay SQLite reads in a temporary development-only test: Dashboard, Study and Progress show themed placeholders before real data, without premature empty states or fake zero metrics. Remove test delays before delivery.
- [ ] Change Study filters/search quickly and verify only the newest results display; controls/search remain available during loading.
- [ ] Reject a read temporarily: loading ends with an error/retry control. Retry recovers, including a failed initial question-language read.
- [ ] Return to Progress after an exam/practice session and verify statistics refresh.
- [ ] Test skeletons on a compact phone in light/dark mode and at large system font size.
- [ ] Enable Reduce Motion: placeholders remain static. Switch away from a loading tab: its opacity loop stops; unmounting also stops it.
- [ ] With VoiceOver/TalkBack, verify one busy loading announcement and no decorative-rectangle announcements; retry is accessible.
- [ ] Run `node scripts/test-skeleton.cjs`; these are native-stub contract tests, not physical-device verification.

## New plan — point 3.2 timer warnings

- [ ] Answer phase: verify neutral >10 s, warning at 10 and 5 s, and red below 5 s; expired display remains static red until progression. Reading/video time must remain neutral.
- [ ] Feel at most one warning vibration per question below 5 seconds, not one per second. Next question can warn independently.
- [ ] Advance from a question with 1–4 seconds left; the next question must show its own initial duration without an early vibration/red flash.
- [ ] Reduce Motion disables pulsing and the optional warning haptic, while color/text warnings remain. Verify both themes and readable non-fading digits.
- [ ] Verify no warning vibration in the background, outside the focused exam route or from the global timer; deadlines must continue normally.
- [ ] Test a device where haptics are unavailable/disabled: the exam remains usable. Actual vibration delivery depends on device/system support.
- [ ] Verify the global 25-minute timer, question time limits and auto-advance are unchanged.
- [ ] Run `node scripts/test-exam-timer.cjs` and `node scripts/test-exam-engine.cjs`; native-stub tests do not replace phone QA.

## New plan — point 3.3 question/result motion

- [ ] Each new exam question slides in briefly without hiding content, blocking answers or delaying timers/auto-advance. Verify rapid answering and timeout progression.
- [ ] A new long/media-heavy question starts scrolled to the top. Basic reading → answering must not remount/replay its video; consecutive questions referencing the same video must each get their one playback.
- [ ] Passed and failed results count up to the exact recorded score; only passed attempts show success celebration. Buttons remain usable during the effect.
- [ ] Navigate away during score counting and return; the final score must be correct, without a stuck partial count. Opening/closing review details must not replay the result effect.
- [ ] Reduce Motion shows the final score without counting and removes slide/halo motion. Test changing this setting mid-animation and both themes.
- [ ] VoiceOver/TalkBack announces the recorded final score, not each intermediate number; the halo is decorative.
- [ ] Run `node scripts/test-exam-motion.cjs` and the engine/timer regressions. Stubbed contracts do not replace physical-device animation/playback QA.

## Core exam

- [ ] Start an exam for each supported target category: AM, A, B, C, and D.
- [ ] Verify every exam has 32 questions: 20 basic and 12 specialist.
- [ ] Verify point weights add to 74 and that 68 points is the pass threshold.
- [ ] Confirm the 25-minute deadline continues after backgrounding/reopening the app.
- [ ] Confirm forward-only progression; an unanswered question advances automatically only when its answer window expires.
- [ ] Finish both a pass and a fail; verify the score, result, and history entry.

## Appearance and accessibility — Phase 4

- [ ] In Settings, select Light/Dark/System and verify all tabs, question answers, media messages, account forms, and exam review use the chosen colors.
- [ ] Close and reopen the app after choosing a manual theme; verify the choice is restored.
- [ ] In System mode, change the phone appearance while the app is open and verify the app follows it.
- [ ] Verify dark-mode search text and keyboard input are readable, including in the sign lexicon.
- [ ] Check the dashboard ring on a compact phone and with larger text; its percentage represents recent exam pass rate, not a guaranteed exam outcome.
- [ ] Verify the question timer becomes a warning at 10 seconds and pulses red at 5 seconds; it must not reveal correctness.
- [ ] Enable Reduce Motion on the phone; verify timer pulses stop and progress updates without animation.
- [ ] Run `node scripts/check-theme-contrast.cjs`; verify all semantic text/background pairs pass 4.5:1.
- [ ] Verify the release-build native splash uses the updated appearance (native config changes require a new binary).

## Question languages — Phase 5

- [ ] Select English in Settings and verify question text and answer options change in Study and in a new exam. The app interface remains Polish; this selection is for the official question content.
- [ ] Select German/Ukrainian and verify any missing official translation is visibly marked as Polish fallback rather than silently mixed.
- [ ] Switch the configured language after starting an exam; verify resuming and reviewing that exam retains its original language.
- [ ] Upgrade an existing install and verify saved history, flags, reminders, and category remain intact after the translation catalog migration.
- [ ] Search Study using words from the selected translation and verify results match the displayed question text.
- [ ] Enable airplane mode and verify imported text translations remain available.
- [ ] Run `node scripts/test-translations.cjs` (Node 22.13+): verify migration, complete answer keys, fallback, exam resume, and scoring.

## Sign lexicon — Phase 5

- [ ] Search `B20`, `B-20 STOP` and `ustap pierwszenstwa`; verify matching codes and names.
- [ ] Scroll all five groups and open the enlarged image on a compact screen and with large text.
- [ ] Open A-3, choose linked questions and verify only mapped questions appear in Study; clear the sign filter and verify normal browsing returns.
- [ ] Open an unlinked sign; verify the honest missing-mapping message and route to the broader signs topic.
- [ ] Android hardware Back in sign details returns to the gallery rather than leaving the app.
- [ ] Enable airplane mode and verify the entire sign gallery and details render without CDN login; source links naturally require internet.
- [ ] Check artwork, labels and source links in both themes. Official graphics retain a white background.
- [ ] Run `node scripts/test-road-signs.cjs`; verify 235 assets and 26 evidenced mappings.

## Study and progress checks

- [ ] Answer correct and incorrect study questions; verify haptic feedback and correct-answer reveal.
- [ ] Flag/unflag a question and verify the Saved filter.
- [ ] Verify All, 3 points, Mistakes, and Saved filters.
- [ ] Answer questions assigned to multiple categories and verify the category weak-spot cards update.
- [ ] Complete five correct study answers on three separate days and verify the challenge card.

## Media, cache, and connectivity

- [ ] With no CDN configured, verify the intentional private-media status is shown without an app error.
- [ ] After private CDN setup, verify one image and one MP4 video load on first view.
- [ ] Switch to airplane mode and reopen cached media.
- [ ] Start and cancel category preloading; verify the UI remains usable.
- [ ] Clear the cache from Settings and verify the displayed cache size resets.
- [ ] Verify expired/invalid media authorization shows a recoverable error state.
- [ ] Run `node scripts/test-media-worker.cjs` and deploy the updated Worker; reject signed grants with missing expiry and malformed object paths.

## Notifications, privacy, and delivery

- [ ] Enable and disable the daily reminder; verify no duplicate notification is left behind.
- [ ] Verify the application works without permissions other than notification consent.
- [ ] Confirm no permanent CDN token, media URL with embedded secret, XLSX source, or media archive is included in the build.
- [ ] Run `npx expo-doctor`, `npx tsc --noEmit`, and `npx expo lint` on the release branch.
- [ ] Run `node scripts/test-exam-engine.cjs`; all 5,000 seeded exams and scoring boundaries must pass.
- [ ] Build and install the EAS `preview` profile before requesting production credentials.
