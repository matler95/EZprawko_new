// Component lifecycle with native/auth stubs: no device or remote mutations.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let effect,pathname='/',target=null,active=null,calls=[],authChanged,preferencesChanged,appChanged,interval,release;
let blocked=false;
const db={};
const exportsObject={};
new Function('require','exports','setInterval','clearInterval',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/components/exam-preparation.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
  if(name==='react')return {useEffect:fn=>effect=fn};
  if(name==='expo-router')return {usePathname:()=>pathname};
  if(name==='expo-sqlite')return {useSQLiteContext:()=>db};
  if(name==='react-native')return {AppState:{currentState:'active',addEventListener:(_event,fn)=>{appChanged=fn;return{remove(){}};}}};
  if(name==='@/context/target-category-context')return {useTargetCategory:()=>({category:'B'})};
  if(name==='@/services/exam-preparation-target')return {examPreparationTarget:async()=>target};
  if(name==='@/database/repository')return {resumeActiveExam:async()=>active};
  if(name==='@/services/media-cache')return {protectMedia(){},trimMediaCache:async()=>{}};
  if(name==='@/services/prepared-study')return {cancelPreparedStudyMedia(){}};
  if(name==='@/services/supabase')return {supabase:{auth:{onAuthStateChange:fn=>{authChanged=fn;return{data:{subscription:{unsubscribe(){}}}};}}}};
  if(name==='@/services/prepared-exam')return {
    subscribePreparedExam:fn=>{preferencesChanged=fn;return()=>{};},
    ensurePreparedExam:async(_db,category,_progress,proceed)=>{
      calls.push({category,proceed});
      if(blocked){await new Promise(resolve=>release=resolve);throw Error('old pre-login attempt');}
    },
  };
  throw Error(name);
},exportsObject,fn=>{interval=fn;return 1;},()=>{});
const tick=()=>new Promise(setImmediate);
const mount=()=>{exportsObject.ExamPreparation();return effect();};
(async()=>{
  let cleanup=mount();await tick();assert.equal(calls.length,0,'no category means no speculative default-B exam');
  target={category:'A1',language:'en'};blocked=true;preferencesChanged();await tick();
  assert.equal(calls.length,1);assert.equal(calls[0].category,'A1','confirmed draft overrides the context default');
  authChanged('SIGNED_IN');await tick();assert.equal(calls.length,1,'auth event coalesces while the prior run settles');
  blocked=false;release();await tick();await tick();assert.equal(calls.length,2,'successful login retries immediately, without the 60-second interval');
  cleanup();assert.equal(calls[1].proceed(),false,'unmount cancels this background owner');
  pathname='/settings';cleanup=mount();await tick();const inSettings=calls.length;
  authChanged('SIGNED_IN');await tick();assert.equal(calls.length,inSettings+1,'login in settings prepares before returning home');cleanup();
  pathname='/study';cleanup=mount();await tick();const inStudy=calls.length;interval();await tick();
  assert.equal(calls.length,inStudy,'Study does not download an independent full exam');cleanup();
  pathname='/';active={questions:[{mediaFilename:'active.jpg'}]};cleanup=mount();await tick();
  assert.equal(calls.length,inStudy,'an active exam never prepares a full successor');cleanup();
  console.log('Exam preparation lifecycle: confirmed onboarding target, immediate coalesced auth retry, settings warmup, route cancellation and no Study/active successor passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
