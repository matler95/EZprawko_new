// Actual screen handlers with native/hook stubs; SQLite aggregate tested separately.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), React = require('react');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '..'), cache = new Map();
let states=[], refs=[], effects=[], pending=[], si=0, ri=0, ei=0, focus, writes=0, failWrite=false, failMastery=false, mastered=0, theme='light';
let routeParams={};
const items=[1,2,3].map(id=>({id,question:`Pytanie ${id}`,points:3,scope:'SPECJALISTYCZNY',correct_answer:'A',media_filename:null,contentLanguage:'pl'}));
const db={getAllAsync:async()=>items,getFirstAsync:async()=>null};
function load(file){if(cache.has(file))return cache.get(file);const exports={};
  new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
    if(name==='react')return {...React,useCallback:f=>f,useRef:v=>{const i=ri++;return refs[i]??(refs[i]={current:v});},useState:v=>{const i=si++;if(!(i in states))states[i]=v;return [states[i],x=>states[i]=typeof x==='function'?x(states[i]):x];},useEffect:(f,deps)=>{const i=ei++;if(!effects[i]||deps.some((v,j)=>v!==effects[i][j])){effects[i]=deps;pending.push(f);}}};
    if(name==='react/jsx-runtime')return require(name);
    if (name === '@/hooks/use-translation') return { useTranslation: () => ({ t: load('src/domain/ui-copy.ts').t, language: load('src/domain/ui-language.ts').uiLanguage() }) };
    if(name==='react-native')return {Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',TextInput:'TextInput',View:'View',StyleSheet:{create:s=>s},Platform:{select:s=>s.default}};
    if(name==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
    if(name==='expo-router')return {router:{setParams:value=>Object.assign(routeParams,value)},useFocusEffect:f=>focus=f,useLocalSearchParams:()=>routeParams};
    if(name==='expo-sqlite')return {useSQLiteContext:()=>db};
    if(name==='expo-haptics')return {NotificationFeedbackType:{Success:1,Error:2},notificationAsync:async()=>{throw Error('no haptics');}};
    if(name==='@/context/app-theme-context')return {useAppTheme:()=>({colors:load('src/constants/theme.ts').Colors[theme]})};
    if(name==='@/context/target-category-context')return {useTargetCategory:()=>({category:'B'})};
    if(name==='@/database/repository')return {topicProgress:async()=>[],toggleFlag:async()=>true,recordPracticeAnswer:async()=>{if(failWrite)throw Error('write failed');writes++;mastered=1;}};
    if(name==='@/database/study-session')return {studyMastery:async()=>{if(failMastery)throw Error('read failed');return {total:100,mastered};}};
    if(name==='@/database/translations')return {selectedQuestionLanguage:async()=>'pl',questionContent:async(_db,id)=>({question:`Pytanie ${id}`,contentLanguage:'pl',answers:[{label:'A',answer:'Pierwsza'},{label:'B',answer:'Druga'}]})};
    if(name==='@/database/explanations')return {getQuestionExplanation:async()=>null};
    if(name==='@/services/answer-feedback')return {playAnswerSound:()=>{}};
    if(name==='@/components/basic-answer-buttons')return {BasicAnswerButtons:'BasicAnswerButtons',basicAnswerText:(_answers,label)=>label==='T'?'TAK':'NIE'};
    if(name==='@/global.css')return {};
    if(name.startsWith('@/components/'))return new Proxy({}, {get:(_t,p)=>p});
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);
    throw Error(name);
  },exports);cache.set(file,exports);return exports;}
function nodes(t){if(!t||typeof t!=='object')return [];const c=t.props?.children;return [t,...(Array.isArray(c)?c.flat(Infinity):[c]).flatMap(nodes)];}
function text(t){if(typeof t==='string'||typeof t==='number')return String(t);if(!t||typeof t!=='object')return '';const c=t.props?.children;return (Array.isArray(c)?c.flat(Infinity):[c]).map(text).join(' ').replace(/\s+/g,' ');}
function button(t,label){const n=nodes(t).find(n=>n.type==='Pressable'&&text(n).includes(label));assert(n,`Missing ${label}: ${text(t)}`);return n;}
const tick=()=>new Promise(setImmediate);
const Screen=load('src/app/study.tsx').default().type;
function render(){si=ri=ei=0;const t=Screen();const run=pending;pending=[];run.forEach(f=>f());return t;}
(async()=>{
  const {studySummary}=load('src/domain/study-session.ts');
  assert.deepEqual(studySummary([],{}),{total:0,correct:0,incorrect:0,unanswered:0,mistakes:[]});
  assert.equal(studySummary([1,2],{}).unanswered,2,'browsing alone cannot complete a batch');
  assert.deepEqual(studySummary([1,1,2,3],{1:{label:'A',correct:true},2:{label:'B',correct:false},99:{correct:false}}),{total:3,correct:1,incorrect:1,unanswered:1,mistakes:[2]});
  for(theme of ['light','dark']){
    states=[];refs=[];effects=[];pending=[];writes=mastered=0;
    render();const cleanup=focus();await tick();render();await tick();let t=render();
    await button(t,'Otwórz pytanie').props.onPress();await tick();t=render();
    const wrong=button(t,'Druga');await Promise.all([wrong.props.onPress(),wrong.props.onPress()]);t=render();assert.equal(writes,1,'double tap writes once');
    button(t,'Następne').props.onPress();await tick();t=render();
    failWrite=true;await button(t,'Pierwsza').props.onPress();t=render();assert.match(text(t),/Nie zapisano/);assert.equal(writes,1);failWrite=false;
    await button(t,'Pierwsza').props.onPress();t=render();assert.equal(writes,2);assert.match(text(t),/Dobra odpowiedź/,'haptic failure cannot lose answer');
    cleanup();focus();await tick();t=render();assert.match(text(t),/Pytanie 2/);assert(button(t,'Pierwsza').props.disabled,'returning from another tab preserves question and answer');
    button(t,'Poprzednie').props.onPress();await tick();t=render();assert(button(t,'Druga').props.disabled,'review locks prior answer');
    button(t,'Zakończ sesję').props.onPress();await tick();t=render();assert.match(text(t),/Poprawne: 1.*Błędne: 1/);assert.match(text(t),/Bez odpowiedzi: 1/);assert.match(text(t),/Zmiana w tej sesji:.*\+.*1/);
    failMastery=true;await button(t,'Powtórz błędy').props.onPress();t=render();assert.match(text(t),/Nie udało się rozpocząć powtórki/);failMastery=false;
    await button(t,'Powtórz błędy').props.onPress();await tick();t=render();assert.match(text(t),/1 z 1/);assert.match(text(t),/Pytanie 1/);assert.equal(writes,2,'replay has no implicit answer');
    await button(t,'Pierwsza').props.onPress();t=render();assert.equal(writes,3);
    failMastery=true;button(t,'Podsumowanie').props.onPress();await tick();t=render();assert(nodes(t).some(n=>n.type==='LoadingError'));assert.match(text(t),/Poprawne: 1.*Błędne: 0/);
    failMastery=false;nodes(t).find(n=>n.type==='LoadingError').props.onRetry();await tick();t=render();assert.equal(writes,3,'mastery retry cannot save answers again');assert(!nodes(t).some(n=>n.type==='Pressable'&&text(n).includes('Powtórz błędy')));
    button(t,'Wróć do menu').props.onPress();await tick();t=render();assert.match(text(t),/Nauka/);cleanup();
  }
  states=[];refs=[];effects=[];pending=[];writes=mastered=0;items[0].scope='PODSTAWOWY';items[0].correct_answer='T';
  render();const cleanup=focus();await tick();render();await tick();let basicTree=render();
  await button(basicTree,'Otwórz pytanie').props.onPress();await tick();basicTree=render();
  const basic=nodes(basicTree).find(n=>n.type==='BasicAnswerButtons');assert(basic);assert.equal(basic.props.disabled,false);
  basic.props.onAnswer('T');await tick();basicTree=render();const answeredBasic=nodes(basicTree).find(n=>n.type==='BasicAnswerButtons');
  assert(answeredBasic.props.disabled);assert.equal(answeredBasic.props.selectedAnswer,'T');assert.equal(writes,1);cleanup();
  states=[];refs=[];effects=[];pending=[];writes=mastered=0;routeParams={filter:'three',count:'5',start:'1'};
  render();const autoCleanup=focus();await tick();render();await tick();render();await tick();let autoTree=render();
  assert.match(text(autoTree),/Pytanie 1/);assert.match(text(autoTree),/1 z 3/);assert.equal(writes,0,'auto-open must not record an answer');assert.equal(routeParams.start,undefined);
  button(autoTree,'Następne →').props.onPress();await tick();autoTree=render();assert.match(text(autoTree),/Pytanie 2/,'consumed start cannot reopen question 1');autoCleanup();routeParams={};
  // Load the real SQL helper, not the UI's stub.
  const native=new DatabaseSync(':memory:');native.exec(`CREATE TABLE questions(id INTEGER,categories TEXT);CREATE TABLE practice_mastery(question_id INTEGER,correct_streak INTEGER);INSERT INTO questions VALUES(1,'["B","B1"]'),(2,'["A"]'),(3,'["B"]');INSERT INTO practice_mastery VALUES(1,3),(2,3),(3,2);`);
  const exports={};new Function('require','exports',ts.transpileModule(fs.readFileSync(path.join(root,'src/database/study-session.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(()=>load('src/domain/driving-categories.ts'),exports);
  const adapter={getFirstAsync:async(sql,category)=>native.prepare(sql).get(category)};
  assert.deepEqual({...await exports.studyMastery(adapter,'B')},{total:2,mastered:1});assert.deepEqual({...await exports.studyMastery(adapter,'PT')},{total:0,mastered:0});
  console.log('Study sessions: unique answers, partial completion, double-tap/write-failure guards, review lock, exact mistake replay, read retries, both themes and real category mastery SQL passed. Native/device QA remains separate.');
})().catch(e=>{console.error(e);process.exitCode=1;});
