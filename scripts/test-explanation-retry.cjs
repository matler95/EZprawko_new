// Exercises real read-only recovery handlers; no educational fixture is bundled.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map(), db = {};
let states = [], refs = [], deps = [], cleanups = [], effects = [], si = 0, ri = 0, ei = 0, requests = [];
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText)(name => {
    if (name === 'react') return {
      useState(initial) { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
      useRef(initial) { const i = ri++; return refs[i] ?? (refs[i] = { current: initial }); },
      useEffect(fn, next) { const i = ei++; if (!deps[i] || next.some((value,j) => value !== deps[i][j])) { cleanups[i]?.(); deps[i] = next; effects.push(() => { cleanups[i] = fn(); }); } },
    };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'expo-sqlite') return { useSQLiteContext: () => db };
    if (name === '@/database/explanations') return { getQuestionExplanation: (_db,id) => new Promise((resolve,reject) => requests.push({ id, resolve, reject })) };
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: value => value }) };
    if (name === '@/context/app-theme-context') return { useAppTheme: () => ({ colors: {} }) };
    if (name === 'expo-router') return { Link: 'Link' };
    if (name === 'react-native') return { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value } };
    if (name.startsWith('@/components/')) return load(`src/${name.slice(2)}.tsx`);
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    throw Error(`Unexpected dependency: ${name}`);
  },exports); cache.set(file,exports); return exports;
}
const tick = () => new Promise(setImmediate);
const Component = load('src/components/question-explanation.tsx').QuestionExplanation;
const render = id => {
  si = ri = ei = 0;
  const result = Component({ questionId: id });
  const queued = effects; effects = []; queued.forEach(fn => fn());
  return result;
};
const nodes = tree => tree && typeof tree === 'object' ? [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)] : [];
(async () => {
  let card = render(1); assert(card.props.loading);
  requests.shift().reject(Error('private failure')); await tick();
  card = render(1); assert(card.props.failed); assert(!card.props.loading);
  const failureView = card.type(card.props);
  const retry = nodes(failureView).find(node => node.type === 'Pressable');
  assert(retry); assert.equal(retry.props.accessibilityRole,'button'); assert.equal(retry.props.style.minHeight,48);
  const staleRetry = card.props.onRetry; staleRetry(); staleRetry();
  card = render(1); assert(card.props.loading); assert.equal(requests.length,1,'double tap creates only one read');
  const explanation = { explanationText: 'SYNTHETIC TEST', legalBasis: null, sourceUrl: null };
  requests.shift().resolve(explanation); await tick();
  card = render(1); assert.equal(card.props.explanation,explanation); assert(!card.props.failed);
  card = render(2); assert.equal(card.props.explanation,null,'never flash previous question explanation');
  const old = requests.shift(); render(3); const current = requests.shift();
  old.resolve(explanation); current.resolve(null); await tick();
  card = render(3); assert(!card.props.failed); assert(!card.props.loading); assert.equal(card.props.explanation,null);
  assert(!nodes(card.type(card.props)).some(node => node.type === 'Pressable'),'missing content is not a retryable read failure');
  render(4); const closing = requests.shift(); cleanups.forEach(fn => fn?.());
  const beforeClose = JSON.stringify(states); closing.resolve(explanation); await tick(); assert.equal(JSON.stringify(states),beforeClose,'closed review cannot receive delayed result');
  states=[];refs=[];deps=[];cleanups=[];
  render(5); const resetting=requests.shift();
  await load('src/domain/data-maintenance.ts').withDataMaintenance(async()=>{});
  resetting.resolve(explanation);await tick();assert.equal(states[1],null,'reset fences old read');
  console.log('Explanation retry: read failure vs missing content, inline retry, double taps, question changes, modal close/reset and accessible action passed. Read-only component imports no answer writer.');
})().catch(error=>{console.error(error);process.exitCode=1;});
