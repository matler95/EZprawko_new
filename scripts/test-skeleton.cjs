// Native contract tests; visual/device QA remains separate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
let reduced=false, focused=true, theme='light', effects=[], starts=0, stops=0, timings=[];
const native = {
  View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{ create:(styles)=>styles },Platform:{ select:(values)=>values.default },
  Animated:{ View:'AnimatedView',Value:class { constructor(value){ this.value=value; } setValue(value){ this.value=value; } },
    timing:(_,config)=>{ timings.push(config); return config; },sequence:(values)=>values,
    loop:()=>({ start:()=>starts++,stop:()=>stops++ }) },
};
function load(file) {
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{ compilerOptions:{ module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true } }).outputText;
  new Function('require','exports',code)((name)=>{
    if(name==='react')return { ...React,useEffect:(fn)=>effects.push(fn),useState:(init)=>[typeof init==='function'?init():init,()=>{}] };
    if(name==='react/jsx-runtime')return require(name);
    if(name==='react-native')return native;
    if(name==='expo-router')return { useIsFocused:()=>focused };
    if(name==='@/hooks/use-reduced-motion')return { useReducedMotion:()=>reduced };
    if(name==='@/context/app-theme-context')return { useAppTheme:()=>({ colors:load('src/constants/theme.ts').Colors[theme] }) };
    if(name==='@/global.css')return {};
    throw Error(`Unexpected dependency ${name}`);
  },exports);
  return exports;
}
const { Skeleton,LoadingSkeleton,LoadingError }=load('src/components/skeleton.tsx');
const nodes=(element)=>{
  if(!React.isValidElement(element))return [];
  if(typeof element.type==='function')return nodes(element.type(element.props));
  return [element,...React.Children.toArray(element.props.children).flatMap(nodes)];
};
for(theme of ['light','dark']) {
  const colors=load('src/constants/theme.ts').Colors[theme];
  assert.equal(Skeleton({}).props.style.backgroundColor,colors.disabledSurface);
  for(const variant of ['dashboard','study','progress']) {
    effects=[]; const before=starts;
    const element=LoadingSkeleton({ variant,label:'Ładowanie testowe' });
    assert.equal(element.props.accessibilityRole,'progressbar');
    assert.equal(element.props.accessibilityLabel,'Ładowanie testowe');
    assert.equal(element.props.accessibilityState.busy,true);
    assert(nodes(element).some((n)=>n.props.importantForAccessibility==='no-hide-descendants'));
    const cleanup=effects[0](); assert.equal(starts,before+1); cleanup();
    assert(nodes(element).filter((n)=>n.props.style?.backgroundColor===colors.disabledSurface).length>=9);
  }
}
assert.equal(starts,stops,'each started animation must be stopped on cleanup');
assert(timings.every((t)=>t.useNativeDriver===true&&t.isInteraction===false));
for(const preferences of [{ reduced:true,focused:true },{ reduced:false,focused:false }]) {
  reduced=preferences.reduced;focused=preferences.focused;effects=[];const before=starts;
  LoadingSkeleton({ variant:'dashboard' });effects[0]();assert.equal(starts,before);
}
let retries=0;
const error=LoadingError({ onRetry:()=>retries++ });
const button=nodes(error).find((n)=>n.type==='Pressable');
assert(button.props.style.minHeight>=44);button.props.onPress();assert.equal(retries,1);
assert(nodes(error).some((n)=>n.props.accessibilityRole==='alert'));
console.log('Skeleton: three layouts, two themes, accessible busy state, native non-interaction animation, reduced motion/focus guards, cleanup and retry passed.');
