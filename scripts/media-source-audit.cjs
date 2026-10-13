function reconcileSourceRows(questions, source) {
  const catalog = new Map(questions.map(q => [q.id, q]));
  const seen = new Set(), issues = [];
  for (const row of source.records) {
    if (seen.has(row.id)) issues.push({ kind: 'duplicateSourceId', questionId: row.id, sourceRow: row.sourceRow });
    seen.add(row.id);
    const question = catalog.get(row.id);
    if (!question) { issues.push({ kind: 'missingFromDatabase', questionId: row.id, sourceRow: row.sourceRow }); continue; }
    if (question.media_filename !== row.media_filename) issues.push({ kind: 'sourceMediaMismatch', questionId: row.id,
      sourceRow: row.sourceRow, mediaCell: row.mediaCell, source: row.media_filename, database: question.media_filename });
    const categories = JSON.parse(question.categories);
    if (JSON.stringify([...new Set(categories)].sort()) !== JSON.stringify([...new Set(row.categories)].sort())) {
      issues.push({ kind: 'sourceCategoryMismatch', questionId: row.id, sourceRow: row.sourceRow });
    }
  }
  for (const question of questions) if (!seen.has(question.id)) issues.push({ kind: 'missingFromSource', questionId: question.id });
  return { status: issues.length ? 'mismatch' : 'matched', sourceRows: source.records.length, databaseRows: questions.length,
    blankSourceMedia: source.records.filter(row => row.media_filename === null).length, issues };
}
module.exports = { reconcileSourceRows };
