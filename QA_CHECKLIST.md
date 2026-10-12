# Private device and release QA checklist

Run this checklist on a physical Android device and, before public release, an iPhone. Record the app version, device model, OS version, and outcome for every failed item.

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
