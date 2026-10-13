// Real SQLite persistence; UI copy is independent from the official question bank.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'exports', code)(name => {
    if (name === '@/database/translations') return { parseQuestionLanguage: value => ['en','de','uk'].includes(value) ? value : 'pl' };
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    throw Error(name);
  }, exports);
  return exports;
}
const native = new DatabaseSync(':memory:');
native.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);');
let fail = false, beforeTransaction;
const db = {
  getFirstAsync: async (sql, ...args) => native.prepare(sql).get(...args),
  runAsync: async (sql, key, value) => {
    if (fail && key === 'question-language') throw Error('write failed');
    return native.prepare(sql).run(key, value);
  },
  withExclusiveTransactionAsync: async fn => {
    if (beforeTransaction) await beforeTransaction();
    native.exec('BEGIN');
    try { await fn(db); native.exec('COMMIT'); } catch (error) { native.exec('ROLLBACK'); throw error; }
  },
};
(async () => {
  const language = load('src/domain/ui-language.ts');
  const copy = load('src/domain/ui-copy.ts');
  const prefs = load('src/database/ui-language.ts');
  const maintenance = load('src/domain/data-maintenance.ts');
  const placeholders = value => [...value.matchAll(/\{\d+\}/g)].map(m => m[0]).sort();
  const keys = new Set();
  for (const row of copy.uiCopy) {
    assert(!keys.has(row[0]), `duplicate copy: ${row[0]}`); keys.add(row[0]);
    for (const text of row) {
      assert(text.trim() && !text.includes('\uFFFD'), `invalid copy: ${row[0]}`);
      assert.deepEqual(placeholders(text), placeholders(row[0]), `placeholder mismatch: ${row[0]}`);
    }
  }
  let updates = 0;
  const unsubscribe = language.subscribeUiLanguage(() => updates++);
  for (const locale of ['pl','en','de','uk']) {
    await prefs.saveUiLanguage(db, locale);
    assert.equal(await prefs.readUiLanguage(db), locale);
    assert.equal(native.prepare("SELECT value FROM settings WHERE key='question-language'").get().value, locale);
    assert.equal(language.uiLanguage(), locale);
    assert(!copy.t('Pytanie {0}, {1}', [2, '✓']).includes('{'));
  }
  assert.equal(updates, 4);
  unsubscribe();
  fail = true;
  await assert.rejects(() => prefs.saveUiLanguage(db, 'en'), /write failed/);
  assert.equal(await prefs.readUiLanguage(db), 'uk', 'failed second write must roll back both preferences');
  assert.equal(language.uiLanguage(), 'uk', 'failed save must not change visible UI');
  fail = false;
  beforeTransaction = () => maintenance.withDataMaintenance(async () => undefined);
  await assert.rejects(() => prefs.saveUiLanguage(db, 'de'), /interrupted/);
  assert.equal(await prefs.readUiLanguage(db), 'uk', 'reset fences delayed preference writes');
  assert.equal(copy.t('Pytanie {0}, {1}', [3, '✓'], 'en'), 'Question 3, ✓');
  assert.equal(copy.t(null), '');
  const mediaErrors = load('src/domain/media-error.ts');
  assert(!mediaErrors.mediaErrorMessage(new Error('download failed https://private/?token=secret')).includes('secret'));
  const { MediaAccountRequiredError } = load('src/domain/account.ts');
  assert.match(mediaErrors.mediaErrorMessage(new MediaAccountRequiredError()), /Zaloguj/);
  console.log(`UI language: ${keys.size} complete four-language entries, placeholder parity, subscriptions, explicit locale, atomic persistence/rollback and reset fence passed.`);
  native.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
