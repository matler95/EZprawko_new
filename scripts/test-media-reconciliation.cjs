const assert = require('node:assert/strict');
const { reconcileSourceRows } = require('./media-source-audit.cjs');
const { listAllObjects, reconcileRemoteObjects } = require('./media-remote-audit.cjs');
const q = { id: 1, media_filename: 'a.jpg', categories: JSON.stringify(['B', 'A']) };
const source = { records: [{ id: 1, media_filename: 'a.jpg', categories: ['A', 'B'], sourceRow: 2, mediaCell: 'H2' }] };
assert.equal(reconcileSourceRows([q], source).status, 'matched');
const mismatched = reconcileSourceRows([q, { ...q, id: 2 }], { records: [
  { ...source.records[0], media_filename: null, categories: ['C'] }, source.records[0], { ...source.records[0], id: 3 },
] });
for (const kind of ['sourceMediaMismatch', 'sourceCategoryMismatch', 'duplicateSourceId', 'missingFromSource', 'missingFromDatabase']) assert(mismatched.issues.some(issue => issue.kind === kind));
const files = [{ filename: 'a.jpg', deliveredKey: 'zdjecia/a.jpg', categories: ['B'], questionIds: [1], type: 'image' },
  { filename: 'b.wmv', deliveredKey: 'wideo/b.mp4', categories: ['B'], questionIds: [2], type: 'video' }];
let report = reconcileRemoteObjects(files, [{ key: 'zdjecia/a.jpg', size: 10, http_metadata: { contentType: 'image/jpeg' } }]);
assert.equal(report.summary.counts.presentNonempty, 1); assert.equal(report.summary.counts.missing, 1);
assert.equal(report.records[0].authenticatedAppAccess, 'unverified'); assert.equal(report.records[0].decoding, 'unverified');
report = reconcileRemoteObjects(files, [{ key: 'zdjecia/a.jpg', size: 0 }, { key: 'wideo/b.mp4', size: 10, http_metadata: { contentType: 'text/html' } }]);
assert.equal(report.summary.counts.empty, 1); assert.equal(report.summary.unexpectedContentType, 1); assert.equal(report.summary.unknownContentType, 1);
assert.equal(reconcileRemoteObjects(files, [{ key: 'zdjecia/a.jpg' }]).summary.counts.unknownSize, 1);
assert.throws(() => reconcileRemoteObjects(files, [{ key: 'a' }, { key: 'a' }]), /Duplicate/);
const unicode = reconcileRemoteObjects([{ ...files[0], deliveredKey: 'zdjecia/z\u0307.jpg' }], [{ key: 'zdjecia/ż.jpg', size: 10 }]);
assert.equal(unicode.summary.counts.missing, 1, 'normalization is diagnostic, never silent replacement');
assert.equal(unicode.issues[0].candidates[0].match, 'unicodeNormalizationOnly');
assert.equal(unicode.unreferencedObjects.length, 1);
(async () => {
  let calls = [];
  const cursorObjects = await listAllObjects(async cursor => {
    calls.push(cursor); return cursor ? { success: true, result: [{ key: 'b' }], result_info: { is_truncated: false } }
      : { success: true, result: [{ key: 'a' }], result_info: { is_truncated: true, cursor: 'next' } };
  });
  assert.equal(cursorObjects.length, 2); assert.deepEqual(calls, [undefined, 'next']);
  calls = [];
  const fallbackObjects = await listAllObjects(async (_cursor, after) => {
    calls.push(after); return { success: true, result: after ? [] : [{ key: 'a' }, { key: 'b' }] };
  });
  assert.equal(fallbackObjects.length, 2); assert.deepEqual(calls, [undefined, 'b'], 'absence of pagination metadata requires empty continuation proof');
  await assert.rejects(() => listAllObjects(async () => ({ success: true, result: [{ key: 'a' }] })), /pagination/);
  await assert.rejects(() => listAllObjects(async () => ({ success: true, result: [{ key: 'b' }, { key: 'a' }] })), /pagination/);
  await assert.rejects(() => listAllObjects(async () => ({ success: false, result: [] })), /Incomplete/);
  await assert.rejects(() => listAllObjects(async () => ({ success: true, result: [{ key: 'a' }], result_info: { is_truncated: true } })), /pagination/);
  console.log('Media reconciliation: source IDs/media/category/blank/duplicate gaps; complete cursor and start_after inventories, ignored pagination rejection, missing/empty/unknown size and MIME diagnostics passed. No live API in tests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
