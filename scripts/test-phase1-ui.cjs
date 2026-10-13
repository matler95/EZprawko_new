// Component contract tests with native primitives stubbed; device QA is separate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '..');
const primitive = (name) => name;
const native = {
  Pressable: primitive('Pressable'), Text: primitive('Text'), View: primitive('View'), ScrollView: primitive('ScrollView'), Modal: primitive('Modal'), ActivityIndicator: primitive('ActivityIndicator'),
  StyleSheet: { create: (s) => s }, Platform: { select: (values) => values.default }, useColorScheme: () => 'light',
};
const loaded = new Map();
let navigated = null;
let disclosureExpanded = false, testTheme = 'light', testLanguage = 'pl';
function load(relative) {
  if (loaded.has(relative)) return loaded.get(relative);
  const result = {};
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root,relative),'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require','exports',compiled)((name) => {
    if (name === 'react') return { ...React, useState: initial => [disclosureExpanded, value => { disclosureExpanded = typeof value === 'function' ? value(disclosureExpanded) : value; }] };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return native;
    if (name === 'react-native-safe-area-context') return { SafeAreaView: primitive('SafeAreaView') };
    if (name === 'expo-router') return { Link: primitive('Link'), router: { replace: (value) => { navigated = value; } } };
    if (name === 'expo-splash-screen') return { hideAsync: async () => {} };
    if (name === '@/global.css') return {};
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: (key, values) => load('src/domain/ui-copy.ts').t(key, values, testLanguage), language: testLanguage }) };
    if (name === '@/context/app-theme-context') return { useAppTheme: () => ({ colors: load('src/constants/theme.ts').Colors[testTheme] }) };
    if (name === '@/components/ui/app-controls') return load('src/components/ui/app-controls.tsx');
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    throw new Error(`Unexpected dependency ${name}`);
  },result);
  loaded.set(relative,result);
  return result;
}
const nodes = (element) => {
  if (!React.isValidElement(element)) return [];
  if (typeof element.type === 'function' && /^(App(Button|Card|Status)|ReviewedExplanation)$/.test(element.type.name)) return nodes(element.type(element.props));
  return [element,...React.Children.toArray(element.props.children).flatMap(nodes)];
};
const text = (element) => {
  if (typeof element === 'string' || typeof element === 'number') return String(element);
  if (!React.isValidElement(element)) return '';
  if (typeof element.type === 'function' && /^(App(Button|Card|Status)|ReviewedExplanation)$/.test(element.type.name)) return text(element.type(element.props));
  return React.Children.toArray(element.props.children).map(text).join(' ');
};
const { BasicAnswerButtons, basicAnswerText } = load('src/components/basic-answer-buttons.tsx');
for (const [yes,no] of [['Tak','Nie'],['Yes','No'],['Ja','Nein'],['Так','Ні']]) {
  const answers = [{ label: 'N', answer: no },{ label: 'T', answer: yes }];
  let chosen = null;
  const tree = BasicAnswerButtons({ answers, onAnswer: (key) => { chosen = key; } });
  const buttons = nodes(tree).filter((n) => n.type === 'Pressable');
  assert.equal(buttons.length,2);
  assert.equal(text(buttons[0]),yes.toLocaleUpperCase());
  assert.equal(text(buttons[1]),no.toLocaleUpperCase());
  for (const b of buttons) assert(b.props.style[0].minHeight >= 70);
  buttons[0].props.onPress(); assert.equal(chosen,'T');
  buttons[1].props.onPress(); assert.equal(chosen,'N');
  const blocked = nodes(BasicAnswerButtons({ answers, locked: true, disabled: true, onAnswer: () => { throw Error('locked answer'); } })).filter((n) => n.type === 'Pressable');
  assert(blocked.every((b) => b.props.disabled && b.props.accessibilityState.disabled));
  blocked.forEach((b) => b.props.onPress());
  const review = BasicAnswerButtons({ answers, selectedAnswer: 'T', correctAnswer: 'N' });
  assert(text(review).includes('Twój wybór'));
  assert(text(review).includes('Klucz MI'));
  assert(nodes(review).filter((n) => n.type === 'Pressable').every((n) => n.props.disabled));
  assert.equal(basicAnswerText(answers,'N'),no.toLocaleUpperCase());
}
const { ExamBriefing } = load('src/components/exam-briefing.tsx');
const { AppButton, AppStatus } = load('src/components/ui/app-controls.tsx');
const busyButton = AppButton({ label: 'Preparing', onPress() {}, busy: true });
assert(busyButton.props.disabled && busyButton.props.accessibilityState.busy);
assert.equal(busyButton.props.style({ pressed: false })[0].minHeight,56);
assert.equal(text(busyButton).trim(),'Preparing');
assert.equal(AppButton({ label:'Back',variant:'link',onPress(){} }).props.style({pressed:false})[0].minHeight,48);
assert.equal(AppStatus({message:'Failure',tone:'error'}).props.accessibilityRole,'alert');
let starts=0, cancels=0;
const props = { visible: true, category: 'B', hasActiveExam: true, starting: false, error: null, onStart: () => starts++, onCancel: () => cancels++ };
const briefing = ExamBriefing(props);
for (const rule of ['32','25','68','74','Nie możesz wrócić','zastąpi']) assert(text(briefing).includes(rule));
assert.equal(starts,0, 'rendering a briefing must not start a session');
briefing.props.onRequestClose(); assert.equal(cancels,1);
const starting = ExamBriefing({ ...props, starting: true });
starting.props.onRequestClose(); assert.equal(cancels,2,'preparation remains cancellable before commit');
assert(nodes(starting).filter((n) => n.type === 'Pressable').some((n) => !n.props.disabled));
const committing = ExamBriefing({ ...props, starting: true, committing: true });
committing.props.onRequestClose(); assert.equal(cancels,2,'commit cannot be cancelled halfway through');
const { ErrorBoundary, ScreenErrorBoundary } = load('src/components/error-boundary.tsx');
assert.deepEqual(ErrorBoundary.getDerivedStateFromError(new Error('sensitive details')), { failed: true });
const boundary = new ErrorBoundary({ children: (home) => ({ home }) });
boundary.setState = (delta) => { boundary.state = { ...boundary.state,...delta }; };
boundary.state = { failed: true, recoverHome: false };
boundary.render().props.onHome();
assert.equal(boundary.state.failed,false);
assert.deepEqual(boundary.render(),{ home: true });
let retries=0;
const fallback = ScreenErrorBoundary({ error: new Error('sensitive details'), retry: async () => { retries++; } });
fallback.props.onHome(); assert.equal(navigated,'/');
fallback.props.onRetry(); assert.equal(retries,1);
assert(!text(fallback.type(fallback.props)).includes('sensitive details'));
console.log('Phase 1 UI: T/N keys, four language labels, 80px targets, locked interaction, review marks, briefing/cancel and error recovery contracts passed.');
const { ExplanationCard } = load('src/components/explanation-card.tsx');
assert(text(ExplanationCard({ explanation: null })).includes('nie ma jeszcze zweryfikowanego'));
assert(text(ExplanationCard({ explanation: null, loading: true })).includes('Wczytujemy'));
assert(text(ExplanationCard({ explanation: null, failed: true })).includes('Nie udało'));
const fixture = { explanationText: 'SYNTHETIC UI TEST', legalBasis: 'SYNTHETIC REFERENCE', sourceUrl: 'https://eli.gov.pl/', reviewedAt: 1, reviewedBy: 'fixture' };
for (const theme of ['light', 'dark']) for (const language of ['pl', 'en', 'de', 'uk']) {
  testTheme = theme; testLanguage = language; disclosureExpanded = false;
  const teaching = ExplanationCard({ explanation: fixture });
  assert(text(teaching).includes(fixture.explanationText), 'core teaching never requires disclosure');
  assert(!text(teaching).includes(fixture.legalBasis));
  assert(!nodes(teaching).some(n => n.type === 'Link'), 'collapsed source is absent from accessibility tree');
  const localized = key => load('src/domain/ui-copy.ts').t(key, [], language);
  assert(text(teaching).includes(localized('Wyjaśnienie w języku polskim')));
  let toggle = nodes(teaching).find(n => n.type === 'Pressable');
  assert.equal(toggle.props.accessibilityRole, 'button');
  assert.equal(toggle.props.accessibilityState.expanded, false);
  assert.equal(toggle.props.accessibilityLabel, localized('Pokaż podstawę prawną i źródło'));
  assert.equal(toggle.props.style({ pressed: false })[0].minHeight, 48);
  toggle.props.onPress();
  assert(text(teaching).includes(fixture.legalBasis));
  const link = nodes(teaching).find(n => n.type === 'Link');
  assert.equal(link.props.href, 'https://eli.gov.pl/');
  assert(link.props.asChild);
  assert.equal(link.props.children.props.accessibilityRole, 'link');
  assert.equal(link.props.children.props.style.minHeight, 48);
  toggle = nodes(teaching).find(n => n.type === 'Pressable');
  assert.equal(toggle.props.accessibilityState.expanded, true);
  assert.equal(toggle.props.accessibilityLabel, localized('Ukryj podstawę prawną i źródło'));
  toggle.props.onPress();
  assert(!text(teaching).includes(fixture.legalBasis));
  disclosureExpanded = true;
  const legacy = ExplanationCard({ explanation: { ...fixture, legalBasis: null, sourceUrl: null } });
  assert(text(legacy).includes(localized('nieuzupełniona w starszym rekordzie')));
  assert(!nodes(legacy).some(n => n.type === 'Link'));
  for (const props of [{ explanation: fixture, loading: true }, { explanation: fixture, failed: true }, { explanation: null }]) {
    assert(!text(ExplanationCard(props)).includes(fixture.explanationText));
    assert(!nodes(ExplanationCard(props)).some(n => n.type === 'Link'));
  }
}
console.log('Explanation card: missing/loading/error, disclosure toggle, visible teaching/Polish notice, absent collapsed source, legacy metadata, 48px roles/states and both themes/four languages passed.');
