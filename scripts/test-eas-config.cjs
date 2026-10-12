const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),base=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo;
const eas=JSON.parse(fs.readFileSync(path.join(root,'eas.json'),'utf8'));
const exportsConfig={};new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,'app.config.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(require,exportsConfig);
const configure=exportsConfig.default,{readiness}=require('./check-eas-readiness.cjs');
const unlinked={...base,extra:{...base.extra,eas:{...base.extra?.eas,projectId:undefined}}};
// Fixture UUID used only in memory; never written to app configuration.
const id='12345678-1234-1234-1234-123456789abc';
const original=process.env.EAS_BUILD;delete process.env.EAS_BUILD;
try {
  let c=configure({config:unlinked});assert.equal(c.updates.enabled,false);assert.equal(c.updates.url,undefined);assert.equal(c.runtimeVersion.policy,'fingerprint');
  assert(readiness(c,{}).some(v=>v.includes('projectId')));
  assert.throws(()=>configure({config:{...base,extra:{eas:{projectId:'placeholder'}}}}));
  c=configure({config:{...base,extra:{other:'preserved',eas:{projectId:id}},updates:{disableAntiBrickingMeasures:false}}});
  assert.equal(c.extra.other,'preserved');assert.equal(c.updates.url,`https://u.expo.dev/${id}`);assert(c.updates.enabled);assert.equal(c.updates.fallbackToCacheTimeout,0);assert(c.updates.useEmbeddedUpdate);assert.equal(c.updates.disableAntiBrickingMeasures,false);
  const env={EXPO_PUBLIC_SUPABASE_URL:'https://example.supabase.co',EXPO_PUBLIC_MEDIA_BASE_URL:'https://media.example.com',EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};
  assert.deepEqual(readiness(c,env),[]);
  assert(readiness(c,{...env,EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_fixture'}).length);
  const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.deepEqual(readiness(c,{...env,EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}),[]);
  assert(readiness(c,{...env,EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('service_role')}).length);
  assert(readiness(c,{...env,EXPO_PUBLIC_MEDIA_BASE_URL:'http://localhost:8080'}).length);
  assert(readiness(c,{...env,EXPO_PUBLIC_MEDIA_BASE_URL:'https://user:password@example.com'}).length);
  assert.deepEqual(readiness(c,{},'development'),[],'Metro supplies client vars for development');
  process.env.EAS_BUILD='true';assert.throws(()=>configure({config:unlinked}));assert(configure({config:{...base,extra:{eas:{projectId:id}}}}).updates.enabled);
} finally {if(original===undefined)delete process.env.EAS_BUILD;else process.env.EAS_BUILD=original;}
assert.equal(base.ios.bundleIdentifier,'pl.ezprawko.app');assert.equal(base.android.package,'pl.ezprawko.app');
for(const profile of ['development','preview','production']){assert.equal(eas.build[profile].channel,profile);assert.equal(eas.build[profile].environment,profile);assert(!eas.build[profile].env,'public config must not be hardcoded in build profiles');}
assert(eas.build.development.developmentClient);assert.equal(eas.build.preview.android.buildType,'apk');assert.equal(eas.build.production.android.buildType,'app-bundle');assert.equal(eas.build.production.distribution,'store');assert(eas.build.production.autoIncrement);assert(eas.build.preview.autoIncrement);
const ignore=require('ignore')().add(fs.readFileSync(path.join(root,'.easignore'),'utf8'));
for(const file of ['multimedia_do_pytan.zip','gov-attachment.xlsx','.env.local','.env.production','.aws/credentials','.codex/state.json','credentials.json','key.p12','infrastructure/supabase/.env','supabase/config.toml','wideo/test.mp4','zdjecia/test.jpg','android/build.gradle','ios/Info.plist'])assert(ignore.ignores(file),`excluded: ${file}`);
for(const file of ['app.config.ts','app.json','eas.json','package.json','package-lock.json','src/app/_layout.tsx','scripts/check-eas-readiness.cjs','assets/database/questions.db','assets/data/question-translations.json','assets/signs/A-1.webp','assets/images/ezprawko-icon.png'])assert(!ignore.ignores(file),`retained: ${file}`);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));assert(pkg.dependencies['expo-updates']);assert.equal(pkg.scripts['eas-build-post-install'],'node scripts/check-eas-readiness.cjs');
console.log('EAS config: project-link gating, fingerprint, offline startup, separate channels/environments, remote versioning, public-key guard and upload exclusion/inclusion contracts passed. No remote changes.');
