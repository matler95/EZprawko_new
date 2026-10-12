const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'src/domain/exam-engine.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const engine = {};
new Function('exports', compiled)(engine);
const db = new DatabaseSync(path.join(root, 'assets/database/questions.db'), { readOnly: true });
const pool = db.prepare('SELECT id,scope,points,categories FROM questions').all().map((q) => ({ ...q, categories: JSON.parse(q.categories) }));
db.close();
const original = JSON.stringify(pool);
let seed = 0xe2;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const quota = (questions) => [1,2,3].map((points) => questions.filter((q) => q.points === points).length);
const signatures = new Set();
for (const category of ['AM','A','B','C','D']) {
  for (let trial = 0; trial < 1000; trial++) {
    const exam = engine.buildOfficialExam(pool, category, random);
    assert.equal(exam.questions.length, 32);
    assert.equal(new Set(exam.questions.map((q) => q.id)).size, 32);
    assert.equal(exam.questions.reduce((n,q) => n+q.points, 0), 74);
    assert.equal(exam.maxScore, 74);
    assert.equal(exam.passScore, 68);
    assert.equal(exam.durationSeconds, 1500);
    const basic = exam.questions.slice(0,20);
    const specialist = exam.questions.slice(20);
    assert.deepEqual(quota(basic), [4,6,10]);
    assert.deepEqual(quota(specialist), [2,4,6]);
    assert(basic.every((q) => q.scope === 'PODSTAWOWY' && q.readingTimeSeconds === 20 && q.answeringTimeSeconds === 15));
    assert(specialist.every((q) => q.scope === 'SPECJALISTYCZNY' && q.categories.includes(category) && q.readingTimeSeconds === 0 && q.answeringTimeSeconds === 50));
    assert.equal(engine.examScore(exam, {}), 0);
    assert.equal(engine.passedExam(exam, {}), false);
    const answers = Object.fromEntries(exam.questions.map((q) => [q.id, true]));
    assert.equal(engine.examScore(exam, answers), 74);
    assert.equal(engine.passedExam(exam, answers), true);
    for (const q of basic.filter((q) => q.points === 3).slice(0,2)) answers[q.id] = false;
    assert.equal(engine.examScore(exam, answers), 68);
    assert.equal(engine.passedExam(exam, answers), true);
    answers[basic.find((q) => q.points === 1).id] = false;
    assert.equal(engine.examScore(exam, answers), 67);
    assert.equal(engine.passedExam(exam, answers), false);
    signatures.add(exam.questions.map((q) => q.id).join(','));
  }
}
assert.equal(signatures.size, 5000, 'the seeded random runs must not produce identical exams');
assert.equal(JSON.stringify(pool), original, 'sampling must not mutate the source bank');
assert.throws(() => engine.buildOfficialExam([], 'B'), /Not enough/);
assert.throws(() => engine.buildOfficialExam(pool, 'invalid-category'), /Not enough/);
const insufficient = pool.filter((q) => !(q.scope === 'SPECJALISTYCZNY' && q.points === 3));
assert.throws(() => engine.buildOfficialExam(insufficient, 'B'), /Not enough/);
const duplicates = pool.map((q) => ({ ...q, id: 1 }));
assert.throws(() => engine.buildOfficialExam(duplicates, 'B'), /violates the official structure/);
console.log('Exam engine: 5,000 seeded exams (1,000/category), quotas, order, points, timers, duplicates, source immutability and 68/67 pass boundary passed.');
