const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const React=require('react');const root=path.resolve(__dirname,'..'),cache=new Map();
let available=true,shareFail=false,session=null,authError=null,cacheFail=false,dialog=null,operation=null,written=null;
const removed=[],events=[];
const fileSystem={cacheDirectory:'file:///app-cache/',EncodingType:{UTF8:'utf8'},
  makeDirectoryAsync:async uri=>events.push(['mkdir',uri]),writeAsStringAsync:async(uri,content)=>{written=JSON.parse(content);events.push(['write',uri]);},
  deleteAsync:async(uri)=>removed.push(uri)};
function load(file){
  if(cache.has(file))return cache.get(file);
  const exports={};cache.set(file,exports);
  const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','exports',code)((name)=>{
    if(name==='react')return {...React,useState:(v)=>[v,()=>{}],useRef:(v)=>({current:v})};
    if(name==='react/jsx-runtime')return require(name);
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: load('src/domain/ui-copy.ts').t, language: load('src/domain/ui-language.ts').uiLanguage() }) };
    if(name==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:s=>s},Platform:{select:s=>s.default},Alert:{alert:(...v)=>{dialog=v;}}};
    if(name==='expo-sqlite')return {useSQLiteContext:()=>db};
    if(name==='expo-file-system/legacy')return fileSystem;
    if(name==='expo-sharing')return {isAvailableAsync:async()=>available,shareAsync:async(uri)=>{events.push(['share',uri]);if(shareFail)throw Error('share failed');}};
    if(name==='@/services/media-cache')return {clearMediaCache:async()=>{events.push(['cache']);if(cacheFail)throw Error('cache failed');}};
    if(name==='@/services/reminders')return {disableDailyReminder:async()=>events.push(['reminders'])};
    if(name==='@/services/supabase')return {supabase:{auth:{signOut:async options=>{assert.equal(options.scope,'local');events.push(['signout']);return {error:authError};},getSession:async()=>({data:{session},error:null})}}};
    if(name==='@/context/data-maintenance-context')return {useDataMaintenance:()=>fn=>{operation=fn;}};
    if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors.light})};
    if(name==='@/global.css')return {};
    if(name==='@/components/ui/app-controls')return load('src/components/ui/app-controls.tsx');
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);
    throw Error(`Unexpected dependency ${name}`);
  },exports);return exports;
}
const native=new DatabaseSync(':memory:');let failDelete=false;
const args=v=>v.length===1&&Array.isArray(v[0])?v[0]:v;
const db={execAsync:async sql=>{if(failDelete&&sql==='DELETE FROM flags')throw Error('synthetic SQL failure');native.exec(sql);},
  runAsync:async(sql,...v)=>native.prepare(sql).run(...args(v)),getAllAsync:async(sql,...v)=>native.prepare(sql).all(...args(v)),
  withExclusiveTransactionAsync:async fn=>{native.exec('BEGIN');try{await fn(db);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};
const data=load('src/database/user-data.ts');
for(const table of data.userProgressTables)native.exec(`CREATE TABLE ${table}(id INTEGER PRIMARY KEY,fixture TEXT);`);
native.exec(`CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE questions(id INTEGER); INSERT INTO questions VALUES (123);
  CREATE TABLE question_translations(question_id INTEGER,language TEXT); INSERT INTO question_translations VALUES (123,'en');
  CREATE TABLE question_signs(question_id INTEGER);INSERT INTO question_signs VALUES (123);`);
function seed(){for(const table of data.userProgressTables)native.exec(`INSERT OR REPLACE INTO ${table} VALUES (1,'learning fixture')`);
  for(const key of ['target-category','question-language','theme-preference','onboarding-complete','daily-reminder-id','exam-language:fixture','translations-version','question-signs-version','explanations-version','unknown-secret'])native.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run(key,key==='unknown-secret'?'never-export-this':key);}
function count(table){return native.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;}
function find(tree,predicate){if(!tree||typeof tree!=='object')return [];if(typeof tree.type==='function'&&/^App(Button|Card|Status)$/.test(tree.type.name))return find(tree.type(tree.props),predicate);const c=tree.props?.children;return [...(predicate(tree)?[tree]:[]),...(Array.isArray(c)?c.flat(Infinity):[c]).flatMap(v=>find(v,predicate))];}
(async()=>{
  seed();const exported=await data.exportUserData(db);
  assert.equal(exported.schemaVersion,1);assert.equal(exported.data.practice_attempts.length,1);
  assert(!JSON.stringify(exported).includes('never-export-this'));assert(!('questions' in exported.data));
  assert.equal(exported.data.settings.length,6);
  failDelete=true;await assert.rejects(()=>data.resetUserProgress(db),/synthetic/);failDelete=false;
  for(const table of data.userProgressTables)assert.equal(count(table),1,'failed reset rolls back all tables');
  await data.resetUserProgress(db);for(const table of data.userProgressTables)assert.equal(count(table),0);
  assert.equal(count('settings'),9);assert.equal(count('questions'),1);assert.equal(count('question_translations'),1);
  seed();await data.resetUserProgress(db,true);assert.equal(count('settings'),3);assert.equal(count('question_signs'),1);
  const service=load('src/services/user-data.ts');
  await service.shareUserData(db);assert.equal(written.format,'ezprawko-user-data');assert(removed.at(-1).startsWith('file:///app-cache/user-data-exports/ezprawko-'));
  shareFail=true;await assert.rejects(()=>service.shareUserData(db),/share failed/);shareFail=false;
  assert(removed.at(-1).endsWith('.json'),'failed sharing must clean temporary JSON');
  available=false;const before=events.length;await assert.rejects(()=>service.shareUserData(db),/dostępne/);assert.equal(events.length,before);available=true;
  seed();session={user:'fixture'};await assert.rejects(()=>service.deleteLocalUserData(db),/sesji/);assert.equal(count('practice_attempts'),1);session=null;
  cacheFail=true;await assert.rejects(()=>service.deleteLocalUserData(db),/cache failed/);assert.equal(count('practice_attempts'),1);cacheFail=false;
  authError=Error('offline revocation');assert.match(await service.deleteLocalUserData(db),/Nie potwierdzono/);assert.equal(count('practice_attempts'),0);assert.equal(count('settings'),3);
  const guard=load('src/domain/data-maintenance.ts');const revision=guard.userDataRevision();
  await guard.withDataMaintenance(async()=>{assert(!guard.userDataWritable());await assert.rejects(()=>guard.withDataMaintenance(async()=>{}),/already/);});
  assert(!guard.userDataWritable(revision));assert(guard.userDataWritable());
  await assert.rejects(()=>guard.withDataMaintenance(async()=>{throw Error('test');}),/test/);assert(guard.userDataWritable(),'failure releases maintenance guard');
  seed();const card=load('src/components/user-data-card.tsx').UserDataCard();
  const buttons=find(card,n=>n.type==='Pressable');assert.equal(buttons.length,3);assert(buttons.every(n=>n.props.style({pressed:false})[0].minHeight>=48));
  buttons[1].props.onPress();assert.equal(operation,null,'opening confirmation must not reset');assert.equal(dialog[2][0].style,'cancel');
  dialog[2][1].onPress();await operation();assert.equal(count('practice_attempts'),0);
  console.log('User data: versioned secret-free snapshot, transactional reset/rollback, settings/catalog preservation, scoped JSON cleanup/sheet failure, local-session/cache failure, remote-revocation warning, generation guard and confirmation-only 48px UI passed.');
  native.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
