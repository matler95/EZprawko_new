// Native primitives are stubbed. This is not legal approval or physical-device QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '..');
const cache = new Map();
let theme = 'light', hasBack = true, navigation = null, failed = false, opened = null, rejectLink = false;
const constants = { executionEnvironment: 'standalone', expoConfig: { version: '1.2.0' } };
const application = { nativeApplicationVersion: '1.1.0', nativeBuildVersion: '42' };
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const result = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require','exports',code)((name) => {
    if (name === 'react') return { ...React, useState: () => [failed, (next) => { failed = next; }] };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return { View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',StyleSheet:{create:(s)=>s},Platform:{select:(s)=>s.default} };
    if (name === 'react-native-safe-area-context') return { SafeAreaView:'SafeAreaView' };
    if (name === 'expo-router') return { Link:'Link',router:{canGoBack:()=>hasBack,back:()=>{navigation='back';},replace:(route)=>{navigation=route;}} };
    if (name === 'expo-linking') return { openURL: async (url) => { opened=url; if(rejectLink)throw Error('test refusal'); return true; } };
    if (name === 'expo-constants') return constants;
    if (name === 'expo-application') return application;
    if (name === '@/global.css') return {};
    if (name === '@/context/app-theme-context') return { useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors[theme]}) };
    if (name.startsWith('@/')) {
      const base=`src/${name.slice(2)}`;
      return load(fs.existsSync(path.join(root,`${base}.tsx`))?`${base}.tsx`:`${base}.ts`);
    }
    throw Error(`Unexpected dependency (legal screens must not fetch account/progress): ${name}`);
  },result);
  cache.set(file,result);return result;
}
function nodes(tree,predicate) {
  if(!tree || typeof tree!=='object') return [];
  const children=tree.props?.children;
  return [...(predicate(tree)?[tree]:[]),...(Array.isArray(children)?children.flat(Infinity):[children]).flatMap((child)=>nodes(child,predicate))];
}
function text(tree) {
  if(typeof tree==='string' || typeof tree==='number')return String(tree);
  if(!tree || typeof tree!=='object')return '';
  const children=tree.props?.children;
  return (Array.isArray(children)?children.flat(Infinity):[children]).map(text).join(' ');
}
(async()=>{
  const {appMetadata}=load('src/domain/app-metadata.ts');
  assert.deepEqual(appMetadata({isExpoGo:false,configVersion:'2.0',nativeVersion:'1.0',nativeBuild:'7'}),{version:'1.0',build:'7'},'native metadata must not be replaced by OTA config');
  assert.match(appMetadata({isExpoGo:true,configVersion:'1.0',nativeVersion:'57.0',nativeBuild:'999'}).build,/brak buildu EZprawko/);
  assert.equal(appMetadata({isExpoGo:false,nativeVersion:null,nativeBuild:null}).version,'Nieustalona');
  const {privacy,terms,legalNotice,ministrySource}=load('src/content/legal.ts');
  assert.match(legalNotice,/robocze/);
  const {LegalDocumentScreen,LegalSourceLink}=load('src/components/legal-document-screen.tsx');
  const {AppAboutCard}=load('src/components/app-about-card.tsx');
  for(theme of ['light','dark']) {
    for(const document of [privacy,terms]) {
      const tree=LegalDocumentScreen({document});
      const content=text(tree);
      for(const section of document.sections)for(const paragraph of section.paragraphs)assert(content.includes(paragraph));
      assert(content.includes(legalNotice));
      assert(nodes(tree,(node)=>node.type==='ScrollView').length);
      const back=nodes(tree,(node)=>node.type==='Pressable')[0];
      assert(back.props.style.minHeight>=48);
      hasBack=true;back.props.onPress();assert.equal(navigation,'back');
      hasBack=false;back.props.onPress();assert.equal(navigation,'/settings');
    }
    const card=AppAboutCard();
    assert.match(text(card),/Wersja:\s+1\.1\.0.*Build:\s+42/s);
    assert.deepEqual(nodes(card,(node)=>node.type==='Link').map((node)=>node.props.href),['/legal/privacy','/legal/terms']);
    assert.match(text(card),/uprawnienia.*nie zostały jeszcze udokumentowane/);
  }
  constants.executionEnvironment='storeClient';
  assert.match(text(AppAboutCard()),/Wersja:\s+1\.2\.0.*Expo Go — brak buildu EZprawko/s);
  const p=load('src/app/legal/privacy.tsx').default();
  assert.equal(p.props.document,privacy);
  assert.equal(load('src/app/legal/terms.tsx').default().props.document,terms);
  let link=LegalSourceLink({title:'Źródło',url:ministrySource});
  nodes(link,(node)=>node.type==='Pressable')[0].props.onPress();
  await new Promise(setImmediate); assert.equal(opened,ministrySource); assert.equal(failed,false);
  rejectLink=true;nodes(link,(node)=>node.type==='Pressable')[0].props.onPress();
  await new Promise(setImmediate);assert.equal(failed,true);
  link=LegalSourceLink({title:'Źródło',url:ministrySource});
  assert(nodes(link,(node)=>node.props?.accessibilityRole==='alert').length);
  console.log('Legal UI: both themes, full offline documents, draft/rights notices, two routes, 48px controls, back fallback, native/Expo Go metadata and external-link failure passed.');
})().catch((error)=>{console.error(error);process.exitCode=1;});
