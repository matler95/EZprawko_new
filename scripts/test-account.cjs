// No live authentication: auth/network/native components are stubs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
const root=path.resolve(__dirname,'..'),cache=new Map();
let states=[],refs=[],memo=[],effects=[],pending=[],cleanups=[],si=0,ri=0,ci=0,ei=0,focus,authListener,foreground,theme='light';
let configured=true,session=null,readError=false,authError=null,logoutError=null,loginDelay=null,readDelay=null,loginCalls=[],logoutCalls=0,returned=0,grantStatus=0;
const signed={user:{email:'tester@fixture.example'},access_token:'fixture-only'};
const supabase={auth:{
  getSession:async()=>{const value=session;if(readDelay)await readDelay;return {data:{session:value},error:readError?{code:'read_failed'}:null};},
  onAuthStateChange:fn=>{authListener=fn;return {data:{subscription:{unsubscribe:()=>{authListener=null;}}}};},
  signInWithPassword:async args=>{loginCalls.push(args);if(loginDelay)await loginDelay;if(authError)return {data:{session:null},error:authError};session=signed;authListener?.('SIGNED_IN',session);return {data:{session},error:null};},
  signOut:async options=>{assert.equal(options.scope,'local');logoutCalls++;if(logoutError)return {error:logoutError};session=null;authListener?.('SIGNED_OUT',null);return {error:null};}
},functions:{invoke:async()=>grantStatus?{data:null,error:{context:new Response(null,{status:grantStatus})}}:{data:{token:'fixture-only'},error:null}}};
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
  if(name==='react')return {...React,useRef:v=>{const i=ri++;return refs[i]??(refs[i]={current:v});},useState:v=>{const i=si++;if(!(i in states))states[i]=v;return [states[i],x=>states[i]=typeof x==='function'?x(states[i]):x];},useCallback:(f,deps)=>{const i=ci++;if(!memo[i]||deps.some((v,j)=>v!==memo[i].deps[j]))memo[i]={fn:f,deps};return memo[i].fn;},useEffect:(f,deps)=>{const i=ei++;if(!effects[i]||deps.some((v,j)=>v!==effects[i][j])){effects[i]=deps;pending.push(f);}}};
  if(name==='react/jsx-runtime')return require(name);
  if(name==='react-native')return {Text:'Text',TextInput:'TextInput',View:'View',Pressable:'Pressable',Modal:'Modal',ScrollView:'ScrollView',SafeAreaView:'SafeAreaView',KeyboardAvoidingView:'KeyboardAvoidingView',Image:'Image',ActivityIndicator:'ActivityIndicator',Keyboard:{dismiss:()=>{}},AppState:{addEventListener:(_type,fn)=>{foreground=fn;return {remove:()=>{foreground=null;}};}},StyleSheet:{create:s=>s},Platform:{OS:'ios',select:s=>s.default}};
  if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
  if(name==='expo-router')return {useFocusEffect:f=>focus=f};
  if(name==='expo')return {useEventListener:()=>{}};
  if(name==='expo-video')return {useVideoPlayer:()=>({}),VideoView:'VideoView'};
  if(name==='@/services/supabase')return {supabase,get supabaseConfigured(){return configured;}};
  if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors[theme]})};
  if(name==='@/services/media-cache')return {cachedMediaUri:async()=>{if(!session)throw new (load('src/domain/account.ts').MediaAccountRequiredError)();return 'file:///fixture.jpg';}};
  if(name==='@/config/media')return {mediaConfig:{enabled:true},deliveredMediaFilename:f=>f};
  if(name==='@/global.css')return {};
  if(name.startsWith('@/')){const base=`src/${name.slice(2)}`;return load(fs.existsSync(path.join(root,base+'.tsx'))?base+'.tsx':base+'.ts');}throw Error(name);
},exports);return exports;}
function nodes(t){if(!t||typeof t!=='object')return [];const c=t.props?.children;return [t,...(Array.isArray(c)?c.flat(Infinity):[c]).flatMap(nodes)];}
function text(t){if(typeof t==='string')return t;if(!t||typeof t!=='object')return '';const c=t.props?.children;return (Array.isArray(c)?c.flat(Infinity):[c]).map(text).join(' ').replace(/\s+/g,' ');}
function button(t,label){const n=nodes(t).find(n=>n.type==='Pressable'&&text(n)===label);assert(n,`Missing ${label}: ${text(t)}`);return n;}
function input(t,label){return nodes(t).find(n=>n.type==='TextInput'&&n.props.accessibilityLabel===label);}
function resetHooks(){states=[];refs=[];memo=[];effects=[];pending=[];cleanups=[];}
function render(Component,props){si=ri=ci=ei=0;const tree=Component(props);const run=pending;pending=[];for(const f of run){const cleanup=f();if(cleanup)cleanups.push(cleanup);}return tree;}
function unmount(){cleanups.forEach(f=>f());cleanups=[];}
const tick=()=>new Promise(setImmediate);
(async()=>{
  const domain=load('src/domain/account.ts'),account=load('src/services/account.ts'),Card=load('src/components/media-account-card.tsx').MediaAccountCard;
  assert(domain.validLoginEmail(' test+tag@example.com '));assert(!domain.validLoginEmail('missing@'));assert(!domain.validLoginEmail('a b@example.com'));
  assert(!domain.accountErrorMessage({message:'SECRET_DETAILS'}).includes('SECRET_DETAILS'));
  assert.match(domain.accountErrorMessage({status:429}),/wiele prób/);
  for(theme of ['light','dark']){
    resetHooks();session=null;loginCalls=[];returned=0;authError=null;logoutError=null;
    const props={onAuthenticated:()=>returned++};render(Card,props);const blur=focus();await tick();let tree=render(Card,props);
    await button(tree,'Zaloguj się').props.onPress();tree=render(Card,props);assert.match(text(tree),/poprawny adres/);assert.match(text(tree),/Wpisz hasło/);assert.equal(loginCalls.length,0);
    input(tree,'E-mail').props.onChangeText(' test+tag@example.com ');input(tree,'Hasło').props.onChangeText(' secret with spaces ');tree=render(Card,props);
    button(tree,'Pokaż hasło').props.onPress();tree=render(Card,props);assert.equal(input(tree,'Hasło').props.secureTextEntry,false);
    authError={code:'invalid_credentials',message:'SERVER_SECRET'};button(tree,'Zaloguj się').props.onPress();await tick();tree=render(Card,props);assert.match(text(tree),/Sprawdź e-mail i hasło/);assert(!text(tree).includes('SERVER_SECRET'));authError=null;
    const submit=button(tree,'Zaloguj się');submit.props.onPress();submit.props.onPress();await tick();tree=render(Card,props);assert.equal(loginCalls.length,2,'one failure and one nonduplicated success');assert.equal(loginCalls[1].email,'test+tag@example.com');assert.equal(loginCalls[1].password,' secret with spaces ');assert.equal(returned,1);assert.match(text(tree),/Serwer sprawdza dostęp/);assert(!text(tree).includes('Możesz pobierać'));
    logoutError={status:503};button(tree,'Wyloguj z tego urządzenia').props.onPress();await tick();tree=render(Card,props);assert.match(text(tree),/Operacja konta/);assert(session);logoutError=null;
    button(tree,'Wyloguj z tego urządzenia').props.onPress();await tick();tree=render(Card,props);assert.equal(session,null);assert.equal(input(tree,'Hasło').props.value,'');assert(input(tree,'Hasło').props.secureTextEntry);
    input(tree,'Hasło').props.onChangeText('temporary');blur();tree=render(Card,props);assert.equal(input(tree,'Hasło').props.value,'');
    readError=true;foreground('active');await tick();tree=render(Card,props);assert(button(tree,'Sprawdź ponownie'));readError=false;button(tree,'Sprawdź ponownie').props.onPress();await tick();assert(input(render(Card,props),'E-mail'));unmount();
  }
  resetHooks();session=null;configured=false;render(Card,{});assert.match(text(render(Card,{})),/nie jest dostępne/);assert(!input(render(Card,{}),'E-mail'));unmount();configured=true;
  // A late stored-session read cannot overwrite a newer auth event.
  resetHooks();session=null;let release;readDelay=new Promise(r=>release=r);render(Card,{});await tick();session=signed;authListener('SIGNED_IN',session);release();await tick();assert.match(text(render(Card,{})),/tester@fixture.example/);readDelay=null;unmount();
  resetHooks();session=null;returned=0;render(Card,{onAuthenticated:()=>returned++});const closeFocus=focus();await tick();let closing=render(Card,{onAuthenticated:()=>returned++});
  input(closing,'E-mail').props.onChangeText('test@example.com');input(closing,'Hasło').props.onChangeText('fixture');closing=render(Card,{onAuthenticated:()=>returned++});
  loginDelay=new Promise(r=>release=r);button(closing,'Zaloguj się').props.onPress();await tick();closeFocus();unmount();release();await tick();loginDelay=null;assert.equal(returned,0,'late completion after closing must not navigate');assert(session,'closing UI is not cancellation of an authorized server request');await account.signOutLocalAccount();
  // Full deletion queues after pending login; progress-only reset does not clear login.
  session=null;loginDelay=new Promise(r=>release=r);const pendingLogin=account.signInExistingAccount('test@example.com','fixture');await tick();
  const maintenance=load('src/domain/data-maintenance.ts');let erasure;
  const removing=maintenance.withDataMaintenance(async()=>{erasure=account.signOutLocalAccount();await erasure;});
  release();await assert.rejects(()=>pendingLogin);await removing;loginDelay=null;assert.equal(session,null);
  loginDelay=new Promise(r=>release=r);const interrupted=account.signInExistingAccount('test@example.com','fixture');await tick();await maintenance.withDataMaintenance(async()=>{});release();await assert.rejects(()=>interrupted);loginDelay=null;assert(session,'progress-only maintenance preserves authorized login');await account.signOutLocalAccount();
  const auth=load('src/services/media-auth.ts');await assert.rejects(()=>auth.mediaGrant('one.jpg'),domain.MediaAccountRequiredError);
  session=signed;grantStatus=401;await assert.rejects(()=>auth.mediaGrant('one.jpg'),domain.MediaAccountRequiredError);grantStatus=403;await assert.rejects(()=>auth.mediaGrant('one.jpg'),e=>!(e instanceof domain.MediaAccountRequiredError));grantStatus=0;
  resetHooks();session=null;const Media=load('src/components/question-media.tsx').QuestionMedia;render(Media,{filename:'one.jpg'});await tick();let tree=render(Media,{filename:'one.jpg'});button(tree,'Zaloguj się do materiałów').props.onPress();tree=render(Media,{filename:'one.jpg'});assert(nodes(tree).find(n=>n.type==='Modal').props.visible);
  const card=nodes(tree).find(n=>n.type===Card);assert(card);session=signed;card.props.onAuthenticated();render(Media,{filename:'one.jpg'});await tick();tree=render(Media,{filename:'one.jpg'});assert(nodes(tree).some(n=>n.type==='Image'),'same material loads without route navigation');unmount();
  resetHooks();session=null;render(Media,{filename:'one.jpg',examMode:true});await tick();tree=render(Media,{filename:'one.jpg',examMode:true});assert(!nodes(tree).some(n=>n.type==='Modal'),'no login overlay during exam');assert(!nodes(tree).some(n=>n.type==='Pressable'&&text(n)==='Zaloguj się do materiałów'));unmount();
  console.log('Account UX: validation/no secret error echoes, password visibility/clearing, both themes, double-tap guard, stored-session race/retry, local logout, login/delete queue, same-media return and exam overlay exclusion passed. No live auth or account mutation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
