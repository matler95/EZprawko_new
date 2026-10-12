// SQLite aggregation and native-stub chart contracts; device visual QA is separate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
let theme = 'light';
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'exports', code)((name) => {
    if (name === '@/global.css') return {};
    if (name === 'react-native') return { ScrollView: 'ScrollView', View: 'View', Text: 'Text', StyleSheet: { create: (s) => s }, Platform: { select: (s) => s.default } };
    if (name === '@/context/app-theme-context') return { useAppTheme: () => ({ colors: load('src/constants/theme.ts').Colors[theme] }) };
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    return require(name);
  }, exports);
  cache.set(file, exports);
  return exports;
}
const { bankProgress } = load('src/database/bank-progress.ts');
const { coveragePercent, examDateLabels, scoreHeight, SCORE_PLOT_HEIGHT } = load('src/domain/progress-presentation.ts');
const { ExamScoreChart } = load('src/components/exam-score-chart.tsx');
const native = new DatabaseSync(':memory:');
native.exec(`CREATE TABLE questions(id INTEGER PRIMARY KEY);
  CREATE TABLE practice_attempts(question_id INTEGER,selected_answer TEXT);
  CREATE TABLE exam_sessions(id TEXT PRIMARY KEY,completed_at INTEGER);
  CREATE TABLE exam_answers(session_id TEXT,question_id INTEGER,selected_answer TEXT);
  INSERT INTO questions VALUES (1),(2),(3),(4),(5);
  INSERT INTO exam_sessions VALUES ('done',123),('active',NULL);`);
const db = { getFirstAsync: async (sql) => native.prepare(sql).get() ?? null };
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  const children = tree.props?.children;
  return [...(predicate(tree) ? [tree] : []), ...(Array.isArray(children) ? children.flat(Infinity) : [children]).flatMap((child) => find(child, predicate))];
}
(async () => {
  assert.deepEqual({ ...await bankProgress(db) }, { total: 5, answered: 0 });
  native.exec(`INSERT INTO practice_attempts VALUES (1,'T'),(1,'N'),(2,'A'),(999,'T');
    INSERT INTO exam_answers VALUES ('done',1,'N'),('done',3,'C'),('done',4,NULL),('active',5,'T'),('unknown',4,'T');`);
  assert.deepEqual({ ...await bankProgress(db) }, { total: 5, answered: 3 }, 'deduplicate modes/retries, exclude skipped, incomplete, orphan sessions and stale IDs');
  native.exec('DELETE FROM practice_attempts; DELETE FROM exam_answers;');
  assert.deepEqual({ ...await bankProgress(db) }, { total: 5, answered: 0 }, 'reflect reset without cached counts');
  native.exec('DELETE FROM questions;');
  assert.deepEqual({ ...await bankProgress(db) }, { total: 0, answered: 0 });
  assert.equal(coveragePercent(1450,3518),41);
  assert.equal(coveragePercent(3517,3518),99);
  assert.equal(coveragePercent(3518,3518),100);
  assert.equal(coveragePercent(1,0),0);
  assert.equal(coveragePercent(-1,10),0);
  assert.equal(coveragePercent(20,10),100);
  const timestamp = new Date(2026,9,12,9,5).getTime();
  assert.deepEqual(examDateLabels(timestamp), { date: '12.10', year: '2026', time: '09:05' });
  assert.equal(scoreHeight(0),0); assert.equal(scoreHeight(74),SCORE_PLOT_HEIGHT);
  assert.equal(scoreHeight(68),68/74*SCORE_PLOT_HEIGHT);
  const history = Array.from({length:9}, (_, i) => ({ id: String(i), score: [74,68,67,0][i%4], passed: i%4<2, category: 'B', completedAt: timestamp-i*1000 }));
  for (theme of ['light','dark']) {
    const tree = ExamScoreChart({history});
    const columns = find(tree, (node) => node.props?.accessible === true);
    assert.equal(columns.length,7);
    assert.deepEqual(columns.map((node)=>node.key),['6','5','4','3','2','1','0']);
    assert.match(columns[0].props.accessibilityLabel,/12\.10\.2026.*09:04.*67.*niezdany/);
    const plot = columns[0].props.children[1];
    assert.equal(plot.props.style.height,SCORE_PLOT_HEIGHT);
    assert.equal(plot.props.children[1].props.style.bottom,scoreHeight(68));
    assert.equal(plot.props.children[1].props.pointerEvents,'none');
    const zero = columns.find((node)=>node.key==='3').props.children[1].props.children[0];
    assert.equal(zero.props.style[1].height,0,'zero score must not inflate the bar');
    assert(find(tree,(node)=>node.type==='ScrollView')[0].props.horizontal);
  }
  assert.equal(history.length,9,'chart must not mutate source history');
  native.close();
  console.log('Bank progress: real SQLite deduplication, skipped/incomplete/stale exclusion, empty/reset, percentage bounds, local timestamps and 7-column chart/68-point geometry in both themes passed.');
})().catch((error)=>{ console.error(error); process.exitCode=1; });
