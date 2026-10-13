// Exercises decoder readiness and recovery without real files, accounts or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
let states = [], cursor = 0, effects = [], requests = [], videoStatus = 'loading';
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'exports', code)(name => {
    if (name === 'react') return {
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
      useCallback: fn => fn,
      useEffect: (fn, deps) => effects.push({ fn, deps }),
    };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return { Image: 'Image', View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView', ActivityIndicator: 'ActivityIndicator', Platform: {}, StyleSheet: { create: value => value } };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'expo-router') return { router: { navigate() {} } };
    if (name === 'expo') return { useEvent: () => ({ status: videoStatus }), useEventListener() {} };
    if (name === 'expo-video') return { useVideoPlayer: () => ({ status: videoStatus }), VideoView: 'VideoView' };
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: value => value }) };
    if (name === '@/context/app-theme-context') return { useAppTheme: () => ({ colors: {} }) };
    if (name === '@/config/media') return { mediaConfig: { enabled: true }, deliveredMediaFilename: value => value };
    if (name === '@/services/media-cache') return { cachedMediaUri: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) };
    if (name === '@/components/media-account-card') return { MediaAccountCard: 'Account' };
    if (name === '@/domain/ui-copy') return { uiCopy: [['Dostęp do materiału nie został przyznany.', 'Access denied']] };
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    throw Error(name);
  }, exports);
  return exports;
}
const children = tree => tree && typeof tree === 'object' ? [tree, ...[tree.props?.children].flat(Infinity).flatMap(children)] : [];
const render = (component, props) => { cursor = 0; effects = []; return component(props); };
const tick = () => new Promise(setImmediate);
(async () => {
  const { QuestionMedia } = load('src/components/question-media.tsx');
  const { MediaAccountRequiredError } = load('src/domain/account.ts');
  const { mediaFailure } = load('src/domain/media-error.ts');
  assert.equal(mediaFailure(new MediaAccountRequiredError()).kind, 'account');
  assert.deepEqual(mediaFailure(new Error('Access denied')), { kind: 'access', message: 'Dostęp do materiału nie został przyznany.', retryable: false });
  assert(!mediaFailure(new Error('https://private/?token=secret')).message.includes('secret'));
  const ready = [];
  const props = { filename: 'image.jpg', onReadyChange: value => ready.push(value) };
  render(QuestionMedia, props); effects.forEach(effect => effect.fn());
  requests.shift().resolve('file:///image.jpg'); await tick();
  let tree = render(QuestionMedia, props); effects[0].fn();
  assert.equal(ready.at(-1), false, 'URI alone cannot unlock answers');
  tree.props.onLoad(); tree = render(QuestionMedia, props); effects[0].fn();
  assert.equal(ready.at(-1), true, 'image load unlocks answers');
  tree.props.onError(); tree = render(QuestionMedia, props); effects[0].fn();
  assert.equal(ready.at(-1), false, 'decode failure locks answers');
  assert(children(tree).some(node => node.type === 'Pressable'), 'decode error has retry');
  states = []; requests = [];
  render(QuestionMedia, props); effects.forEach(effect => effect.fn());
  requests.shift().resolve(undefined); await tick();
  tree = render(QuestionMedia, props);
  assert(!children(tree).some(node => node.type === 'ActivityIndicator'), 'missing URI does not spin forever');
  states = []; requests = [];
  render(QuestionMedia, props);
  const oldCleanup = effects.at(-1).fn();
  const old = requests.shift(); oldCleanup();
  render(QuestionMedia, { ...props, filename: 'other.jpg' });
  effects.at(-1).fn();
  old.reject(new MediaAccountRequiredError()); await tick();
  requests.shift().resolve('file:///other.jpg'); await tick();
  tree = render(QuestionMedia, { ...props, filename: 'other.jpg' });
  assert.equal(tree.type, 'Image', 'obsolete account error cannot overwrite the next material');
  // A mounted decoder reports buffering, success and failure through its actual status.
  states = []; requests = [];
  render(QuestionMedia, { ...props, filename: 'video.mp4' }); effects.forEach(effect => effect.fn());
  requests.shift().resolve('file:///video.mp4'); await tick();
  const video = render(QuestionMedia, { ...props, filename: 'video.mp4' });
  for (const status of ['loading', 'readyToPlay', 'loading', 'error']) {
    videoStatus = status; render(video.type, video.props); effects.forEach(effect => effect.fn());
    render(QuestionMedia, { ...props, filename: 'video.mp4' }); effects[0].fn();
    assert.equal(ready.at(-1), status === 'readyToPlay');
  }
  console.log('Media readiness: URI vs decoded image/video, buffering/error, missing URI recovery and safe account/access classification passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
