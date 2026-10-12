# Reviewed explanation content pipeline

The official question-bank spreadsheet supplied with this project contains questions, answer choices, correct answers, categories, point values, and media references. It does not contain teaching explanations.

The app is prepared to display reviewed explanations from the SQLite table below:

```sql
question_explanations(
  question_id INTEGER PRIMARY KEY,
  explanation TEXT NOT NULL,
  source_url TEXT,
  reviewed_at INTEGER NOT NULL
)
```

## Editorial rules

1. Every explanation must be written or reviewed by a qualified Polish road-law instructor or another appropriately qualified reviewer.
2. It must explain why the official answer is correct, without replacing the official source question or adding an unverified rule.
3. Cite an authoritative source link where practical, and record the review timestamp.
4. Treat regulatory changes as a content versioning event: review affected records before shipping an update.
5. Do not use generated explanations as a source of legal or road-safety guidance without human review.

## Import shape

Prepare reviewed records as JSON for a future import step:

```json
[
  {
    "questionId": 123,
    "explanation": "Reviewed Polish explanation…",
    "sourceUrl": "https://authoritative.example/rule",
    "reviewedAt": 1790000000000
  }
]
```

Until such a reviewed pack is supplied, Study continues to show the official correct answer without inventing an explanation.
