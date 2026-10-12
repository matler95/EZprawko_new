# Private device and release QA checklist

Run this checklist on a physical Android device and, before public release, an iPhone. Record the app version, device model, OS version, and outcome for every failed item.

## Core exam

- [ ] Start an exam for each supported target category: AM, A, B, C, and D.
- [ ] Verify every exam has 32 questions: 20 basic and 12 specialist.
- [ ] Verify point weights add to 74 and that 68 points is the pass threshold.
- [ ] Confirm the 25-minute deadline continues after backgrounding/reopening the app.
- [ ] Confirm no answered question can be revisited and that the next question cannot be reached before answering.
- [ ] Finish both a pass and a fail; verify the score, result, and history entry.

## Study and progress

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

## Notifications, privacy, and delivery

- [ ] Enable and disable the daily reminder; verify no duplicate notification is left behind.
- [ ] Verify the application works without permissions other than notification consent.
- [ ] Confirm no permanent CDN token, media URL with embedded secret, XLSX source, or media archive is included in the build.
- [ ] Run `npx expo-doctor`, `npx tsc --noEmit`, and `npx expo lint` on the release branch.
- [ ] Build and install the EAS `preview` profile before requesting production credentials.
