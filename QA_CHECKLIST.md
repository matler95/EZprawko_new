# Private device and release QA checklist

## New improvement plan — F0 / F1.1 (2026-10-13)

- [x] Missing-file search: all three current gov.pl ZIP indexes checked remotely;
  exact DSC_0055.JPG and 5-9.2021.wmv absent. Ordinary indexes match local copies;
  current catalog SHA matches local source. This is not a repair or decoding pass.

- [x] P0 canonical media delivery mapping fixed locally; real NFC grant/URL/cache
  regression and exact-key Worker checks pass. R2 inventory after repair matches
  2633/2635 keys; no new canonical collisions in real catalog.
- [ ] P0 on updated app: 11179/11180 obtain canonical grants and decode films on
  Android/iOS; warm cache works offline. Old cached names do not cause wrong media.
- [ ] P0 obtain verified DSC_0055.JPG (11150) and 5-9.2021.wmv/MP4 (13074).
  File with bis is linked to 13080 and cannot be assumed to be a safe replacement.

- [x] F1.0 source reconciliation: all 3518 IDs/media/category sets match official
  katalog rows, including 538 blanks; source cells for missing files recorded.
- [x] F1.0 actual R2 metadata inventory completed via read-only GET: 2649 objects,
  2631/2635 exact expected keys present/nonempty. Two absent files (11150/13074) and
  two NFC/NFD name mismatches (11179/11180) documented. No repairs performed.
- [ ] F1.0 resolve two absent files and canonical delivery-key mapping; verify grants,
  URLs/cache and true decoding for all affected questions on Android/iOS.

- [x] P0 F1.0 local reference audit: database/manifest sets, real app delivery/cache
  mapping and ZIP metadata reconciled using `audit-media.cjs` (see docs/MEDIA_AUDIT.md).
  Exact local source references missing for questions 13074 and 11150; not repaired.
  This check does not mark full media completeness, decoding or server access as passed.

- [ ] P0 F1.0 completeness: reconcile every expected media reference against official
  import source and actual storage, across all categories. Record IDs/keys, intentional
  text-only questions, missing/empty files, unsupported types and WMV -> MP4/case/key
  collisions. Shared objects count once globally; unknown inventory is not a pass.
- [ ] P0 F1.0 availability: verify real authenticated application path, HEAD/GET and
  video Range, distinguish 401/403/404/5xx, expired grant and invalid/partial media.
  Check all unique files for integrity/decoding; native Android/iOS samples and reviewed
  question-media correspondence are separate requirements. Do not expose auth tokens.
- [ ] P0 F1.0 offline: warm cache, partially downloaded/lost file, retry and decoder
  failure keep exact question pool and block answering until ready. Save all-category
  report with expected/present/accessible/decoded/matched/unverified totals and defects.
- [ ] F5.1 Start/Study/onboarding: shared headings announced; larger recommendation,
  answer markers and metadata fit both themes/all languages/largest fonts without
  obscuring exam CTA, bottom navigation or selected/correct semantics.

- [ ] F5.1 headings/locale: Settings and Progress headings are announced and wrap at
  largest font; five Settings child cards retain readable metadata in both themes.
  Postęp stays centered on tablets without clipping numbers or section headings.
- [ ] F5.1 locale: PL/EN/DE/UK show intended grouping and MB decimal separator; history
  dates use interface locale and local 24-hour time. Change device zone and reopen:
  dates refresh without changing saved attempts. Unknown/invalid values show a dash.

- [ ] F5.3 Study menu: open category chooser, change draft, cancel with no setting write;
  save/retry updates Study and new exams, not an active exam. Route filters remain;
  search resets as explained. Double taps/old Start cannot launch a stale category batch.
- [ ] F5.3: no category chooser during active Study/preparation/summary or exact exam
  replay. Background/return during save leaves no stale error, busy lock or auto-start.
- [ ] F5.3 onboarding/settings/data: disclosure announces expanded state and hides
  collapsed text from reader; local-only/no-sync and export privacy/restore limitations
  remain visible. Verify PL/EN/DE/UK, both themes and largest fonts. Onboarding actions
  sit low when content fits and remain scrollable/reachable when it does not.

- [ ] F2.5: with a reviewed local explanation fixture in Study and exam review,
  teaching and Polish notice are immediately visible; legal/source details start
  collapsed. Reader announces Show/Hide and expanded state, cannot reach hidden link.
- [ ] F2.5: expand/collapse works in both themes and PL/EN/DE/UK at largest fonts;
  source target >=48px opens official URL. New question/reopened review starts collapsed;
  retry retains selected answer and stats. Current shipped pack has no explanation entries.

- [ ] F5.4 Study: reader announces A/B/C answer text, selected/correct markers and
  disabled navigation; visible markers remain understandable without color. T/N
  controls wrap on narrow screens, with largest fonts and readable letter badges.
- [ ] F5.4 Review: opening a question hides background from reader; labelled close
  and accessibility escape work, focus enters/returns correctly, bottom safe area
  is respected. Number tiles/answers grow with large fonts without clipping.
- [ ] F5.4 Signs: 48px filters, category-scoped count loading/retry without leaving
  selected sign, no stale count after category/foreground change. Practice action
  clears previous exam-session filters and retains current category.

- [ ] F5 Settings cards: account/download/reminder/data actions share layout and
  readable labels in both themes and all UI languages at large fonts.
- [ ] F5 account: keyboard/autofill, show/hide password and login -> same material
  return work; logout doesn't clear local progress/cache. Validate with a real account.
- [ ] F5 reminder: switch announces checked/busy, time action announces current time;
  iOS cancel doesn't save, Android dialog respects 24-hour time. Verify actual delivery.
- [ ] F5 download/data: busy label remains visible, cancellation usable, export locks
  reset actions; destructive actions still require confirmation. About legal links work.

- [ ] F5 onboarding/settings: both themes, PL/EN/DE/UK and large font; shared buttons
  wrap and onboarding stays centered on larger devices without restricting scrolling.
- [ ] F5 onboarding: language/category radios keep selected state; busy save blocks
  duplicate/secondary actions; Back, draft reopen and final Study destination still work.
- [ ] F5 Settings: save/read errors and successful save are announced; danger cache
  removal remains distinct and confirmed, disabled during download and reversible by
  cancelling the confirmation. Test with actual keyboard and screen reader.

- [ ] F5.1: shared primary/secondary/link/gold controls wrap long translated labels
  at largest font; spinner does not hide the action label, status announcements are usable.
- [ ] F5.1: exam preparation Start is blocked while busy, Cancel works until commit;
  Study summary and preparation preserve prior navigation/retry/answer behavior.
- [ ] F5.1: inspect migrated cards/buttons in both themes on Android/iPhone; minimum
  targets are 56px for main actions and 48px for links, without fixed container height.

- [ ] F4: Start recommends a weak topic with >=5 tested questions, historical mistakes
  when sample is smaller, or five three-point questions for an empty record. An active
  exam's resume remains primary; no readiness/pass guarantee is implied.
- [ ] F4: Progress has coverage, separate mastery, topic sample size/latest score and
  a topic practice action. Samples below five show insufficient data, not a diagnosis.
- [ ] F4: category change cannot use other-category exams in topic results; shared
  practice questions apply to their bank categories. Rapid returns cannot show an
  obsolete refresh. Topic/review routes clear unrelated sign/session filters.
- [ ] F4: history mistake labels are clear after correction; zero-count history action
  is hidden. Long topic labels/large fonts wrap on both platforms.

- [ ] F3.6: summary -> next batch retains category/language/filter/topic/sign/search;
  large pool avoids previous source batch, small pool reports repeated questions.
- [ ] F3.6: read failure keeps summary and answers; double tap starts one batch.
  Blur/reset during read cannot start late; media preparation uses the new exact pool.
- [ ] F3.6: completed-exam mistake replay offers its own replay, no general next-batch
  action; continuation never broadens scope just to fill the batch.

- [ ] F3 menu: Start and actual batch count are easy to find; topics/filters/search
  expand with readable accessible state on small phones and large fonts.
- [ ] F3 scope: collapsed panels never hide active search/topic/sign/exam constraints;
  Clear returns to the current category. Topic/generic mistake entry has no old scope.
- [ ] F3 navigation: unanswered Skip/Finish is distinct from answered Next/Summary;
  skip does not increment practice stats and remains unanswered in the summary.

- [ ] F2.4: explanation read failure -> inline Retry in Study and exam review;
  selected answer, current position, media and statistics stay unchanged.
- [ ] F2.4: rapid retry/change question/close review/reset cannot display an old
  explanation; absent reviewed content shows the missing-content message, not Retry.

- [ ] F1.2: select a media-bearing batch, observe exact count/progress, fail delivery,
  log in and retry; the question IDs and starting position remain unchanged.
- [ ] F1.2: cancel during delivery, rapidly switch tabs and return, change category,
  language or reset data; obsolete preparation never opens a question or writes answers.
- [ ] F1.2: ready batch -> Start -> actual image/video decode; cold and partially
  cached sessions are prepared without claiming decoder success/full offline.
- [ ] F1.2: denied access/storage -> Settings -> return resumes the same batch.

- [ ] Complete physical baseline measurements and screenshots described in docs/UX_BASELINE.md.
- [ ] Image/video answers unlock only after successful decoding; loading, buffering and errors remain blocked.
- [ ] Missing URI has recovery; account-required opens login, access denial/storage error opens Settings rather than repeated download.
- [ ] Retry, rapid question changes and leaving the screen do not apply obsolete media results.
- [ ] Check actual video playback and exam timing on Android and iPhone after readiness changes.

Run this checklist on a physical Android device and, before public release, an iPhone. Record the app version, device model, OS version, and outcome for every failed item.

## UX audit acceptance — 2026-10-13 (physical checks still open)

- [ ] Fresh install: choose PL/EN/DE/UK before category. Labels on all tabs, Settings,
  dialogs, timers, result/review and account errors follow UI language. Main language
  also changes default question language; a separate override works. Existing exams
  retain their content language. Polish sign/legal/editorial content has a language notice.
- [ ] Enable a local reminder, change UI language and verify one schedule with the
  translated content at the original time. Changing language while disabled must not
  enable notifications or ask permission. Verify actual OS delivery, not just stored IDs.
- [ ] Let one next attempt warm while logged in. Measure warm Start through briefing
  to question: no bulk downloads/new draw after click, no clock started during warming.
  Cold first use/category/language/cache changes show honest progress and cancellation;
  cancelled preparation must preserve an existing active exam.
- [ ] Inject answer/result-write failure and retry: original selection retained, one
  completed result, no stranded index-32 resume. Test fast double taps and taps just
  after question/global deadlines. Background/reopen must not restart question time.
- [ ] During active exam verify Android Back confirmation and actual iOS navigation
  gesture behavior. Verify media plays once without controls; specifically inspect
  process-death resume for replay/continuity before approving exam fidelity.
- [ ] Study → another tab → Study keeps the question/selection/summary. Explicit new
  category/filter/source resets the round. Restarting the process is not Study resume.
  Open history and replay exact wrong/skipped questions from that attempt, including
  its category; other attempts must not contaminate this filter.
- [ ] Results A/B/PT do not contaminate another category's recent pass rate/trend;
  global history remains labelled. Coverage is not mastery or a guarantee of passing.
- [ ] Small phone, largest fonts, both themes, VoiceOver/TalkBack: buttons/filters wrap,
  question/results scroll, answer status has text/symbols and login keyboard is usable.
  Media failures have retry/login as appropriate, without exposing paths/private URLs.
- Local evidence: 25 regression scripts, TypeScript/lint, Expo Doctor 21/21, 24 contrast
  pairs and Android JS export passed. These do not substitute for device acceptance.

## PLAN_UX_IMPLEMENTACJI.md — UX-4 settings

- [ ] On physical Android/iPhone, check Learning/Appearance/Account/Multimedia/Reminders/Data/Information in both themes, small screen and large fonts. All category/language/theme options wrap, have readable selected states and >=48px targets; verify screen-reader labels, roles and headers.
- [ ] Change category and language; Study and newly started exams use the saved values. Existing exam category/language stay unchanged. Simulate a failed SQLite save: previous language/theme remain selected, error is actionable and retry succeeds. Rapid taps submit one setting write; returning after an offscreen save unlocks controls and rereads language.
- [ ] Missing media cache shows 0 MB; actual filesystem read failure shows unavailable size. Re-enter Settings or return from background after downloading media and check refreshed size. Manual refresh retries read failure without deleting files.
- [ ] Removing downloaded media first asks for confirmation. Cancel/back/system dismissal preserves files; confirm clears only downloaded media, preserving questions/progress/preferences/account. Failure leaves a retryable action, never announces successful removal. A running preload blocks clearing; the clear confirmation blocks starting a preload. After cancel/failure/completion both actions become available again.
- [ ] During full local-data removal with a pending download, verify obsolete download cleanup completes and cannot recreate files after removal. Regression-check export, progress-only reset and full local removal; account/cache preservation still follows their displayed contracts.

## PLAN_UX_IMPLEMENTACJI.md — UX-3 local account UI

- [ ] Use only an existing authorized test account. Empty/bad-format e-mail or empty password shows field feedback without a request. Entered password bytes, including intentional spaces, are not trimmed. Invalid credentials/unconfirmed e-mail/rate-limit/network failure have safe actionable messages, no backend/token/password dump.
- [ ] Show/Hide defaults masked and remasks after success/blur; check actual iOS/Android autofill, e-mail Next focus, password Go submit, keyboard avoidance, small screens, large text and screen reader. Repeated submit/logout taps produce one action; login read failures can be retried.
- [ ] Reopen Settings and background/foreground the app: local session snapshot is refreshed. A late old read cannot overwrite a new auth event; stored-session wording does not promise server-verified permissions. Expired/rejected sessions remain recoverable.
- [ ] In Study/review, trigger a genuinely missing-login material error and use the inline modal. Login or explicit return/retry reloads the same material/question, preserving selected answer and round position and adding no practice attempt. Closing does not claim cancellation of a server request already sent; it may finish without late UI navigation.
- [ ] During an active exam, no inline login modal/pause/restart is offered. Prepared materials, no native controls and all original global/question timing rules remain. Missing-media recovery does not silently reset exam time.
- [ ] Local logout preserves SQLite progress/cache and does not delete the server account/sign out other devices. If logout/confirmation fails, UI must not claim verified completion. Account switching does not imply a cloud-synced or account-isolated progress database.
- [ ] Full local removal while login is pending waits for the serialized auth work, then confirms local session absence; old callbacks cannot restore it afterward. Ordinary progress reset preserves account semantics. Check errors/foreground/unmount races without production credentials.
- [ ] Registration, confirmation/recovery email links, password changes and server account deletion remain unimplemented/unconfigured in this local stage; do not mark them validated from form tests. Existing AsyncStorage/session security and production access policies need release review.

## PLAN_UX_IMPLEMENTACJI.md — UX-2 resumable onboarding

- [ ] Fresh test installation/copy (do not erase the owner's existing progress just to test): no category silently selected, Next blocked until choice; all 12 target categories and PL/EN/DE/UK question options available. Interface remains Polish; missing translations explicitly fall back.
- [ ] Next/Back saves the confirmed step/category/language. Close/reopen after a confirmed transition and resume that step; an unconfirmed radio change is not promised to survive. Invalid draft safely recovers without modifying the official bank.
- [ ] Completion commits category, language and flag together; synthetic write failure permits retry without partially updating preferences. Double taps create one transition/completion; reset while a write is queued cannot resurrect the old setup.
- [ ] Existing completed onboarding preserves the selected category/language and does not show the new wizard automatically. Ordinary progress reset keeps setup; full local removal restarts it. JSON export contains the draft when unfinished, without auth credentials.
- [ ] Test direct navigation/deep links to Study/Progress/Signs/Exam before completion: return to setup with hidden tabs. Settings/legal remain inspectable. Complete setup and confirm normal tab navigation is restored, including foreground/blur/read failures and a late offscreen completion.
- [ ] First-study action opens the first question of a category/language-correct five-question three-point batch, not only the bank list. No practice row until an answer is saved. Next does not re-trigger autostart; failed/empty query shows recoverable state.
- [ ] Optional Dashboard and Account/Reminder destinations work; onboarding never requests notification permission. Media login requirement, cache limitations and local-only progress explanation match actual behavior. Choosing reminders opens Settings for an explicit later decision.
- [ ] Android/iPhone compact screens + large system fonts + screen reader: all four steps scroll, category/language radio states are announced, headings/errors readable, no hidden CTA under keyboard/safe areas or color-only selection. Check Back navigation and focus after transitions.

## PLAN_UX_IMPLEMENTACJI.md — UX-1 exam-media readiness and download recovery

- [ ] On a slow connection, start a new exam: Briefing shows exact media preparation counts before a new active attempt/deadline exists. After preparation it starts at approximately 25:00, then normal 20+15/50 question timers; no network fetch is needed for those prepared files.
- [ ] Repeat with all selected media already cached in airplane mode: no network grant needed for a cache hit. Missing cache file while offline blocks preparation rather than starting a timed unusable question.
- [ ] Missing login/CDN object/configuration, HTTP failure or zero-byte/oversized file shows preparation failure with retry/settings access. Previously active exam/questions/answers remain; its original deadline continues independently and is not extended.
- [ ] Cancel during drawing/serial media preparation, change category or leave Dashboard: no late new exam/navigation. Current HTTP download may finish; cancellation does not abort the socket mid-file. Briefing's short committing stage locks cancellation, then either starts or rolls back on write failure.
- [ ] Partially fail a 250-file Settings download: busy indicator stops and retry is enabled; already cached files are reused. Rapid duplicate taps do not launch a second batch. Cancellation between files, tab blur and category switch do not attribute old progress to a new category.
- [ ] Test storage quota/system cache purge. All files must exist at final pre-start verification; evicted files block readiness. Do not infer a full category offline pack or permanent availability from a bounded cache batch.
- [ ] Decode/display each prepared image/video correctly on Android and iPhone: file size checks alone cannot prove codec/content validity. Check large video, local-player startup delay, background/foreground and audio/control rules without modifying the engine's time limits.
- [ ] Reset local data during preparation and immediately start another download: old callback/temp cleanup must not recreate progress/session or interfere with the new generation. Verify no stray temporary files after errors.

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

## Simplification — gamification removed (2026-10-13)

- [ ] Dashboard shows learning, exam, resume and category results without badges,
  achievement lists, streaks or challenge cards. No reward prompts in other tabs.
- [ ] Passed/failed exam results show the exact score immediately, with no counting,
  success halo or celebration. Answer feedback is visual/tactile, without chimes.
- [ ] Upgrade an older installation: questions, translations, media, answers/history,
  flags and mastery remain. Old reward rows/nullable local_day columns are inactive,
  not updated or reconstructed; optional export preserves them until explicit reset.
- [ ] Fresh install creates no challenge_days/user_achievements tables. Reset and
  export work both with and without these legacy tables; reset never deletes the bank.
- [ ] Run `node scripts/test-no-gamification.cjs`, full regression and native device QA.

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
- [ ] Passed and failed results show the exact recorded score immediately; opening/closing review details does not change it. No reward animation/counting.
- [ ] Reduce Motion removes question slide motion. Test changing this setting mid-animation and both themes.
- [ ] VoiceOver/TalkBack announces the recorded final score once, without decorative reward elements.
- [ ] Run `node scripts/test-exam-motion.cjs` and the engine/timer regressions. Stubbed contracts do not replace physical-device animation/playback QA.

## Core exam

- [ ] Start an exam for all 12 supported targets: A, A1, A2, AM, B, B1, C, C1, D, D1, PT, T.
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

- [ ] Select English as app language: UI and default questions change. Then change only question language and verify the UI stays in the chosen app language. New exams use the content preference.
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
- [ ] Verify selected-category coverage/mastery and exam weak areas; the removed global weak-category cards must not reappear.
- [ ] Complete Study answers and verify practice history/mastery update without challenges or awards.

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

## Look-ahead media and quarantine — device QA

- [ ] Fresh Study/exam pools never include 11150/13074; old history remains viewable.
- [ ] All categories retain 32 questions / 74 points; an unstarted old draft is replaced.
- [ ] Cold Study start waits for only the selected question and next two, including start from the middle of a batch.
- [ ] While answering, upcoming materials download; repeat on slow mobile data, rapid Next/Previous and after changing filters/category.
- [ ] Compare cold vs warmed startup time on physical Android/iOS; record network and cache state (no claimed benchmark yet).
- [ ] Airplane mode: ready exam works from cache; Study may need retry beyond the prepared window and must not offer answers before media readiness.
- [ ] Login, blur/refocus, cancel, cache limit and local reset cannot cause a stale question to open or a clock to start.
- [ ] Current question/start outranks queued background downloads; at most two transfers run globally.
