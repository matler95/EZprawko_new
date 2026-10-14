// Real media component/controller with native player and hooks stubbed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const modules=new Map();let states=[],refs=[],effects=[],si=0,ri=0,request,events={},appListener;
let status='readyToPlay',plays=0,pauses=0,replays=0;
const player={duration:6,currentTime:0,seekBy(delta){this.currentTime+=delta;},play(){plays++;},pause(){pauses++;},replay(){replays++;this.currentTime=0;},get status(){return status;}};
function load(file){if(modules.has(file))return modules.get(file);const exports={};modules.set(file,exports);
 new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
  if(name==='react')return {useState:v=>{const i=si++;if(!(i in states))states[i]=v;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useRef:v=>{const i=ri++;return refs[i]??(refs[i]={current:v});},useEffect:f=>effects.push(f),useCallback:f=>f};
  if(name==='react/jsx-runtime')return require(name);
  if(name==='react-native')return {StyleSheet:{create:s=>s},Platform:{},AppState:{addEventListener:(_event,fn)=>{appListener=fn;return{remove(){}};}},...Object.fromEntries(['View','Text','Pressable','Image','ScrollView','Modal','KeyboardAvoidingView','ActivityIndicator'].map(x=>[x,x]))};
  if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
  if(name==='expo-router')return {router:{}};
  if(name==='expo')return {useEvent:()=>({status}),useEventListener:(_player,event,fn)=>events[event]=fn};
  if(name==='expo-video')return {VideoView:'VideoView',useVideoPlayer:(_uri,setup)=>{setup(player);return player;}};
  if(name==='@/hooks/use-translation')return {useTranslation:()=>({t:x=>x})};
  if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:{}})};
  if(name==='@/config/media')return {mediaConfig:{enabled:true},deliveredMediaFilename:x=>x.replace(/\.wmv$/i,'.mp4')};
  if(name==='@/services/media-cache')return {cachedMediaUri:async()=> 'file:///fixture.mp4'};
  if(name==='@/components/media-account-card')return {};
  if(name==='@/domain/media-error')return {mediaFailure:()=>({message:'fixture'})};
  if(name==='@/services/media-diagnostics')return {recordMediaDiagnostic(){}};
  throw Error(name);
 },exports);return exports;
}
const tick=()=>new Promise(setImmediate);
const nodes=t=>t&&typeof t==='object'?[t,...[t.props?.children].flat(Infinity).flatMap(nodes)]:[];
const render=(component,props)=>{si=ri=0;effects=[];const tree=component(props);effects.forEach(f=>f());return tree;};
(async()=>{
 const {QuestionMedia}=load('src/components/question-media.tsx');
 render(QuestionMedia,{filename:'fixture.wmv'});await tick();const media=render(QuestionMedia,{filename:'fixture.wmv'});
 const Video=media.type;states=[];refs=[];let ended=0,duration;
 const startedAt=Date.now()+10000;
 const props={...media.props,examMode:true,examPlayback:'waiting',videoStartedAt:startedAt,onVideoDuration:d=>duration=d,onVideoEnd:()=>ended++};
 let tree=render(Video,props);assert.equal(plays,0,'no film during reading');assert.equal(duration,6);
 const view=nodes(tree).find(n=>n.type==='VideoView');
 assert.equal(view.props.nativeControls,false);assert.equal(view.props.fullscreenOptions.enable,false);assert.equal(view.props.allowsPictureInPicture,false);assert.equal(view.props.pointerEvents,'none');
 assert(!nodes(tree).some(n=>n.type==='Pressable'),'no exam replay button');
 render(Video,{...props,examPlayback:'playing'});assert.equal(plays,1);
 render(Video,{...props,examPlayback:'playing'});assert.equal(plays,1,'renders cannot replay the clip');
 events.playToEnd();events.playToEnd();assert.equal(ended,1);
 render(Video,{...props,examPlayback:'finished'});assert.equal(plays,1);assert(pauses>0);
 states=[];refs=[];plays=0;ended=0;
 render(Video,{...props,examPlayback:'playing',videoStartedAt:Date.now()-2000});assert(player.currentTime>=2,'resume seeks forward, never restarts at zero');
 const before=Date.now;Date.now=()=>before()+10000;
 try{appListener('active');assert.equal(ended,1);assert(player.currentTime>5.9);}finally{Date.now=before;}
 states=[];refs=[];plays=0;
 tree=render(Video,{...media.props,examMode:false});const replay=nodes(tree).find(n=>n.type==='Pressable');
 assert(replay&&!replay.props.disabled);replay.props.onPress();assert.equal(replays,1);assert.equal(plays,1);
 assert.equal(nodes(tree).find(n=>n.type==='VideoView').props.nativeControls,true);
 console.log('Exam media: reading gate, single autoplay, no pause/seek/fullscreen/PiP controls, resume/background wall time, one end event and Study replay passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
