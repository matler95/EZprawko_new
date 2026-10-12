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
