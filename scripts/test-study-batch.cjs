const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const exports={};
  new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);throw Error(name);
  },exports);cache.set(file,exports);return exports;}
const native=new DatabaseSync(':memory:');
native.exec(`CREATE TABLE questions(id INTEGER PRIMARY KEY,question TEXT,categories TEXT,points INTEGER,scope TEXT,correct_answer TEXT,media_filename TEXT);
CREATE TABLE question_translations(question_id INTEGER,language TEXT,question TEXT);
CREATE TABLE question_topics(question_id INTEGER,topic TEXT);CREATE TABLE question_signs(question_id INTEGER,sign_code TEXT);
CREATE TABLE practice_attempts(question_id INTEGER,is_correct INTEGER);CREATE TABLE exam_answers(question_id INTEGER,session_id TEXT,is_correct INTEGER);
CREATE TABLE flags(question_id INTEGER,created_at INTEGER);`);
for(let id=1;id<=18;id++){
  native.prepare('INSERT INTO questions VALUES(?,?,?,?,?,?,?)').run(id,`STOP ${id}`,JSON.stringify([id===18?'A':'B']),3,'PODSTAWOWY','T',null);
  native.prepare('INSERT INTO question_topics VALUES(?,?)').run(id,id<=8?'Signs':'Other');
  native.prepare('INSERT INTO question_signs VALUES(?,?)').run(id,'B-20');
  native.prepare('INSERT INTO question_translations VALUES(?,?,?)').run(id,'en',`STOP English ${id}`);
  native.prepare('INSERT INTO flags VALUES(?,?)').run(id,id);
  native.prepare('INSERT INTO practice_attempts VALUES(?,0)').run(id);
  native.prepare('INSERT INTO exam_answers VALUES(?,?,?)').run(id,'exam-one',id<=3?0:1);
}
const db={getAllAsync:async(sql,params)=>native.prepare(sql).all(...params)};
(async()=>{
  const {readStudyBatch}=load('src/database/study-batch.ts');
  const scope={filter:'all',category:'B',language:'en',limit:5};
  const first=await readStudyBatch(db,scope);assert.equal(first.questions.length,5);assert.equal(first.repeated,0);
  const ids=first.questions.map(q=>q.id);
  const next=await readStudyBatch(db,scope,ids);assert.equal(next.repeated,0);assert(next.questions.every(q=>!ids.includes(q.id)&&q.contentLanguage==='en'));
  for(const filter of ['all','three','basic','hardest','mistakes','flags']){
    const constrained={...scope,filter,topic:'Signs',sign:'B-20',search:'English'};
    const small=await readStudyBatch(db,constrained,[1,2,3,4,5]);
    assert.equal(small.questions.length,5);assert.equal(new Set(small.questions.map(q=>q.id)).size,5);
    assert.equal(small.repeated,2,'all 3 fresh questions precede repeats');assert(small.questions.slice(0,3).every(q=>q.id>=6&&q.id<=8));
    assert(small.questions.every(q=>q.id<=8),'scope never broadens to fill pool');
  }
  const exhausted=await readStudyBatch(db,{...scope,topic:'Signs'},[1,2,3,4,5,6,7,8]);assert.equal(exhausted.repeated,5);
  const exam=await readStudyBatch(db,{...scope,session:'exam-one'},[1,2,3]);assert.equal(exam.questions.length,3);assert(exam.questions.every(q=>q.id<=3));
  const missing=await readStudyBatch(db,{...scope,topic:'Missing'},ids);assert.equal(missing.questions.length,0);
  const injection=await readStudyBatch(db,{...scope,search:"' OR 1=1 --"});assert.equal(injection.questions.length,0);
  const fallback=await readStudyBatch(db,{...scope,language:'de'});assert(fallback.questions.every(q=>q.contentLanguage==='pl'));
  assert.equal((await readStudyBatch(db,{...scope,limit:12})).questions.length,12);
  for(const id of [11150,13074]){
    native.prepare('INSERT INTO questions VALUES(?,?,?,?,?,?,?)').run(id,'Known missing',JSON.stringify(['B','AM']),3,'PODSTAWOWY','T','missing.jpg');
    native.prepare('INSERT INTO exam_answers VALUES(?,?,?)').run(id,'quarantined-history',0);
    native.prepare('INSERT INTO flags VALUES(?,?)').run(id,999999);
  }
  for(const category of ['B','AM']){
    for(const filter of ['all','flags']){
      const result=await readStudyBatch(db,{...scope,category,filter,limit:12});
      assert(result.questions.every(q=>![11150,13074].includes(q.id)));
    }
    assert.equal((await readStudyBatch(db,{...scope,category,session:'quarantined-history'})).questions.length,0);
  }
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM exam_answers WHERE session_id=?').get('quarantined-history').n,2,'history is preserved');
  assert.equal(native.prepare('SELECT COUNT(*) AS n FROM questions WHERE id IN (11150,13074)').get().n,2,'source rows are preserved');
  native.close();console.log('Study batches: real SQL scopes, repeats, limits, media quarantine and preserved source/history passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
