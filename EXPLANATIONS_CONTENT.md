# Reviewed explanation content pipeline

The official question-bank spreadsheet supplied with this project contains questions, answer choices, correct answers, categories, point values, and media references. It does not contain teaching explanations.

The original SQLite table is preserved for compatibility:

```sql
question_explanations(
  question_id INTEGER PRIMARY KEY,
  explanation TEXT NOT NULL,
  source_url TEXT,
  reviewed_at INTEGER NOT NULL
)
```

Phase 2 adds nullable columns in place: `explanation_text`, `legal_basis`,
`reviewed_by`, `source_question`, `correct_answer`, and `media_filename`.
Existing reviewed records are retained, as are history, flags, translations and
the base question catalog. The legacy `questionExplanation` getter remains
available; the new UI reads structured metadata through `getQuestionExplanation`.

## Editorial rules

1. Every explanation must be written or reviewed by a qualified Polish road-law instructor or another appropriately qualified reviewer.
2. It must explain why the official answer is correct, without replacing the official source question or adding an unverified rule.
3. Cite an authoritative source link where practical, and record the review timestamp.
4. Treat regulatory changes as a content versioning event: review affected records before shipping an update.
5. Do not use generated explanations as a source of legal or road-safety guidance without human review.

## Import shape

Prepare a versioned reviewed JSON pack. This is a schema illustration, not an
approved record; source fields must be copied verbatim from the question bank:

```json
{
  "version": "editorial-pack-version",
  "entries": [
    {
      "questionId": 123,
      "sourceQuestion": "Exact original Polish question text",
      "correctAnswer": "T",
      "mediaFilename": null,
      "explanationText": "Explanation approved by a qualified reviewer",
      "legalBasis": "Precise act, article/paragraph and subsection",
      "sourceUrl": "https://eli.gov.pl/…",
      "reviewedBy": "Reviewer name or editorial identifier",
      "reviewedAt": 1790000000000
    }
  ]
}
```

Until such a reviewed pack is supplied, Study continues to show the official correct answer without inventing an explanation.

## Tools and quality gates

### Coverage baseline — 2026-10-13

`--report` returns global, `byCategory` and `byPoints` counts of total, covered,
missing, coverage percentage, priority questions and missing priority explanations.
It validates packaged source question, answer and media against the read-only bank.
Category totals overlap: a shared question is counted once in each category, but
once globally. Point-value totals partition the global bank.

| Category | Questions | Covered | Missing priority |
| --- | ---: | ---: | ---: |
| A | 1425 | 0 | 824 |
| A1 | 1411 | 0 | 824 |
| A2 | 1409 | 0 | 824 |
| AM | 1513 | 0 | 914 |
| B | 2135 | 0 | 1178 |
| B1 | 1421 | 0 | 821 |
| C | 1472 | 0 | 827 |
| C1 | 1439 | 0 | 818 |
| D | 1488 | 0 | 831 |
| D1 | 1475 | 0 | 829 |
| PT | 438 | 0 | 238 |
| T | 1305 | 0 | 778 |

| Points | Questions | Covered | Missing priority |
| --- | ---: | ---: | ---: |
| 1 | 727 | 0 | 83 |
| 2 | 1092 | 0 | 100 |
| 3 | 1699 | 0 | 1699 |
| Global | 3518 | 0 | 1882 |

All groups currently have 0% coverage. Refresh this baseline with the report after
each approved content import; automated tests cannot certify editorial correctness.
Test reporting with `node scripts/test-explanation-coverage.cjs`.

```powershell
node scripts/prepare-explanations.cjs --report
node scripts/prepare-explanations.cjs --template .expo/explanations-review-template.json
node scripts/prepare-explanations.cjs --input reviewed.json --confirm-reviewed
node scripts/test-explanations.cjs
```

The template contains 1,882 priority records: all 1,699 three-point questions,
plus questions whose Polish text explicitly mentions intersections/priority.
This text-based editorial queue is not a claim of complete visual classification
of videos/images. The template is ignored by Git, has empty teaching/legal fields
and cannot pass validation until edited and reviewed.

The CLI reads `questions.db` in read-only mode and generates the offline package
`assets/data/question-explanations.json` with a SHA-256 content version.
An optional `--output` supports another generated path within the workspace.
The explicit review flag and reviewer fields record an editorial assertion;
automated validation cannot certify a person's qualifications or legal accuracy.

Validation rejects missing review identity/date/legal basis, future review dates,
duplicate/unknown IDs, mismatched original question/answer/media snapshots and
non-HTTPS/non-government source URLs. Only `gov.pl` and its subdomains are allowed
for legal citations; URL acceptance does not prove the linked article supports
the explanation. That remains the qualified reviewer's responsibility.

SQLite installs records transactionally and rolls back the whole content update
on a source mismatch. Unrelated legacy records are not deleted; older review
timestamps do not overwrite newer records. Snapshot-backed records stop displaying
if the original question, answer or media reference changes. A legislation change
without a question-bank change still requires explicit editorial re-review.

Study reveals explanations only after answering; completed-exam review also shows
them. Active exams do not reveal explanations. Cards include the legal citation,
government source link, a Polish-language notice, and honest missing/error states.
The shipped package currently has **zero** explanations; test fixtures are synthetic,
remain only inside tests and are never bundled as legal or road-safety content.

## Hardest questions

Study's `hardest` filter includes all three-point questions and lower-weight
questions with at least two incorrect practice attempts. Ordering is descending
practice failure count, then point weight, then question ID for deterministic
ties. The filter composes with the existing language/topic/sign/search clauses.
Exam-only mistakes still appear in the separate Mistakes filter.
