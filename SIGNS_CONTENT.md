# Road-sign lexicon content

## Scope and provenance

The offline lexicon contains all 235 non-repealed entries in the five groups
specified by Phase 5: A (42), B (46), C (21), D (76), T (50).
This is not a catalogue of every Polish sign: E/F/G/P/R/W and signals are outside
the current lexicon scope. The interface and official sign names remain Polish.

Names and artwork come from the annex to the official consolidated regulation:
[Dz.U. 2019 poz. 2310](https://eli.gov.pl/eli/DU/2019/2310/ogl).
The four subsequent amendments listed by ELI were inspected:
[2021/433](https://eli.gov.pl/eli/DU/2021/433/ogl),
[2021/2065](https://eli.gov.pl/eli/DU/2021/2065/ogl),
[2022/2372](https://eli.gov.pl/eli/DU/2022/2372/ogl),
[2026/133](https://eli.gov.pl/eli/DU/2026/133/ogl).

Included changes: B-19 name, D-23b/c artwork and names including hybrid vehicles,
D-34b, D-44/45 names, T-1a and T-32 descriptions, and the 2022 D-39 artwork.
Repealed T-22 is excluded. No AI-generated sign images or legal explanations are used.

`assets/data/road-signs.json` records source pages and SHA-256 hashes of the
source documents. `scripts/import_road_signs.py` reproduces the catalogue using
pdfplumber, Pillow and standard Python libraries. Downloaded source PDFs and
visual-review montages live under ignored `.expo/sign-sources`.
The approximately 1.5 MB WebP artwork is bundled via static Metro imports, not
fetched from R2, so the lexicon is available offline without authentication.
White artwork surfaces intentionally preserve the official PDF background in
both themes; surrounding cards and labels use semantic theme tokens.

## Question relationships

`assets/data/question-signs.json` currently contains 26 relationships evidenced
by an exact sign code in the question text or media filename. The importer does
not infer a depicted sign from a generic filename, matching words such as
"children", or a possibly incorrect answer. A filename relationship identifies
source naming evidence, not a human-reviewed annotation of every frame.

The versioned SQLite `question_signs` migration replaces only derived mappings,
preserving question records, history, flags and translations. A bound `EXISTS`
filter lets Study compose sign selection with its existing filters/language.
Absent mappings are disclosed and the learner can open the broader signs topic.

Remaining content work: human review of images/videos for comprehensive
sign-to-question annotation, and optionally expansion beyond A/B/C/D/T. No claim
of complete multimedia annotation or explanatory legal content is made.

## Validation

Run `node scripts/test-road-signs.cjs`, `node scripts/test-translations.cjs`,
`npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor`.
Device QA: scroll/search, large fonts, dark mode, Android back, offline gallery,
source links, and the sign → Study → answer → return journey.
