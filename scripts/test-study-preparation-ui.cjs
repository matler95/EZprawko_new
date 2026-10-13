const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
let states = [], refs = [], cursor = 0, refCursor = 0, focus, effects = [], mode = 'account', calls = [], cancelled = 0;
const controller = {
  cancel() { cancelled++; },
  async run(progress) {
    calls.push(mode); progress({ completed: 1, total: 2, filename: 'one.jpg' });
    if (mode === 'account') throw Error('account');
    if (mode === 'access') throw Error('access');
    if (mode === 'delay') return new Promise(resolve => { controller.resolve = resolve; });
    progress({ completed: 2, total: 2, filename: 'two.jpg' }); return true;
  },
};
const exportsForUi = {};
new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/study-preparation.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(function fixture(name) {
  if (name === 'react') return {
    useState(value) { const i = cursor++; if (!(i in states)) states[i] = value; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(value) { const i = refCursor++; return refs[i] ?? (refs[i] = { current: value }); },
    useCallback: fn => fn, useMemo: fn => fn(), useId: () => 'fixture', useEffect: fn => effects.push(fn),
  };
  if (name === 'react/jsx-runtime') return require(name);
  if (name === 'expo-router') return { useFocusEffect: fn => { focus = fn; }, router: { navigate() {} } };
  if (name === 'react-native') return { Platform: {}, StyleSheet: { create: value => value }, ...Object.fromEntries(['KeyboardAvoidingView','Pressable','ScrollView','Text','View','ActivityIndicator'].map(value => [value,value])) };
  if (name === '@/components/ui/app-controls' || name === '@/constants/ui-tokens') {
    const exports = {}; const file = name === '@/components/ui/app-controls' ? 'src/components/ui/app-controls.tsx' : 'src/constants/ui-tokens.ts';
    new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(fixture,exports);return exports;
  }
  if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
  if (name === '@/context/app-theme-context') return { useAppTheme: () => ({ colors: {} }) };
  if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: (value, args = []) => value.replace(/\{(\d+)\}/g, (_, i) => args[i]) }) };
  if (name === '@/services/study-preparation') return { createStudyPreparation: () => controller };
  if (name === '@/services/media-cache') return { protectMedia() {}, releaseProtectedMedia() {} };
  if (name === '@/domain/media-error') return { mediaFailure: error => ({ kind: error.message, message: error.message, retryable: false }) };
  if (name === '@/components/media-account-card') return { MediaAccountCard: 'Account' };
  throw Error(name);
}, exportsForUi);
const expand = tree => tree && typeof tree.type === 'function' && /^App(Button|Card|Status|Heading)$/.test(tree.type.name) ? tree.type(tree.props) : tree;
const nodes = input => { const tree = expand(input); return tree && typeof tree === 'object' ? [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)] : []; };
const text = input => { const tree = expand(input); return typeof tree === 'string' ? tree : tree && typeof tree === 'object' ? [tree.props?.children].flat(Infinity).map(text).join(' ') : ''; };
const button = (tree, label) => { const found = nodes(tree).find(node => node.type === 'Pressable' && text(node).includes(label)); assert(found, label); return found; };
const tick = () => new Promise(setImmediate);
(async () => {
  let starts = 0, exits = 0;
  const questions = [{ id: 1, media_filename: 'one.jpg' }, { id: 2, media_filename: 'two.jpg' }];
  const props = { questions, category: 'B', onReady: () => starts++, onCancel: () => exits++ };
  const render = () => { cursor = refCursor = 0; effects = []; return exportsForUi.StudyPreparation(props); };
  render();const cleanup = focus();await tick();let tree = render();
  button(tree, 'Zaloguj').props.onPress();tree = render();
  mode = 'ready';await nodes(tree).find(node => node.type === 'Account').props.onAuthenticated();await tick();tree = render();
  assert(text(tree).includes('Materiały gotowe'));assert.equal(starts,0,'successful download requires explicit start');
  button(tree,'Rozpocznij naukę').props.onPress();assert.equal(starts,1);
  cleanup();mode='delay';const blur=focus();await tick();
  const oldResolve=controller.resolve;blur();focus();mode='ready';oldResolve(false);await tick();await tick();tree=render();
  assert(text(tree).includes('Materiały gotowe'),'quick blur/refocus waits for cancelled work then resumes');
  mode='delay';focus();await tick();tree=render();
  button(tree,'Przerwij przygotowanie').props.onPress();controller.resolve(false);await tick();
  assert.equal(exits,1);assert.equal(starts,1,'cancelled work cannot start study');assert(cancelled>0);
  states=[];refs=[];mode='access';render();focus();await tick();tree=render();
  assert(!nodes(tree).some(node=>node.type==='Account'),'access denial does not imply missing login');
  button(tree,'Przejdź do konta');assert.equal(starts,1);
  console.log('Study preparation UI: login -> same batch retry, explicit start, cancellation and access-denied recovery passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
