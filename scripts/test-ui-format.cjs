const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => {
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    throw Error(name);
  }, exports);
  cache.set(file, exports); return exports;
}
const { formatUiNumber, formatUiDateTime } = load('src/domain/ui-format.ts');
const { setUiLanguage } = load('src/domain/ui-language.ts');
const normalize = value => value.replace(/[\u00a0\u202f]/g, ' ');
for (const [language, grouped, decimal, date] of [
  ['pl', '12 345', '5,0', '12.10.2026'], ['en', '12,345', '5.0', '12/10/2026'],
  ['de', '12.345', '5,0', '12.10.2026'], ['uk', '12 345', '5,0', '12.10.2026'],
]) {
  setUiLanguage(language);
  assert.equal(normalize(formatUiNumber(12345)), grouped);
  assert.equal(formatUiNumber(5, language, 1), decimal);
  assert.equal(formatUiNumber(0), '0');
  const timestamp = new Date(2026, 9, 12, 0, 5).getTime();
  assert(formatUiDateTime(timestamp).includes(date));
  assert(formatUiDateTime(timestamp).includes('00:05'), 'midnight must not become 24:05 or shift to UTC');
  assert.equal(formatUiDateTime(timestamp), formatUiDateTime(timestamp, language));
}
setUiLanguage('en'); assert.equal(formatUiNumber(5, 'pl', 1), '5,0', 'explicit language overrides current state');
for (const value of [NaN, Infinity, -Infinity]) {
  assert.equal(formatUiNumber(value), '—'); assert.equal(formatUiDateTime(value), '—');
}
assert.equal(formatUiDateTime(1e30), '—');
const previousZone = process.env.TZ;
try {
  const instant = Date.UTC(2026, 0, 1, 12, 5);
  process.env.TZ = 'UTC'; assert(formatUiDateTime(instant).includes('12:05'));
  process.env.TZ = 'Europe/Warsaw'; assert(formatUiDateTime(instant).includes('13:05'), 'formatter must follow changed device zone');
} finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
setUiLanguage('pl');
console.log('UI format: four locales, live default/explicit override, grouping/decimal precision, local calendar date, 24-hour midnight and invalid values passed. No persistence writes.');
