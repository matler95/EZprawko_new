const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file);
  const exports={};cache.set(file,exports);
  const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  new Function('require','exports',code)((name)=>{
    if(name.startsWith('@/assets/'))return require(path.join(root,name.slice(2)));
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);
    return require(path.resolve(root,path.dirname(file),name));
  },exports);return exports;
}
const source=new DatabaseSync(path.join(root,'assets/database/questions.db'),{readOnly:true});
const native=new DatabaseSync(':memory:');
for(const table of ['questions','answers']){
  native.exec(source.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(table).sql);
  const rows=source.prepare(`SELECT * FROM ${table}`).all();
  const insert=native.prepare(`INSERT INTO ${table} VALUES (${Object.keys(rows[0]).map(()=>'?').join(',')})`);
  for(const row of rows)insert.run(...Object.values(row));
}source.close();
const args=(values)=>values.length===1&&Array.isArray(values[0])?values[0]:values;
const db={execAsync:async sql=>native.exec(sql),runAsync:async(sql,...values)=>native.prepare(sql).run(...args(values)),
  getFirstAsync:async(sql,...values)=>native.prepare(sql).get(...args(values))??null,
  getAllAsync:async(sql,...values)=>native.prepare(sql).all(...args(values)),
  withExclusiveTransactionAsync:async fn=>{native.exec('BEGIN');try{await fn(db);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};
(async()=>{
  const r=load('src/database/repository.ts');const {drivingCategories,categoryClause}=load('src/domain/driving-categories.ts');
  await r.initializeDatabase(db);
  for(const category of drivingCategories){
    await r.setSelectedCategory(db,category);assert.equal(await r.selectedCategory(db),category);
    assert.equal(native.prepare("SELECT COUNT(*) AS n FROM settings WHERE key='target-category'").get().n,1);
    const exam=await r.startActiveExam(db,category);assert.equal(exam.questions.length,32);
    assert.equal(exam.questions.reduce((n,q)=>n+q.points,0),74);
    assert(exam.questions.every(q=>q.categories.includes(category)),`all questions must match ${category}`);
    assert.equal((await r.resumeActiveExam(db)).id,exam.id);
    const rows=await db.getAllAsync(`SELECT q.id FROM questions q WHERE ${categoryClause}`,category);
    assert(rows.length>=32);
    const topics=await r.topicProgress(db,category);
    assert.equal(topics.reduce((n,t)=>n+t.total,0),rows.length);
    const media=await r.mediaFilenamesForCategory(db,category);
    assert(media.length<=250);
    const expectedMedia=new Set(native.prepare(`SELECT q.media_filename FROM questions q WHERE ${categoryClause}`).all(category).map(q=>q.media_filename));
    assert(media.every(filename=>expectedMedia.has(filename)));
  }
  await assert.rejects(()=>r.setSelectedCategory(db,'B+E'),/Unsupported/);
  let exam=await r.startActiveExam(db,'B');
  await r.saveActiveProgress(db,exam.id,32,exam.questions[31].id,null);
  assert.equal(await r.resumeActiveExam(db),null,'index 32 must not produce a dead resume card');
  exam=await r.startActiveExam(db,'A');assert.equal((await r.resumeActiveExam(db)).id,exam.id,'new exam replaces stranded session');
  // Failed hydration must preserve previous session, not commit an unusable replacement.
  const broken={...db,getFirstAsync:async(sql,...values)=>{if(sql.startsWith('SELECT id, scope'))throw Error('synthetic read failure');return db.getFirstAsync(sql,...values);}};
  await assert.rejects(()=>r.startActiveExam(broken,'B'),/synthetic/);
  assert.equal((await r.resumeActiveExam(db)).id,exam.id);
  // Preparation is outside the write transaction and cannot destroy the old attempt.
  const oldId=exam.id;
  await assert.rejects(()=>r.startActiveExam(db,'B',async questions=>{
    assert.equal(questions.length,32);assert.equal((await r.resumeActiveExam(db)).id,oldId);
    throw Error('synthetic media failure');
  }),/synthetic media/);
  assert.equal((await r.resumeActiveExam(db)).id,oldId);
  await assert.rejects(()=>r.startActiveExam(db,'B',async()=>{},()=>false),/cancelled/);
  assert.equal((await r.resumeActiveExam(db)).id,oldId);
  let cancelled=false;
  const cancelDb={...db,withExclusiveTransactionAsync:async fn=>db.withExclusiveTransactionAsync(async tx=>fn({...tx,runAsync:async(sql,...v)=>{
    const result=await tx.runAsync(sql,...v);if(sql.startsWith('INSERT INTO active_exam_questions'))cancelled=true;return result;
  }}))};
  await assert.rejects(()=>r.startActiveExam(cancelDb,'B',async()=>{},()=>!cancelled),/cancelled/);
  assert.equal((await r.resumeActiveExam(db)).id,oldId,'late cancellation rolls back replacement');
  const realNow=Date.now;let wall=realNow();Date.now=()=>wall;
  try {
    const delayedExam=await r.startActiveExam(db,'B',async()=>{wall+=120000;});
    assert.equal(delayedExam.expiresAt,wall+25*60*1000,'preparation time is not exam time');
  } finally {Date.now=realNow;}
  native.prepare('UPDATE active_exam SET current_index=-1').run();assert.equal(await r.resumeActiveExam(db),null);
  native.prepare('UPDATE active_exam SET current_index=0,expires_at=1').run();assert.equal(await r.resumeActiveExam(db),null);
  exam=await r.startActiveExam(db,'B');
  native.prepare('UPDATE active_exam_questions SET question_id=999999 WHERE position=0').run();assert.equal(await r.resumeActiveExam(db),null);
  exam=await r.startActiveExam(db,'B');
  await r.clearActiveExam(db);assert.equal(await r.resumeActiveExam(db),null);
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM questions').get().n,3518);
  const maintenance=load('src/domain/data-maintenance.ts');
  const {resetUserProgress}=load('src/database/user-data.ts');
  let release;const delayed=new Promise(resolve=>{release=resolve;});
  let tail=Promise.resolve();
  const queuedDb={...db,withExclusiveTransactionAsync:fn=>{
    const task=tail.then(async()=>{await delayed;return db.withExclusiveTransactionAsync(fn);});
    tail=task.catch(()=>{});return task;
  }};
  const latePractice=r.recordPracticeAnswer(queuedDb,exam.questions[0].id,'T',true);
  const lateExam=r.saveCompletedExam(queuedDb,'B',exam.questions,{});
  await maintenance.withDataMaintenance(()=>resetUserProgress(db));
  release();await Promise.all([latePractice,lateExam]);
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM practice_attempts').get().n,0,'queued old practice must not resurrect deleted progress');
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM exam_sessions').get().n,0,'queued old exam must not resurrect deleted history');
  console.log('Maintenance fence: queued old practice/exam transactions cannot recreate progress after reset.');
  await r.setSelectedCategory(db,'B');
  native.prepare(`INSERT INTO practice_mastery(question_id,correct_streak,last_correct_at)
    SELECT q.id,3,? FROM questions q WHERE ${categoryClause} AND EXISTS(SELECT 1 FROM question_signs s WHERE s.question_id=q.id)`).run(Date.now()-48*3600000,'B');
  const last=native.prepare('SELECT q.id,q.correct_answer FROM questions q JOIN practice_mastery m ON m.question_id=q.id LIMIT 1').get();
  native.prepare('UPDATE practice_mastery SET correct_streak=2 WHERE question_id=?').run(last.id);
  await r.recordPracticeAnswer(db,last.id,last.correct_answer,true);
  assert(native.prepare("SELECT earned_at FROM user_achievements WHERE id='signs' AND category='B'").get(),'last mastery update must grant expert inside the practice transaction');
  assert.equal(native.prepare('SELECT local_day FROM practice_attempts').get().local_day,load('src/domain/learning-streak.ts').localDay());
  console.log('Learning integration: positive practice records local day and awards category-B sign expert atomically on the last mastered question.');
  console.log('Session/categories: all 12 real-bank pools generate 32/74, one setting, exact category/topic filters, index-32 recovery, replacement, failed-hydration preservation, expired/invalid/missing questions and scoped active-data removal passed.');
  native.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
