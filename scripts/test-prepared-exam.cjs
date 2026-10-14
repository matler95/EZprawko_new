// No media/network writes: checks persisted draft reuse, coalescing and invalidation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),modules=new Map(),settings=new Map(),pins=new Map();
let category='B',language='pl',draws=0,downloads=0,delay=null,fail=false;
const pool=cat=>['PODSTAWOWY','SPECJALISTYCZNY'].flatMap((scope,section)=>[3,2,1].flatMap((points,i)=>Array.from({length:(section?[6,4,2]:[10,6,4])[i]},()=>({id:++downloads,scope,points,categories:[cat],readingTimeSeconds:section?0:20,answeringTimeSeconds:section?50:15,mediaFilename:null}))));
function load(file){if(modules.has(file))return modules.get(file);const exports={};modules.set(file,exports);
new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
 if(name==='@/services/exam-preparation-target')return {examPreparationTarget:async()=>({category,language})};
 if(name==='@/services/prepared-study')return {cancelPreparedStudyMedia(){}};
 if(name==='@/database/exam-reuse')return {preserveExpiredExam:async()=>{},readExamReuse:async()=>undefined};
 if(name==='@/database/repository')return {createExam:async(_db,cat)=>{draws++;return pool(cat);},resumeActiveExam:async()=>null,selectedCategory:async()=>category};
 if(name==='@/database/translations')return {selectedQuestionLanguage:async()=>language};
 if(name==='@/services/media-cache')return {protectMedia:(group,names)=>pins.set(group,names),releaseProtectedMedia:group=>pins.delete(group),cachedMediaUri:async()=> 'fixture'};
 if(name==='@/services/media-preload')return {prepareExamMedia:async(_questions,progress,proceed)=>{progress?.({completed:0,total:3});if(delay)await delay;if(fail||!proceed())throw Error('preparation failed');progress?.({completed:3,total:3});}};
 if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);throw Error(name);
},exports);return exports;}
const db={getFirstAsync:async()=>settings.has('prepared-exam')?{value:settings.get('prepared-exam')}:null,runAsync:async(_sql,value)=>settings.set('prepared-exam',value),withExclusiveTransactionAsync:async fn=>fn(db)};
(async()=>{
 const service=load('src/services/prepared-exam.ts');let release;delay=new Promise(r=>release=r);
 const progress=[];const first=service.ensurePreparedExam(db,'B');await new Promise(setImmediate);const second=service.ensurePreparedExam(db,'B',value=>progress.push(value));await new Promise(setImmediate);assert.equal(draws,1);release();assert.deepEqual(await first,await second);delay=null;assert.deepEqual(progress.map(value=>value.completed),[0,3],'a joining UI receives current and final warm-download progress');
 await service.ensurePreparedExam(db,'B');assert.equal(draws,1,'ready candidate survives a new call without reroll');
 const blocked=JSON.parse(settings.get('prepared-exam'));blocked.questions[0].id=13074;settings.set('prepared-exam',JSON.stringify(blocked));
 const beforeQuarantine=draws;
 assert((await service.ensurePreparedExam(db,'B')).questions.every(q=>q.id!==13074));
 assert.equal(draws,beforeQuarantine+1,'an old unstarted candidate containing a missing asset must be replaced');
 settings.clear();fail=true;await assert.rejects(()=>service.ensurePreparedExam(db,'B'));assert(settings.has('prepared-exam'),'partial download preserves exact question draft');const before=draws;fail=false;await service.ensurePreparedExam(db,'B');assert.equal(draws,before);
 language='en';await service.ensurePreparedExam(db,'B');assert.equal(draws,before+1,'language change redraws candidate');
 settings.clear();delay=new Promise(r=>release=r);const obsolete=service.ensurePreparedExam(db,'B');await new Promise(setImmediate);category='C';const current=service.ensurePreparedExam(db,'C');release();await assert.rejects(()=>obsolete);delay=null;assert.equal((await current).category,'C');assert.equal(JSON.parse(settings.get('prepared-exam')).category,'C');
 let successor,starts=0;
 settings.clear();category='C';delay=new Promise(r=>release=r);let continueUi=true;
 const cancelled=service.ensurePreparedExam(db,'C',()=>{},()=>continueUi);await new Promise(setImmediate);
 const cancelledDraws=draws;continueUi=false;release();await assert.rejects(()=>cancelled);delay=null;
 assert(pins.has('prepared'),'cancel keeps partial draft pinned against competing cache eviction');
 await service.ensurePreparedExam(db,'C');assert.equal(draws,cancelledDraws,'cancel/reopen does not redraw any questions');
 settings.clear();delay=new Promise(r=>release=r);continueUi=true;
 const foreground=service.ensurePreparedExam(db,'C',()=>{},()=>continueUi);await new Promise(setImmediate);
 const background=service.ensurePreparedExam(db,'C',undefined,()=>true);await new Promise(setImmediate);
 continueUi=false;release();await Promise.all([foreground,background]);delay=null;
 assert(pins.has('prepared'),'a live background owner keeps preparing after its UI waiter cancels');
 const unsubscribe=service.subscribePreparedExam(()=>{starts++;successor=service.ensurePreparedExam(db,'C');});
 settings.clear();const beforeConsume=draws;
 service.consumePreparedExam((await current).questions);assert(pins.has('active'));assert(!pins.has('prepared'));
 assert.equal(starts,0,'consumption must not trigger a speculative full successor');
 assert.equal(draws,beforeConsume);unsubscribe();
 console.log('Prepared exam: coalesced single draw, persisted exact retry, language/category invalidation and active-media protection passed. No active session or exam clock is created by preparation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
