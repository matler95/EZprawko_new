const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(relative) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  new Function('require', 'exports', code)((name) => name.startsWith('@/') ? load(`src/${name.slice(2)}.ts`) : require(path.resolve(root, path.dirname(relative), name)), exports);
  return exports;
}
const catalog = require('../assets/data/road-signs.json');
const links = require('../assets/data/question-signs.json');
const { findSigns, roadSigns } = load('src/domain/road-signs.ts');
const { installQuestionSigns, signQuestionCounts } = load('src/database/signs.ts');
assert.equal(roadSigns.length, 235);
assert.equal(new Set(roadSigns.map((s) => s.code)).size, 235);
assert(!roadSigns.some((s) => s.code === 'T-22'), 'repealed T-22 must not appear');
assert.equal(findSigns('b20')[0].code, 'B-20');
assert.equal(findSigns('ustap pierwszenstwa')[0].code, 'A-7');
assert.equal(findSigns('B-20 STOP')[0].code, 'B-20');
assert.equal(findSigns('stop', 'A').length, 0);
assert.equal(findSigns('not-a-sign').length, 0);
assert(findSigns('', 'T').every((s) => s.group === 'T'));
assert(findSigns('D-23c')[0].name.includes('hybrydowych'));
assert(findSigns('B-19')[0].name.includes('osi napędowej'));
assert(findSigns('T-32')[0].name.includes('po zatrzymaniu'));
for (const sign of roadSigns) {
  assert(sign.name && !sign.name.includes('\uFFFD'));
  assert(sign.source.startsWith('https://eli.gov.pl/eli/DU/'));
  const bytes = fs.readFileSync(path.join(root, 'assets/signs', `${sign.code}.webp`));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
}
const original = new DatabaseSync(path.join(root, 'assets/database/questions.db'), { readOnly: true });
const native = new DatabaseSync(':memory:');
native.exec('CREATE TABLE questions(id INTEGER PRIMARY KEY, question TEXT, categories TEXT); CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT); CREATE TABLE flags(question_id INTEGER PRIMARY KEY); PRAGMA foreign_keys=ON;');
const insert = native.prepare('INSERT INTO questions VALUES (?, ?, ?)');
for (const q of original.prepare('SELECT id,question,categories FROM questions').all()) insert.run(q.id, q.question, q.categories);
original.close();
native.prepare('INSERT INTO flags VALUES (?)').run(893);
let writes = 0;
const db = {
  execAsync: async (sql) => { writes++; native.exec(sql); },
  runAsync: async (sql, ...values) => { writes++; return native.prepare(sql).run(...values); },
  getFirstAsync: async (sql, ...values) => native.prepare(sql).get(...values),
  getAllAsync: async (sql, ...values) => native.prepare(sql).all(...values),
  withExclusiveTransactionAsync: async (fn) => {
    native.exec('BEGIN');
    try { await fn(db); native.exec('COMMIT'); } catch (e) { native.exec('ROLLBACK'); throw e; }
  },
};
(async () => {
  await installQuestionSigns(db);
  assert.equal(native.prepare('SELECT COUNT(*) AS count FROM question_signs').get().count, links.entries.length);
  const counts = await signQuestionCounts(db);
  assert.equal(Object.values(counts).reduce((a,b) => a+b, 0), 26);
  assert.equal(native.prepare('SELECT COUNT(*) AS count FROM flags').get().count, 1);
  assert.equal(native.prepare('SELECT COUNT(*) AS count FROM questions').get().count, 3518);
  const before = native.prepare('SELECT * FROM question_signs').all();
  await installQuestionSigns(db);
  assert.deepEqual(native.prepare('SELECT * FROM question_signs').all(), before);
  assert(links.entries.every((item) => catalog.entries.some((s) => s.code === item.code)));
  const ids = native.prepare('SELECT id FROM questions q WHERE EXISTS (SELECT 1 FROM question_signs s WHERE s.question_id=q.id AND s.sign_code=?)').all('A-3');
  assert.deepEqual(ids.map((q) => q.id).sort((a,b) => a-b), [893,3439]);
  assert.equal(native.prepare('SELECT id FROM questions q WHERE EXISTS (SELECT 1 FROM question_signs s WHERE s.question_id=q.id AND s.sign_code=?)').all("A-3' OR 1=1 --").length, 0);
  console.log('Road signs: 235 official assets, search/groups, updated names, 26 links, SQLite upgrade/idempotence and bound filter passed.');
  native.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
