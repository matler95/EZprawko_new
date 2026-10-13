const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { explanationCoverage } = require('./explanation-coverage.cjs');
const questions = [
  { id: 1, question: 'Pytanie', correct_answer: 'T', media_filename: null, points: 3, categories: JSON.stringify(['A', 'B', 'B']) },
  { id: 2, question: 'Pierwszeństwo', correct_answer: 'A', media_filename: 'photo.jpg', points: 2, categories: JSON.stringify(['B']) },
  { id: 3, question: 'Inne', correct_answer: 'N', media_filename: null, points: 1, categories: JSON.stringify(['A']) },
];
const entry = { questionId: 1, sourceQuestion: 'Pytanie', correctAnswer: 'T', mediaFilename: null };
const report = explanationCoverage(questions, [entry]);
assert.equal(report.totalQuestions, 3);
assert.equal(report.packagedExplanations, 1);
assert.equal(report.coveragePercent, 33.33);
assert.equal(report.priorityQuestions, 2);
assert.equal(report.missingPriorityExplanations, 1);
assert.equal(report.missingExplanations, 2);
assert.deepEqual(report.byCategory.map(row => [row.category, row.totalQuestions, row.packagedExplanations]), [['A', 2, 1], ['B', 2, 1]]);
assert.deepEqual(report.byPoints.map(row => [row.points, row.totalQuestions, row.packagedExplanations]), [[1, 1, 0], [2, 1, 0], [3, 1, 1]]);
assert.equal(explanationCoverage([], []).coveragePercent, 0);
assert.equal(explanationCoverage(questions, []).missingPriorityExplanations, 2);
for (const invalid of [{ ...entry, questionId: 99 }, { ...entry, sourceQuestion: 'Stale' }, { ...entry, correctAnswer: 'N' }, { ...entry, mediaFilename: 'stale.jpg' }]) {
  assert.throws(() => explanationCoverage(questions, [invalid]), /Source mismatch/);
}
assert.throws(() => explanationCoverage([{ ...questions[0], categories: '{}' }], []), /Invalid categories/);
const root = path.resolve(__dirname, '..');
const real = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/prepare-explanations.cjs'), '--report'], { encoding: 'utf8' }));
assert.equal(real.totalQuestions, 3518);
assert.equal(real.byCategory.length, 12);
assert.deepEqual(real.byPoints.map(row => row.points), [1, 2, 3]);
assert.equal(real.byPoints.reduce((sum, row) => sum + row.totalQuestions, 0), real.totalQuestions);
assert.equal(real.byPoints.reduce((sum, row) => sum + row.packagedExplanations, 0), real.packagedExplanations);
for (const row of [...real.byCategory, ...real.byPoints]) {
  assert(row.packagedExplanations <= row.totalQuestions);
  assert(row.coveragePercent >= 0 && row.coveragePercent <= 100);
}
console.log('Explanation coverage: category deduplication, global/point totals, partial/empty coverage, priority, stale-source rejection and real-bank report passed. Read-only.');
