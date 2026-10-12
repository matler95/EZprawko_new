# Official question translations

Source: the private root `gov-attachment.xlsx`, sheet `katalog`. The import reads the question identifier and official EN, D, and UA question/answer columns. Source texts are retained as supplied; question identifiers, answer labels, point values, media references, and the official answer key remain unchanged.

## Coverage

- English (`en`): 3,518 complete records.
- German (`de`, source suffix `D`): 3,517 complete records.
- Ukrainian (`uk`, source suffix `UA`): 2,303 complete records.

Only complete translated question/answer sets are imported. A missing translation uses the original Polish question and answers as a whole, with a visible fallback notice. The app interface remains Polish; the Settings language choice affects question content.

## Rebuilding and installation

Run the existing importer with `--translations-only` to regenerate `assets/data/question-translations.json` without replacing the SQLite question catalog or its media manifest. This package is approximately 2.6 MB, contains source SHA-256 provenance, and is available offline.

During database initialization the app imports the package into `question_translations` in one transaction, using bounded batches and a version marker in Settings. It preserves exam history, practice records, flags, and user preferences. A completed or active exam stores its selected language separately, so changing the global setting does not alter that exam's content.

## Verification

`node scripts/test-translations.cjs` exercises the real repository and translation installer against an in-memory copy of the bundled question bank (Node 22.13+ required). It validates import idempotence, all answer keys, English/German/Ukrainian display, Polish fallback, session-language retention, full scoring, and review.

Device QA remains required for the language selector, first-upgrade migration, offline reading, and long translated answer text on compact phones.
