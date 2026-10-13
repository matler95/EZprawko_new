// Hook/native contract harness, not physical-device haptic verification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
let reduced=false,focused=true,theme='light',haptics=0,starts=0,stops=0,rejectHaptics=false;
let refs=[],states=[],effects=[],previous=[],refIndex=0,stateIndex=0;
const native = {
  View:'View',Text:'Text',StyleSheet:{ create:(s)=>s,absoluteFill:{ position:'absolute',top:0,left:0,right:0,bottom:0 } },Platform:{ select:(s)=>s.default },AppState:{ currentState:'active' },
  Animated:{ View:'AnimatedView',Value:class { constructor(v){this.value=v;} setValue(v){this.value=v;} },
    timing:(_,config)=>{ assert(config.useNativeDriver&&config.isInteraction===false); return config; },sequence:(v)=>v,
    loop:()=>({ start:()=>starts++,stop:()=>stops++ }) },
};
const cache=new Map();
function load(file) {
  if(cache.has(file))return cache.get(file);
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{ compilerOptions:{ module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true } }).outputText;
  new Function('require','exports',code)((name)=>{
    if(name==='react')return { ...React,useEffect:(fn,deps)=>effects.push({fn,deps}),
      useRef:(initial)=>{const i=refIndex++;return refs[i]??(refs[i]={current:initial});},
      useState:(initial)=>{const i=stateIndex++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],()=>{}];} };
    if(name==='react/jsx-runtime')return require(name);
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: load('src/domain/ui-copy.ts').t, language: load('src/domain/ui-language.ts').uiLanguage() }) };
    if(name==='react-native')return native;
    if(name==='expo-router')return {useIsFocused:()=>focused};
    if(name==='expo-haptics')return { NotificationFeedbackType:{ Warning:'Warning' },notificationAsync:(kind)=>{
      assert.equal(kind,'Warning');haptics++;return rejectHaptics?Promise.reject(Error('unsupported device')):Promise.resolve();
    } };
    if(name==='@/hooks/use-reduced-motion')return {useReducedMotion:()=>reduced};
    if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors[theme]})};
    if(name==='@/global.css')return {};
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);
    throw Error(`Unexpected dependency ${name}`);
  },exports);cache.set(file,exports);return exports;
}
const {timerLevel,questionTimerSeconds}=load('src/domain/timer-presentation.ts');
const {ExamTimer}=load('src/components/exam-timer.tsx');
function unmount(){for(const e of previous)e.cleanup?.();refs=[];states=[];previous=[];}
function render(props){
  refIndex=0;stateIndex=0;effects=[];const tree=ExamTimer(props);
  previous=effects.map((e,i)=>{
    const old=previous[i];
    if(old&&old.deps.length===e.deps.length&&old.deps.every((d,j)=>Object.is(d,e.deps[j])))return old;
    old?.cleanup?.();return {...e,cleanup:e.fn()};
  });return tree;
}
for(const [seconds,level] of [[50,'normal'],[11,'normal'],[10,'warning'],[5,'warning'],[4,'critical'],[1,'critical'],[0,'expired']])assert.equal(timerLevel(seconds,true,true),level);
assert.equal(timerLevel(1,true,false),'normal');
assert.equal(timerLevel(61,false,true),'normal');assert.equal(timerLevel(60,false,true),'warning');assert.equal(timerLevel(30,false,true),'critical');
assert.equal(questionTimerSeconds({key:'old:ANSWERING',seconds:2},'new:ANSWERING',50),50);
assert.equal(questionTimerSeconds({key:'same:READING',seconds:2},'same:ANSWERING',15),15);
assert.equal(questionTimerSeconds({key:'same:ANSWERING',seconds:2},'same:ANSWERING',15),2);
for(theme of ['light','dark']){
  unmount();const before=haptics;const colors=load('src/constants/theme.ts').Colors[theme];
  assert.equal(render({seconds:10,question:true}).props.style[1].backgroundColor,colors.warningSurface);
  assert.equal(render({seconds:5,question:true}).props.style[1].backgroundColor,colors.warningSurface);
  assert.equal(haptics,before);
  assert.equal(render({seconds:4,question:true}).props.style[1].backgroundColor,colors.errorSurface);
  for(const seconds of [3,2,1,0])render({seconds,question:true});
  assert.equal(haptics,before+1,'one warning per keyed question/phase');
  unmount();render({seconds:4,question:true});assert.equal(haptics,before+2,'next question gets its own warning');
}
for(const config of [{reduced:true,focused:true,active:true,bg:false},{reduced:false,focused:false,active:true,bg:false},
  {reduced:false,focused:true,active:false,bg:false},{reduced:false,focused:true,active:true,bg:true}]){
  unmount();reduced=config.reduced;focused=config.focused;native.AppState.currentState=config.bg?'background':'active';const before=haptics;
  render({seconds:4,question:true,active:config.active});assert.equal(haptics,before);
}
unmount();reduced=false;focused=true;native.AppState.currentState='active';const before=haptics;
render({seconds:30});assert.equal(haptics,before,'global timer must not duplicate question haptics');
unmount();rejectHaptics=true;render({seconds:4,question:true});
unmount();assert.equal(starts,stops,'every opacity loop has cleanup');
setImmediate(()=>console.log('Exam timer: boundary colors, two themes, one-shot warnings, stale-clock isolation, reduced motion/focus/background guards, global quiet mode and cleanup passed.'));
