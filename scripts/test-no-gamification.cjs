// Actual bank + SQLite. Upgrade compatibility is tested without touching user data.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..'), modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {}; modules.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  new Function('require','exports',code)(name => {
    if (name.endsWith('.json')) return require(path.resolve(root, name.startsWith('@/assets/') ? name.slice(2) : path.join(path.dirname(file),name)));
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    throw Error(name);
  }, exports); return exports;
}
const original = new DatabaseSync(path.join(root,'assets/database/questions.db'),{readOnly:true});
const native = new DatabaseSync(':memory:');
for (const table of ['questions','answers']) {
  native.exec(original.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(table).sql);
  const rows = original.prepare(`SELECT * FROM ${table}`).all();
  const insert = native.prepare(`INSERT INTO ${table} VALUES (${Object.keys(rows[0]).map(()=>'?').join(',')})`);
  for (const row of rows) insert.run(...Object.values(row));
}
original.close();
const args = values => values.length===1 && Array.isArray(values[0]) ? values[0] : values;
const writes = [];
const db = {
  execAsync:async sql=>{writes.push(sql);native.exec(sql);},
  runAsync:async(sql,...values)=>{writes.push(sql);return native.prepare(sql).run(...args(values));},
  getFirstAsync:async(sql,...values)=>native.prepare(sql).get(...args(values)),
  getAllAsync:async(sql,...values)=>native.prepare(sql).all(...args(values)),
  withExclusiveTransactionAsync:async fn=>{native.exec('BEGIN');try{await fn(db);native.exec('COMMIT');}catch(error){native.exec('ROLLBACK');throw error;}},
};
(async()=>{
  const repo=load('src/database/repository.ts'), data=load('src/database/user-data.ts');
  await repo.initializeDatabase(db);
  assert.equal(native.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('challenge_days','user_achievements')").get().n,0);
  const exam=await repo.createExam(db,'B');
  await repo.recordPracticeAnswer(db,exam[0].id,exam[0].correctAnswer,true);
  const result=await repo.saveCompletedExam(db,'B',exam,Object.fromEntries(exam.map(q=>[q.id,q.correctAnswer])));
  assert.equal(result.score,74);assert.equal((await repo.examReview(db,result.id)).questions.length,32);
  assert.equal((await data.exportUserData(db)).data.practice_attempts.length,1);
  // Simulate an older install: nullable legacy columns and earned records survive upgrade.
  native.exec("ALTER TABLE practice_attempts ADD COLUMN local_day TEXT; ALTER TABLE exam_sessions ADD COLUMN local_day TEXT; CREATE TABLE challenge_days(day TEXT PRIMARY KEY,correct_answers INTEGER); INSERT INTO challenge_days VALUES ('2026-10-12',5); CREATE TABLE user_achievements(id TEXT PRIMARY KEY,category TEXT,earned_at INTEGER); INSERT INTO user_achievements VALUES ('first','',123);");
  native.exec("UPDATE practice_attempts SET local_day='2026-10-12'; UPDATE exam_sessions SET local_day='2026-10-12';");
  writes.length=0;
  await repo.initializeDatabase(db);
  await repo.recordPracticeAnswer(db,exam[1].id,exam[1].correctAnswer,false);
  await repo.saveCompletedExam(db,'B',exam,{});
  assert(!writes.some(sql=>/challenge_days|user_achievements|local_day/.test(sql)), 'startup/answers/results must not maintain gamification');
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM exam_sessions').get().n,2);
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM practice_attempts').get().n,2);
  const exported=await data.exportUserData(db);
  assert.equal(exported.data.user_achievements.length,1);assert.equal(exported.data.challenge_days[0].correct_answers,5);
  assert.equal(exported.data.practice_attempts[0].local_day,'2026-10-12','legacy historical columns are preserved');
  await data.resetUserProgress(db);
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM user_achievements').get().n,0);
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM challenge_days').get().n,0);
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM questions').get().n,3518);
  for (const file of ['src/components/dashboard-screen.tsx','src/app/exam/[id].tsx','src/app/exam/review.tsx']) {
    const code=fs.readFileSync(path.join(root,file),'utf8');
    assert(!/LearningRewards|learningProgress|SuccessBadge|AnimatedExamScore/.test(code),`reward UI in ${file}`);
  }
  for (const file of ['src/app/exam/[id].tsx','src/app/exam/review.tsx']) {
    assert.match(fs.readFileSync(path.join(root,file),'utf8'),/\.score\}\/74/,'result is displayed directly, not counted up');
  }
  console.log('No gamification: fresh schema, real 32/74 exam/history, no reward writes, legacy upgrade/history preservation, optional export/reset and plain result UI passed.');
  native.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
