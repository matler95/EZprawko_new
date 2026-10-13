const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path');
const cache=new Map(),pins=new Map(),reads=[],warms=[];let draw=0,fail=false,delay=null;
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
 new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
  if(name==='@/database/study-batch')return {readStudyBatch:async(_db,scope,previous)=>{
    reads.push({scope,previous});const first=++draw*100;if(delay)await delay;if(fail)throw Error('read failed');
    return {questions:Array.from({length:scope.limit},(_,i)=>({id:first+i,media_filename:i%2?'two.mp4':'one.jpg'})),repeated:previous.length?2:0};
  }};
  if(name==='@/database/translations')return {selectedQuestionLanguage:async()=> 'pl'};
  if(name==='@/services/media-cache')return {protectMedia:(group,files)=>pins.set(group,files),releaseProtectedMedia:group=>pins.delete(group)};
  if(name==='@/services/media-preload')return {preloadMedia:async(files,_progress,proceed)=>warms.push({files,proceed})};
  if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');throw Error(name);
 },exports);return exports;
}
(async()=>{
 const service=load('src/services/prepared-study.ts'),db={},scope={category:'B',language:'pl',filter:'all',limit:12};
 const first=await service.readPreparedStudyBatch(db,scope);
 const again=await service.readPreparedStudyBatch(db,{...scope,search:' '});
 assert.strictEqual(again,first);assert.equal(draw,1);assert.equal(warms[0].files.length,3);
 const previous=first.questions.map(q=>q.id);
 const next=await service.warmNextStudyBatch(db,scope,[...previous,...previous]);
 assert.strictEqual(await service.readPreparedStudyBatch(db,scope,previous),next);
 assert.equal(next.repeated,2);assert.equal(draw,2,'next click consumes the prefetched exact batch');
 const oldWarm=warms[0];service.consumePreparedStudyBatch(db,first.questions);
 assert.equal(oldWarm.proceed(),false);
 assert.notStrictEqual(await service.readPreparedStudyBatch(db,scope),first);
 for(const altered of [{language:'en'},{category:'A'},{filter:'flags'},{topic:'Signs'},{sign:'B-20'},{session:'history'},{search:'STOP'},{limit:5}])
   await service.readPreparedStudyBatch(db,{...scope,...altered});
 assert(pins.size<=4,'bounded pinned drafts');
 fail=true;await assert.rejects(()=>service.readPreparedStudyBatch(db,{...scope,search:'failure'}));fail=false;
 await service.readPreparedStudyBatch(db,{...scope,search:'failure'});
 let release;delay=new Promise(resolve=>release=resolve);const obsolete=service.readPreparedStudyBatch(db,{...scope,search:'reset'});
 const outcome=assert.rejects(obsolete,/interrupted/);
 await load('src/domain/data-maintenance.ts').withDataMaintenance(async()=>{});release();await outcome;delay=null;
 const refreshed=await service.readPreparedStudyBatch(db,scope);assert.notStrictEqual(refreshed,first);
 console.log('Prepared Study: exact warm/click/next reuse, scoped invalidation, bounded pins, retry and reset fencing passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
