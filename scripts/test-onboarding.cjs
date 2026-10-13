// Real in-memory SQLite and screen handlers with native/hook stubs, not device QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
const {DatabaseSync}=require('node:sqlite');const root=path.resolve(__dirname,'..'),cache=new Map();
let states=[],refs=[],si=0,ri=0,focus,theme='light',hidden=false,failRead=false,failWrite=false,completed=[],writes=0;
const native=new DatabaseSync(':memory:');native.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);');
const args=v=>v.length===1&&Array.isArray(v[0])?v[0]:v;
const db={getFirstAsync:async(sql,...v)=>{if(failRead)throw Error('read failed');return native.prepare(sql).get(...args(v))??null;},
  getAllAsync:async(sql,...v)=>native.prepare(sql).all(...args(v)),
  runAsync:async(sql,...v)=>{if(failWrite)throw Error('write failed');writes++;return native.prepare(sql).run(...args(v));},
  execAsync:async sql=>native.exec(sql),
  withExclusiveTransactionAsync:async fn=>{native.exec('BEGIN');try{await fn(db);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
  new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
    if(name==='react')return {...React,useCallback:f=>f,useContext:()=>({setIsTabBarHidden:v=>hidden=v}),useRef:v=>{const i=ri++;return refs[i]??(refs[i]={current:v});},useState:v=>{const i=si++;if(!(i in states))states[i]=v;return [states[i],x=>states[i]=typeof x==='function'?x(states[i]):x];}};
    if(name==='react/jsx-runtime')return require(name);
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: load('src/domain/ui-copy.ts').t, language: load('src/domain/ui-language.ts').uiLanguage() }) };
    if(name==='react-native')return {Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',View:'View',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:s=>s},Platform:{select:s=>s.default}};
    if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
    if(name==='expo-router')return {useFocusEffect:f=>focus=f};
    if(name==='expo-sqlite')return {useSQLiteContext:()=>db};
    if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors[theme]})};
    if(name==='@/context/tab-bar-context')return {TabBarContext:{}};
    if(name==='@/components/skeleton')return {LoadingError:'LoadingError',LoadingSkeleton:'LoadingSkeleton'};
    if(name==='@/components/ui/app-controls')return load('src/components/ui/app-controls.tsx');
    if(name==='@/global.css')return {};
    if(name.startsWith('@/assets/'))return require(path.join(root,name.slice(2)));
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);throw Error(name);
  },exports);return exports;}
function nodes(t){if(!t||typeof t!=='object')return [];if(typeof t.type==='function'&&/^App(Button|Card|Status)$/.test(t.type.name))return nodes(t.type(t.props));const c=t.props?.children;return [t,...(Array.isArray(c)?c.flat(Infinity):[c]).flatMap(nodes)];}
function text(t){if(typeof t==='string'||typeof t==='number')return String(t);if(!t||typeof t!=='object')return '';if(typeof t.type==='function'&&/^App(Button|Card|Status)$/.test(t.type.name))return text(t.type(t.props));const c=t.props?.children;return (Array.isArray(c)?c.flat(Infinity):[c]).map(text).join(' ').replace(/\s+/g,' ');}
function button(tree,label){const translated=load('src/domain/ui-copy.ts').t(label);const node=nodes(tree).find(n=>n.type==='Pressable'&&text(n).trim()===translated);assert(node,`Missing ${translated}: ${text(tree)}`);return node;}
const tick=()=>new Promise(setImmediate),setting=key=>native.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value;
(async()=>{
  const r=load('src/database/onboarding.ts'),categories=load('src/domain/driving-categories.ts').drivingCategories;
  assert.deepEqual(r.parseOnboardingDraft('broken'),r.emptyOnboarding);assert.equal(r.parseOnboardingDraft('{"step":3,"category":"B+E"}').step,0);
  await assert.rejects(()=>r.finishOnboarding(db,{...r.emptyOnboarding}));
  for(const category of categories)for(const language of ['pl','en','de','uk']){
    native.exec('DELETE FROM settings');const draft={step:3,category,language};
    await r.saveOnboardingDraft(db,draft);assert.deepEqual(await r.readOnboardingDraft(db),draft);
    assert.equal(await r.finishOnboarding(db,draft),category);assert.equal(setting('question-language'),language);assert.equal(setting('onboarding-complete'),'true');assert.equal(setting('onboarding-draft'),undefined);
    await r.finishOnboarding(db,{step:3,category:'B',language:'pl'});assert.equal(setting('target-category'),category);assert.equal(setting('question-language'),language,'existing completion must not overwrite preferences');
    await r.saveOnboardingDraft(db,r.emptyOnboarding);assert.equal(setting('onboarding-draft'),undefined);
  }
  native.exec('DELETE FROM settings');failWrite=true;await assert.rejects(()=>r.finishOnboarding(db,{step:3,category:'A',language:'en'}));failWrite=false;assert.equal(setting('onboarding-complete'),undefined);
  const broken={...db,withExclusiveTransactionAsync:async fn=>db.withExclusiveTransactionAsync(tx=>fn({...tx,runAsync:async(sql,...v)=>{
    if(v[0]==='onboarding-complete')throw Error('late write failure');return tx.runAsync(sql,...v);
  }}))};
  await assert.rejects(()=>r.finishOnboarding(broken,{step:3,category:'A',language:'en'}));assert.equal(setting('target-category'),undefined);assert.equal(setting('question-language'),undefined,'late failure rolls back preference writes');
  const Flow=load('src/components/onboarding-flow.tsx').OnboardingFlow;
  for(theme of ['light','dark']){
    native.exec('DELETE FROM settings');states=[];refs=[];completed=[];
    const render=()=>{si=ri=0;return Flow({onComplete:(...v)=>completed.push(v)});};
    render();let cleanup=focus();await tick();let tree=render();assert(hidden);assert(!button(tree,'Dalej').props.disabled,'language is available before category');
    button(tree,'English').props.onPress();tree=render();assert.equal(load('src/domain/ui-language.ts').uiLanguage(),'en');
    button(tree,'Dalej').props.onPress();await tick();tree=render();assert(button(tree,'Dalej').props.disabled,'category remains an explicit choice');
    button(tree,'A1').props.onPress();tree=render();const next=button(tree,'Dalej');const before=writes;
    next.props.onPress();next.props.onPress();await tick();tree=render();assert.equal(writes-before,1,'double tap saves once');assert.equal(JSON.parse(setting('onboarding-draft')).step,2);
    assert.match(text(tree),/Progress is saved only on this device/);
    cleanup();states=[];refs=[];render();cleanup=focus();await tick();tree=render();assert.equal(JSON.parse(setting('onboarding-draft')).step,2,'confirmed step survives reopening');
    button(tree,'Dalej').props.onPress();await tick();tree=render();assert.match(text(tree),/English/);assert.match(text(tree),/Reminders are optional/);
    failWrite=true;button(tree,'Zacznij pierwsze 5 pytań').props.onPress();await tick();tree=render();assert.match(text(tree),/Setup could not be completed/);assert.equal(completed.length,0);assert.equal(setting('onboarding-complete'),undefined);failWrite=false;
    button(tree,'Zacznij pierwsze 5 pytań').props.onPress();await tick();assert.deepEqual(completed,[['A1','study']]);assert.equal(setting('target-category'),'A1');assert.equal(setting('question-language'),'en');cleanup();assert(!hidden);
  }
  states=[];refs=[];si=ri=0;failRead=true;Flow({onComplete:()=>{}});const cleanup=focus();await tick();si=ri=0;let tree=Flow({onComplete:()=>{}});assert(nodes(tree).some(n=>n.type==='LoadingError'));failRead=false;cleanup();
  // Fence an old queued transaction after a full reset.
  native.exec('DELETE FROM settings');let release;const gate=new Promise(resolve=>release=resolve);
  const queued={...db,withExclusiveTransactionAsync:async fn=>{await gate;return db.withExclusiveTransactionAsync(fn);}};
  const pending=r.finishOnboarding(queued,{step:3,category:'B',language:'pl'});
  await load('src/domain/data-maintenance.ts').withDataMaintenance(async()=>native.exec('DELETE FROM settings'));
  release();await assert.rejects(()=>pending,/interrupted/);assert.equal(setting('onboarding-complete'),undefined);
  const data=load('src/database/user-data.ts');
  for(const table of data.userProgressTables)native.exec(`CREATE TABLE ${table}(id INTEGER);`);
  await r.saveOnboardingDraft(db,{step:2,category:'PT',language:'uk'});
  const exported=await data.exportUserData(db);assert(exported.data.settings.some(v=>v.key==='onboarding-draft'));
  await data.resetUserProgress(db);assert(setting('onboarding-draft'),'ordinary progress reset preserves setup');
  await data.resetUserProgress(db,true);assert.equal(setting('onboarding-draft'),undefined,'full local reset clears setup');
  console.log('Onboarding: 12 categories × 4 languages, explicit initial choice, drafts/resume, double-tap locking, atomic failures, idempotent completion, both themes, read errors and reset fence passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
