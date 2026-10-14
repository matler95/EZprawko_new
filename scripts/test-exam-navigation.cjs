// Real installed Expo Router route compiler; native transitions remain phone QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {getExactRoutes}=require('expo-router/build/getRoutes');
const {getReactNavigationConfig}=require('expo-router/build/getReactNavigationConfig');
const root=path.resolve(__dirname,'../src/app');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const keys=walk(root).filter(file=>/\.tsx$/.test(file)).map(file=>'./'+path.relative(root,file).split(path.sep).join('/'));
const context=key=>({default:()=>null,...(key==='./_layout.tsx'?{unstable_settings:{initialRouteName:'(tabs)'}}:{})});
context.keys=()=>keys;context.resolve=key=>key;context.id='test-real-app-routes';
const routes=getExactRoutes(context,{importMode:'sync',ignoreRequireErrors:false});
const tabs=routes.children.find(route=>route.route==='(tabs)');assert(tabs,'tabs have their own layout');
assert.deepEqual(tabs.children.map(route=>route.route).sort(),['index','progress','settings','signs','study']);
for(const name of ['exam/[id]','exam/review','legal/privacy','legal/terms']){
  assert(routes.children.some(route=>route.route===name),`${name} must be owned by the root stack, not native tabs`);
  assert(!tabs.children.some(route=>route.route===name));
}
const config=getReactNavigationConfig(routes,true);
assert.equal(config.initialRouteName,'(tabs)');
assert.equal(config.screens['exam/[id]'],'exam/:id');
assert.equal(config.screens['exam/review'],'exam/review');
assert.equal(config.screens['(tabs)'].screens.index,'');
assert.equal(config.screens['(tabs)'].screens.study,'study');
const layout=fs.readFileSync(path.join(root,'_layout.tsx'),'utf8');
assert.match(layout,/<Stack screenOptions=/);assert(!layout.includes('<AppTabs'));
assert.match(layout,/name="exam\/\[id\]" options=\{\{ gestureEnabled: false \}\}/,'iOS swipe cannot silently leave a running exam');
assert.match(fs.readFileSync(path.join(root,'(tabs)/_layout.tsx'),'utf8'),/@\/components\/app-tabs/);
const dashboard=fs.readFileSync(path.resolve(root,'../components/dashboard-screen.tsx'),'utf8');
assert.equal((dashboard.match(/pathname: "\/exam\/\[id\]"/g)||[]).length,2,'start and resume use the same reachable route');
console.log('Exam navigation: actual Expo Router compiler resolves root-stack start/resume/review/legal routes, stable tab URLs and default home; no exam hidden under NativeTabs. Native transitions remain device QA.');
