const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { auditMediaReferences } = require('./media-reference-audit.cjs');
const { reconcileSourceRows } = require('./media-source-audit.cjs');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--details')) throw Error('Usage: node scripts/audit-media.cjs [--details]');
const db = new DatabaseSync(path.join(root, 'assets/database/questions.db'), { readOnly: true });
let questions, metadata;
try { questions = db.prepare('SELECT id,categories,media_filename FROM questions ORDER BY id').all(); metadata = db.prepare('SELECT value FROM metadata WHERE key=?').get('source_sha256'); }
finally { db.close(); }
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/media-manifest.json'), 'utf8'));
const mapping = {};
new Function('exports', 'process', 'require', ts.transpileModule(fs.readFileSync(path.join(root, 'src/config/media.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS,esModuleInterop:true } }).outputText)(mapping, { env: {} }, name => {
  if(name==='@/assets/data/media-delivery.json')return require('../assets/data/media-delivery.json');
  if(name==='@/domain/media-version')return {mediaDeliveryVersion:'local'};
  throw Error(name);
});
const archiveNames = ['multimedia_do_pytan.zip', 'Multimedia_do_pytań_-_cz_2_02042026.zip'];
const available = archiveNames.filter(name => fs.existsSync(path.join(root, name)));
const inventory = JSON.parse(execFileSync('python', [path.join(root, 'scripts/media-archive-inventory.py'), ...available.map(name => path.join(root, name))], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
const result = auditMediaReferences(questions, manifest, inventory, mapping);
const source = path.join(root, 'gov-attachment.xlsx');
const digest = fs.existsSync(source) ? createHash('sha256').update(fs.readFileSync(source)).digest('hex') : null;
result.summary.sourceHashMatches = digest !== null && digest === metadata?.value && digest === manifest.sourceSha256;
if (fs.existsSync(source)) {
  const sourceRows = JSON.parse(execFileSync('python', [path.join(root, 'scripts/media-source-rows.py'), source], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
  result.sourceReconciliation = reconcileSourceRows(questions, sourceRows);
  result.summary.sourceRowsReconciled = result.sourceReconciliation.status;
  result.summary.sourceReconciliation = result.sourceReconciliation;
  result.summary.missingArchiveSourceRows = sourceRows.records.filter(row => result.issues.some(issue => issue.kind === 'missingFromLocalArchives' && issue.questionIds.includes(row.id)));
} else result.summary.sourceRowsReconciled = 'unverified';
result.summary.archivesRead = available;
result.summary.missingLocalArchives = archiveNames.filter(name => !available.includes(name));
result.summary.remoteStorage = 'unverified';
result.summary.nativePlayback = 'unverified';
console.log(JSON.stringify(args.includes('--details') ? result : { ...result.summary, issueSample: result.issues.slice(0, 12) }, null, 2));
