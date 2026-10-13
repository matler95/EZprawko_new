// Deterministic scheduler test, no real network or native APIs.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path');
const exportsObject={};
new Function('exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/services/media-download-queue.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exportsObject);
const {withMediaDownloadSlot,promoteMediaDownload}=exportsObject;
const tick=()=>new Promise(setImmediate);
(async()=>{
  let running=0,peak=0;const started=[],releases=new Map();
  const job=(name,priority)=>withMediaDownloadSlot(async()=>{
    running++;peak=Math.max(peak,running);started.push(name);
    await new Promise(resolve=>releases.set(name,resolve));
    running--;if(name==='failure')throw Error('fixture');return name;
  },priority,name);
  const first=job('first','background'),second=job('second','background');
  const background=job('later','background'),foreground=job('current','background');
  promoteMediaDownload('current');
  await tick();assert.deepEqual(started,['first','second']);
  releases.get('first')();await first;await tick();
  assert.deepEqual(started,['first','second','current'],'queued current material outranks speculative work');
  releases.get('second')();await second;await tick();assert.equal(started.at(-1),'later');
  releases.get('current')();releases.get('later')();await Promise.all([foreground,background]);
  const failure=job('failure','foreground');const outcome=assert.rejects(failure,/fixture/);
  await tick();releases.get('failure')();await outcome;await tick();
  const recovery=job('recovery','background');await tick();releases.get('recovery')();await recovery;
  assert.equal(peak,2);assert.equal(running,0);
  console.log('Shared media queue: two-transfer limit, foreground priority and slot recovery after failure passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
