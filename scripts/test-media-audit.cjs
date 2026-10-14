const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { execFileSync } = require('node:child_process');
const { auditMediaReferences } = require('./media-reference-audit.cjs');
const root = path.resolve(__dirname, '..'), mapping = {};
new Function('exports', 'process', 'require', ts.transpileModule(fs.readFileSync(path.join(root, 'src/config/media.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS,esModuleInterop:true } }).outputText)(mapping, { env: {} }, name => {
  if(name==='@/assets/data/media-delivery.json')return require('../assets/data/media-delivery.json');
  if(name==='@/domain/media-version')return {mediaDeliveryVersion:'local'};
  throw Error(name);
});
const question = (id, name, categories = ['B']) => ({ id, media_filename: name, categories: JSON.stringify(categories) });
const entry = (filename, size = 10, crc = 42) => ({ filename, path: `folder/${filename}`, archive: 'test.zip', size, crc });
const report = auditMediaReferences([question(1, 'clip.wmv', ['A', 'B', 'B']), question(2, 'clip.wmv'), question(3, null)],
  { media: [{ filename: 'clip.wmv' }] }, [entry('clip.wmv')], mapping);
assert.equal(report.summary.questionsWithMediaReference, 2);
assert.equal(report.summary.questionsWithoutMediaReference, 1);
assert.equal(report.summary.uniqueReferences, 1);
assert.equal(report.summary.referencesFoundInArchives, 1);
assert.deepEqual(report.files[0].questionIds, [1, 2]);
assert.deepEqual(report.files[0].categories, ['A', 'B']);
assert.equal(report.files[0].deliveredKey, 'wideo/clip.mp4');
assert.equal(report.files[0].cacheName, mapping.mediaCacheName('clip.wmv'));
assert.equal(report.summary.byCategory.find(row => row.category === 'B').questionsWithMedia, 2);
assert.equal(report.files[0].deliveryAvailability, 'unverified');
assert.equal(report.files[0].integrity, 'unverified');
assert.equal(report.files[0].questionMediaMatch, 'unverified');
const bad = auditMediaReferences([question(1, 'clip.wmv'), question(2, 'clip.mp4'), question(3, 'A b.jpg'), question(4, 'A_b.jpg'),
  question(5, 'Photo.JPG'), question(6, 'photo.jpg'), question(7, 'bad.exe'), question(8, ''), question(9, '../escape.jpg')],
  { media: [{ filename: 'clip.wmv' }, { filename: 'clip.wmv' }, { filename: 'unused.jpg' }, { filename: '' }] },
  [entry('clip.wmv', 0), entry('clip.wmv', 10, 43), entry('orphan.jpg')], mapping);
for (const kind of ['deliveredKeyCollision', 'cacheKeyCollision', 'caseVariantKeys', 'missingFromManifest', 'missingFromLocalArchives',
  'emptyArchiveEntry', 'conflictingArchiveEntries', 'unsupportedExtension', 'unsafeReference', 'invalidQuestionReference',
  'invalidManifestReference', 'duplicateManifestReference', 'unusedManifestReference']) assert(bad.summary.issueCounts[kind] > 0, kind);
assert.equal(bad.summary.unusedLocalArchiveEntries, 1);
assert.equal(auditMediaReferences([], { media: [] }, [], mapping).summary.uniqueReferences, 0);
const unicodeNames = ['ż.jpg', 'z\u0307.jpg'];
const unicodeCollision = auditMediaReferences(unicodeNames.map((name, i) => question(i + 1, name)),
  { media: unicodeNames.map(filename => ({ filename })) }, unicodeNames.map(name => entry(name)), mapping);
assert.equal(unicodeCollision.summary.uniqueDeliveredKeys, 1);
assert.equal(unicodeCollision.summary.issueCounts.deliveredKeyCollision, 1, 'audit surfaces canonical collisions rather than hiding them');
assert.equal(unicodeCollision.summary.issueCounts.cacheKeyCollision, 1);
const real = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/audit-media.cjs')], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
assert.equal(real.totalQuestions, 3518);
assert.equal(real.questionsWithMediaReference + real.questionsWithoutMediaReference, real.totalQuestions);
assert.equal(real.byCategory.length, 12);
assert.equal(real.byType.reduce((sum, row) => sum + row.files, 0), real.uniqueReferences);
assert.equal(real.remoteStorage, 'unverified'); assert.equal(real.nativePlayback, 'unverified');
assert.equal(real.sourceRowsReconciled, 'matched');
assert.equal(real.sourceReconciliation.sourceRows, real.totalQuestions);
assert.equal(real.sourceReconciliation.blankSourceMedia, real.questionsWithoutMediaReference);
assert.deepEqual(real.sourceReconciliation.issues, []);
console.log('Media audit: actual delivery mapping, shared references/categories, manifest/archive gaps, key/cache/case collisions, conflicts/empty/unsafe/unsupported entries and real read-only bank report passed. ZIP metadata is not decoding or remote availability.');
