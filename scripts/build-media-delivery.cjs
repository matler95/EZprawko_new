// Read-only R2 inventory. --write generates local data/report, never uploads.
const fs = require('node:fs'), path = require('node:path'), {execFileSync} = require('node:child_process');
const {DatabaseSync} = require('node:sqlite');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const write = process.argv.includes('--write');
if (process.argv.slice(2).some(x => x !== '--write')) throw Error('Usage: node scripts/build-media-delivery.cjs [--write]');
const audit = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'audit-media-remote.cjs'), '--details'], {
  cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 120000 }));
if (!audit.summary.inventoryComplete) throw Error('Incomplete inventory');
const records = audit.records.filter(r => r.status === 'presentNonempty');
const sizes = Object.fromEntries(records.map(r => [r.key, r.size]));
const manifest = { version: 1, checkedAt: audit.summary.checkedAt, deliveryVersion: 'local', sizes };
function stats(values) { const s = [...values].sort((a,b) => a-b); return { count: s.length, total: s.reduce((a,b) => a+b,0),
  median: s.length ? (s[Math.floor((s.length-1)/2)]+s[Math.floor(s.length/2)])/2 : 0,
  p95: s[Math.ceil(s.length*.95)-1] ?? 0, max: s.at(-1) ?? 0 }; }
const exportsEngine = {};
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(root,'src/domain/exam-engine.ts'),'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exportsEngine);
const db = new DatabaseSync(path.join(root,'assets/database/questions.db'), {readOnly:true});
const rows = db.prepare('SELECT id, scope, points, categories, media_filename FROM questions').all()
  .filter(q => ![11150,13074].includes(q.id)).map(q => ({...q, categories:JSON.parse(q.categories)})); db.close();
const mediaKey = filename => { const f = filename.normalize('NFC').replace(/\.wmv$/i,'.mp4');
  return f.includes('/') ? f : /\.(mp4|m4v|mov)$/i.test(f) ? 'wideo/'+f : 'zdjecia/'+f; };
const byId = new Map(rows.map(q => [q.id,q]));
const bytes = questions => [...new Set(questions.flatMap(q => byId.get(q.id).media_filename ? [mediaKey(byId.get(q.id).media_filename)] : []))]
  .reduce((n,key) => { if (!sizes[key]) throw Error('Missing size for eligible reference'); return n+sizes[key]; },0);
let seed = 123456789; const random = () => { seed = (1664525*seed+1013904223)>>>0; return seed/4294967296; };
const categories = [...new Set(rows.flatMap(q => q.categories))].sort();
const exams = categories.map(category => {
  const pool = rows.filter(q => q.categories.includes(category));
  const values = Array.from({length:1000}, () => bytes(exportsEngine.buildOfficialExam(pool,category,random).questions));
  const bound = ['PODSTAWOWY','SPECJALISTYCZNY'].reduce((total,scope,section) => total + [3,2,1].reduce((sum,points,i) =>
    sum + pool.filter(q=>q.scope===scope && q.points===points).map(q=>q.media_filename ? sizes[mediaKey(q.media_filename)] : 0)
      .sort((a,b)=>b-a).slice(0,(section?[6,4,2]:[10,6,4])[i]).reduce((a,b)=>a+b,0),0),0);
  return {category, ...stats(values), conservativeUpperBound:bound};
});
const result = {checkedAt:audit.summary.checkedAt, inventoryComplete:true,
  units:'bytes', all:stats(records.map(r=>r.size)), image:stats(records.filter(r=>r.type==='image').map(r=>r.size)),
  video:stats(records.filter(r=>r.type==='video').map(r=>r.size)), exams,
  largest:records.sort((a,b)=>b.size-a.size).slice(0,20).map(r=>({key:r.key,size:r.size})),
  appAccess:'unverified', nativeDecoding:'unverified', deviceTiming:'not measured'};
if (write) {
  fs.writeFileSync(path.join(root,'assets/data/media-delivery.json'), JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(path.join(root,'docs/MEDIA_SIZE_BASELINE.json'), JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify(result,null,2));
