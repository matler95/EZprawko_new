// Native-stub contracts: timings are manually advanced; phone QA is separate.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const React=require('react');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
let ready=true,reduced=false,focused=true,refs=[],states=[],effects=[],prior=[],ri=0,si=0;
const animations=[];
class Value {
  constructor(v){this.value=v;this.listeners=new Map();}
  setValue(v){this.value=v;for(const fn of this.listeners.values())fn({value:v});}
  addListener(fn){const id=String(this.listeners.size+1);this.listeners.set(id,fn);return id;}
  removeListener(id){this.listeners.delete(id);}
  interpolate(config){return config;}
}
const native={ View:'View',Text:'Text',StyleSheet:{create:(s)=>s,absoluteFill:{}},Platform:{select:(v)=>v.default},
  Animated:{View:'AnimatedView',Value,timing:(value,config)=>{
    const entry={value,config,started:false,stopped:false};animations.push(entry);
    return { start:(callback)=>{entry.started=true;entry.callback=callback;},stop:()=>{entry.stopped=true;entry.callback?.({finished:false});} };
  }},
};
const cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file);
  const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','exports',code)((name)=>{
    if(name==='react')return {...React,useEffect:(fn,deps)=>effects.push({fn,deps}),useRef:(initial)=>{const i=ri++;return refs[i]??(refs[i]={current:initial});},
      useState:(initial)=>{const i=si++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],(v)=>{states[i]=typeof v==='function'?v(states[i]):v;}];}};
    if(name==='react/jsx-runtime')return require(name);
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: load('src/domain/ui-copy.ts').t, language: load('src/domain/ui-language.ts').uiLanguage() }) };
    if(name==='react-native')return native;
    if(name==='expo-router')return {useIsFocused:()=>focused};
    if(name==='@/hooks/use-reduced-motion')return {useMotionPreference:()=>({ready,reduced})};
    if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors.light})};
    if(name==='@/global.css')return {};
    if(name.startsWith('@/domain/'))return load(`src/${name.slice(2)}.ts`);
    throw Error(`Unexpected dependency ${name}`);
  },exports);cache.set(file,exports);return exports;
}
function render(component,props){
  ri=0;si=0;effects=[];const tree=component(props);
  prior=effects.map((e,i)=>{const old=prior[i];if(old&&old.deps.every((v,j)=>Object.is(v,e.deps[j])))return old;old?.cleanup?.();return {...e,cleanup:e.fn()};});
  return tree;
}
function reset(){prior.forEach((e)=>e.cleanup?.());refs=[];states=[];prior=[];ready=true;reduced=false;focused=true;}
const text=(node)=>React.isValidElement(node)?React.Children.toArray(node.props.children).map(text).join(''):String(node);
const {QuestionTransition}=load('src/components/question-transition.tsx');
const child=React.createElement('Pressable',{disabled:false},'Answer');
let tree=render(QuestionTransition,{children:child});
assert.equal(tree.props.children,child,'entry transition must not replace or disable the live answer controls');
assert.equal(animations.at(-1).config.duration,180);assert(animations.at(-1).config.useNativeDriver);
reset();assert(animations.at(-1).stopped);
reset();reduced=true;const before=animations.length;
render(QuestionTransition,{children:child});assert.equal(animations.length,before,'Reduce Motion must disable transition');
reset();assert(animations.every((a)=>a.config.isInteraction===false));
console.log('Exam motion: live controls, 180ms question transition, cleanup and reduced motion passed. Result celebrations/counting are removed.');
(async()=>{
  let resolvePreference,onChange,removed=false;
  native.AccessibilityInfo={
    isReduceMotionEnabled:()=>new Promise((resolve)=>{resolvePreference=resolve;}),
    addEventListener:(_,callback)=>{onChange=callback;return {remove:()=>{removed=true;}};},
  };
  const {useMotionPreference}=load('src/hooks/use-reduced-motion.ts');
  reset();assert.deepEqual(render(useMotionPreference),{reduced:true,ready:false});
  onChange(true);resolvePreference(false);await Promise.resolve();
  assert.deepEqual(render(useMotionPreference),{reduced:true,ready:true},'late initial preference must not overwrite a newer setting event');
  reset();assert(removed);
  render(useMotionPreference);reset();resolvePreference(false);await Promise.resolve();assert.equal(states.length,0,'unmounted hook must ignore late resolution');
  native.AccessibilityInfo.isReduceMotionEnabled=()=>Promise.reject(Error('unavailable'));
  render(useMotionPreference);await new Promise((resolve)=>setImmediate(resolve));
  assert.deepEqual(render(useMotionPreference),{reduced:true,ready:true});reset();
  console.log('Motion preference: conservative initial state, setting-event race, unmount guard and failed-read fallback passed.');
})().catch((error)=>{console.error(error);process.exitCode=1;});
