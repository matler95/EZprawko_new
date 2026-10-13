const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const exports={};
  new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);throw Error(name);
  },exports);cache.set(file,exports);return exports;}
const native=new DatabaseSync(':memory:');native.exec(`
CREATE TABLE questions(id INTEGER PRIMARY KEY,categories TEXT);CREATE TABLE question_topics(question_id INTEGER PRIMARY KEY,topic TEXT);
CREATE TABLE practice_attempts(id INTEGER PRIMARY KEY,question_id INTEGER,is_correct INTEGER,answered_at INTEGER,selected_answer TEXT);
CREATE TABLE exam_sessions(id TEXT PRIMARY KEY,category TEXT,completed_at INTEGER);
CREATE TABLE exam_answers(session_id TEXT,question_id INTEGER,is_correct INTEGER,selected_answer TEXT,PRIMARY KEY(session_id,question_id));`);
for(let id=1;id<=12;id++){
  native.prepare('INSERT INTO questions VALUES(?,?)').run(id,JSON.stringify(id===4?['B','A']:id===12?['A']:['B']));
  native.prepare('INSERT INTO question_topics VALUES(?,?)').run(id,id<=6?'Core':id<=10?'Small':'Unseen');
  if(id<=10)native.prepare('INSERT INTO practice_attempts VALUES(?,?,?,?,?)').run(id,id,id<=3?0:1,100,'A');
}
for(let id=20;id<40;id++)native.prepare('INSERT INTO practice_attempts VALUES(?,?,?,?,?)').run(id,1,1,200,'A');
native.exec(`INSERT INTO exam_sessions VALUES('oldB','B',150),('newB','B',300),('otherA','A',400),('unfinished','B',NULL);
INSERT INTO exam_answers VALUES('oldB',1,0,'B'),('newB',2,1,'A'),('newB',3,0,NULL),('otherA',4,0,'B'),('unfinished',5,0,'B');`);
const db={getAllAsync:async(sql,params)=>native.prepare(sql).all(...params),getFirstAsync:async(sql,params)=>native.prepare(sql).get(...params)};
(async()=>{
  const {learningInsights}=load('src/database/learning-insights.ts');
  const {learningRecommendation,rankTopicInsights}=load('src/domain/learning-recommendation.ts');
  const b=await learningInsights(db,'B');const core=b.topics.find(t=>t.topic==='Core');
  assert.deepEqual({...core},{topic:'Core',total:6,answered:6,correct:5});
  assert.equal(b.historicalMistakes,5,'history semantics match existing mistakes filter including shared questions');
  assert.equal(learningRecommendation(b.topics).topic.topic,'Core');
  const small=b.topics.find(t=>t.topic==='Small');assert.equal(small.answered,4);
  assert.equal(learningRecommendation([{...small,correct:0}]).kind,'practice','tiny sample cannot label a weakest topic');
  assert.equal(learningRecommendation([{...small,correct:0}],3).kind,'mistakes','small sample can lead to explicitly historical review');
  assert.equal(learningRecommendation([{...core,correct:6}]).kind,'practice','perfect answers do not imply readiness');
  const a=await learningInsights(db,'A');assert.equal(a.topics.find(t=>t.topic==='Core').correct,0,'A uses its own completed exam');
  const empty=await learningInsights(db,'PT');assert.equal(empty.topics.length,0);assert.equal(empty.historicalMistakes,0);
  const original=JSON.stringify(b.topics);rankTopicInsights(b.topics);assert.equal(JSON.stringify(b.topics),original,'ranking does not mutate input');
  const sameTime=native.prepare('INSERT INTO practice_attempts VALUES(?,?,?,?,?)');sameTime.run(50,3,1,300,'A');
  assert.equal((await learningInsights(db,'B')).topics.find(t=>t.topic==='Core').correct,6,'same-time practice is deterministic');
  native.close();console.log('Learning insights: latest unique outcomes, duplicate practice, exam category/completion, skip, stable ties, historical filter parity and sample-aware non-mutating recommendation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
