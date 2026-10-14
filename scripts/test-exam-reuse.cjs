// Actual SQLite repository + selection + preparation + cache, with in-memory media transport.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const {DatabaseSync} = require('node:sqlite');
const root = path.resolve(__dirname,'..'), modules = new Map(), files = new Map(), transfers = [];
const delivery = require('../assets/data/media-delivery.json');
const dir = 'file:///cache/question-media/';
let authenticated = true;
const nativeFiles = {cacheDirectory:'file:///cache/', makeDirectoryAsync:async()=>{},
  getInfoAsync:async uri => uri===dir ? {exists:true,isDirectory:true} : files.has(uri) ? {exists:true,isDirectory:false,size:files.get(uri),modificationTime:1} : {exists:false},
  readDirectoryAsync:async()=>[...files.keys()].map(uri=>uri.slice(dir.length)),
  downloadAsync:async(url,uri)=>{const key = decodeURIComponent(new URL(url).pathname.slice(1)); assert(delivery.sizes[key]); transfers.push(key); files.set(uri,delivery.sizes[key]); return {status:200};},
  moveAsync:async({from,to})=>{files.set(to,files.get(from));files.delete(from);},
  deleteAsync:async uri=>{if(uri===dir)files.clear();else files.delete(uri);}};
function load(file) { if(modules.has(file))return modules.get(file); const exports={}; modules.set(file,exports);
  new Function('require','exports','process',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText)(name=>{
    if(name==='expo-file-system/legacy')return nativeFiles;
    if(name==='@/services/media-auth')return {mediaGrant:async()=> {if(!authenticated)throw Error('login required');return 'fixture';}};
    if(name.startsWith('@/assets/'))return require(path.join(root,name.slice(2)));
    if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
    return require(path.resolve(root,path.dirname(file),name));
  },exports,{env:{EXPO_PUBLIC_MEDIA_BASE_URL:'https://fixture.invalid',EXPO_PUBLIC_SUPABASE_URL:'https://auth.invalid'}}); return exports; }
const source = new DatabaseSync(path.join(root,'assets/database/questions.db'),{readOnly:true}), native = new DatabaseSync(':memory:');
for(const table of ['questions','answers']) { native.exec(source.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(table).sql);
  const rows=source.prepare('SELECT * FROM '+table).all(), insert=native.prepare('INSERT INTO '+table+' VALUES ('+Object.keys(rows[0]).map(()=>'?').join(',')+')');
  for(const row of rows)insert.run(...Object.values(row)); } source.close();
const args = values=>values.length===1&&Array.isArray(values[0])?values[0]:values;
const db={execAsync:async sql=>native.exec(sql),runAsync:async(sql,...values)=>native.prepare(sql).run(...args(values)),
  getFirstAsync:async(sql,...values)=>native.prepare(sql).get(...args(values))??null,
  getAllAsync:async(sql,...values)=>native.prepare(sql).all(...args(values)),
  withExclusiveTransactionAsync:async fn=>{native.exec('BEGIN');try{await fn(db);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};
const ids = questions=>questions.map(q=>q.id);
(async()=>{
  const r=load('src/database/repository.ts'), reuse=load('src/database/exam-reuse.ts'), service=load('src/services/prepared-exam.ts');
  const {validExamSelection}=load('src/domain/exam-selection.ts');
  await r.initializeDatabase(db);
  const onboarding=load('src/database/onboarding.ts'), target=load('src/services/exam-preparation-target.ts');
  assert.equal(await target.examPreparationTarget(db),null,'first launch must not guess category B');
  await onboarding.saveOnboardingDraft(db,{step:1,category:'A1',language:'en'});
  assert.equal(await target.examPreparationTarget(db),null,'an unconfirmed category is not a preparation target');
  await onboarding.saveOnboardingDraft(db,{step:2,category:'A1',language:'en'});
  assert.deepEqual(await target.examPreparationTarget(db),{category:'A1',language:'en'});
  authenticated=false;await assert.rejects(()=>service.ensurePreparedExam(db,'A1'),/login required/);
  assert.equal(transfers.length,0,'no media download or auth bypass before login');
  const early=JSON.parse(native.prepare("SELECT value FROM settings WHERE key='prepared-exam'").get().value);
  assert(validExamSelection(early.questions,'A1'));assert.equal(early.language,'en');
  await onboarding.saveOnboardingDraft(db,{step:3,category:'A1',language:'en'});
  await onboarding.finishOnboarding(db,{step:3,category:'A1',language:'en'});
  authenticated=true;const handedOff=await service.ensurePreparedExam(db,'A1',()=>{});
  assert.deepEqual(ids(handedOff.questions),ids(early.questions),'finish/login/foreground consumes the same onboarding draw');
  const earlyDownloads=transfers.length;await service.ensurePreparedExam(db,'A1',()=>{});
  assert.equal(transfers.length,earlyDownloads,'warm onboarding handoff never redownloads');
  await r.setSelectedCategory(db,'B');await db.runAsync('INSERT OR REPLACE INTO settings(key,value) VALUES (?,?)','question-language','pl');
  let prepared=await service.ensurePreparedExam(db,'B',()=>{});
  let active=await r.startActiveExam(db,'B',service.verifyPreparedMedia,()=>true,prepared); service.consumePreparedExam(active.questions);
  const downloaded=transfers.length; await service.ensurePreparedExam(db,'B'); assert.equal(transfers.length,downloaded,'no full successor while active');
  const firstId=active.questions[0].id;
  await r.questionClock(db,active.id,0,active.questions[0]);
  await r.clearActiveExam(db);
  assert.equal(await r.resumeActiveExam(db),null);
  let seed=await reuse.readExamReuse(db,'B','pl');assert.equal(seed.retainedIds.length,31);assert.deepEqual(seed.excludedIds,[firstId]);
  const before=transfers.length;prepared=await service.ensurePreparedExam(db,'B',()=>{});
  assert(validExamSelection(prepared.questions,'B'));assert(!ids(prepared.questions).includes(firstId));
  assert(seed.retainedIds.every(id=>ids(prepared.questions).includes(id)));
  const replacements=prepared.questions.filter(q=>!seed.retainedIds.includes(q.id));assert.equal(replacements.length,1);
  const newKeys=transfers.slice(before);assert(newKeys.length<=1,'only a missing replacement file can download');
  const exact=ids(prepared.questions);await service.ensurePreparedExam(db,'B',()=>{});assert.deepEqual(ids(prepared.questions),exact);assert.equal(transfers.length,before+newKeys.length);
  active=await r.startActiveExam(db,'B',service.verifyPreparedMedia,()=>true,prepared);service.consumePreparedExam(active.questions);
  assert.deepEqual(active.selections,{});assert.equal(active.index,0);
  await r.questionClock(db,active.id,0,active.questions[0]);
  await r.saveActiveProgress(db,active.id,1,active.questions[0].id,null);
  await r.questionClock(db,active.id,1,active.questions[1]);
  const seen=[firstId,active.questions[0].id,active.questions[1].id];
  // Transaction failure cannot delete the resumable attempt or partially replace a seed.
  const failing={...db,withExclusiveTransactionAsync:fn=>db.withExclusiveTransactionAsync(tx=>fn({...tx,execAsync:async sql=>{if(sql.startsWith('DELETE FROM active_exam_questions'))throw Error('fixture rollback');return tx.execAsync(sql);}}))};
  await assert.rejects(()=>r.clearActiveExam(failing),/rollback/);assert.equal((await r.resumeActiveExam(db)).id,active.id);
  await r.clearActiveExam(db);seed=await reuse.readExamReuse(db,'B','pl');assert.equal(seed.retainedIds.length,30);assert(seen.every(id=>seed.excludedIds.includes(id)));
  prepared=await service.ensurePreparedExam(db,'B',()=>{});assert(seed.retainedIds.every(id=>ids(prepared.questions).includes(id)));assert(seen.every(id=>!ids(prepared.questions).includes(id)));
  // Expiry uses raw persisted data, not resumeActiveExam's null result.
  active=await r.startActiveExam(db,'B',service.verifyPreparedMedia,()=>true,prepared);service.consumePreparedExam(active.questions);
  await r.questionClock(db,active.id,0,active.questions[0]);native.prepare('UPDATE active_exam SET expires_at=1').run();
  assert.equal(await r.resumeActiveExam(db),null);await reuse.preserveExpiredExam(db);assert.equal((await reuse.readExamReuse(db,'B','pl')).retainedIds.length,31);
  // TTL and changed scope do not bring back old seeds.
  seed=JSON.parse(native.prepare("SELECT value FROM settings WHERE key='exam-reuse'").get().value);seed.createdAt=Date.now()-25*60*60*1000;
  native.prepare("UPDATE settings SET value=? WHERE key='exam-reuse'").run(JSON.stringify(seed));assert.equal(await reuse.readExamReuse(db,'B','pl'),undefined);
  for(const category of load('src/domain/driving-categories.ts').drivingCategories){
    active=await r.startActiveExam(db,category);await r.questionClock(db,active.id,0,active.questions[0]);await r.clearActiveExam(db);
    seed=await reuse.readExamReuse(db,category,'pl');const next=await r.createExam(db,category);assert(validExamSelection(next,category));
    assert(seed.retainedIds.every(id=>ids(next).includes(id)));assert(!ids(next).includes(active.questions[0].id));
  }
  const engine=load('src/domain/exam-engine.ts');
  const fallback=engine.buildOfficialExam(active.questions,active.category,()=>0.5,{retainedIds:ids(active.questions).slice(1),excludedIds:[active.questions[0].id]});
  assert.equal(fallback.reuseFallback,'insufficient-pool');assert(validExamSelection(fallback.questions,active.category),'exhaustion falls back to a valid ordinary exam, never a malformed quota');
  active=await r.startActiveExam(db,'B');await r.questionClock(db,active.id,0,active.questions[0]);
  await r.saveCompletedExam(db,'B',active.questions,{},Date.now(),'en',active.id);
  assert.equal(await reuse.readExamReuse(db,'B','pl'),undefined,'a saved final result never seeds questions whose keys are available in review');
  native.prepare('INSERT INTO active_exam VALUES (?,?,?,?)').run(active.id,'B',1,0);
  for(const [i,q] of active.questions.entries())native.prepare('INSERT INTO active_exam_questions(session_id,position,question_id) VALUES (?,?,?)').run(active.id,i,q.id);
  await reuse.preserveExpiredExam(db);assert.equal(await reuse.readExamReuse(db,'B','pl'),undefined,'legacy stale active row cannot recycle a completed attempt');
  assert.equal(native.prepare('SELECT value FROM settings WHERE key=?').get('exam-language:'+active.id).value,'en','completed-history language survives stale-active cleanup');
  console.log('Exam reuse E2E: 31/30 preserved IDs, accumulated exposure, exact retry, zero retained-file transfer, no speculative successor, blank new answers, transactional rollback, expiry, TTL and all 12 categories passed. Native decoding remains device QA.');
})().catch(error=>{console.error(error);process.exitCode=1;});
