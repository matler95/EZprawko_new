// File-system/network are in-memory stubs: never downloads real government media.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
const root=path.resolve(__dirname,'..'),cache=new Map(),files=new Map();
let enabled=true,failName=null,emptyName=null,grantCalls=0,downloadCalls=0,delay=null,readFailure=false;
let states=[],refs=[],si=0,ri=0,focus,category='B',theme='light',uiFailure=false,uiCancel=false;
const dir='file:///cache/question-media/';
const fileSystem={cacheDirectory:'file:///cache/',makeDirectoryAsync:async()=>{},
  getInfoAsync:async uri=>uri===dir&&files.size?{exists:true,isDirectory:true}:files.has(uri)?{exists:true,isDirectory:false,size:files.get(uri),modificationTime:1}:{exists:false},
  downloadAsync:async(remote,uri)=>{downloadCalls++;if(delay)await delay;if(remote.includes(failName??'NEVER'))throw Error('network failed');files.set(uri,remote.includes(emptyName??'NEVER')?0:123);return {status:200};},
  moveAsync:async({from,to})=>{files.set(to,files.get(from));files.delete(from);},
  deleteAsync:async uri=>{if(uri===dir)files.clear();else files.delete(uri);},
  readDirectoryAsync:async()=>{if(readFailure)throw Error('FS unavailable');return [...files.keys()].filter(k=>k.startsWith(dir)).map(k=>k.slice(dir.length));}};
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
  if(name==='expo-file-system/legacy')return fileSystem;
  if(name==='@/config/media')return {mediaConfig:{get enabled(){return enabled;}},deliveredMediaFilename:f=>f.replace(/\.wmv$/i,'.mp4'),deliveredMediaKey:f=>f.replace(/\.wmv$/i,'.mp4'),mediaUrl:f=>`https://media.invalid/${f}`};
  if(name==='@/services/media-auth')return {mediaGrant:async()=>{grantCalls++;return 'fixture';}};
  if(name==='react')return {...React,useCallback:f=>f,useRef:v=>{const i=ri++;return refs[i]??(refs[i]={current:v});},useState:v=>{const i=si++;if(!(i in states))states[i]=v;return [states[i],x=>states[i]=typeof x==='function'?x(states[i]):x];}};
  if(name==='react/jsx-runtime')return require(name);
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: load('src/domain/ui-copy.ts').t, language: load('src/domain/ui-language.ts').uiLanguage() }) };
  if(name==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',Modal:'Modal',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:s=>s},Platform:{select:s=>s.default}};
  if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
  if(name==='expo-router')return {useFocusEffect:f=>focus=f};
  if(name==='expo-sqlite')return {useSQLiteContext:()=>({})};
  if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors[theme]})};
  if(name==='@/context/target-category-context')return {useTargetCategory:()=>({category})};
  if(name==='@/database/repository')return {mediaFilenamesForCategory:async()=>['one.jpg','two.wmv']};
  if(name==='@/services/media-preload'&&file.endsWith('.tsx'))return {preloadMedia:async(_files,progress,proceed)=>{
    progress({completed:0,total:2});await new Promise(setImmediate);progress({completed:1,total:2});
    if(uiFailure)throw Error('failed');if(uiCancel||!proceed())return {completed:1,total:2};return {completed:2,total:2};
  }};
  if(name==='@/global.css')return {};
  if(name==='@/components/ui/app-controls')return load('src/components/ui/app-controls.tsx');
  if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);throw Error(name);
},exports);return exports;}
function nodes(t){if(!t||typeof t!=='object')return [];if(typeof t.type==='function'&&/^App(Button|Card|Status|Heading)$/.test(t.type.name))return nodes(t.type(t.props));const c=t.props?.children;return [t,...(Array.isArray(c)?c.flat(Infinity):[c]).flatMap(nodes)];}
function text(t){if(typeof t==='string'||typeof t==='number')return String(t);if(!t||typeof t!=='object')return '';if(typeof t.type==='function'&&/^App(Button|Card|Status|Heading)$/.test(t.type.name))return text(t.type(t.props));const c=t.props?.children;return (Array.isArray(c)?c.flat(Infinity):[c]).map(text).join(' ').replace(/\s+/g,' ');}
function button(t,label){return nodes(t).find(n=>n.type==='Pressable'&&text(n).includes(label));}
(async()=>{
  const media=load('src/services/media-cache.ts'),preload=load('src/services/media-preload.ts');
  const {createStudyPreparation}=load('src/services/study-preparation.ts');
  files.clear();failName='two.mp4';
  const studyPool=[{id:1,media_filename:'one.jpg'},{id:2,media_filename:'two.wmv'}];
  const study=createStudyPreparation(studyPool);studyPool[0].media_filename='changed.jpg';
  await assert.rejects(()=>study.run(()=>{}));assert(files.has(dir+'one.jpg'));
  failName=null;assert.equal(await study.run(()=>{}),true);assert(!files.has(dir+'changed.jpg'),'retry uses the frozen study pool');
  files.clear();let studyRelease;delay=new Promise(resolve=>studyRelease=resolve);
  const cancelledStudy=createStudyPreparation(studyPool);let studyEvents=0;
  const studyRun=cancelledStudy.run(()=>studyEvents++);await new Promise(setImmediate);
  assert.equal(await cancelledStudy.run(()=>{}),false,'double start cannot launch another preparation');
  cancelledStudy.cancel();const countBeforeCancel=studyEvents;studyRelease();assert.equal(await studyRun,false);
  assert.equal(studyEvents,countBeforeCancel,'cancel suppresses delayed progress');delay=null;
  files.clear();const obsoleteStudy=createStudyPreparation(studyPool);
  await load('src/domain/data-maintenance.ts').withDataMaintenance(async()=>{});
  assert.equal(await obsoleteStudy.run(()=>{}),false,'reset invalidates a selected study batch');
  files.clear();downloadCalls=0;grantCalls=0;
  const pool=[{mediaFilename:'one.jpg'},{mediaFilename:'one.jpg'},{mediaFilename:'two.wmv'},{mediaFilename:null}];
  const events=[];await preload.prepareExamMedia(pool,p=>events.push(p));assert.equal(downloadCalls,2);assert.equal(events[0].completed,0);assert.equal(events.at(-1).completed,2);
  assert.equal(await media.cacheSizeBytes(),246);readFailure=true;await assert.rejects(()=>media.cacheSizeBytes(),/FS unavailable/);readFailure=false;
  assert(files.has(dir+'two.mp4'));const oldCalls=grantCalls;await preload.prepareExamMedia(pool);assert.equal(grantCalls,oldCalls,'cached exam works without renewed network grant');
  await preload.prepareExamMedia([{mediaFilename:null}]);
  enabled=false;await assert.rejects(()=>preload.prepareExamMedia(pool));enabled=true;
  files.clear();failName='two.mp4';await assert.rejects(()=>preload.prepareExamMedia(pool));assert(files.has(dir+'one.jpg'),'partial success remains cached');
  failName=null;await preload.prepareExamMedia(pool);assert(files.has(dir+'two.mp4'),'retry uses partial cache');
  files.clear();emptyName='one.jpg';await assert.rejects(()=>preload.prepareExamMedia(pool),/pusty/);assert(!files.has(dir+'one.jpg'));assert(![...files.keys()].some(k=>k.endsWith('.download')));emptyName=null;
  files.set(dir+'one.jpg',0);await preload.prepareExamMedia([{mediaFilename:'one.jpg'}]);assert.equal(files.get(dir+'one.jpg'),123,'zero-sized cache entry repaired');
  files.clear();let proceed=true;
  await assert.rejects(()=>preload.prepareExamMedia(pool,p=>{if(p.completed===1)proceed=false;},()=>proceed),/przerwane/);assert(!files.has(dir+'two.mp4'));
  files.clear();await assert.rejects(()=>preload.prepareExamMedia(pool,p=>{if(p.completed===2)files.delete(dir+'one.jpg');}),/cache/,'final verification catches eviction');
  files.clear();let release;delay=new Promise(r=>release=r);const first=media.cachedMediaUri('shared.jpg'),second=media.cachedMediaUri('shared.jpg');await new Promise(setImmediate);const before=downloadCalls;release();await Promise.all([first,second]);delay=null;assert.equal(downloadCalls,before,'same-file requests share one download');
  files.clear();delay=new Promise(r=>release=r);const clearingConflict=media.cachedMediaUri('pending.jpg');await new Promise(setImmediate);
  await assert.rejects(()=>media.clearMediaCache(),/pobieranie/);release();await clearingConflict;delay=null;await media.clearMediaCache();assert.equal(await media.cacheSizeBytes(),0);
  const {withDataMaintenance}=load('src/domain/data-maintenance.ts');
  files.clear();delay=new Promise(r=>release=r);const resetDownload=media.cachedMediaUri('reset-pending.jpg');const downloadOutcome=resetDownload.catch(()=>undefined);await new Promise(setImmediate);
  const resetClear=withDataMaintenance(()=>media.clearMediaCache());release();await Promise.all([downloadOutcome,resetClear]);delay=null;assert.equal(await media.cacheSizeBytes(),0,'full local removal waits for obsolete download cleanup');
  files.clear();delay=new Promise(r=>release=r);const obsolete=preload.prepareExamMedia(pool);await new Promise(setImmediate);await withDataMaintenance(async()=>{files.clear();});release();await assert.rejects(()=>obsolete);delay=null;assert(!files.has(dir+'one.jpg'),'reset cannot be followed by old download commit');
  const Card=load('src/components/media-download-card.tsx').MediaDownloadCard;
  for(theme of ['light','dark']){
    states=[];refs=[];uiFailure=true;uiCancel=false;const element=Card();const Inner=element.type;
    const render=()=>{si=ri=0;return Inner(element.props);};render();const cleanup=focus();let tree=render();
    const start=button(tree,'Pobierz');const promise=start.props.onPress();start.props.onPress();tree=render();assert(button(tree,'Przerwij'));await promise;tree=render();
    assert(button(tree,'Spróbuj ponownie'));assert.equal(button(tree,'Spróbuj ponownie').props.disabled,false,'failure must unlock retry');
    uiFailure=false;await button(tree,'Spróbuj ponownie').props.onPress();tree=render();assert.match(text(tree),/2\/2/);assert(!button(tree,'Przerwij'));
    uiCancel=true;await button(tree,'Pobierz').props.onPress();tree=render();assert.match(text(tree),/przerwane/);assert.equal(button(tree,'Spróbuj ponownie').props.disabled,false);
    cleanup();
    const Briefing=load('src/components/exam-briefing.tsx').ExamBriefing;let cancelled=0;
    const props={visible:true,category:'B',hasActiveExam:true,starting:true,progress:{completed:1,total:2},error:null,onStart:()=>{},onCancel:()=>cancelled++,onSettings:()=>{}};
    tree=Briefing(props);assert.match(text(tree),/1\/2/);assert.match(text(tree),/Zegar jeszcze nie działa/);assert(!button(tree,'Przerwij przygotowanie').props.disabled);
    nodes(tree).find(n=>n.type==='Modal').props.onRequestClose();assert.equal(cancelled,1);
    tree=Briefing({...props,committing:true});assert(button(tree,'Uruchamianie próby').props.disabled);nodes(tree).find(n=>n.type==='Modal').props.onRequestClose();assert.equal(cancelled,1,'commit has a distinct non-cancellable boundary');
    tree=Briefing({...props,starting:false,error:'Logowanie wymagane'});assert(button(tree,'Przejdź do konta'));assert.equal(button(tree,'Rozpocznij egzamin próbny').props.disabled,false);
  }
  console.log('Media preparation: exact unique exam pool, MP4 mapping, warm offline cache, missing/empty media, partial retry, cancellation, eviction verification, shared downloads/reset fence and download-card retry in both themes passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
