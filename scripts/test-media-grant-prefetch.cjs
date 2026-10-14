const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const modules=new Map(),files=new Set(),primes=[],downloads=[];
function load(file){if(modules.has(file))return modules.get(file);const exports={};modules.set(file,exports);
  new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
    if(name==='@/services/media-cache')return {cachedMediaUri:async(file,only)=>{if(files.has(file))return 'fixture';if(only)return undefined;downloads.push(file);files.add(file);return 'fixture';}};
    if(name==='@/services/media-auth')return {primeMediaGrants:async keys=>primes.push(keys)};
    if(name==='@/config/media')return {deliveredMediaFilename:f=>f,deliveredMediaKey:f=>'wideo/'+f,mediaSizeBytes:()=>1000};
    if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');throw Error(name);
  },exports);return exports;}
(async()=>{
  const {prepareExamMedia}=load('src/services/media-preload.ts');
  const questions=Array.from({length:17},(_,i)=>({mediaFilename:i+'.mp4'}));
  await prepareExamMedia(questions);assert.equal(primes.length,3);assert.deepEqual(primes.map(p=>p.length),[8,8,1]);assert.equal(downloads.length,17);
  const count=primes.length;await prepareExamMedia(questions);assert.equal(primes.length,count,'warm/offline cache does not invoke grant preparation at all');
  console.log('Grant lookahead: one shared authorization chunk per eight cold upcoming files, both workers coalesce priming, warm files require zero object grants.');
})().catch(error=>{console.error(error);process.exitCode=1;});
