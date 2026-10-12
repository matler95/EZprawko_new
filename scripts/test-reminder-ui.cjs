// Picker/native controls are stubbed; this is not delivery or device layout QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
const root=path.resolve(__dirname,'..'),cache=new Map();
let platform='ios',theme='light',states=[],refs=[],si=0,ri=0,focus=null,appListener=null,pickerOptions=null;
let snapshot,updates=[],settingsFail=false;
function load(file){if(cache.has(file))return cache.get(file);const exports={};
  const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','exports',code)((name)=>{
    if(name==='react')return {...React,useCallback:fn=>fn,useRef:value=>{const i=ri++;return refs[i]??(refs[i]={current:value});},useState:value=>{const i=si++;if(!(i in states))states[i]=typeof value==='function'?value():value;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}};
    if(name==='react/jsx-runtime')return require(name);
    if(name==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Modal:'Modal',StyleSheet:{create:s=>s},useColorScheme:()=>theme,Platform:{get OS(){return platform;},select:s=>s.default},AppState:{addEventListener:(_type,fn)=>{appListener=fn;return {remove:()=>{}};}}};
    if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
    if(name==='expo-router')return {useFocusEffect:fn=>{focus=fn;}};
    if(name==='expo-sqlite')return {useSQLiteContext:()=>({})};
    if(name==='expo-linking')return {openSettings:async()=>{if(settingsFail)throw Error('denied');}};
    if(name==='@react-native-community/datetimepicker')return {__esModule:true,default:'TimePicker',DateTimePickerAndroid:{open:options=>{pickerOptions=options;},dismiss:async()=>true}};
    if(name==='@/services/reminders')return {readDailyReminder:async()=>snapshot,updateDailyReminder:async(_db,time,enabled,ask)=>{updates.push({time,enabled,ask});snapshot={...snapshot,time,enabled};return snapshot;}};
    if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors[theme],preference:theme})};
    if(name==='@/global.css')return {};
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);throw Error(name);
  },exports);cache.set(file,exports);return exports;}
function nodes(tree,fn){if(!tree||typeof tree!=='object')return [];const c=tree.props?.children;return [...(fn(tree)?[tree]:[]),...(Array.isArray(c)?c.flat(Infinity):[c]).flatMap(v=>nodes(v,fn))];}
function text(tree){if(typeof tree==='string')return tree;if(!tree||typeof tree!=='object')return '';const c=tree.props?.children;return (Array.isArray(c)?c.flat(Infinity):[c]).map(text).join(' ');}
const Card=load('src/components/reminder-card.tsx').ReminderCard;
function render(){si=0;ri=0;return Card();}
function button(tree,label){return nodes(tree,n=>n.type==='Pressable'&&text(n).includes(label))[0];}
const tick=()=>new Promise(setImmediate);
(async()=>{
  for(theme of ['light','dark']){
    platform='ios';states=[];refs=[];updates=[];snapshot={time:{hour:19,minute:0},enabled:false,permissionGranted:true,scheduleCount:0};
    render();const cleanup=focus();await tick();let tree=render();
    assert.match(text(tree),/19:00/);button(tree,'Zmień godzinę').props.onPress();tree=render();
    assert(nodes(tree,n=>n.type==='Modal')[0].props.visible);
    const picker=nodes(tree,n=>n.type==='TimePicker')[0];assert.equal(picker.props.themeVariant,theme);
    picker.props.onValueChange({},new Date(2020,0,1,8,35));tree=render();button(tree,'Anuluj').props.onPress();assert.equal(updates.length,0);
    tree=render();button(tree,'Zmień godzinę').props.onPress();tree=render();
    nodes(tree,n=>n.type==='TimePicker')[0].props.onValueChange({},new Date(2020,0,1,0,1));tree=render();button(tree,'Zapisz godzinę').props.onPress();await tick();tree=render();
    assert.deepEqual(updates[0],{time:{hour:0,minute:1},enabled:false,ask:false});assert.match(text(tree),/00:01/);
    button(tree,'Włącz przypomnienie').props.onPress();await tick();tree=render();assert.equal(updates[1].ask,true);
    assert(nodes(tree,n=>n.type==='Pressable'&&n.props.accessibilityRole==='switch')[0].props.accessibilityState.checked);
    assert(nodes(tree,n=>n.type==='Pressable').every(n=>n.props.style.minHeight>=48));
    snapshot={...snapshot,enabled:false,permissionGranted:false};appListener('active');await tick();tree=render();
    assert.match(text(tree),/Wyłączone/);settingsFail=true;button(tree,'Ustawienia powiadomień').props.onPress();await tick();tree=render();assert(nodes(tree,n=>n.props?.accessibilityRole==='alert').length);settingsFail=false;
    cleanup();
  }
  platform='android';states=[];refs=[];updates=[];snapshot={time:{hour:19,minute:0},enabled:true,permissionGranted:true,scheduleCount:1};
  render();const cleanup=focus();await tick();let tree=render();button(tree,'Zmień godzinę').props.onPress();assert.equal(pickerOptions.mode,'time');assert(pickerOptions.is24Hour);assert.equal(updates.length,0,'opening/cancelling dialog must not save');
  pickerOptions.onValueChange({},new Date(2020,0,1,23,59));await tick();assert.deepEqual(updates[0].time,{hour:23,minute:59});
  cleanup();const before=updates.length;pickerOptions.onValueChange({},new Date(2020,0,1,9,0));await tick();assert.equal(updates.length,before,'late picker callback after blur must be ignored');
  console.log('Reminder UI: native iOS draft/cancel/save in both themes, 48px controls, switch permission intent, foreground refresh/settings error, Android 24-hour selection and late-callback guard passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
