# Legal documents — private testing and publication gate

Point 4.1 adds working screens, not a declaration of GDPR compliance or cleared media rights. Bundled Polish drafts are in `src/content/legal.ts`; Settings links to `/legal/privacy` and `/legal/terms`. They remain clearly marked as drafts. Do not remove that notice merely because UI tests pass.

## Verified from current code

- SQLite holds learning history and settings locally; there is no progress-sync request in the current app.
- Optional Supabase password sign-in uses AsyncStorage session persistence. Passwords are submitted to Auth, not saved in the progress database.
- Media-token verifies the authenticated account and issues a 120-second per-file HMAC grant containing account ID. Cloudflare validates it and serves private R2 objects. Cloud services receive network request information; deployed log configuration has not been audited.
- Reminders are locally scheduled, not server push. No remote push registration, advertising or behavioral analytics implementation was found.
- Point 4.2 adds local JSON export, transactional progress reset and local-user-data removal (preferences, reminders, session and managed media/export cache). Neither operation deletes the cloud account, infrastructure logs, system backups or already shared external exports. Documents have been updated to distinguish these scopes.

## Must be supplied and reviewed before public distribution

- [ ] Identify legal operator/controller, address and working privacy/support contacts; identify DPO if applicable. Do not infer identity from the developer's Windows username.
- [ ] Review lawful basis for each purpose, including any legitimate-interest assessment. Define the intended user audience/age and any additional requirements.
- [ ] Verify Supabase project region, Cloudflare processing locations, contracts/DPAs, subprocessors and any non-EEA transfers/safeguards.
- [ ] Define and implement retention/deletion periods for accounts, Auth/function/Worker/access logs and backups. Token lifetime is not log retention.
- [ ] Implement and document effective rights-request handling, including remote account deletion separately from the implemented local reset/export/removal; legal/operator review is still required.
- [ ] Confirm OS backup behavior and adequate session storage/security for the intended release.
- [ ] Record permissions/licence evidence for question text, translations, images, videos and sign graphics. The repository's template MIT licence does not automatically license question-bank assets.
- [ ] Have the privacy policy and terms reviewed for the actual service model, mandatory consumer protections and complaint procedure; supply all missing details. No paid-contract or marketing-consent flow is introduced here.
- [ ] Provide stable public document URLs for eventual store submissions and reconcile store privacy declarations with actual app/cloud behavior.
- [ ] Update revision, drafts and in-app status only after review/approvals. A private-test label is not an exemption from obligations that may apply to processing during testing.

## References checked

- [UODO: rights and information to provide](https://uodo.gov.pl/pl/493/2254) — used as a checklist for controller identity, purposes/bases, retention and rights, not an approval of these drafts.
- [UODO: retention information](https://uodo.gov.pl/pl/676/4260) — periods/criteria require actual operational confirmation.
- [Ministry of Infrastructure: question-bank source](https://www.gov.pl/web/infrastruktura/prawo-jazdy) — source attribution, not an assertion that every attachment carries an unrestricted licence.

## Build and device checks

`expo-application ~57.0.3` was added using `npx expo install` for installed-binary version/build metadata. Rebuild a development client if its binary lacks this module; do not hand-edit native folders. Expo Go displays the project version and explicitly reports that it is not an EZprawko build. Web/missing metadata reports unavailable values instead of inventing a build number.

Run `node scripts/test-legal-ui.cjs`, `npx tsc --noEmit`, `npx expo lint`, and the new 4.1 section of `QA_CHECKLIST.md`. Stubbed contracts and an Android JS export are not physical-device testing or an EAS native build.
