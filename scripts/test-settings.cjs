// Settings failures and conflicting actions; no real device, filesystem or account writes.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), React = require('react');
const root = path.resolve(__dirname, '..'), modules = new Map();
let states = [], refs = [], si = 0, ri = 0, focus, foreground, alert;
let language = 'en', languageReadError = false, languageSaveError = false, writes = 0, saveDelay;
let cacheBytes = 5242880, cacheReadError = false, clearError = false, clears = 0, theme = 'light', preference = 'system', themeError = false, category = 'B';
const tick = () => new Promise(setImmediate);
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {}; modules.set(file, exports);
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => {
    if (name === 'react') return { ...React, useCallback: f => f, useRef: v => { const i = ri++; return refs[i] ?? (refs[i] = { current: v }); }, useState: v => { const i = si++; if (!(i in states)) states[i] = v; return [states[i], x => { states[i] = typeof x === 'function' ? x(states[i]) : x; }]; } };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: load('src/domain/ui-copy.ts').t, language: load('src/domain/ui-language.ts').uiLanguage() }) };
    if (name === '@/global.css') return {};
    if (name === '@/hooks/use-ui-language') return { useUiLanguage: () => 'pl' };
    if (name === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'ios', select: s => s.ios ?? s.default }, StyleSheet: { create: s => s }, Alert: { alert: (...args) => { alert = args; } }, AppState: { addEventListener: (_event, cb) => { foreground = cb; return { remove: () => {} }; } } };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'expo-router') return { useFocusEffect: cb => { focus = cb; } };
    if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
    if (name === '@/context/app-theme-context') return { useAppTheme: () => ({ colors: load('src/constants/theme.ts').Colors[theme], preference, setPreference: async value => { if (themeError) return false; preference = value; return true; } }) };
    if (name === '@/context/target-category-context') return { useTargetCategory: () => ({ category, changing: false, error: null, setCategory: async value => { category = value; return true; } }) };
    if (name === '@/database/translations') return { questionLanguages: [{ code: 'pl', label: 'Polski' }, { code: 'en', label: 'English' }], translationCoverage: { en: 123 }, selectedQuestionLanguage: async () => { if (languageReadError) throw Error('read'); return language; }, setQuestionLanguage: async (_db, value) => { writes++; if (saveDelay) await saveDelay; if (languageSaveError) throw Error('write'); language = value; } };
    if (name === '@/services/media-cache') return { cacheSizeBytes: async () => { if (cacheReadError) throw Error('read'); return cacheBytes; }, clearMediaCache: async () => { clears++; if (clearError) throw Error('clear'); cacheBytes = 0; } };
    if (name === '@/components/ui/app-controls') return load('src/components/ui/app-controls.tsx');
    if (name.startsWith('@/components/')) { const names = { 'media-download-card': 'MediaDownloadCard', 'media-account-card': 'MediaAccountCard', 'reminder-card': 'ReminderCard', 'user-data-card': 'UserDataCard', 'app-about-card': 'AppAboutCard' }; return { [names[name.split('/').at(-1)]]: name }; }
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    throw Error(name);
  }, exports);
  return exports;
}
function nodes(t) { if (!t || typeof t !== 'object') return []; if(typeof t.type==='function'&&/^App(Button|Card|Status|Heading)$/.test(t.type.name))return nodes(t.type(t.props)); return [t, ...[t.props?.children].flat(Infinity).flatMap(nodes)]; }
function text(t) { if (typeof t === 'string' || typeof t === 'number') return String(t); if (!t || typeof t !== 'object') return ''; if(typeof t.type==='function'&&/^App(Button|Card|Status|Heading)$/.test(t.type.name))return text(t.type(t.props)); return [t.props?.children].flat(Infinity).map(text).join(' '); }
function button(tree, label) { return nodes(tree).findLast(n => n.type === 'Pressable' && text(n).trim() === label); }
function render(Screen) { si = ri = 0; return Screen(); }
(async () => {
  const Screen = load('src/app/settings.tsx').default;
  for (theme of ['light', 'dark']) {
    states = []; refs = []; writes = clears = 0; language = 'en'; preference = 'system'; cacheBytes = 5242880; cacheReadError = languageReadError = themeError = false;
    render(Screen); const blur = focus(); await tick(); let tree = render(Screen);
    assert.match(text(tree), /5,0 MB/); assert(button(tree, 'English').props.accessibilityState.checked);
    load('src/domain/ui-language.ts').setUiLanguage('en');assert(text(render(Screen)).includes('5.0 MB'));
    load('src/domain/ui-language.ts').setUiLanguage('pl');tree=render(Screen);
    assert(!text(tree).includes('Mogą zostać usunięte'));
    const details=button(tree,'Jak działają materiały offline?');assert.equal(details.props.accessibilityState.expanded,false);
    details.props.onPress();tree=render(Screen);assert(text(tree).includes('Mogą zostać usunięte'));
    button(tree,'Ukryj informacje o materiałach offline').props.onPress();tree=render(Screen);
    languageSaveError = true; button(tree, 'Polski').props.onPress(); await tick(); tree = render(Screen);
    assert(button(tree, 'English').props.accessibilityState.checked); assert.match(text(tree), /Nie udało się zapisać/);
    languageSaveError = false; let release; saveDelay = new Promise(r => { release = r; });
    const submit = button(tree, 'Polski'); const saving = submit.props.onPress(); submit.props.onPress();
    assert.equal(writes, 2, 'failed request plus a single pending save'); release(); await saving; await tick(); saveDelay = null;
    tree = render(Screen); assert(button(tree, 'Polski').props.accessibilityState.checked); assert.match(text(tree), /zapisano/);
    themeError = true; button(tree, 'Ciemny').props.onPress(); await tick(); tree = render(Screen); assert(button(tree, 'Systemowy').props.accessibilityState.checked); themeError = false;
    button(tree, 'Ciemny').props.onPress(); await tick(); assert(button(render(Screen), 'Ciemny').props.accessibilityState.checked);
    cacheReadError = true; foreground('active'); await tick(); tree = render(Screen); assert.match(text(tree), /Zajętość aktualnie niedostępna/); assert(!text(tree).includes('0,0 MB'));
    cacheReadError = false; button(tree, 'Odśwież zajętość').props.onPress(); await tick(); tree = render(Screen); assert.match(text(tree), /5,0 MB/);
    const download = nodes(tree).find(n => n.type === '@/components/media-download-card');
    download.props.onBusyChange(true); tree = render(Screen); assert(button(tree, 'Usuń pobrane materiały').props.disabled);
    download.props.onBusyChange(false); await tick(); tree = render(Screen);
    button(tree, 'Usuń pobrane materiały').props.onPress(); assert.equal(clears, 0, 'confirmation precedes deletion'); assert.equal(download.props.canStart(), false, 'synchronous lock blocks download before rerender');
    alert[2][0].onPress(); assert.equal(clears, 0);
    button(render(Screen), 'Usuń pobrane materiały').props.onPress(); clearError = true; alert[2][1].onPress(); await tick(); tree = render(Screen); assert.match(text(tree), /Nie udało się usunąć/); assert(!button(tree, 'Usuń pobrane materiały').props.disabled);
    clearError = false; button(tree, 'Usuń pobrane materiały').props.onPress(); alert[2][1].onPress(); await tick(); tree = render(Screen); assert.match(text(tree), /0,0 MB/);
    languageReadError = true; foreground('active'); await tick(); tree = render(Screen); assert(button(tree, 'Ponów odczyt języka')); languageReadError = false; language = 'en'; button(tree, 'Ponów odczyt języka').props.onPress(); await tick(); assert(button(render(Screen), 'English').props.accessibilityState.checked);
    saveDelay = new Promise(r => { release = r; }); button(render(Screen), 'Polski').props.onPress(); blur(); release(); await tick(); saveDelay = null;
    focus(); await tick(); tree = render(Screen); assert(button(tree, 'Polski').props.accessibilityState.checked); assert(!button(tree, 'Polski').props.disabled, 'offscreen save must not leave controls locked on return');
    blur();
  }
  console.log('Settings: both themes, language failure/retry, duplicate save guard, failed theme save, unavailable cache size, foreground refresh, download/clear confirmation exclusion, cancellation and clear retry passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
