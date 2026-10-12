const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
function load(relative) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root,relative),'utf8'),{ compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require','exports',code)((name) => {
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    return require(path.resolve(root,path.dirname(relative),name));
  },exports);
  return exports;
}
const { installExplanations, installExplanationPack, getQuestionExplanation } = load('src/database/explanations.ts');
const { validateExplanationPack } = load('src/domain/explanation-pack.ts');
const { studyFilterSql, isStudyFilter } = load('src/database/study-filters.ts');
const original = new DatabaseSync(path.join(root,'assets/database/questions.db'),{ readOnly: true });
const qs = original.prepare('SELECT id,question,correct_answer,media_filename,points FROM questions LIMIT 3').all();
original.close();
const native = new DatabaseSync(':memory:');
native.exec(`CREATE TABLE questions(id INTEGER PRIMARY KEY,question TEXT,correct_answer TEXT,media_filename TEXT,points INTEGER);
CREATE TABLE question_explanations(question_id INTEGER PRIMARY KEY,explanation TEXT NOT NULL,source_url TEXT,reviewed_at INTEGER NOT NULL);
CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE flags(question_id INTEGER PRIMARY KEY);
CREATE TABLE practice_attempts(question_id INTEGER,is_correct INTEGER); CREATE TABLE exam_answers(question_id INTEGER,is_correct INTEGER);`);
for (const q of qs) native.prepare('INSERT INTO questions VALUES (?,?,?,?,?)').run(q.id,q.question,q.correct_answer,q.media_filename,q.points);
native.prepare('INSERT INTO flags VALUES (?)').run(qs[0].id);
native.prepare('INSERT INTO question_explanations VALUES (?,?,?,?)').run(qs[0].id,'Synthetic legacy test explanation',null,1);
const db = {
  execAsync: async (sql) => native.exec(sql), runAsync: async (sql,...values) => native.prepare(sql).run(...values),
  getFirstAsync: async (sql,...values) => native.prepare(sql).get(...values) ?? null,
  getAllAsync: async (sql,...values) => native.prepare(sql).all(...values),
  withExclusiveTransactionAsync: async (fn) => { native.exec('BEGIN'); try { await fn(db); native.exec('COMMIT'); } catch(e) { native.exec('ROLLBACK'); throw e; } },
};
// These fixtures test plumbing only; they are never bundled as legal guidance.
const entry = (q) => ({ questionId: q.id, explanationText: 'SYNTHETIC TEST — not educational content',
  legalBasis: 'SYNTHETIC TEST reference', sourceUrl: 'https://eli.gov.pl/', reviewedAt: Date.now()-10000, reviewedBy: 'test fixture',
  sourceQuestion: q.question, correctAnswer: q.correct_answer, mediaFilename: q.media_filename });
(async () => {
  await installExplanations(db);
  assert.equal((await getQuestionExplanation(db,qs[0].id)).explanationText,'Synthetic legacy test explanation');
  const pack = { version: 'fixture-1', entries: [entry(qs[1])] };
  await installExplanationPack(db,pack);
  const imported = await getQuestionExplanation(db,qs[1].id);
  assert.equal(imported.legalBasis,pack.entries[0].legalBasis);
  assert.equal(imported.sourceUrl,'https://eli.gov.pl/');
  await installExplanations(db,pack);
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM question_explanations').get().n,2);
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM flags').get().n,1);
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM questions').get().n,3);
  for (const change of [{ reviewedBy: '' },{ legalBasis: '' },{ reviewedAt: 0 },{ reviewedAt: Date.now()+10000 },{ sourceUrl: 'javascript:alert(1)' },{ sourceUrl: 'https://gov.pl.evil.example/' }]) {
    assert.throws(() => validateExplanationPack({ version: 'invalid', entries: [{ ...entry(qs[2]),...change }] }));
  }
  assert.throws(() => validateExplanationPack({ version: 'duplicate', entries: [entry(qs[2]),entry(qs[2])] }));
  const invalid = { version: 'rollback', entries: [entry(qs[2]), { ...entry(qs[0]), correctAnswer: 'WRONG' }] };
  invalid.entries[1].correctAnswer = qs[0].correct_answer === 'T' ? 'N' : 'T';
  await assert.rejects(() => installExplanationPack(db,invalid),/mismatch/);
  assert.equal(await getQuestionExplanation(db,qs[2].id),null);
  assert.equal(native.prepare("SELECT value FROM settings WHERE key='explanations-version'").get().value,'fixture-1');
  native.prepare('UPDATE questions SET question=? WHERE id=?').run('changed source',qs[1].id);
  assert.equal(await getQuestionExplanation(db,qs[1].id),null,'stale content must not display against changed questions');
  native.prepare('UPDATE questions SET points=1 WHERE id=?').run(qs[0].id);
  native.prepare('UPDATE questions SET points=3 WHERE id=?').run(qs[1].id);
  native.prepare('UPDATE questions SET points=2 WHERE id=?').run(qs[2].id);
  for(let i=0;i<4;i++) native.prepare('INSERT INTO practice_attempts VALUES (?,0)').run(qs[0].id);
  native.prepare('INSERT INTO practice_attempts VALUES (?,0)').run(qs[2].id);
  const filter = studyFilterSql('hardest');
  const rows = native.prepare(`SELECT q.id FROM questions q ${filter.joins} WHERE (${filter.where}) ORDER BY ${filter.order}`).all();
  assert.deepEqual(rows.map((q) => q.id),[qs[0].id,qs[1].id]);
  assert(isStudyFilter('hardest')); assert(!isStudyFilter("' OR 1=1"));
  const bounded = native.prepare(`SELECT q.id FROM questions q WHERE (${filter.where}) AND q.id=? ORDER BY ${filter.order}`).all(qs[1].id);
  assert.deepEqual(bounded.map((q)=>q.id),[qs[1].id]);
  console.log('Explanations: legacy migration, reviewed metadata, idempotence, rollback, source mismatch, data preservation and hardest ranking passed.');
  native.close();
})().catch((error) => { console.error(error); process.exitCode=1; });
