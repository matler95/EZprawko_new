const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),modules=new Map(),files=new Map(),sizes=new Map(),started=[],statuses=new Map();
const MB=1024*1024,dir='file:///cache/question-media/';let hold,heldResolve,free=1000*MB,oversize=false;
const native={cacheDirectory:'file:///cache/',makeDirectoryAsync:async()=>{},
  getFreeDiskStorageAsync:async()=>free,
  getInfoAsync:async uri=>uri===dir?{exists:true,isDirectory:true}:files.has(uri)?{exists:true,isDirectory:false,size:files.get(uri),modificationTime:1}:{exists:false},
  readDirectoryAsync:async()=>[...files.keys()].map(uri=>uri.slice(dir.length)),
  moveAsync:async({from,to})=>{files.set(to,files.get(from));files.delete(from);},
  deleteAsync:async uri=>{if(uri===dir)files.clear();else files.delete(uri);},
  createDownloadResumable:(url,uri,_options,progress)=>{let cancelled=false,resolveCancel;const cancel=new Promise(resolve=>resolveCancel=resolve);
    return {cancelAsync:async()=>{cancelled=true;resolveCancel();},downloadAsync:async()=>{
      const name=new URL(url).pathname.slice(1);started.push(name);
      if(hold===name)await Promise.race([new Promise(resolve=>heldResolve=resolve),cancel]);
      if(cancelled)return undefined;
      const bytes=oversize?30*MB:sizes.get(name)??MB;
      progress({totalBytesWritten:bytes,totalBytesExpectedToWrite:bytes});if(cancelled)return undefined;
      files.set(uri,bytes);const sequence=statuses.get(name);return {status:sequence?.shift()??200};
    }};}};
function load(file){if(modules.has(file))return modules.get(file);const exports={};modules.set(file,exports);
  new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
    if(name==='expo-file-system/legacy')return native;
    if(name==='@/config/media')return {deliveredMediaFilename:f=>f,deliveredMediaKey:f=>f,mediaSizeBytes:f=>sizes.get(f),mediaConfig:{enabled:true},mediaUrl:f=>'https://fixture.invalid/'+f};
    if(name==='@/services/media-auth')return {mediaGrant:async()=> 'fixture'};
    if(name==='@/domain/ui-copy')return {t:x=>x};
    if(name==='@/domain/media-policy')return {MEDIA_POLICY:{cacheBytes:200*MB,speculationBytes:12*MB,unknownForegroundBytes:16*MB,transferReserveBytes:10*MB,downloadTimeoutMs:40}};
    if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');throw Error(name);
  },exports);return exports;}
const tick=()=>new Promise(setImmediate);
(async()=>{
  const cache=load('src/services/media-cache.ts'),preload=load('src/services/media-preload.ts');
  sizes.set('first.jpg',120*MB);sizes.set('second.jpg',120*MB);hold='first.jpg';
  cache.protectMedia('active',['first.jpg','second.jpg']);
  const first=cache.cachedMediaUri('first.jpg');await tick();
  await assert.rejects(()=>cache.cachedMediaUri('second.jpg'),/Brak miejsca/);assert(!started.includes('second.jpg'),'reservation includes the other temporary transfer');
  heldResolve();await first;hold=null;assert.equal(await cache.cacheSizeBytes(),120*MB);cache.releaseProtectedMedia('active');await cache.clearMediaCache();
  sizes.set('shared.jpg',MB);hold='shared.jpg';const before=started.length;
  const one=cache.cachedMediaUri('shared.jpg'),two=cache.cachedMediaUri('shared.jpg');await tick();heldResolve();await Promise.all([one,two]);hold=null;
  assert.equal(started.length,before+1,'shared download reserves/writes once');await cache.clearMediaCache();
  sizes.set('large.jpg',9*MB);sizes.set('video.mp4',4*MB);sizes.set('small.jpg',MB);
  await preload.preloadMedia(['large.jpg','video.mp4','small.jpg']);assert(files.has(dir+'large.jpg'));assert(!files.has(dir+'video.mp4'));assert(!files.has(dir+'small.jpg'),'keep ordering when byte window is full');
  const prior=started.length;assert.equal(await cache.cachedMediaUri('unknown.jpg',false,'background'),undefined);assert.equal(started.length,prior);
  assert(await cache.cachedMediaUri('unknown.jpg'),'controlled unknown foreground is allowed');
  sizes.set('timeout.jpg',MB);hold='timeout.jpg';await assert.rejects(()=>cache.cachedMediaUri('timeout.jpg'),/przerwane|długo/);hold=null;
  assert(![...files.keys()].some(uri=>uri.endsWith('.download')),'cancel settles before cleanup');
  sizes.set('oversize.jpg',MB);oversize=true;await assert.rejects(()=>cache.cachedMediaUri('oversize.jpg'),/przerwane/);oversize=false;
  sizes.set('retry.jpg',MB);statuses.set('retry.jpg',[503,200]);const retries=started.length;assert(await cache.cachedMediaUri('retry.jpg'));assert.equal(started.length,retries+2);
  sizes.set('denied.jpg',MB);statuses.set('denied.jpg',[403]);const denied=started.length;await assert.rejects(()=>cache.cachedMediaUri('denied.jpg'),/Dostęp/);assert.equal(started.length,denied+1,'403 is never retried/downgraded');
  free=2*MB;sizes.set('disk.jpg',MB);const disk=started.length;await assert.rejects(()=>cache.cachedMediaUri('disk.jpg'),/telefonie/);assert.equal(started.length,disk);free=1000*MB;
  await cache.clearMediaCache();files.set(dir+'old.jpg',170*MB);files.set(dir+'pinned.jpg',60*MB);files.set(dir+'orphan.123.download',MB);
  cache.protectMedia('active',['pinned.jpg']);await cache.trimMediaCache();assert(files.has(dir+'pinned.jpg'));assert(!files.has(dir+'old.jpg'));assert(!files.has(dir+'orphan.123.download'));
  cache.releaseProtectedMedia('active');await cache.clearMediaCache();
  // Cancellation of a queued foreground job must prevent its HTTP request too.
  sizes.set('block1.jpg',MB);sizes.set('block2.jpg',MB);sizes.set('obsolete.jpg',MB);
  hold='block1.jpg';const block1=cache.cachedMediaUri('block1.jpg');await tick();const release1=heldResolve;
  hold='block2.jpg';const block2=cache.cachedMediaUri('block2.jpg');await tick();const release2=heldResolve;
  let current=true;const obsolete=cache.cachedMediaUri('obsolete.jpg',false,'foreground',()=>current);await tick();current=false;
  release1();release2();await Promise.all([block1,block2,obsolete]);hold=null;assert(!started.includes('obsolete.jpg'));
  const diagnostics=load('src/services/media-diagnostics.ts').readMediaDiagnostics();assert(diagnostics.length<=128);assert(!JSON.stringify(diagnostics).includes('fixture.invalid'));
  console.log('Media budgets: pre-write/shared reservations, byte window, unknown sizes, native timeout/oversize cancellation, one 503 retry/no 403 retry, disk headroom, pinned migration/orphan cleanup and queued foreground cancellation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
