// Actual exam screen handlers, no real device or user database.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'..'),modules=new Map();let states=[],refs=[],effects=[],prior=[],pending=[],si=0,ri=0,ei=0;
const choices=[],advances=[];let finishes=0,theme='light',readingStarts=0;
const db={},translate=(x,args=[])=>x.replace(/\{(\d+)\}/g,(_,i)=>args[i]);
const questions=[{id:1,scope:'PODSTAWOWY',mediaFilename:'fixture.jpg',question:'Basic',points:3,answers:[{label:'T',answer:'Tak'},{label:'N',answer:'Nie'}],correctAnswer:'T',contentLanguage:'pl'},
 {id:2,scope:'SPECJALISTYCZNY',mediaFilename:'fixture.mp4',question:'Specialist',points:3,answers:[{label:'A',answer:'First'},{label:'B',answer:'Second'},{label:'C',answer:'Third'}],correctAnswer:'B',contentLanguage:'pl'}];
function load(file){if(modules.has(file))return modules.get(file);const exports={};modules.set(file,exports);
 new Function('require','exports','setInterval','clearInterval',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
  if(name==='react')return {useContext:()=>({setIsTabBarHidden(){}}),useLayoutEffect:f=>pending.push(f),useCallback:f=>f,useRef:v=>{const i=ri++;return refs[i]??(refs[i]={current:v});},useState:v=>{const i=si++;if(!(i in states))states[i]=v;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useEffect:(f,deps)=>{const i=ei++;if(!prior[i]||deps.some((v,j)=>v!==prior[i][j])){prior[i]=deps;pending.push(f);}}};
  if(name==='react/jsx-runtime')return require(name);
  if(name==='react-native')return {Platform:{select:v=>v.default},StyleSheet:{create:s=>s},Alert:{alert(){}},BackHandler:{addEventListener:()=>({remove(){}})},...Object.fromEntries(['View','Text','ScrollView','Pressable'].map(x=>[x,x]))};
  if(name==='@/global.css')return {};
  if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
  if(name==='expo-router')return {router:{replace(){}},useLocalSearchParams:()=>({id:'fixture'}),useFocusEffect(){}};
  if(name==='expo-sqlite')return {useSQLiteContext:()=>db};
  if(name==='@/hooks/use-translation')return {useTranslation:()=>({t:translate})};
  if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors[theme]})};
  if(name==='@/context/tab-bar-context')return {TabBarContext:{use:()=>({setIsTabBarHidden(){}})}};
  if(name==='@/database/repository')return {
   resumeActiveExam:async()=>({id:'fixture',category:'B',language:'pl',index:0,expiresAt:Date.now()+1500000,questions,selections:{}}),
   questionClock:async(_db,_id,index)=>({index,readingEndsAt:Date.now()+(index===0?20000:-1),answeringEndsAt:Date.now()+50000}),
   finishExamReading:async()=>{readingStarts++;return {index:0,readingEndsAt:Date.now()-1,answeringEndsAt:Date.now()+15000};},
   saveActiveChoice:async(_db,_id,index,qid,answer)=>choices.push({index,qid,answer}),
   saveActiveProgress:async(_db,_id,index,qid,answer)=>advances.push({index,qid,answer}),
   saveCompletedExam:async()=>{finishes++;return {id:'done',score:71,passed:true};},
  };
  if(name.startsWith('@/components/'))return new Proxy({},{get:(_t,p)=>p});
  if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
  throw Error(name);
 },exports,()=>0,()=>{});return exports;
}
const tick=()=>new Promise(setImmediate);
const nodes=t=>t&&typeof t==='object'?[t,...[t.props?.children].flat(Infinity).flatMap(nodes)]:[];
const text=t=>typeof t==='string'||typeof t==='number'?String(t):t&&typeof t==='object'?[t.props?.children].flat(Infinity).map(text).join(' '):'';
const button=(tree,label)=>{const b=nodes(tree).find(n=>n.type==='Pressable'&&text(n).includes(label));assert(b,label);return b;};
(async()=>{
 const screenSource=fs.readFileSync(path.join(root,'src/app/exam/[id].tsx'),'utf8');
 assert(!screenSource.includes('correctAnswer={'),'active exam must not pass the answer key to answer controls');
 const Screen=load('src/app/exam/[id].tsx').default().type;
 const render=()=>{si=ri=ei=0;const tree=Screen({id:'fixture'});const jobs=pending;pending=[];jobs.forEach(f=>f());return tree;};
 render();await tick();render();await tick();let tree=render();
 assert(!nodes(tree).some(n=>n.type==='BasicAnswerButtons'),'reading does not show unusable answer controls');
 assert(!nodes(tree).some(n=>n.type==='Pressable'&&text(n).includes('Następne pytanie')));
 const photo=nodes(tree).find(n=>n.type==='QuestionMedia');photo.props.onReadyChange(true);tree=render();
 const photoWrapper=nodes(tree).find(n=>n.type==='View'&&n.props.children?.type==='QuestionMedia');
 assert.equal(photoWrapper.props.style,undefined,'exam photo is not clipped during reading');assert.equal(photoWrapper.props.accessibilityElementsHidden,false);
 const reading=button(tree,'Przejdź do odpowiedzi');assert(!reading.props.disabled);
 reading.props.onPress();reading.props.onPress();await tick();tree=render();
 assert.equal(readingStarts,1,'double tap advances the reading clock only once');
 assert(!nodes(tree).some(n=>n.type==='Pressable'&&text(n).includes('Przejdź do odpowiedzi')));
 const positions=nodes(tree);assert(positions.findIndex(n=>n.type==='Text'&&text(n)==='Basic')<positions.findIndex(n=>n.type==='QuestionMedia'),'question appears before media');
 assert.doesNotMatch(text(tree),/71\s*\/74/);
 const basic=nodes(tree).find(n=>n.type==='BasicAnswerButtons');assert(basic.props.neutral);assert.equal(basic.props.correctAnswer,undefined);assert(!basic.props.disabled);
 basic.props.onAnswer('T');await tick();tree=render();assert.equal(choices.length,1);assert.equal(advances.length,0,'selection does not advance');
 nodes(tree).find(n=>n.type==='BasicAnswerButtons').props.onAnswer('N');await tick();tree=render();
 assert.equal(choices.at(-1).answer,'N');assert.equal(nodes(tree).find(n=>n.type==='BasicAnswerButtons').props.selectedAnswer,'N');
 button(tree,'Następne pytanie').props.onPress();await tick();render();await tick();tree=render();
 assert.equal(advances.at(-1).answer,'N');
 const media=nodes(tree).find(n=>n.type==='QuestionMedia');assert(media.props.examMode);assert.equal(media.props.examPlayback,'playing');
 assert(button(tree,'Następne pytanie').props.disabled,'media readiness/end gate specialist answers');
 media.props.onReadyChange(true);await media.props.onVideoEnd();tree=render();
 assert(!button(tree,'Następne pytanie').props.disabled);
 const first=nodes(tree).find(n=>n.type==='Pressable'&&text(n).includes('First'));first.props.onPress();await tick();tree=render();
 assert.equal(finishes,0);assert.doesNotMatch(text(tree),/71\s*\/74/,'no intermediate correctness or score');
 for(theme of ['light','dark']){
   const palette=load('src/constants/theme.ts').Colors[theme];tree=render();
   const selected=nodes(tree).find(n=>n.type==='Pressable'&&n.props.accessibilityState?.selected);
   const style=Object.assign({},...selected.props.style.filter(Boolean));
   assert.equal(style.backgroundColor,palette.selectionSurface);assert.equal(style.borderColor,palette.selection);
   assert(style.borderWidth>=3);assert(!text(selected).includes('Twój wybór'));
   assert(nodes(selected).some(n=>n.type==='View'&&n.props.style?.backgroundColor===palette.selection),'selected ABC has a filled graphic indicator');
 }
 button(tree,'Następne pytanie').props.onPress();await tick();tree=render();
 assert.equal(finishes,1);assert.match(text(tree),/71\s*\/74/);assert(button(tree,'Przejrzyj odpowiedzi'));
 console.log('Exam flow: neutral mutable/persisted selection, explicit Next, video readiness/end gate, specialist clock and final-only result/review passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
