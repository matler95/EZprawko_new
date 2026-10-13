// Editorial tooling: generates drafts or validates an explicitly reviewed pack.
// It never fabricates explanation text and never writes the source SQLite bank.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const { explanationCoverage } = require('./explanation-coverage.cjs');
const root = path.resolve(__dirname, '..');
const validator = {};
const compiled = ts.transpileModule(fs.readFileSync(path.join(root,'src/domain/explanation-pack.ts'),'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
new Function('exports',compiled)(validator);
const args = process.argv.slice(2);
const value = (flag) => args[args.indexOf(flag)+1];
const db = new DatabaseSync(path.join(root,'assets/database/questions.db'),{ readOnly: true });
const questions = db.prepare('SELECT id,question,correct_answer,media_filename,points,categories FROM questions').all();
db.close();
const priority = questions.filter((q) => q.points === 3 || /(skrzyż|pierwszeństw)/.test(q.question.toLocaleLowerCase('pl-PL')));
function writeOutput(target, content) {
  const resolved = path.resolve(root,target);
  if (!resolved.startsWith(root+path.sep)) throw new Error('Output must stay inside the project workspace');
  fs.mkdirSync(path.dirname(resolved),{ recursive: true });
  fs.writeFileSync(resolved,JSON.stringify(content,null,2)+'\n');
}
if (args.includes('--template')) {
  const entries = priority.map((q) => ({ questionId: q.id, sourceQuestion: q.question, correctAnswer: q.correct_answer,
    mediaFilename: q.media_filename, explanationText: '', legalBasis: '', sourceUrl: '', reviewedBy: '', reviewedAt: null }));
  writeOutput(value('--template'),{ version: 'DRAFT-NOT-REVIEWED', entries });
  console.log(`Draft template: ${entries.length} priority questions. Empty content must be authored/reviewed before import.`);
} else if (args.includes('--input')) {
  if (!args.includes('--confirm-reviewed')) throw new Error('Human editorial review must be explicitly confirmed with --confirm-reviewed');
  const pack = JSON.parse(fs.readFileSync(path.resolve(root,value('--input')),'utf8'));
  validator.validateExplanationPack(pack);
  const byId = new Map(questions.map((q) => [q.id,q]));
  for (const entry of pack.entries) {
    const q = byId.get(entry.questionId);
    if (!q || q.question !== entry.sourceQuestion || q.correct_answer !== entry.correctAnswer || q.media_filename !== entry.mediaFilename) throw new Error(`Source mismatch: ${entry.questionId}`);
  }
  const version = createHash('sha256').update(JSON.stringify(pack.entries)).digest('hex');
  writeOutput(args.includes('--output') ? value('--output') : 'assets/data/question-explanations.json',{ version, entries: pack.entries });
  console.log(`Validated ${pack.entries.length} reviewed records; package version ${version}.`);
} else if (args.includes('--report')) {
  const pack = JSON.parse(fs.readFileSync(path.join(root,'assets/data/question-explanations.json'),'utf8'));
  validator.validateExplanationPack(pack);
  console.log(JSON.stringify(explanationCoverage(questions, pack.entries),null,2));
} else {
  throw new Error('Use --report, --template .expo/explanations-review-template.json, or --input reviewed.json --confirm-reviewed [--output path]');
}
