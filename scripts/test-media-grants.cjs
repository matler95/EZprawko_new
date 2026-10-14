// Both real endpoint signing and real client batching; no live accounts/network.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path'),{createHmac}=require('node:crypto');
const root=path.join(__dirname,'..');let handler,userChecks=0,status=200,legacy=false,legacySuccess=false,plainResponse=false,listener;
const secret='fixture-only',env={MEDIA_TOKEN_SECRET:secret,SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'fixture'};
new Function('Deno','fetch',ts.transpileModule(fs.readFileSync(path.join(root,'infrastructure/supabase/functions/media-token/index.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(
 {env:{get:key=>env[key]},serve:fn=>handler=fn},async()=>{userChecks++;return Response.json({id:'user-one'},{status});});
const send=body=>handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)}));
let session={access_token:'account-one'},invocations=[],hold=null;
const supabase={auth:{onAuthStateChange:fn=>{listener=fn;return {data:{subscription:{unsubscribe(){}}}};},getSession:async()=>({data:{session},error:null})},
 functions:{invoke:async(_name,{body})=>{
   invocations.push(body);if(hold)await hold;
   const response=status===403?new Response(null,{status:403}):legacySuccess?await send({filename:body.filename}):legacy&&body.filenames?new Response(null,{status:400}):await send(body);
   return response.ok?{data:await response.json(),error:null}:{data:null,error:{context:plainResponse?{status:response.status}:response}};
 }}};
const modules=new Map();
function load(file){if(modules.has(file))return modules.get(file);const exports={};modules.set(file,exports);
 new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
  if(name==='@/services/supabase')return {supabase,supabaseConfigured:true};
  if(name==='@/domain/ui-copy')return {t:x=>x};
  if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');throw Error(name);
 },exports);return exports;
}
(async()=>{
 let response=await send({filenames:['wideo/a.mp4','zdjecia/a.jpg','wideo/a.mp4']});
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 const grants=(await response.json()).grants;assert.equal(grants.length,2);assert.equal(userChecks,1);
 for(const grant of grants){
  const [header,payload,signature]=grant.token.split('.');
  assert.equal(signature,createHmac('sha256',secret).update(header+'.'+payload).digest('base64url'));
  const claims=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(claims.key,grant.filename);assert.equal(claims.sub,'user-one');assert.equal(claims.exp,grant.expiresAt);
 }
 for(const body of [null,[],{filenames:[]},{filenames:Array(9).fill('a.jpg')},{filenames:['../a.jpg']},{filenames:['a//b']},{filenames:['a\u0000.jpg']}])
  assert.equal((await send(body)).status,400);
 assert.equal((await send({filename:'a.jpg'})).status,200);
 status=401;assert.equal((await send({filenames:['a.jpg']})).status,401);status=200;
 const {mediaGrant}=load('src/services/media-auth.ts');
 invocations=[];const tokens=await Promise.all([mediaGrant('a.jpg'),mediaGrant('b.mp4'),mediaGrant('a.jpg')]);
 assert.equal(invocations.length,1);assert.equal(invocations[0].filenames.length,2);assert.equal(tokens[0],tokens[2]);
 await mediaGrant('a.jpg');assert.equal(invocations.length,1,'valid in-memory grant is reused');
 const beforePrime=invocations.length;
 await load('src/services/media-auth.ts').primeMediaGrants(Array.from({length:9},(_,i)=>'prime-'+i+'.jpg'));
 assert.equal(invocations.length,beforePrime+1);assert.equal(invocations.at(-1).filenames.length,8,'one upcoming authorization chunk is bounded at eight');
 invocations.splice(beforePrime);
 listener('SIGNED_OUT');session=null;await assert.rejects(()=>mediaGrant('a.jpg'),/Zaloguj/);
 session={access_token:'account-two'};listener('SIGNED_IN');await mediaGrant('a.jpg');assert.equal(invocations.length,2);
 const realNow=Date.now;Date.now=()=>realNow()+100_000;
 try {await mediaGrant('a.jpg');assert.equal(invocations.length,3,'near-expiry grants renew');} finally{Date.now=realNow;}
 let release;hold=new Promise(resolve=>release=resolve);
 const delayed=mediaGrant('late.jpg');const outcome=assert.rejects(delayed);
 await new Promise(setImmediate);listener('SIGNED_OUT');session=null;release();await outcome;hold=null;
 session={access_token:'account-three'};listener('SIGNED_IN');legacy=true;plainResponse=true;
 await mediaGrant('legacy.jpg');assert(invocations.some(body=>body.filename==='legacy.jpg'));
 status=403;await assert.rejects(()=>mediaGrant('denied.jpg'),/Dostęp/);status=200;
 modules.delete('src/services/media-auth.ts');legacy=false;legacySuccess=true;invocations=[];
 const compatible=load('src/services/media-auth.ts').mediaGrant;
 const oldTokens=await Promise.all([compatible('old-first.jpg'),compatible('old-second.mp4')]);
 assert.equal(invocations.length,2,'old endpoint success reuses the first grant, only requests the second separately');
 const claims=oldTokens.map(token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url')));
 assert.deepEqual(claims.map(value=>value.key),['old-first.jpg','old-second.mp4']);
 assert.notEqual(oldTokens[0],oldTokens[1],'a legacy grant cannot be reused across files');
 await compatible('old-first.jpg');assert.equal(invocations.length,2);
 listener('SIGNED_OUT');session=null;await assert.rejects(()=>compatible('old-first.jpg'),/Zaloguj/);
 const worker=await import('data:text/javascript;base64,'+fs.readFileSync(path.join(root,'infrastructure/cloudflare-media-worker/src/index.js')).toString('base64'));
 let reads=0;const workerEnv={MEDIA_TOKEN_SECRET:secret,MEDIA_BUCKET:{get:async()=>{reads++;return {body:'fixture',httpEtag:'etag',writeHttpMetadata(){}};}}};
 const accepted=await worker.default.fetch(new Request('https://fixture.invalid/media/'+grants[0].filename,{headers:{Authorization:'Bearer '+grants[0].token}}),workerEnv);
 assert.equal(accepted.status,200);
 const rejected=await worker.default.fetch(new Request('https://fixture.invalid/media/wideo/other.mp4',{headers:{Authorization:'Bearer '+grants[0].token}}),workerEnv);
 assert.equal(rejected.status,401);assert.equal(reads,1,'batch grants remain object-bound');
 console.log('Media grants: one user check/batch, <=8 validation, signatures/Worker binding, coalescing/cache/expiry, logout fencing and legacy fallback passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
