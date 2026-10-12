// Real SQLite state + native-stub presentation; phone QA is separate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');const root=path.resolve(__dirname,'..'),cache=new Map();let theme='light';
function load(file){if(cache.has(file))return cache.get(file);const exports={};
  const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','exports',code)((name)=>{
    if(name==='react/jsx-runtime')return require(name);
    if(name==='react-native')return {Text:'Text',View:'View',StyleSheet:{create:s=>s},Platform:{select:s=>s.default}};
    if(name==='@/global.css')return {};
    if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors[theme]})};
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);throw Error(name);
  },exports);cache.set(file,exports);return exports;}
const native=new DatabaseSync(':memory:');
native.exec(`CREATE TABLE questions(id INTEGER PRIMARY KEY,categories TEXT);INSERT INTO questions VALUES (1,'["B"]'),(2,'["B"]'),(3,'["A"]');
CREATE TABLE question_signs(question_id INTEGER,sign_code TEXT);INSERT INTO question_signs VALUES (1,'A-1'),(1,'A-2'),(2,'B-1'),(3,'C-1');
CREATE TABLE practice_mastery(question_id INTEGER PRIMARY KEY,correct_streak INTEGER);
CREATE TABLE practice_attempts(id INTEGER PRIMARY KEY,question_id INTEGER,answered_at INTEGER,is_correct INTEGER);
CREATE TABLE exam_sessions(id TEXT,completed_at INTEGER,score INTEGER);
CREATE TABLE user_achievements(id TEXT,category TEXT,earned_at INTEGER,PRIMARY KEY(id,category));
CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);
CREATE TABLE exam_answers(id INTEGER);CREATE TABLE active_exam_questions(id INTEGER);CREATE TABLE active_exam(id INTEGER);
CREATE TABLE flags(id INTEGER);CREATE TABLE challenge_days(day TEXT,correct_answers INTEGER);`);
const args=v=>v.length===1&&Array.isArray(v[0])?v[0]:v;
const db={execAsync:async sql=>native.exec(sql),getFirstAsync:async(sql,...v)=>native.prepare(sql).get(...args(v))??null,
getAllAsync:async(sql,...v)=>native.prepare(sql).all(...args(v)),runAsync:async(sql,...v)=>native.prepare(sql).run(...args(v)),
withExclusiveTransactionAsync:async fn=>{native.exec('BEGIN');try{await fn(db);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};
function text(tree){if(typeof tree==='string'||typeof tree==='number')return String(tree);if(!tree||typeof tree!=='object')return '';const c=tree.props?.children;return (Array.isArray(c)?c.flat(Infinity):[c]).map(text).join(' ');}
(async()=>{
  const {learningStreak,localDay}=load('src/domain/learning-streak.ts');
  assert.deepEqual(learningStreak([], '2026-10-12'),{current:0,best:0,todayActive:false});
  assert.equal(learningStreak(['2026-10-09','2026-10-11','2026-10-12','2026-10-12'],'2026-10-12').current,2);
  assert.equal(learningStreak(['2026-10-09','2026-10-10','2026-10-11'],'2026-10-12').current,3,'yesterday grace');
  assert.equal(learningStreak(['2026-10-09','2026-10-10'],'2026-10-12').current,0,'missed day breaks streak');
  assert.equal(learningStreak(['2026-03-28','2026-03-29','2026-03-30'],'2026-03-30').current,3,'DST days are not 24h durations');
  assert.equal(learningStreak(['2024-02-28','2024-02-29','2024-03-01'],'2024-03-01').current,3);
  assert.equal(learningStreak(['2025-12-30','2025-12-31','2026-01-01'],'2026-01-01').current,3);
  assert.equal(learningStreak(['2026-02-30','2026-10-13','invalid'],'2026-10-12').best,0);
  const r=load('src/database/learning-progress.ts');const now=new Date(2026,9,12,23,55).getTime();
  const oldTimestamp=new Date(2026,9,8,23,40).getTime();
  native.prepare('INSERT INTO practice_attempts(question_id,answered_at,is_correct) VALUES (1,?,1)').run(oldTimestamp);
  await r.installLearningDays(db);await r.installLearningDays(db);
  assert.equal(native.prepare('SELECT local_day FROM practice_attempts').get().local_day,'2026-10-08');
  native.exec('DELETE FROM practice_attempts');
  let progress=await r.learningProgress(db,'B',now);assert.equal(progress.streak.current,0);assert.equal(progress.achievements.length,0);
  const add=(day,correct,count=1)=>{const timestamp=new Date(2026,9,day,23,40).getTime();for(let i=0;i<count;i++)native.prepare('INSERT INTO practice_attempts(question_id,answered_at,is_correct,local_day) VALUES (1,?,?,?)').run(timestamp,correct,localDay(timestamp));};
  add(10,0);add(11,1,5);add(12,1,5);add(15,1,5);
  native.prepare('INSERT INTO exam_sessions VALUES (?,?,?,?)').run('first',new Date(2026,9,10,11,0).getTime(),67,'2026-10-10');
  native.prepare('INSERT INTO exam_sessions VALUES (?,?,?,?)').run('perfect',new Date(2026,9,12,12,0).getTime(),74,'2026-10-12');
  // A legacy UTC cache cannot fabricate a challenge day.
  native.exec("INSERT INTO challenge_days VALUES ('2026-10-10',99)");
  progress=await r.learningProgress(db,'B',now);assert.equal(progress.streak.current,3);assert.equal(progress.challenge,2);assert(!progress.challengeComplete);assert.equal(progress.correctToday,5);
  assert.deepEqual(new Set(progress.achievements.map(a=>a.id)),new Set(['first','perfect','streak']));
  add(10,1,5);progress=await r.learningProgress(db,'B',now);assert(progress.challengeComplete);assert.equal(progress.challenge,3);
  native.exec('INSERT INTO practice_mastery VALUES (1,3),(2,3),(3,0)');
  progress=await r.learningProgress(db,'B',now);assert.deepEqual({...progress.signs},{total:2,mastered:2});assert(progress.achievements.some(a=>a.id==='signs'));
  const earned=progress.achievements.find(a=>a.id==='signs').earned_at;
  native.exec('UPDATE practice_mastery SET correct_streak=0 WHERE question_id=1');
  progress=await r.learningProgress(db,'B',now+1);assert.equal(progress.signs.mastered,1);assert.equal(progress.achievements.find(a=>a.id==='signs').earned_at,earned,'earned badge survives mistakes/idempotent refresh');
  assert(!(await r.learningProgress(db,'A',now)).achievements.some(a=>a.id==='signs'),'sign badge is scoped to target');
  assert.equal((await r.learningProgress(db,'PT',now)).signs.total,0);assert(!(await r.learningProgress(db,'PT',now)).achievements.some(a=>a.id==='signs'),'empty target cannot earn expert');
  const afterGap=await r.learningProgress(db,'B',new Date(2026,9,14,12,0).getTime());
  assert.equal(afterGap.streak.current,0);assert(afterGap.achievements.some(a=>a.id==='streak'));assert(afterGap.challengeComplete);
  for(theme of ['light','dark']){
    const component=load('src/components/learning-rewards.tsx').LearningRewards;
    assert.match(text(component({progress,category:'B'})),/Seria nauki:.*3.*dni/);
    const body=text(component({progress,category:'B',part:'achievements'}));
    for(const label of ['Pierwszy krok','W ogniu nauki','Mistrz przepisów','Ekspert znaków','Zdobyta','24 h'])assert(body.includes(label));
  }
  const data=load('src/database/user-data.ts');assert.equal((await data.exportUserData(db)).data.user_achievements.length,4);
  await data.resetUserProgress(db);progress=await r.learningProgress(db,'B',now);assert.equal(progress.streak.current,0);assert.equal(progress.achievements.length,0);assert.equal(native.prepare('SELECT COUNT(*) AS n FROM questions').get().n,3);
  assert.equal(localDay(new Date(2026,9,12,23,55).getTime()),'2026-10-12');
  console.log(`Learning rewards (${process.env.TZ||'system timezone'}): local history, gaps/yesterday grace, DST/leap/invalid/future days, wrong-answer activity, consecutive challenge, first/perfect/streak persistence, exact-category/unique-sign mastery, no empty award, badge retention, both themes and export/reset passed.`);native.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
