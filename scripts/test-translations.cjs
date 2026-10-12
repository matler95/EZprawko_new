const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const loaded = new Map();
function loadSource(relative) {
  if (loaded.has(relative)) return loaded.get(relative);
  const result = {};
  loaded.set(relative, result);
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  new Function('require', 'exports', compiled)((name) => {
    if (name === '../../assets/data/question-signs.json') return require('../assets/data/question-signs.json');
    if (name === '../../assets/data/question-explanations.json') return require('../assets/data/question-explanations.json');
    if (name === '@/assets/data/question-translations.json') return require('../assets/data/question-translations.json');
    if (name.startsWith('@/')) return loadSource(`src/${name.slice(2)}.ts`);
    throw new Error(`Unexpected runtime dependency ${name}`);
  }, result);
  return result;
}

const original = new DatabaseSync(path.join(root, 'assets/database/questions.db'), { readOnly: true });
const native = new DatabaseSync(':memory:');
for (const table of ['questions', 'answers']) {
  native.exec(original.prepare('SELECT sql FROM sqlite_master WHERE name = ?').get(table).sql);
  const rows = original.prepare(`SELECT * FROM ${table}`).all();
  const insert = native.prepare(`INSERT INTO ${table} VALUES (${Object.keys(rows[0]).map(() => '?').join(',')})`);
  for (const row of rows) insert.run(...Object.values(row));
}
original.close();

const args = (values) => values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
let writes = 0;
const db = {
  execAsync: async (sql) => { writes++; native.exec(sql); },
  runAsync: async (sql, ...values) => { writes++; return native.prepare(sql).run(...args(values)); },
  getFirstAsync: async (sql, ...values) => native.prepare(sql).get(...args(values)) ?? null,
  getAllAsync: async (sql, ...values) => native.prepare(sql).all(...args(values)),
  withExclusiveTransactionAsync: async (callback) => {
    native.exec('BEGIN');
    try { await callback(db); native.exec('COMMIT'); } catch (error) { native.exec('ROLLBACK'); throw error; }
  },
};

(async () => {
  const repository = loadSource('src/database/repository.ts');
  const translations = loadSource('src/database/translations.ts');
  await repository.initializeDatabase(db);
  assert.equal(native.prepare('SELECT COUNT(*) AS count FROM question_translations').get().count, 9338);
  await db.runAsync("INSERT INTO flags VALUES (?, ?)", 1, 123);
  const beforeWrites = writes;
  await translations.installTranslations(db);
  assert.equal(writes, beforeWrites, 'unchanged catalog must not be imported twice');
  assert.equal(native.prepare('SELECT COUNT(*) AS count FROM flags').get().count, 1);

  const catalog = require('../assets/data/question-translations.json');
  for (const item of catalog.entries) {
    const originalKey = native.prepare('SELECT correct_answer FROM questions WHERE id = ?').get(item.id).correct_answer;
    assert(item.answers.some((answer) => answer.label === originalKey), `missing correct label ${item.id}/${item.language}`);
    assert.equal(new Set(item.answers.map((answer) => answer.label)).size, item.answers.length);
    assert(item.question.trim() && item.answers.every((answer) => answer.answer.trim()));
  }

  for (const language of ['en', 'de', 'uk']) {
    const example = catalog.entries.find((item) => item.language === language);
    const content = await translations.questionContent(db, example.id, language);
    assert.equal(content.question, example.question);
    assert.equal(content.contentLanguage, language);
    assert.deepEqual(content.answers, example.answers);
  }
  for (const language of ['de', 'uk']) {
    const missing = native.prepare('SELECT id FROM questions q WHERE NOT EXISTS (SELECT 1 FROM question_translations t WHERE t.question_id = q.id AND t.language = ?) LIMIT 1').get(language);
    const fallback = await translations.questionContent(db, missing.id, language);
    assert.equal(fallback.contentLanguage, 'pl');
    assert.equal(fallback.question, native.prepare('SELECT question FROM questions WHERE id = ?').get(missing.id).question);
  }
  await translations.setQuestionLanguage(db, 'en');
  const active = await repository.startActiveExam(db, 'B');
  assert.equal(active.language, 'en');
  assert(active.questions.every((question) => question.contentLanguage === 'en'));
  await translations.setQuestionLanguage(db, 'uk');
  const resumed = await repository.resumeActiveExam(db);
  assert.equal(resumed.language, 'en', 'an active exam must retain its original language');
  assert.deepEqual(resumed.questions.map((question) => question.id), active.questions.map((question) => question.id));
  const answers = Object.fromEntries(active.questions.map((question) => [question.id, question.correctAnswer]));
  const completed = await repository.saveCompletedExam(db, 'B', active.questions, answers, Date.now() - 10000, active.language);
  assert.equal(completed.score, 74);
  const review = await repository.examReview(db, completed.id);
  assert.equal(review.language, 'en');
  assert(review.questions.every((question) => question.isCorrect && question.contentLanguage === 'en'));
  assert.equal(review.questions.length, 32);
  console.log('Translations: migration/idempotence, 9,338 answer keys, language fallback, exam resume, scoring, and review passed.');
  native.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
