# Private device and release QA checklist

Run this checklist on a physical Android device and, before public release, an iPhone. Record the app version, device model, OS version, and outcome for every failed item.

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
