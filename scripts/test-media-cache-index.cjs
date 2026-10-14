const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path');
const root=path.join(__dirname,'..'),modules=new Map(),files=new Map(),dir='file:///cache/question-media/';
let scans=0,stats=0,size=1024*1024,inventoryDelay=null;
const filesystem={cacheDirectory:'file:///cache/',makeDirectoryAsync:async()=>{},
 getInfoAsync:async uri=>{stats++;return uri===dir?{exists:true,isDirectory:true}:files.has(uri)?{exists:true,isDirectory:false,size:files.get(uri),modificationTime:1}:{exists:false};},
 readDirectoryAsync:async()=>{scans++;if(inventoryDelay)await inventoryDelay;return [...files.keys()].map(uri=>uri.slice(dir.length));},
 downloadAsync:async(_remote,uri)=>{files.set(uri,size);return {status:200};},
 moveAsync:async({from,to})=>{files.set(to,files.get(from));files.delete(from);},
 deleteAsync:async uri=>{if(uri===dir)files.clear();else files.delete(uri);}};
function load(file){if(modules.has(file))return modules.get(file);const exports={};modules.set(file,exports);
 new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
  if(name==='expo-file-system/legacy')return filesystem;
  if(name==='@/config/media')return {mediaSizeBytes:()=>size,deliveredMediaFilename:x=>x,deliveredMediaKey:x=>x,mediaConfig:{enabled:true},mediaUrl:x=>'https://fixture.invalid/'+x};
  if(name==='@/services/media-auth')return {mediaGrant:async()=> 'fixture'};
  if(name==='@/domain/ui-copy')return {t:x=>x};
  if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');throw Error(name);
 },exports);return exports;
}
(async()=>{
 const cache=load('src/services/media-cache.ts'),MB=1024*1024;
 for(let i=0;i<100;i++)files.set(dir+'existing-'+i+'.jpg',MB);
 let release;inventoryDelay=new Promise(resolve=>release=resolve);
 const first=cache.cachedMediaUri('new-0.jpg');await new Promise(setImmediate);
 assert.equal(await cache.cachedMediaUri('new-0.jpg',true),undefined,'a cache-only probe cannot expose a commit before its budget check');
 release();await first;inventoryDelay=null;
 await Promise.all(Array.from({length:19},(_,i)=>cache.cachedMediaUri('new-'+(i+1)+'.jpg')));
 assert.equal(scans,1,'twenty downloads share one directory inventory, not twenty scans');
 assert(stats<200,'no full stat pass per download');
 await cache.cachedMediaUri('new-0.jpg',true);assert.equal(scans,1,'warm lookup does not scan the directory');
 await cache.clearMediaCache();files.set(dir+'old.jpg',150*MB);files.set(dir+'pinned.jpg',60*MB);
 cache.protectMedia('active',['pinned.jpg']);size=100*MB;
 await cache.cachedMediaUri('incoming.jpg');
 assert(!files.has(dir+'old.jpg'));assert(files.has(dir+'pinned.jpg'));assert(files.has(dir+'incoming.jpg'));
 assert.equal(scans,2,'clear invalidates the index');
 cache.releaseProtectedMedia('active');await cache.clearMediaCache();size=140*MB;
 cache.protectMedia('exam',['protected-one.jpg','protected-two.jpg']);
 await cache.cachedMediaUri('protected-one.jpg');
 await assert.rejects(()=>cache.cachedMediaUri('protected-two.jpg'),/Brak miejsca/);
 assert(files.has(dir+'protected-one.jpg')&&!files.has(dir+'protected-two.jpg'),'preserve existing protected media, roll back the failed new cache commit');
 await assert.rejects(()=>cache.cachedMediaUri('protected-two.jpg'),/Brak miejsca/,'retry cannot accept a failed over-budget commit');
 cache.releaseProtectedMedia('exam');await cache.clearMediaCache();
 console.log('Cache index: one inventory for twenty downloads, warm lookup, clear invalidation, bounded eviction and protected over-budget failure passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
