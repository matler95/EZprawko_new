"""Import the official Polish theory question XLSX into app-ready SQLite data."""
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def text(cell):
    return None if pd.isna(cell) or not str(cell).strip() else str(cell).strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=ROOT / 'gov-attachment.xlsx')
    parser.add_argument('--database', type=Path, default=ROOT / 'assets/database/questions.db')
    parser.add_argument('--manifest', type=Path, default=ROOT / 'assets/data/media-manifest.json')
    args = parser.parse_args()

    rows = pd.read_excel(args.source, sheet_name='katalog')
    args.database.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    if args.database.exists():
        args.database.unlink()
    db = sqlite3.connect(args.database)
    db.executescript('''
      PRAGMA foreign_keys = ON;
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE questions (
        id INTEGER PRIMARY KEY, question TEXT NOT NULL, correct_answer TEXT NOT NULL,
        media_filename TEXT, scope TEXT NOT NULL CHECK(scope IN ('PODSTAWOWY','SPECJALISTYCZNY')),
        points INTEGER NOT NULL CHECK(points IN (1,2,3)), categories TEXT NOT NULL
      );
      CREATE TABLE answers (
        question_id INTEGER NOT NULL REFERENCES questions(id), label TEXT NOT NULL,
        answer TEXT NOT NULL, PRIMARY KEY(question_id, label)
      );
      CREATE INDEX question_scope_points ON questions(scope, points);
    ''')

    media, seen = {}, set()
    for _, row in rows.iterrows():
        if pd.isna(row['Numer pytania']):
            continue
        qid, question, correct = int(row['Numer pytania']), text(row['Pytanie']), text(row['Poprawna odp'])
        source_scope = text(row['Zakres struktury'])
        scope_aliases = {'PODSTAWOWY': 'PODSTAWOWY', 'PODSTAWOWA': 'PODSTAWOWY', 'SPECJALISTYCZNY': 'SPECJALISTYCZNY', 'SPECAJLISTYCZNY': 'SPECJALISTYCZNY'}
        scope = scope_aliases.get((source_scope or '').upper())
        points = int(row['Liczba punktów'])
        categories = [item.strip() for item in (text(row['Kategorie']) or '').split(',') if item.strip()]
        answers = [(label, text(row[f'Odpowiedź {label}'])) for label in 'ABC']
        answers = [(label, answer) for label, answer in answers if answer]
        if not answers:
            answers = [('T', 'Tak'), ('N', 'Nie')]
        if qid in seen or not question or correct not in {label for label, _ in answers} or scope not in {'PODSTAWOWY', 'SPECJALISTYCZNY'} or points not in {1, 2, 3} or not categories:
            raise ValueError(f'Invalid official question: {qid}')
        seen.add(qid)
        filename = text(row['Media'])
        db.execute('INSERT INTO questions VALUES (?, ?, ?, ?, ?, ?, ?)', (qid, question, correct, filename, scope, points, json.dumps(categories, ensure_ascii=False)))
        db.executemany('INSERT INTO answers VALUES (?, ?, ?)', [(qid, label, answer) for label, answer in answers])
        if filename:
            media[filename] = {'filename': filename, 'source': 'official-archive', 'cachePolicy': 'private-lru'}

    digest = hashlib.sha256(args.source.read_bytes()).hexdigest()
    db.executemany('INSERT INTO metadata VALUES (?, ?)', [('source_file', args.source.name), ('source_sha256', digest), ('question_count', str(len(seen))), ('schema_version', '1')])
    db.commit()
    db.close()
    args.manifest.write_text(json.dumps({'version': '1', 'sourceSha256': digest, 'media': list(media.values())}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Imported {len(seen)} questions and {len(media)} media references')


if __name__ == '__main__':
    main()
