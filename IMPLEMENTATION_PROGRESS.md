# Implementation progress

## Improvement plan — official source search for two missing files (2026-10-13)

- Inspected the user-specified gov.pl page and current links, then all three remote
  ZIP central directories using bounded HTTP Range (ordinary packages and sign-language
  package). No full archive download, extraction, storage write or media substitution.
- Exact DSC_0055.JPG and 5-9.2021.wmv absent in all packages; no filename contains
  DSC_0055 or question IDs 11150/13074. Part 2 contains only known bis variant for
  another question. Two ordinary indexes match local names/size/CRC/compressed size.
- Current catalog attachment SHA-256 equals local source. This is a binary comparison,
  not a new worksheet edit/import. Source still needs publisher clarification/assets.
- Added repeatable find-official-media.py with strict 206/Content-Range validation,
  stable Last-Modified check, seek/transfer bounds and no full-download fallback.
  Live search completed; Expo lint and TypeScript passed. Findings recorded in report.

## Improvement plan — P0 Unicode delivery repair (2026-10-13)

- Fixed delivery-only filename normalization to NFC before WMV -> MP4 mapping.
  Actual cache filename, protection/download lock, grant key and URL derive from
  the same canonical helper. Case/folder identity preserved; no source DB/manifest
  rewrite, speculative alias, Worker deployment or cloud object write.
- New real-mapping/cache integration checks both affected references, canonical
  coalescing, one grant/download for NFD/NFC, identical signed/request key and warm
  offline lookup. Legacy noncanonical cache is not falsely reused/deleted; normal
  LRU can clean old entries. Worker regression confirms exact signature binding:
  canonical grant works; mismatched decomposed request cannot read the bucket.
- Audit tests additionally expose canonical filename collisions. Real catalog has
  no new collision. Full R2 GET audit after repair confirms 2633/2635 exact keys
  present/nonempty; only questions 11150 and 13074 lack expected files.
- Candidate 5-9.2021 bis.wmv belongs to question 13080, not 13074. It was not
  substituted. Remaining source files require verified originals/correction; no
  invented media or changed official answers. Native playback/grant QA remains open.

## Improvement plan — P0 F1.0 source rows / actual R2 inventory (2026-10-13)

- Spreadsheet skill applied to read-only source analysis. Original XLSX was neither
  edited nor exported. Added repeatable source-field extraction and keyed reconciliation:
  all 3518 IDs/media references/category sets match SQLite, including 538 blank media
  fields. Source provenance includes Excel row/media cell; duplicates/gaps/mismatches
  are distinct diagnostics. Missing archive refs originate in H3031 and H3243.
- Actual configured R2 bucket read through existing Wrangler session and Cloudflare GET
  metadata API only. Tokens remain in process memory; no raw CLI stderr/provider body
  is echoed. No upload, renaming, deployment, account/permission or source-data changes.
- Complete inventory: 2649 objects; 2631/2635 expected exact keys present/nonempty,
  with image/video MIME families. 18 objects unreferenced by exact delivered keys.
  API omitted cursor metadata; documented start_after continuation reached an empty
  page. First response contained 649 entries and was NOT assumed to be complete.
- Four exact-key misses: 13074 and 11150 have no matching file/candidate; 11180 and
  11179 have canonical-equivalent NFC files (598763 and 545143 bytes). Existing delivery
  mapping/Worker lacks normalization, so this is a real key compatibility gap. No
  automatic correction was made. Actual file contents and learner grants not verified.
- Tests cover source mismatch/duplicates/gaps and exact/blank category comparisons;
  cursor/start_after pagination including ignored/repeated/unsorted responses; size,
  MIME and Unicode candidates without silently converting a miss to a pass. Test mocks
  never call live API. Original audit integration now checks source-row matched status.
- Results and remaining repair/codec/app-access tasks documented in docs/MEDIA_AUDIT.md.
  F1.0 stays open until missing files, Unicode mapping, decoding and native QA are resolved.

## Improvement plan — P0 F1.0 local media manifest audit (2026-10-13)

- Added repeatable read-only `audit-media.cjs` and detailed JSON manifest output:
  actual app delivery mapping, dependent question IDs/categories, cache keys and
  reconciliation against the packaged manifest plus ZIP central-directory inventories.
  Python helper only reads standard ZIP metadata; no extraction or cloud access.
- Bank: 2980/3518 questions reference 2635 unique files (1534 images, 1101 WMV).
  Manifest matches references, no current delivery/cache/case collisions. Source XLSX
  SHA matches database/manifest; source ROW reconciliation is explicitly unverified.
- 2633 references occur by exact basename in two source archives. Missing:
  13074 -> 5-9.2021.wmv; 11150 -> DSC_0055.JPG. A separate 5-9.2021 bis.wmv exists
  but was not substituted. 16 unreferenced archive entries are reported, not deleted.
- New tests exercise shared IDs/categories, actual WMV mapping, manifest gaps,
  delivery/cache/case collisions, invalid/unsafe/unsupported/empty/conflicting records,
  unused entries and real bank/archive report. Existing preparation/readiness/Worker
  regressions, Expo lint and TypeScript passed. No educational/answer data changed.
- Detailed evidence and remaining P0 stages in docs/MEDIA_AUDIT.md. Remote presence,
  authenticated HTTP/Range, conversion outputs, CRC/content decoding and native playback
  are unverified for every reference; local metadata is not a completeness pass.

## Improvement plan — F5.1 Start/Study/onboarding and P0 media audit (2026-10-13)

- Migrated Dashboard title/section and Study menu/summary/category setup plus all
  onboarding step/section headings to shared semantic AppHeading. Body/metadata,
  answer/selection markers and recommendation/resume copy use common readable tokens.
  Removed obsolete heading styles. Brand hero, question text and score hierarchy stay
  specialized; no session, route, official content, timer or persistence behavior changed.
- Mobile UI skill guided shared hierarchy and scalable text. Existing >=600px maximum
  content width, wrapping controls and no fixed text heights remain. Device large-font
  layout and VoiceOver/TalkBack focus are not certified by local tests.
- Added F1.0 as first next P0 checkpoint at user request: complete manifest/reference
  reconciliation, all-category source mapping, WMV-to-MP4/case/key collisions, actual
  storage presence/size/type, authenticated HTTP/Range availability, integrity/decoding,
  semantic media-question match and Android/iOS plus offline/recovery acceptance.
- Media audit is planned, NOT performed. Report must distinguish missing, denied,
  damaged and unverified, count shared objects correctly and include affected IDs.
  No live storage/auth probes, downloads, uploads or cloud mutations were performed.
- All 34 test scripts and 34 contrast pairs passed; final onboarding/Study semantic
  heading checks, Expo lint and TypeScript also passed. QA and phase status updated.

## Improvement plan — checkpoint F5.1 headings / locale (2026-10-13)

- Added screen/detail tokens and AppHeading with semantic header role, shared section
  or screen typography and no fixed height/truncation/font-scale override. Settings
  and Progress screen/section headings use it; redundant heading styles were removed.
- Account/download/reminder/data/About cards use common heading/detail tokens. Progress
  body/detail text is larger and content centered within 600px. Specialized question,
  score and exam/timer hierarchies are not flattened into generic headings.
- Shared UI-only formatter uses explicit PL/EN/DE/UK locales. Progress coverage counts
  no longer force Polish grouping; cache MB uses locale decimal separator. History dates
  use interface calendar format, current local device zone and a 24-hour clock. Date
  formatter is not retained across zone changes; number formats are cached in 8 variants.
- Invalid numeric/date input displays a dash. Progressbar text no longer has a hardcoded
  Polish percent word. No timestamps, SQL, exam timing, scoring or reminder schedules
  changed; compact chart dates and HH:mm reminder/exam clocks intentionally stay stable.
- All 34 test scripts and 34 contrast pairs passed. Formatter tests cover four locales,
  grouping/precision, explicit/live language, midnight, invalid input and zone changes.
  Heading contracts cover role, line height and native font scaling. Settings verifies
  live Polish/English decimal formatting. Final lint/typecheck passed without warnings.
- Mobile UI skill guided hierarchy and readable detail text. Remaining token adoption
  on Dashboard/Study/onboarding and native large-font/layout QA remain separate work;
  this checkpoint does not claim that every visual element or device is audited.

## Improvement plan — checkpoint F5.3 contextual setup (2026-10-13)

- Study menu now offers a 12-category chooser with a local draft, explicit Save/Cancel,
  radio labels/checked state and existing global category persistence. Cancel writes
  nothing; errors retain the draft for retry; synchronous lock prevents duplicate saves
  and stale start handlers. Choosing setup clears auto-start intent. Blur/unmount fences
  local async feedback. Active Study, summaries/preparation and exact-exam replay do not
  offer category changes, preserving the current batch and official exam scope.
- A successful category change uses the existing category-keyed remount. Route filters
  remain, local search starts fresh; the chooser explains both. Active exams keep their
  own persisted category. No new mode, session history or data-reset operation was added.
- Onboarding category copy is shorter; login prerequisite and local-only/no-sync notice
  stay visible. Cache details expand on demand. Flexible spacers move actions toward
  the bottom on short steps while preserving scroll on small screens/large fonts.
- Settings cache details and local-data export details are collapsible. Export sensitivity,
  lack of restore/sync and remote-account deletion boundary remain visible; destructive
  confirmations and export/reset locks remain unchanged. Shared controls provide >=48px
  disclosure targets. Added 11 unique rows in PL/EN/DE/UK (477 total).
- Handler tests cover category cancellation, failed save/retry, duplicate/stale action,
  category remount key, retained route filters and hidden active-session chooser in both
  themes. Onboarding/cache disclosure tests and user-data action contracts were extended.
- Mobile UI skill guided progressive disclosure and bottom-action layout. Physical
  scrolling, keyboard, screen-reader focus/Back and safe-area behavior remain in QA.

## Improvement plan — checkpoint F2.5 explanation disclosure (2026-10-13)

- Study and completed-exam review retain immediate teaching text and Polish-language
  notice. Legal basis and official-source link are now secondary, collapsed by default.
  Nothing is truncated; all teaching text remains directly readable.
- Shared link-style AppButton exposes translated Show/Hide labels and expanded state,
  with >=48px target and wrapping text. The Expo Router source link uses a native
  Pressable child, retaining link role and >=48px target. Collapsed details are not mounted.
- Disclosure lives only in resolved-content child; loading/failure removes it. Card
  is keyed by question ID, so new questions cannot inherit expansion. Legacy null legal
  metadata remains explicit and no absent source link is invented. Retry is unchanged.
- Component-handler tests cover both themes and PL/EN/DE/UK, toggle/collapse, direct
  teaching, hidden source, legacy metadata and loading/failure precedence. Recovery,
  Study sessions, review/sign accessibility, 466 translation rows, contrast, lint and
  TypeScript passed. Native focus, largest fonts and external-link behavior need device QA.
- Mobile UI skill guided hierarchy and touch targets; no gamification, dependencies,
  content generation, answer writes or cloud changes were added. Pack remains empty.
- Next local checkpoint: F5.3 onboarding/settings explanations and contextual category.

## Improvement plan — full regression / F2.6 coverage (2026-10-13)

- All 32 existing test scripts, 34 contrast pairs, Expo lint and TypeScript passed
  before this checkpoint. New explanation coverage test and final lint/typecheck
  passed after the CLI change. Tests do not certify physical device behavior.
- Editorial report now includes total/covered/missing/percentage and priority gaps
  globally, per each of 12 categories and per point value. Shared category questions
  count once in each category and only once globally; category totals are not additive.
- Report rejects unknown/stale question, answer or media references, rather than
  counting a schema-valid but source-incompatible record as covered. No bank or
  explanation content is written by reporting. Fixtures cover partial/empty coverage,
  category deduplication, priority and source mismatch; integration reads the real bank.
- Current content remains 0/3518 reviewed explanations, including 1882 priority gaps.
  Qualified review and access-policy decisions remain open; no cloud/account mutations.
- Replaced contradictory accumulated plan summaries with current phase status and
  remaining priority order. Earlier checkpoint history remains below. Next local task
  is F2.5 collapsible legal/source details; physical QA and optional F6 are not complete.

## Improvement plan — checkpoint F5.4 Study/signs/review accessibility (2026-10-13)

- Specialist Study answers now expose button/disabled/selected semantics and both
  visible and accessible selected/correct markers. Feedback has a polite live region;
  success uses success color. Navigation/end/flag/list-question actions expose roles.
  Answer letter badges use minimum sizes instead of fixed heights; marks sit below
  answer text rather than consuming horizontal answer width.
- T/N answer rows may wrap at narrow widths, retaining 80px minimum targets and
  official keys. No question timer, scoring or answer-write rules changed.
- Completed-exam review has a labelled >=48px close action, accessible escape,
  modal isolation and hidden background accessibility descendants while open.
  Safe bottom inset is retained. Number tiles grow vertically with text rather
  than imposing fixed height; review answer names include selection and correctness.
- Signs and review use centered <=600px content; sign filters are >=48px.
  Related-question read errors retry in-place. Ordered focus/request guards suppress
  obsolete counts; counts are hidden while loading/failed. Sign -> Study clears old
  session/start and unrelated scopes, avoiding accidental failed-exam filtering.
- Passed existing Study/T-N/sign/content regressions and new actual-screen contracts
  for sign retry/routes and result modal/answer semantics. UI languages, final lint
  and TypeScript passed. No live screen-reader behavior or physical layout is claimed.
- Physical VoiceOver/TalkBack focus ordering, escape/back, largest fonts, keyboard,
  media decoding and cross-platform geometry remain explicit acceptance tasks.

## Improvement plan — checkpoint F5.1 Settings child cards (2026-10-13)

- Migrated account, media download, reminder, user-data and About containers to
  shared AppCard. Account/download/reminder errors and loading messages use AppStatus;
  actions use shared AppButton variants. Offline download now retains a visible busy
  label alongside the spinner, with an independent link to cancel after current file.
- Extended AppButton to preserve switch/link roles, custom accessible names and
  checked/expanded states while always deriving disabled/busy from operation props.
  Reminder enable/disable remains a switch and password visibility keeps its state.
- User-data export is a secondary action; progress/full-local resets are danger
  text actions. Existing confirmations, export lock, maintenance/reset fencing and
  account/media download locks are unchanged. Native legal Link children are kept
  directly ref-compatible rather than routing them through a custom button wrapper.
- Updated relevant existing test renderers to inspect rendered shared controls and
  dynamic styles. Account tests cover validation, password visibility/clearing,
  double taps, session races, logout and return to the same media. Reminder tests
  cover iOS draft/cancel/save, switch permission intent, Android time selection and
  late callbacks. Download, reset/export, legal links and Settings regressions passed.
- Final lint/TypeScript, UI-language tests and 34 contrast pairs passed. No live
  login, real notification permissions/delivery, data deletion or cloud mutations
  were performed by these development checks. Physical keyboard/layout/screen-reader
  acceptance and broader F5 ergonomics remain open.

## Improvement plan — checkpoint F5.1 onboarding/settings (2026-10-13)

- Onboarding uses shared cards, primary/link actions and error status. Its content
  is centered at max 600px like the main screens. Category/language choices retain
  radio semantics, explicit selection and existing draft/atomic-completion logic.
- Settings Learning/Appearance/downloaded-media sections use shared cards and
  read/save/error statuses. Retry/refresh use common link actions. Added a danger
  text-action variant (48px minimum) for cache removal, retaining confirmation,
  download exclusion, cancellation and maintenance generation guards.
- Busy/disabled actions keep readable labels without opacity reduction in shared
  controls; onboarding save shows an indicator while secondary actions are blocked.
  No new preference, account operation or change to persisted data contracts.
- Adapted existing onboarding/settings test renderers to inspect actual shared
  controls. Regression passed: 12 categories × 4 languages, draft reopen, duplicate
  clicks, atomic failure/reset, settings write failures/retry, foreground return,
  unavailable cache readings and confirmation/download-clear exclusion in both themes.
  Shared briefing controls, 34 contrast pairs, final Expo lint and TypeScript passed.
- This checkpoint covers onboarding and the Settings screen's own sections.
  Account/download/reminder/user-data/about child cards still have local controls;
  their incremental migration and physical layout/keyboard/screen-reader QA remain.

## Improvement plan — checkpoint F5.1 shared controls (2026-10-13)

- Added ui-tokens.ts and reusable AppButton/AppCard/AppStatus controls. Buttons share
  primary/secondary/gold/link variants, minimum 56px main / 48px link targets,
  multiline labels, pressed feedback and explicit disabled/busy accessibility state.
  Busy blocks the action, retains its label and shows a decorative spinner.
- Disabled filled controls use readable primary text on neutral surfaces; links use
  secondary text without reduced opacity. Expanded contrast checks to 34 pairs,
  including disabled surfaces and status colors on the app background (>=4.5:1).
- Migrated Study start/summary actions and cards, Study preparation recovery/status,
  exam briefing cards/actions/errors and the Dashboard exam CTA. Summary separates
  primary mistake replay, secondary continuation and a link back to the menu.
  Native exam answer controls/navigation keep their purpose-specific layout.
- Existing preparation cancellation/commit and question-answer guards remain in
  handlers. Shared controls do not introduce data writes, dependencies or cloud changes.
- Full local regression scripts were exercised. The older briefing test loader was
  updated to resolve shared TSX controls and inspect their rendered native children;
  its final rerun passed, as did other regression scripts. Added busy/minimum-target/
  alert assertions to that existing test. Final lint/TypeScript and contrast passed.
- This is an incremental migration, not completion of F5. Settings/onboarding,
  remaining repeated controls and physical large-font/screen-reader/layout QA remain.

## Improvement plan — checkpoint F4 learning guidance (2026-10-13)

- Dashboard replaces the fixed recommendation with a deterministic selected-category
  rule: a weak topic with >=5 distinct tested questions, otherwise explicit historical
  mistake review when available, otherwise five three-point questions. Active exam
  resume takes priority; the learning recommendation is suppressed while it exists.
  The exam CTA remains available independently; no pass/readiness guarantee is added.
- Added read-only learningInsights: last result per question combines practice with
  completed exams of the selected category. Repeat attempts cannot inflate the sample;
  skipped exam answers count as incorrect tested questions. Timestamp ties resolve
  deterministically in favor of practice, then event order. Practice has no stored
  attempt category, so shared questions apply wherever the bank includes that question.
- Progress shows topic results, distinct sample/total, a direct clean topic route and
  insufficient-data labels below 5 questions. Topic ordering puts comparable weak
  topics first. Five is a product display threshold, not statistical confidence.
  Added separate mastery count alongside coverage and retained exam trends/history.
- Historical mistake count deliberately matches the existing Mistakes filter. Its
  labels explain that correct later responses do not erase old mistakes. Zero-history
  actions are hidden. An active due-review queue/new meaning of Mistakes is not introduced.
- Dashboard refresh requests are ordered so an older asynchronous refresh cannot
  overwrite newer data. Existing focus/category cleanup remains in effect.
- Tests passed: real SQLite latest outcomes/category/unfinished exam/skip/ties/history
  semantics, pure recommendation/ranking, actual Dashboard/Progress actions and sample
  labels; existing bank-progress/category tests, UI languages, final lint/TypeScript.
- Device layout and screen-reader acceptance remain open. Durable or shared active
  Study resume, due-review policy F4.1 and cloud account decisions remain separate.

## Improvement plan — checkpoint F3.6 next-batch continuation (2026-10-13)

- Study summary offers the next existing-length batch in the current scope.
  Shared readStudyBatch SQL preserves category, language/fallback, filter, topic,
  sign and search. Exact failed-exam replay retains its separate retry path and
  does not offer general continuation.
- A single parameterized query prioritizes IDs outside the prior source batch
  (including its mistake replay), then fills a small pool with previous IDs.
  DISTINCT prevents within-batch duplicates; repeated-count notice explains small
  pools. Preference is about the previous batch, not lifetime uniqueness/mastery.
- Failure/empty result leaves summary/answer ledger intact. Successful continuation
  starts a fresh ledger/baseline and uses existing media preparation for that pool.
  A synchronous lock prevents duplicate starts; blur, reset and stale requests
  prevent delayed continuation. Prior answers remain in database history.
- Real SQLite tests cover fresh/partial/full-repeat pools, ranking filters,
  category/topic/sign/search/exam scope, fallback, limits and parameter safety.
  Screen tests cover failure recovery, duplicate taps, ledger reset, repeat notice,
  cancellation/reset and exam-specific exclusion. UI language, lint/typecheck passed.
- Device layout/media/navigation acceptance remains open; no new session lengths,
  persistent session history or cloud operations were introduced.

## Improvement plan — checkpoint F3.1–F3.3 / skip clarity (2026-10-13)

- Study menu leads with actual batch count and Start, without requiring users to
  choose a question or scroll through every topic first. Mistake review and Signs
  remain direct entries; topics and advanced filters/search expand on demand.
- Current topic/sign/exam source and selected filter remain visible. Search is
  summarized even when its panel is collapsed. Clear removes search/filter and
  all route constraints including session/count/start, preserving target category.
  Choosing a topic or generic mistake review explicitly clears unrelated scopes.
- Corrected scope descriptions: exam-specific replay takes precedence over a
  supplied count; deterministic mistake/saved batches are not called random.
  Five-question labels only claim high weight with the three-point filter.
- Unanswered navigation says Skip (or Finish without answering on the last item);
  answered navigation retains Next/Summary. Skips do not record answers and remain
  visible in existing summaries. Added PL/EN/DE/UK messages.
- Study handler tests cover collapsed search, expand semantics, complete scope
  clearing, topic/mistake entry, explicit start, zero implicit writes and skip,
  in addition to prior session/media paths. UI language, lint and typecheck passed.
- Small-screen layout/screen-reader acceptance remains open. F3.6 next-batch
  continuation/exclusion and further F3 ergonomics remain upcoming.

## Improvement plan — checkpoint F2.4 explanation recovery (2026-10-13)

- Added shared read-only QuestionExplanation loader to Study answer feedback and
  completed exam review. Read errors have an inline accessible Retry button; missing
  reviewed content remains an honest separate state without ineffective retries.
- Retry preserves question, answer, batch and review selection. It only reads
  explanations, does not reload the question/media and imports no answer writer.
  Duplicate retries are locked synchronously; changed question, closed view and
  data reset fence delayed responses. Explanation reads no longer depend on flag
  reads in Study, so a flag failure cannot be mislabeled as an explanation failure.
- Added PL/EN/DE/UK copy and tests covering read failure/success/null, duplicate taps,
  stale question result, view cleanup, reset and accessible recovery. Existing
  explanation/database, Study and language tests passed; final lint/typecheck passed.
- Read-only editorial report: 3,518 questions, 1,699 three-point questions, 1,882
  priority questions, 0 packaged explanations. F2 editorial coverage remains open;
  no unreviewed teaching/legal content was generated or imported.
- Physical device feedback/review, font and screen-reader acceptance remains open.

## Improvement plan — checkpoint F1.2 (2026-10-13)

- Study opens media-bearing batches through a preparation screen with exact question
  count/category, unique-media progress, retry, cancellation and explicit start.
  The selected pool is copied before preparation and remains unchanged after errors,
  login and return from Settings. Text-only batches open directly.
- Added an isolated Study preparation controller reusing serial download and final
  cache-only verification. It performs no question draw or answer writes, suppresses
  obsolete progress, rejects duplicate runs and fences reset by data revision.
- Inline existing-account login retries that same pool. Access/storage errors lead
  to Settings; blur cancels work and refocus waits for it before starting a fresh
  preparation of the retained pool. Cancellation leaves partial downloads reusable.
- Prepared/active Study files are protected from automatic cache eviction for the
  mounted batch lifetime. Explicit removal still requires reloading media; decoding
  remains checked at the question rather than claimed by preparation.
- Added seven PL/EN/DE/UK messages. Tests passed: actual preparation/cache integration
  (frozen pool, partial retry, duplicate run, cancellation/reset), preparation UI
  (login/start/cancel/blur-refocus/access), Study handlers including media gate,
  decoder readiness and UI language; final Expo lint/TypeScript passed.
- Physical device network/decoder/layout/navigation QA remains open. No registration,
  server access policy, cloud changes or durable Study session storage was added.

## Improvement plan — checkpoint F0 / F1.1 (2026-10-13)

- Added docs/UX_BASELINE.md with source-confirmed starting conditions, timing
  definitions and physical measurement matrix. Physical screenshots/timings are
  still open; F0 is not claimed complete. Added device scenarios to QA_CHECKLIST.md.
- Study media readiness now requires successful image onLoad or video readyToPlay,
  rather than the presence of a URI. Loading/buffering/error blocks unanswered
  selections. Video status is observed through the SDK 57 event hook; a source
  change/retry remounts the decoder. Existing exam timers and engine are unchanged.
- Missing URI is a recoverable error instead of an indefinite loading spinner.
  Known account/access/storage errors have distinct recovery actions: login for
  missing session, Settings for access/storage, retry for transient download errors.
  Unknown errors are still sanitized and are not asserted to prove offline status.
- Validated new decoder/readiness tests, existing media preparation and UI-language
  tests, 5,000 seeded exam engine draws, final Expo lint and TypeScript (passed).
  Decoder/platform behavior remains subject to physical Android/iPhone QA.
- Next checkpoint: F1.2 exact Study batch preparation with progress/cancellation
  and return to the same batch after login. Registration/access policy and reviewed
  explanation content remain external dependencies, not implemented by this step.

## Checkpoint — simplification: gamification removed (2026-10-13)

- Owner feedback supersedes earlier reward/challenge plans. Removed Dashboard
  badge/achievement lists, daily challenge and streak cards, learning reward queries,
  reward persistence/award triggers, streak/date-backfill module and obsolete tests.
  Removed result celebration/halo and score count-up; exact passed/failed score is
  displayed immediately, with its accessible label and review actions preserved.
- Removed Study answer chimes, their generated audio players and the unused
  expo-audio dependency/config plugin. Visual answer correctness and existing subtle
  haptics remain functional feedback; timer warnings, Reduce Motion, question
  transitions, offline/media delivery and signed access are unchanged.
- Mobile UI design guidance was used for a calmer hierarchy and fewer sections,
  deliberately not its celebration suggestions. Dashboard retains daily practice,
  mistake review, exam/resume and actual category results. No replacement reward
  system, extra screen or setting was added. Pruned 23 unused reward-related UI
  translation entries (429 four-language entries remain).
- Fresh installs no longer create reward tables or local_day columns. Existing
  reward rows and nullable historical columns are left inactive, not dropped or
  rewritten. Export optionally includes existing legacy tables; explicit user-data
  reset clears them together with progress. Official 3,518 questions, translations,
  answers/history, flags, mastery and settings are preserved. No real user database
  was modified by development tools. Deleted modules can be recovered from the
  owner's backup/version history.
- Added test-no-gamification with real bank/SQLite: fresh schema, normal exam and
  practice writes, upgrade preserving results/legacy columns, zero reward writes,
  optional export and explicit reset, plus source contracts for plain result UI.
  Updated session/motion tests and active plan/QA/legal draft descriptions.
- Validation passed: all 25 regression scripts, final TypeScript/lint, UI-language
  tests after copy pruning, Expo Doctor 21/21, 24 contrast pairs and Android JS
  export to ignored .expo/simplified-ui-export (6.7 MB bundle). Device-level layout
  and native behavior still require physical QA; no EAS build or cloud change.
- npm uninstall reported 33 dependency audit findings (13 moderate, 20 high).
  No automatic audit fix/major-version changes were applied; dependency security
  review remains a separate release task. Removing the audio native plugin is
  reflected in the next native build; no native folders were edited.

## Checkpoint — UX audit, shared UI language (2026-10-13)

- Added a reactive PL/EN/DE/UK interface-language preference and a 452-entry UI
  catalogue covering navigation, onboarding, Study/exam/review, dashboard,
  analytics, Settings/account/media/reminders, recovery and accessibility copy.
  Placeholder parity and uniqueness are tested. This is editorial UI copy,
  not an official translation of legal or educational content.
- Changing interface language atomically saves UI and default question language;
  an explicit separate question-language override remains available. Existing
  exams retain their recorded category/content language. New onboarding chooses
  language before category; incomplete drafts and completed installs remain supported.
  Language defaults use the runtime Intl locale, with Polish fallback.
- Existing enabled local reminders refresh their content in the current language,
  without requesting permission or enabling a disabled reminder. Legal documents,
  sign names and editorial explanations remain Polish with an explicit notice;
  official question translations/fallback and answer keys are unchanged.
- Tests cover real SQLite atomic preference persistence/rollback, maintenance
  fencing, reactive subscriptions, all four locales and safe media error mapping.
  Registration, password-recovery e-mails/deep links and server account deletion
  are not added or enabled; they still require access-policy/server decisions.

## Checkpoint — UX audit, final local polish and validation (2026-10-13)

- Dashboard now leads with daily learning and mistake review before the exam card.
  Category-scoped indicators distinguish coverage, mastery and recent pass rate;
  global history is explicitly separate and opens the recorded answer review.
  Study keeps its question/answer/summary across tab returns, shows topic/batch
  context and supports exact failed-exam replay including unanswered questions.
- Added responsive/wrapping controls, minimum touch targets and symbol-based
  answer states. Missing explanations use compact honest copy. Sign-linked counts
  follow the selected category. Mobile UI design guidance informed hierarchy,
  touch targets and recoverable states without adding screens or session features.
- One next exam is warmed while the app is open. A Start joining that work receives
  its current/final progress rather than starting another draw/download. A ready
  candidate starts with cache-only verification, without bulk media downloading.
  First use, missing cache or changed preferences still need delivery; neither
  instant cold start nor a measured device latency is claimed.
- Answer submissions validate current question position and cannot overwrite a
  double submission. Clicks at/after the global deadline finish without crediting
  a late answer. Completion remains atomic/idempotent with retained-answer retry.
  User-facing media errors use an allowlist/generic fallback, never raw private
  URLs, filesystem paths or backend diagnostics.
- Validation: all 25 scripts/test-*.cjs passed; 5,000 seeded engine draws plus
  all 12 real-bank category pools, 9,338 official translation records, reset/export,
  auth stubs, cache/preparation, deadlines, duplicate/failed writes and UI contracts.
  TypeScript and Expo lint passed without errors/warnings; Expo Doctor 21/21;
  24 theme contrast pairs >=4.5:1. Android Metro/Hermes export passed (1,776 modules,
  6.8 MB JS bundle) to ignored .expo/ux-audit-export; no build/deploy/cloud mutations.
- Remaining acceptance requires physical Android/iPhone QA: cold/warm timings,
  decoder/video continuity after process termination, background/foreground,
  native navigation gestures, large fonts, screen reader, keyboard and real
  authorized login/reminder delivery. Editorial language/legal/rights approval
  and any EAS/release steps remain separate. Local scope is complete, not production QA.

## Checkpoint — UX audit, exam and learning reliability (2026-10-12)

- Atomic, retryable exam completion now uses the active session ID as the completed result ID; answers/history and active-session removal share one SQLite transaction. Tests inject completion failure and verify rollback and nonduplicated retry. Last-question completion no longer strands index 32 before saving the result.
- Added synchronous answer/finish locks, retained-answer retry, stable absolute per-question deadlines persisted in settings, wall-clock phase calculation, and Android hardware-back confirmation. Basic phases retain 20+15 seconds; specialist has 50 seconds. Video completion no longer shortens the fixed reading phase. Video playback continuity after process termination still requires device review.
- Added one persisted next-exam candidate prepared while the app is open. Preparation never starts a clock; partial media failure retains the exact candidate. Start uses that same candidate with cache-only verification. Category/language/reset fencing and active/upcoming-media eviction protection are tested locally. Instant start depends on earlier completed delivery; first use or missing files still requires preparation. Cold/warm physical-device timing is not yet measured.
- Study keeps its current question/answer/summary when returning from another tab, resets context on explicit category/filter/source changes, and blocks answering when its required media file is unavailable. Exact exam mistake review includes skipped questions, selects the exam's category and opens up to its 32 questions. History opens saved answer review; missing/read-error results have retry/home.
- Dashboard readiness, Progress average/trend/coverage and exam weak areas now use the selected category. Global history remains separately labelled. Study labels the bounded random batch, selected topic and exact-exam filter, and adds recovery actions for empty results. Flag write errors have visible feedback.
- Validation passed: TypeScript, Expo lint, test-prepared-exam, test-session-categories (12 official pools plus deadlines/atomic completion/category isolation), test-study-session (including tab return), test-bank-progress (category coverage), test-media-preparation and test-user-data. Native gestures, media decoding, background transitions and real storage failures remain physical QA.
- Next: shared interface language/onboarding, then remaining copy/accessibility polish. Private account creation/recovery policy and device QA remain external decisions; no cloud changes were made.

## Checkpoint — PLAN_UX_IMPLEMENTACJI.md, UX-4 settings (2026-10-12)

- Reorganized Settings into Learning, Appearance, Account, Multimedia, Reminders, Data and Information. Theme-aware cards, wrapping selections, >=48px targets, radio checked/disabled states, headers and readable explanatory text follow the existing mobile design guidance. The screen retains keyboard-aware scrolling and limits content width on larger displays.
- Language loading now has explicit unknown/read-error/retry states instead of silently showing Polish. Language/category/theme changes share saving/success/error feedback and a synchronous click lock. Failed language or theme writes retain the previous selection; theme is applied only after SQLite confirms persistence. Focus/foreground reads recover language changes and controls after an offscreen save.
- Cache size starts unknown, refreshes on focus/foreground and after bounded preloading, and can be refreshed manually. Missing cache directory means zero; filesystem read errors propagate and show unavailable size rather than false 0 MB. Stale reads are ignored.
- Removing downloaded media requires confirmation explaining re-download and preservation of questions/progress/account. Confirmation and deletion block starting a Settings preload; a running preload blocks clearing. The cache service additionally rejects ordinary clearing during an active download and prevents new downloads while clearing. Full local-data maintenance waits for obsolete downloads to settle before removal, retaining the existing generation fence and reset/export contracts.
- Validation passed: npx tsc --noEmit, npx expo lint; scripts/test-settings.cjs (both themes, read/write errors, retry, double taps, foreground refresh, offscreen save recovery, confirmation/cancel and download/clear exclusion); scripts/test-media-preparation.cjs (including filesystem-size errors and pending-download/full-reset clearing); scripts/test-user-data.cjs.
- Physical-device layout, large fonts, screen readers, keyboard and actual filesystem failures remain on QA_CHECKLIST.md. No dependencies, native directories or cloud configuration changed. UX-5 (continuous Study sessions) is the next proposed stage and has not started.

## Checkpoint — PLAN_UX_IMPLEMENTACJI.md, UX-3 local account UX (2026-10-12)

- Implemented the confirmed local-only part of UX-3. Rebuilt MediaAccountCard with required/common-format e-mail validation before API calls, unchanged password bytes (no trimming/minimum-length policy for existing accounts), explicit Show/Hide, autofill hints, Next-to-password focus and Go submit. Actions have >=48px targets; Settings and inline account modal use keyboard-aware scroll containers. Mobile UI guidance informed calm theme-aware form/error hierarchy rather than extra navigation/decorative assets.
- Added stored-session loading/read-failure/retry, auth event subscription, focus/foreground refresh, a revision guard against a late old read replacing a newer auth event, synchronous sign-in/sign-out click locking and password clearing/remasking on success/blur. User-facing auth errors map known codes/status to safe Polish messages without echoing backend details or asserting that an e-mail/account exists from a generic credential failure. Existing Supabase session storage/refresh configuration is unchanged; a locally stored session is not a verified authorization claim.
- Account copy now states local-only progress/no backup or sync, backend checking for every media download, and local logout preserving progress/cache/server account. No dead registration/reset-password controls were added; their absence is explained. No Supabase/Cloudflare settings, user accounts, secrets, redirect URLs, mail delivery or server deletion endpoint were changed or exercised by development tools.
- Added a shared serialized account mutation service used by the card and full local-data deletion. Deletion waits for a pending login before local sign-out; queued logins are fenced by maintenance generation, stale UI completion is ignored, and a progress-only reset does not forcibly clear an authorized local login. Existing deletion verifies the resulting session and retains its remote-revocation warning semantics. Queue tests use native/auth stubs, not a real user's login or token revocation.
- mediaGrant now classifies missing/rejected login with a local typed error. In Study/review media UI, this offers an inline login modal over the same question; successful login or explicit retry with an existing stored session retries the same material without navigating away, resetting the Study round or recording an answer. Closing the UI is not cancellation of an already authorized server request; it may still complete, but unmounted card callbacks cannot navigate. Other server/download errors retain Retry; active exam mode deliberately has no login overlay and no timer changes.
- Validation passed: TypeScript, Expo lint (no warnings), account tests for invalid/empty fields without network, safe error mapping, exact password handling, Show/Hide, both themes, duplicate submits, session read failure/retry and late-read races, logout failure/local confirmation, late completion after unmount, login/full-delete ordering and progress-reset preservation, typed media errors, same-material return and exam-modal exclusion. Regression tests passed for local data removal/export, onboarding, Study rounds, all 12 exam-category/session pools, media preparation and translations.
- Android JS export passed (1,765 modules, 6.6 MB bundle); Metro recovered its stale cache with a full crawl. No native build/device keyboard/autofill/real-auth/playback outcome is claimed; QA_CHECKLIST.md updated. No dependencies or native folders were added.
- Remaining UX-3: decide registration/invitation policy, approved account/contact/legal behavior, configure confirmation/recovery/deep links and a server account-deletion flow, then verify with real authorized test accounts. Next locally actionable point is UX-4 Settings organization/save/error/cache consistency, pending confirmation. EAS and sharing remain deferred.

## Checkpoint — PLAN_UX_IMPLEMENTACJI.md, UX-2: explicit resumable first-run setup (2026-10-12)

- Implemented only the confirmed UX-2. Replaced the Dashboard's one-step/default-B setup with OnboardingFlow: explicit category, question language, Study-vs-Exam explanation, and first action. Fresh setup has no selected category and cannot continue without a deliberate choice; all 12 existing targets and four existing question languages remain available. Language changes questions, not Polish interface text, and partial translation fallback is stated.
- Existing onboarding-complete=true is honored without a forced upgrade/new wizard or preference overwrite. Confirmed Next/Back transitions persist a versionless validated onboarding-draft setting; malformed/invalid step/category values safely restart the relevant flow. Radio edits before a Next/Back confirmation are in-memory, not falsely claimed as autosaved. Reopening resumes the last saved transition.
- Added atomic finishOnboarding: category, question-language, completion flag and draft removal commit together. Failed/late SQL writes roll back all preferences, generation checks prevent old queued writes after data reset, and repeated/stale completion returns the already persisted category without replacing an existing user's language/category. Global category context accepts the already committed value without a second write; navigation failure is reported as saved configuration with a panel fallback rather than pretending SQL failed.
- Added explicit explanations: Study feedback/no exam time pressure, strict simulated exam mechanics, login needed for new media, cached files not a permanent offline promise, and local-only progress with no account cloud backup/sync. The final screen offers a five-question three-point session, Dashboard, or Account/Reminder settings. No registration, mail flow, server permission or notification prompt was introduced; reminders remain optional through the existing explained Settings controls.
- Onboarding hides tabs; root setup state also hides them until completion and redirects guarded Study/Progress/Signs/Exam paths to setup. Settings/legal remain accessible so users can inspect account/legal information. Initial preferences are read with the completion flag, and persisted completion is rechecked to recover from a late offscreen finish. Deep-link/native navigation behavior is still explicitly physical-device QA, not certified by hook stubs.
- The first-study action passes an explicit start parameter: Study consumes it once after successful list loading and opens the first question directly in the five-question/three-point/category/language query. Opening does not record a practice attempt; the parameter cannot reopen question one after Next. Manual browsing and existing session/mistake semantics remain intact.
- Export includes the non-secret onboarding draft; ordinary progress reset preserves preferences/draft, full local removal clears them. No official question/translation/sign schema, exam engine, cloud service, package or native-directory change. Mobile UI guidance shaped short steps, textual states, radio selection, scrollable content and 48–64px+ controls; no decorative bitmap was needed.
- Validation passed: TypeScript, Expo lint (no warnings), SQLite tests for 12 categories × 4 languages, explicit initial choice, saved-step restoration, malformed drafts, duplicate click locking, atomic/late failure rollback, idempotent completion, UI in both themes, read failures/reset fence, draft export/reset and direct first-question/one-shot autostart. Regression checks passed for Study sessions, all real-bank category/exam sessions, user data, media preparation and translations. Android JS export passed (6.6 MB); this is not a native build or phone QA.
- QA_CHECKLIST.md and plan statuses updated. Next proposed point: UX-3 local account/form/session UX; registration policy, confirmation/recovery e-mails/deep links and server account deletion need a separate decision/configuration. EAS and sharing remain deferred; no production/device/legal completeness is claimed.

## Checkpoint — PLAN_UX_IMPLEMENTACJI.md, UX-1: exam-media preparation and recoverable downloads (2026-10-12)

- Saved a separate seven-stage UI/flow completion plan in PLAN_UX_IMPLEMENTACJI.md: media readiness, onboarding, account/auth, Settings, continuous Study, category-specific statistics, accessibility/device flows. It supplements the original plan; EAS and sharing remain deferred. Only UX-1 was implemented in this checkpoint; later steps await scope confirmation and server/device dependencies are explicit.
- New Dashboard exam flow now hydrates the exact 32-question draw, prepares its unique media serially, and verifies nonempty local files before committing the active session. startActiveExam accepts a preparation callback and cancellation guard without changing the question engine, bank or schema. The 25-minute deadline is calculated inside the start transaction after preparation, not before network work/queue waiting. Existing unfinished attempt is replaced only after successful preparation/commit.
- A failed preparation, missing configuration/URI, empty HTTP download, cancellation or reset cannot create an incomplete replacement. Tests verify preservation of the prior active exam on media failure/early cancellation and full transaction rollback on cancellation during inserts. Preparation time is explicitly excluded from the new exam deadline. Resumed exams retain their existing deadline; no clock-reset loophole was introduced.
- Briefing displays material counts, a no-clock-yet preparation state, cancellation and a direct route to Account/Media settings on error. Synchronous start locking prevents duplicate starts; focus/category changes cancel pending preparation. A distinct short committing boundary locks cancellation and announces session startup, avoiding an ambiguous cancel after replacement begins.
- Offline card now has independent busy/running state rather than treating incomplete counts as permanently downloading. Failed/partial batches unlock retry; successful files are reused; cancellation occurs between files (an already running HTTP download is allowed to finish), and category changes remount scoped UI while blur/unmount invalidates callbacks. Both themes use textual progress/error states and accessible actions informed by the mobile UI skill.
- preloadMedia no longer counts an absent URI or a reset/cancelled completion as successful. Cache repairs zero-byte entries, rejects empty/oversized downloads before committing, coalesces simultaneous requests for the same delivered cache path, and uses generation-specific temporary filenames so old reset-era cleanup cannot target a new generation's temporary download. Quota eviction skips in-flight .download files; final exam cache-only verification detects files evicted during preparation.
- Scope remains bounded: Settings still prepares at most 250 category files and uses a 1GB steady-state cache, not a complete/persistent offline pack. No media was actually downloaded by development tests, no R2/Supabase/EAS configuration or credentials changed, and no native folders/packages were added. File presence/size checks do not certify correct image/video decoding or guarantee that the OS preserves cache after verification; actual playback/slow-device/background behavior remains device QA.
- Validation passed: npx tsc --noEmit, npx expo lint (no warnings), real-bank 12-category/session and late-cancellation/clock tests, native-stub file/network scenarios (warm cache, WMV->MP4, partial failure/retry, unavailable/empty media, cancellation, eviction, shared download and reset), download-card/briefing presentation in both themes, data-export/reset, translation and exam-timer regressions. QA_CHECKLIST.md updated with physical-device cases.
- Next: UX-2 explicit onboarding/category/language/first-study guidance. UX-3 mail confirmation/recovery/registration/account deletion needs a separate Supabase/access-policy decision; local account UI can be improved beforehand. Native playback/offline visual outcomes and production permissions are not marked complete.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 6.2: local EAS/OTA preparation, owner project link pending (2026-10-12)

- Implemented the locally actionable portion of approved point 6.2, not a completed native-build/signing milestone. Set Android package and iOS bundleIdentifier to pl.ezprawko.app; kept one identity across variants, explicitly documenting replacement and that older package IDs/Expo Go do not automatically migrate their separate SQLite sandbox.
- Expanded EAS profiles: development/internal dev client, preview/internal Android APK, production/store Android AAB; each has matching explicit development/preview/production environment and OTA channel. Preview/production auto-increment remote build numbers. CLI floor matches the read-only checked EAS CLI 24.13.0. No cloud jobs, owner/team selection, project creation, store submission, device registration or credential generation occurred.
- Installed SDK57-compatible expo-updates ~57.0.26 through npx expo install, and updated the five recommended patches: expo ~57.0.28, @expo/ui ~57.0.23, expo-dev-client ~57.0.20, expo-router ~57.0.26, expo-splash-screen ~57.0.10. npm's final installer report lists 33 security findings (13 moderate/20 high); no automatic/breaking audit fix was applied. A clean Expo doctor is not a security audit clearance.
- Added app.config.ts deriving OTA URL/enabled solely from a real app.json extra.eas.projectId. It validates UUID format, preserves static config/extra, enforces fingerprint runtime compatibility, retains the embedded bundle and starts without waiting for a download. Unlinked local development keeps OTA disabled with no invented project ID/URL; an unlinked cloud-build context fails explicitly. No exam-time programmatic reload or weakened anti-bricking protection was added. Native store signing and optional cryptographic OTA signing are distinct; neither is claimed complete.
- Added .easignore based on existing Git protections plus source ZIP/Excel/videos, root media folders, server infra/Supabase directories and tool state. All app SQLite, translation/sign catalogs/graphics and branding artifacts remain included. credentials.json/keystore/PFX protections were also added to Git ignore. Tests exercise exclusion/inclusion rules but no actual cloud upload/archive inspection is claimed.
- Added a post-install EAS readiness validator checking real linkage/IDs/fingerprint/update URL and preview/production public environment prerequisites, rejecting service-role/secret keys and non-HTTPS/credential-bearing URLs without logging values. Development client can use Metro-supplied public variables. Root .env.local is deliberately excluded from upload; remote EAS environment variables still require owner setup and are not assumed present from local checks.
- Read-only eas whoami confirmed a logged-in owner with access to personal mateusz.learn and team mateuszlearns-team. Since this repo has no linked project UUID and no owner/project choice, stopped before remote mutation. Local readiness currently reports only the missing EAS UUID; signing/account/project permissions and cloud environment definitions are not certified by this local check.
- Validation passed: npx tsc --noEmit, npx expo lint, npx expo-doctor (21/21), project-link/fingerprint/profile/public-key/upload-rule contracts, branding, Study sessions, all 12 real-bank exam categories/recovery/maintenance fences and translations. Android JS export passed (1,761 modules, 6.6 MB bundle) with database/sign assets; Metro recovered a stale cache by a full crawl. This is not an APK/IPA build or device/OTA test.
- Added EAS_BUILD_SETUP.md with owner login/link, environment setup, private preview signing/build, preview OTA command with required --environment, upgrade cautions and production gates. QA_CHECKLIST.md now distinguishes local checks from project linkage, actual upload inspection, signing, native build, device validation and runtime-isolated OTA validation.
- Remaining for 6.2: owner/team and existing/new project choice, real UUID linkage, remote environment verification, Android keystore/Apple team+device authorization, preview native build/install and private OTA test. Point 6.3 physical-device QA needs separate confirmation and the native build; 5.1 sharing remains deferred. Publication permissions, reviewed content/legal texts and dependency security review remain open.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 6.1: launch branding, icons and splash (2026-10-12)

- Implemented only the approved point 6.1. Added an original, editable SVG mark depicting a road bending into a success check, in the existing green/mint/gold palette. Mobile UI guidance favored a simple, text-free silhouette readable at launcher scale over decorative detail. No government/WORD emblem, third-party artwork or claim of official endorsement is included; no AI bitmap generation was needed for this code-native vector mark.
- Added seven deterministic PNG artifacts: opaque 1024×1024 general/iOS light and dark icons; transparent 1024×1024 Android adaptive foreground and single-color/alpha themed silhouette; transparent light/dark splash marks; 64×64 web favicon. scripts/generate-brand-assets.cjs renders all variants from assets/branding/ezprawko-mark.svg using Sharp already present in Expo's toolchain, without adding app dependencies. Source and rebuild notes are in assets/branding/README.md.
- app.json now points to the EZprawko assets instead of the Expo starter's .icon bundle and PNGs. Android uses a solid evergreen background rather than the starter backgroundImage override; foreground/monochrome painted pixels fit the central 66/108 safe-zone circle. iOS light/dark PNG overrides are explicit. Old template assets are preserved, not deleted or overwritten.
- Configured expo-splash-screen with 200px contain images and backgrounds matching the light/dark theme tokens. Native splash appearance follows the system before SQLite's theme preference is available; a saved in-app override may differ. Existing readiness/hide behavior is unchanged, with no artificial launch delay, new native directories, data/media/auth changes or EAS deployment.
- Validation passed: npx tsc --noEmit, npx expo lint, read-only Expo prebuild config resolution, and raster/config tests for dimensions, RGB opacity/sRGB space, alpha margins, nonempty mono silhouette, safe-zone pixels, deterministic source-to-PNG output and all configured references. Visually inspected the local .expo/branding-preview/brand-board.png for iOS variants, Android circle/squircle/themed masks and both splash backgrounds. The Android preview crops the central 72/108 visible viewport; it is representative QA, not a device screenshot.
- expo-doctor passed 20/21 checks; its dependency-version check now recommends five newer SDK57 patches: @expo/ui ~57.0.23 (installed 57.0.22), expo ~57.0.28 (57.0.27), expo-dev-client ~57.0.20 (57.0.19), expo-router ~57.0.26 (57.0.25), expo-splash-screen ~57.0.10 (57.0.9). No automatic upgrades or diagnostic exclusions were applied. Resolve these in the approved build-readiness work before claiming a clean release audit.
- Native launcher/cold-start/splash QA requires a new installed build; Metro/OTA/Expo Go cannot certify these artifacts. Checklist updated with OS masks, small sizes, theme variants and launch transition checks. Next proposed point is 6.2 EAS configuration/build readiness, pending separate confirmation. Signing/account access and physical-device validation remain external; point 5.1 sharing stays deferred and legal/content/media-publication gates remain open.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 5.3: Study-session summary and mistake replay (2026-10-12)

- Implemented the approved point 5.3 only. Study now ends a selected batch with a summary of correct, incorrect and unanswered questions. The final Next action opens the summary; a separate End session action permits honest partial completion. It describes the current 5/12-question batch, not completion of an entire topic or bank.
- First successfully persisted answers are retained per question for the active round. Revisiting a card restores its locked answer without creating another history row; a synchronous write lock blocks double taps and navigation during persistence. Failed writes expose a retry without credit or success feedback. Haptic failure cannot prevent recording an answer.
- Repeat mistakes creates a new round from exactly the incorrect question IDs in that summary, retaining the category, language, media and explanations. It does not accidentally query the global Mistakes filter. No replay action is offered when there are no errors; unanswered cards are counted separately, not mislabeled as mistakes.
- Added a read-only, exact-category SQLite mastery aggregate and before/after snapshots. The summary shows actual mastered question counts and a signed change, including zero/decreases, while explaining the existing three credited repetitions/24-hour rule. A failed post-session read offers retry without re-saving answers or displaying a fabricated zero.
- Mobile UI guidance informed a clear end-of-session card, theme tokens, textual states independent of color, and 48px-or-larger ending/continuation controls. No dependency, native-directory, official-bank, translation, lexicon, exam-engine or cache changes were made.
- Round counters/summary are in memory and end when leaving/reopening Study or changing category; individual attempts/mastery remain in the existing SQLite history/export. No new durable session-summary history or restoration contract is claimed.
- Validation passed: TypeScript, Expo lint, new native-stub screen-flow tests (both themes, partial completion, duplicate taps, failed writes, review locking, exact mistake replay, mastery read/replay retries and TAK/NIE), real SQLite mastery aggregates, 12-category/session regressions, learning rewards and translations. Physical-device layout/accessibility/offline tests remain open in QA_CHECKLIST.md.
- Point 5.1 sharing remains deferred by the user. Next proposed point is 6.1 branding/icons/splash, pending separate confirmation. EAS signing/build, physical-device QA, approved explanations/legal texts and media publication permissions are not marked complete.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 5.2: learning streaks and achievements (2026-10-12)

- Implemented only the approved point 5.2. Point 5.1 sharing is deferred at the user's request, not marked complete. Dashboard now distinguishes a global learning streak (any Study answer, including incorrect, or a completed exam) from the separate three-consecutive-day challenge (five correct Study answers per day). Repeats within one day cannot extend the day streak; yesterday's streak remains live until today is missed, and best streak is shown.
- Added a non-destructive transactional migration for local_day on practice/exam history, explicit-column inserts and day indexes. New actions record their local calendar day rather than UTC/24-hour elapsed durations. Historical timestamps are batch-backfilled once using the migration device's current timezone, since the original event timezone was never recorded; no fake historical timezone is inferred. Existing row counts/answers/results survive migration. Tests exposed inconsistent Windows SQLite/IANA localtime behavior, so the final solution does not rely on SQLite localtime conversion.
- Learning-day summaries are grouped from authoritative practice/completed-exam history; the old challenge_days table remains a compatibility counter, now written with local dates, and cannot fabricate qualifying days. Invalid/future timestamps/dates are excluded from current calculations. Calendar arithmetic handles DST/leap/year boundaries without treating a day as a fixed 24-hour interval.
- Added persistent user_achievements keyed by badge and category: First step (completed exam), In the learning fire (best three-day learning streak), Rules master (74/74 exam), Signs expert (all linked sign questions mastered for the target category). First three badges span categories; expert is category-specific and cannot unlock for an empty pool. Sign links are deduplicated by question, not counted as extra progress.
- Kept the existing mastery rule: three credited correct repetitions with at least 24 hours between credits; an incorrect answer resets current question mastery. Sign expert is awarded atomically on the final qualifying practice update and retained after subsequent errors. Existing histories can unlock first/perfect/streak badges on Dashboard evaluation; recorded milestone rows are idempotent and remain until progress reset.
- Export includes achievement records and local-day fields; both ordinary/full progress removal clear achievements and source histories while keeping the official content. The bundled privacy draft describes these local records (revision 3); no cloud sync, remote push, dependencies, native directories or exam-engine rules changed.
- Mobile UI guidance informed clear streak/goal definitions, theme-aware textual earned/locked states independent of color, and placement of achievements after daily-study shortcuts so they do not bury the core action. Dashboard refreshes on focus/foreground and once a minute while foregrounded, including midnight/category changes; no new screen or navigation clutter was added.
- Tests passed in Europe/Warsaw and America/Los_Angeles for local history migration/idempotence, midnight, missing days/yesterday grace, DST/leap/invalid/future dates, wrong-answer learning activity, consecutive challenges, persistent/category-specific badges, zero sign pools, deduplicated sign links, both theme presentations, export/reset and real-bank final-practice award. Regression tests cover all 12 categories/sessions, translations, data operations, reminders and 5,000 exam-engine trials.
- TypeScript, Expo lint and Android export passed (1,758 modules, 6.6 MB bundle). Physical-device visual/accessibility, long-history upgrade and time-zone travel QA remain in QA_CHECKLIST.md; no device outcome is claimed. Point 5.3 Study-session summaries awaits user confirmation.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 4.3: configurable daily reminder time (2026-10-12)

- Replaced the fixed 19:00 Settings row with a dedicated Reminder card and SDK-compatible native datetimepicker 9.1.0 installed through `npx expo install`. Android uses the recommended imperative 24-hour time dialog/new onValueChange API; iOS presents a themed spinner with explicit draft Save/Cancel. Controls have 48px minimum targets; web clearly reports unsupported local reminders. No native folders were edited; Expo added the config plugin.
- Persisted hour/minute as daily-reminder-minutes in SQLite, with strict 00:00–23:59 validation and a backward-compatible 19:00 fallback for missing/invalid values. Saving time while off does not schedule or request notification permission. Export includes the preference; ordinary progress reset retains it; full local removal clears it.
- Daily schedules now use a fixed owned identifier and data marker. Time changes replace that request and remove referenced legacy/owned duplicates, without cancelling unrelated requests. Android's learning channel is created before any permission prompt. The card reads actual pending OS requests and permissions on focus/foreground, so stale SQLite IDs alone do not imply enabled status.
- OS scheduling and preference writes are serialized with local-deletion cancellation and fenced by the data-maintenance generation. Failed SQLite/OS updates compensate toward the prior schedule where possible; failed compensation is surfaced, not represented as atomic success. An in-flight change cannot recreate a notification after full local deletion.
- Mobile UI guidance informed native time selection, explicit cancel semantics, calm themed typography, accessible status/actions and actionable permission/settings errors. Reminder text remains local/non-personalized, without remote push registration, new auth or CDN requests. Actual delivery under system battery/Focus/DST/time-zone behavior requires phone QA.
- Tests passed for minute boundaries/defaults, disabled save, persistence, fixed-ID/legacy migration, rapid serialized changes, permission denial, missing OS schedules, write/cancel/schedule failures and delayed-enable/deletion race. Native-stub UI tests cover iOS cancel/save in both themes, Android 24-hour selection, switch intent, foreground refresh, system-settings failure and late picker callbacks.
- Installer reported 32 dependency audit findings (13 moderate/19 high); no automatic/breaking audit fixes were applied in this phase. A native development client lacking the module needs rebuilding; JS export is not native/device QA.
- Point 5.1 (exam result share card) awaits separate user confirmation. Legal draft/controller/cloud-account-deletion and media-permission release dependencies remain open.
- Final validation passed: `npx tsc --noEmit`, `npx expo lint`, reminder-time/OS queue and native-picker contracts, reminder preference export/reset integration, data-management and 12-category/session regressions, 5,000 exam-engine trials, translations, legal UI, 24 contrast checks, `git diff --check` and Android export (1,755 modules, 6.6 MB bundle). No actual notification was scheduled on the tester's phone during development, and no EAS native build/device-delivery result is claimed.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 4.2: local data reset/export/removal (2026-10-12)

- Implemented only the approved point 4.2. Settings now exposes Export my data, Reset progress and Delete all local user data, with distinct scope descriptions and destructive confirmations. No actual user/device data was erased during implementation; tests use isolated databases and stubs.
- SQLite reset deletes active/completed exam answers/sessions, practice attempts/mastery, flags, challenge days and per-exam language snapshots inside an exclusive transaction. Ordinary reset retains preferences, onboarding, reminder, auth and cache. Full local removal also clears user settings, retaining only three content-installation version markers and all official questions/answers/translations/sign/topic/explanation catalogs. The database file is not destroyed; this interprets full local clearing as clearing user data, not breaking the bundled bank.
- JSON export is a versioned, consistent snapshot of all local progress tables and explicitly known preferences, without auth storage, passwords/tokens, media or licensed question-bank text. It opens the system share sheet and cleans the exact temporary export file in finally, including error/cancel flows. Shared external copies remain the user's responsibility; export is not an import/restore feature or full cloud-account export.
- Full local removal cancels local scheduled reminders, signs out only the current Supabase session, verifies no local session remains, clears managed media/export cache and then resets local records/preferences. Cloud account/logs/backups are not deleted. Cross-system cleanup is not atomic: failures produce an incomplete-operation message and retry, never a false success. A remote-revocation error with confirmed empty local session is explicitly reported.
- Added a maintenance generation fence, temporary UI suspension and whole-screen remount/home recovery to discard cached user state. Queued old practice/exam transactions and delayed Study haptics cannot recreate reset progress; stale downloads/preloads stop instead of restoring cleared media. Practice answer/mastery/challenge writes are now one transaction. Exam generation/scoring rules are unchanged.
- Installed `expo-sharing` through `npx expo install`; Expo added its config plugin. No native directories were edited. A development client without the native module needs rebuilding. Installer reported 31 audit findings (13 moderate/18 high); no automatic/breaking audit fix was performed here.
- Updated bundled legal drafts to revision 2 with the implemented local scopes; privacy/controller/retention/media-permission and remote account-deletion publication dependencies remain in LEGAL_RELEASE_CHECKLIST.md. These features are not a declaration of GDPR compliance or forensic deletion of backups/storage pages.
- Mobile UI guidance informed clear scopes, 48px controls, confirmation before irreversible changes, visible progress/error feedback and safe return to refreshed screens. Device share-sheet/offline/large-text QA remains in QA_CHECKLIST.md.
- Point 4.3 (configurable reminder time) awaits separate user confirmation. Validation outcomes follow after final checks.
- Final validation passed: `npx tsc --noEmit`, `npx expo lint`, isolated SQLite reset/rollback/export and native-stub data-card/share/error contracts, queued old practice/exam transaction fence, all 12 category/session regressions, 5,000 exam-engine trials, translations, legal UI and bank-progress regressions, `git diff --check`, and Android export (1,736 modules, 6.5 MB bundle). Native share-sheet/offline cleanup and EAS build are not validated by this export.

## Checkpoint — active-exam recovery and one global theory category (2026-10-12)

- Prioritized the two explicitly reported bugs, not plan point 4.2. Found a reproducible resume loop: current_index=32 was accepted by resumeActiveExam, but the exam screen could not find a current question and returned to Dashboard, which offered Resume again. Resume now rejects out-of-range indices, expired/unsupported sessions, incomplete/noncontiguous/duplicate question rows, missing questions and invalid section/point totals.
- New-session hydration happens before the atomic active-session replacement. Failed reads leave the previous attempt intact. Dashboard rechecks a session before navigation, shows errors and offers confirmation-based abandonment of the unfinished attempt only; completed exam/practice history and the official bank are preserved. No actual device/user database was cleared during development.
- Exam screen instances are keyed by route session ID so a new attempt cannot inherit the preceding attempt's result, timers, selections or finishing flags. Async resume errors now show retry/Home instead of indefinite preparation. Screenshot alone does not establish the actual device's stored index; this fix is validated against a reproduced invalid-state case, not claimed as phone QA.
- Added a single SQLite-backed target-category context shared by Dashboard, onboarding, Settings, Study and media preload. Updates are serialized/disabled during persistence; UI changes only after a successful write. Initial read failures enter existing recovery instead of silently using an unverified category. Changing category remounts the Study session and reloads all category-scoped filters/topic totals.
- Supported theory targets: AM, A1, A2, A, B1, B, C1, C, D1, D, T; bank code PT is displayed as a tram driving permit, not a driving-licence category. Kept distinct targets rather than merging subcategories. Plus-E categories were not invented as separate 32-question theory pools. Sources: Article 51(2)(1), [current consolidated act](https://eli.gov.pl/api/acts/DU/2025/1226/text/U/D20251226Lj.pdf), and [official category descriptions](https://www.gov.pl/web/gov/kategorie-prawa-jazdy), checked 2026-10-12. Selection is not a legal eligibility/age determination.
- Study uses exact JSON membership (not substring matches); filter/search/topic/sign/language clauses compose with the same target. Both exam creation entry points restrict the input pool by target while leaving exam-engine quotas/order/scoring unchanged. All twelve real-bank targets pass 32-question/74-point generation and resume tests. Existing attempts and completed history retain their original category snapshot; a changed target applies to Study and new attempts.
- Mobile UI guidance informed one checked radio-like choice, wrapping category controls with 48px targets, explicit PT explanation and a confirmed recovery action. SQLite/translation/sign-bank integrity and media cache were not rewritten. Native device tap/navigation testing remains separate.
- Tests passed: real SQLite session/category suite (all 12 pools, singleton setting, topic totals, index-32/expiry/invalid/missing-question recovery, replacement and failed-hydration preservation), 5,000 exam-engine trials, translation and Phase 1/explanation-card regressions. Validation/export results are recorded below once final checks finish.
- Final checks passed: `npx tsc --noEmit`, `npx expo lint`, bounded exact-category media selection, `git diff --check` and Android export (1,727 modules, 6.5 MB bundle). Reload the updated app on the affected phone and follow the new recovery/category section in QA_CHECKLIST.md; physical-device outcome is not yet confirmed.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 4.1: about and legal document screens (2026-10-12)

- Added an About card in Settings with project/installed-binary version and build metadata, ministry question-bank source and explicit pending media-rights notice. Removed the obsolete CDN-not-configured footer; this does not change private CDN access.
- Added Router screens `/legal/privacy` and `/legal/terms`, backed by bundled Polish content readable offline without account/network requests. A shared themed reader provides selectable paragraphs, semantic headings, 48px back/link controls, bounded text width and direct-link fallback to Settings. External browser-opening failures are caught and expose a copyable URL.
- Audited current SQLite, Supabase auth/session storage, media-token, Cloudflare Worker/cache and reminder code. Drafts distinguish local progress from optional network media/auth, AsyncStorage tokens, 120-second file grants, potential infrastructure logs/system backups, local reminders and separate local/account deletion. They do not promise not-yet-implemented export/deletion or complete explanations.
- Documents visibly remain private-test drafts. Operator/controller identity/contact, lawful bases, cloud retention/regions/transfers, complaints procedure and licence evidence cannot be invented from source code. LEGAL_RELEASE_CHECKLIST.md records publication dependencies and reviewed UODO/ministry references; no GDPR-compliance/legal-approval claim is made.
- Added SDK-compatible `expo-application ~57.0.3` via `npx expo install` for actual installed-binary metadata; Expo Go's host build is not labelled as EZprawko. Rebuild a development client if it lacks this native module. No native directories, SQLite schemas/data, exam engine, translations, sign lexicon or CDN deployment were changed.
- Mobile UI guidance informed restrained themed typography, readable line lengths, large controls and accessible source/navigation affordances. Device/large-text/offline QA is recorded in QA_CHECKLIST.md, separately from stubbed contracts.
- Validation passed: `npx tsc --noEmit`, `npx expo lint`, legal UI/metadata/link-failure contracts in both themes, Phase 1 UI/explanation-card and bank-progress regressions, 24 contrast checks, Android export (1,725 modules, 6.5 MB) and `git diff --check`. An export is not an EAS native build or legal approval.
- Installer reported 30 dependency audit findings (12 moderate, 18 high); no automatic or breaking audit fix was applied in this UI/content point. A scoped dependency security review remains necessary before release.
- Point 4.2 (data reset/export/deletion) awaits separate user confirmation. These draft texts must be updated as data-management capabilities are implemented.

## Checkpoint — PLAN_IMPLEMENTACJI.md, point 3.4: score trend and full-bank coverage (2026-10-12)

- Implemented only the approved point 3.4. Progress now shows the latest seven completed exams in chronological order, an exact 68/74 reference line, a truthful 0–74 scale (zero scores have zero-height bars), score labels and explicit pass/fail text.
- Each chart column includes local completion date, year, time and category. Horizontal scrolling keeps labels readable on compact screens; screen readers receive the full date, score and result. History rows also show completion timestamps; the average card explicitly names its recent-exam sample.
- Added a full-bank coverage card and accessible progress bar. One read-only SQLite aggregate counts distinct question IDs across practice and completed exams, excludes skipped answers, incomplete/orphan sessions and stale IDs, and reads the actual bank size rather than hardcoding 3,518. Repeated answers and overlap between modes never double-count. Coverage is not presented as mastery; all-category scope is explicit. Percentages use floor so 100% means every question was answered.
- The new aggregate participates in the existing focus refresh, loading/error/retry and obsolete-read guard. No migrations, writes, new dependencies, native changes, exam-engine changes, translation or sign-lexicon changes were required.
- Mobile UI guidance informed a restrained themed card, a horizontally scrollable chart instead of compressed labels, textual outcomes independent of color and accessible statistics. Native-stub chart contracts and real in-memory SQLite tests cover deduplication, empty/reset states, skips/incomplete/stale IDs, date labels, coverage bounds and 68-point geometry in both themes.
- TypeScript and Expo lint passed. Skeleton tests, 5,000 exam-engine trials, translation regressions and 24 semantic contrast checks passed. Physical-device layout, large text, screen-reader and offline QA remain listed in QA_CHECKLIST.md; no native visual QA is claimed.
- Final Android export passed (1,719 modules, 6.5 MB bundle), and `git diff --check` passed. No infrastructure deployment or public publication was performed.
- Point 4.1 (legal/about screens) awaits separate user confirmation. Approved explanation content and publication permissions remain external dependencies.

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

## Checkpoint — missing-media quarantine and look-ahead buffer (2026-10-13)

- Excluded confirmed missing-media questions 11150 and 13074 from new Study pools,
  new exam draws/prepared drafts and optional offline downloads. Source rows,
  history and already active attempts are preserved.
- Learning coverage/mastery/topic counts and recommendations use the eligible pool
  so unavailable questions cannot make completion impossible.
- Study warms the first three questions in its menu, waits only for the selected
  question plus two upcoming ones, then prefetches three upcoming questions.
  This supersedes the earlier full-batch Study preparation contract, not exam safety.
- Two concurrent workers use one global two-transfer queue; foreground requests
  promote pending shared downloads. Reset/cancel guards and cache verification remain.
- Added regression coverage for quarantine, old draft replacement, selected start
  windows, focus cancellation, queue priority/limits and failure recovery.
- Device measurements (cold/warm Wi-Fi and slow mobile network, native decode)
  remain required; automated tests do not establish a startup-time benchmark.
- Validation passed: all 38 test scripts, npx tsc --noEmit, npx expo lint,
  and git diff --check. No cloud deployment or source-media substitution.

## Checkpoint — exact ready pools and batch grants (2026-10-13)

- Default Study pools (5/12) and the actual dashboard recommendation warm before
  navigation; the screen reuses those exact questions. Four bounded in-memory
  drafts, five-minute expiry, scope/previous-ID keys and reset fencing.
- Study waits only for its current material; a cache hit bypasses preparation.
  Native decode readiness still gates answers. Next batch warms halfway through
  the current batch; exact mistake/session replay retains its existing semantics.
- Committed exam consumption emits an immediate successor-preparation event,
  invalidates old work and rejects a stored draft identical to the active attempt.
  No new exam clock is started; complete cache verification stays mandatory.
- Cache inventory scans once per cache lifecycle, updates commits and serializes
  eviction. Failed over-budget commits roll back; existing protected files remain.
- Media grants coalesce short-window misses into <=8 filenames; user check once
  per batch, individual object-bound 120-second tokens, memory-only token reuse,
  expiry margins and logout/account/reset fencing. HTTP 400 from the legacy
  single-file endpoint falls back without downgrading 401/403.
- Server source updated locally, no deployment/account/cloud changes.
- Regression suite now includes 41 scripts. Physical-device timing, native
  decoding and deployment smoke tests remain separate acceptance work.
- Validation passed: all 41 scripts, npx tsc --noEmit, npx expo lint and
  git diff --check. Final cache-commit fencing also passed its focused regressions.

