// Real SQLite preferences + stubbed OS scheduler; actual delivery needs device QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');const root=path.resolve(__dirname,'..'),cache=new Map();
let granted=true,asks=0,failSchedule=false,failCancel=false,failWrite=false,pauseSchedule=null;
const scheduled=new Map();const calls=[];
const notifications={SchedulableTriggerInputTypes:{DAILY:'daily'},AndroidImportance:{DEFAULT:3},
  getPermissionsAsync:async()=>({granted}),requestPermissionsAsync:async()=>{asks++;return {granted};},
  getAllScheduledNotificationsAsync:async()=>[...scheduled.values()],setNotificationChannelAsync:async()=>{},
  scheduleNotificationAsync:async request=>{if(pauseSchedule)await pauseSchedule;if(failSchedule){failSchedule=false;throw Error('schedule fail');}scheduled.set(request.identifier,request);calls.push(request);return request.identifier;},
  cancelScheduledNotificationAsync:async id=>{if(failCancel){failCancel=false;throw Error('cancel fail');}scheduled.delete(id);},
  cancelAllScheduledNotificationsAsync:async()=>scheduled.clear()};
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
  const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  new Function('require','exports',code)((name)=>{
    if(name==='expo-notifications')return notifications;if(name==='react-native')return {Platform:{OS:'android'}};
    if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`);throw Error(name);
  },exports);return exports;}
const native=new DatabaseSync(':memory:');native.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);');
const values=v=>v.length===1&&Array.isArray(v[0])?v[0]:v;
const db={execAsync:async sql=>native.exec(sql),getAllAsync:async(sql,...v)=>native.prepare(sql).all(...values(v)),runAsync:async(sql,...v)=>{
  if(failWrite&&sql.includes('daily-reminder-id')){failWrite=false;throw Error('SQL fail');}return native.prepare(sql).run(...values(v));},
  withExclusiveTransactionAsync:async fn=>{native.exec('BEGIN');try{await fn(db);native.exec('COMMIT');}catch(e){native.exec('ROLLBACK');throw e;}}};
(async()=>{
  const time=load('src/domain/reminder-time.ts'),prefs=load('src/database/reminder-preferences.ts'),r=load('src/services/reminders.ts'),guard=load('src/domain/data-maintenance.ts');
  const userData=load('src/database/user-data.ts');
  for(const table of userData.userProgressTables)native.exec(`CREATE TABLE ${table}(id INTEGER)`);
  assert.equal(time.formatReminderTime({hour:0,minute:0}),'00:00');assert.equal(time.formatReminderTime({hour:23,minute:59}),'23:59');
  for(const value of ['-1','1440','bad','',undefined])assert.deepEqual(time.parseReminderTime(value),{hour:19,minute:0});
  for(const bad of [{hour:24,minute:0},{hour:2,minute:60},{hour:1.5,minute:0}])assert.throws(()=>time.reminderMinutes(bad));
  let state=await r.readDailyReminder(db);assert(!state.enabled);assert.deepEqual(state.time,{hour:19,minute:0});
  state=await r.updateDailyReminder(db,{hour:8,minute:35},false);assert(!state.enabled);assert.equal(scheduled.size,0);assert.equal(asks,0);
  assert.deepEqual((await prefs.reminderPreferences(db)).time,{hour:8,minute:35});
  state=await r.updateDailyReminder(db,state.time,true,true);assert(state.enabled);assert.equal(scheduled.size,1);assert.equal(scheduled.get(r.DAILY_REMINDER_ID).trigger.minute,35);
  const ui=load('src/domain/ui-language.ts');ui.setUiLanguage('en');
  await r.refreshDailyReminderLanguage(db);
  assert.equal(scheduled.get(r.DAILY_REMINDER_ID).content.title,'Time for a short review');
  assert.equal(scheduled.size,1);assert.equal(asks,0,'locale refresh must not request consent');ui.setUiLanguage('pl');
  scheduled.set('legacy',{identifier:'legacy',content:{}});native.prepare("UPDATE settings SET value='legacy' WHERE key='daily-reminder-id'").run();
  state=await r.updateDailyReminder(db,{hour:23,minute:59},true);assert.equal(scheduled.size,1);assert(!scheduled.has('legacy'));
  await Promise.all([r.updateDailyReminder(db,{hour:7,minute:1},true),r.updateDailyReminder(db,{hour:9,minute:2},true)]);
  assert.equal(scheduled.size,1);assert.deepEqual((await prefs.reminderPreferences(db)).time,{hour:9,minute:2});
  failWrite=true;await assert.rejects(()=>r.updateDailyReminder(db,{hour:10,minute:30},true),/SQL fail/);
  assert.deepEqual((await prefs.reminderPreferences(db)).time,{hour:9,minute:2});assert.equal(scheduled.get(r.DAILY_REMINDER_ID).trigger.hour,9);
  failSchedule=true;await assert.rejects(()=>r.updateDailyReminder(db,{hour:11,minute:0},true),/schedule fail/);assert.equal(scheduled.size,1);
  failCancel=true;await assert.rejects(()=>r.updateDailyReminder(db,{hour:9,minute:2},false),/cancel fail/);assert.equal(scheduled.size,1);
  await r.updateDailyReminder(db,{hour:0,minute:0},false);assert.equal(scheduled.size,0);
  await r.refreshDailyReminderLanguage(db);assert.equal(scheduled.size,0,'language refresh cannot enable a disabled reminder');
  granted=false;await assert.rejects(()=>r.updateDailyReminder(db,{hour:0,minute:0},true,true),/zgody/);assert.equal(asks,1);assert.equal(scheduled.size,0);
  granted=true;await r.updateDailyReminder(db,{hour:19,minute:15},true);
  const exported=await userData.exportUserData(db);
  assert.equal(exported.data.settings.find(row=>row.key==='daily-reminder-minutes').value,'1155');
  await userData.resetUserProgress(db);assert.deepEqual((await prefs.reminderPreferences(db)).time,{hour:19,minute:15});
  scheduled.delete(r.DAILY_REMINDER_ID);assert(!(await r.readDailyReminder(db)).enabled,'stored ID alone must not claim enabled');
  let release;pauseSchedule=new Promise(resolve=>{release=resolve;});
  const pending=r.updateDailyReminder(db,{hour:20,minute:10},true).then(()=>null,e=>e);
  while(!calls.length || calls.at(-1).trigger.minute!==15)await new Promise(setImmediate);
  // Yield until the queued update is waiting inside native scheduling.
  await new Promise(setImmediate);
  const deletion=guard.withDataMaintenance(async()=>{release();await r.disableDailyReminder();native.exec("DELETE FROM settings WHERE key LIKE 'daily-reminder-%'");});
  assert(await pending instanceof Error);await deletion;pauseSchedule=null;
  assert.equal(scheduled.size,0,'queued wipe wins over delayed enable');assert.equal(native.prepare('SELECT COUNT(*) AS n FROM settings').get().n,0);
  assert.deepEqual((await prefs.reminderPreferences(db)).time,{hour:19,minute:0});
  console.log('Reminders: 00:00/23:59 validation, 19:00 default, disabled-time save, minute scheduling, fixed-ID/legacy deduplication, serialization, SQL rollback/OS compensation, denial, missing OS schedule and delayed-enable/deletion race passed.');native.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
