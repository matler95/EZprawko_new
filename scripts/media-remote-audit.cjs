async function listAllObjects(fetchPage) {
  const objects = [], cursors = new Set(), keys = new Set(); let cursor, startAfter;
  for (let page = 0; page < 100; page++) {
    const response = await fetchPage(cursor, startAfter);
    if (!response.success || !Array.isArray(response.result)) throw Error('Incomplete inventory response');
    for (const object of response.result) {
      if (typeof object.key !== 'string' || keys.has(object.key) || (startAfter && object.key <= startAfter)) throw Error('Invalid inventory pagination');
      keys.add(object.key);
    }
    objects.push(...response.result);
    if (response.result_info?.is_truncated === false) return objects;
    if (!response.result_info || response.result_info.is_truncated === undefined) {
      // Documented start_after is an independent continuation when cursor metadata
      // is omitted. Require strictly sorted keys and an explicit empty final page.
      if (!response.result.length) return objects;
      for (let i = 1; i < response.result.length; i++) if (response.result[i].key <= response.result[i - 1].key) throw Error('Invalid inventory pagination');
      startAfter = response.result.at(-1).key; cursor = undefined; continue;
    }
    cursor = response.result_info.cursor;
    if (typeof cursor !== 'string' || !cursor || cursors.has(cursor)) throw Error('Invalid inventory pagination');
    cursors.add(cursor);
    startAfter = undefined;
  }
  throw Error('Inventory page limit exceeded');
}
function reconcileRemoteObjects(files, objects) {
  const byKey = new Map(), issues = [];
  for (const object of objects) {
    if (typeof object.key !== 'string') throw Error('Invalid inventory key');
    if (byKey.has(object.key)) throw Error('Duplicate inventory key');
    byKey.set(object.key, object);
  }
  const expected = new Set(files.map(file => file.deliveredKey));
  const records = files.map(file => {
    const object = byKey.get(file.deliveredKey);
    const contentType = object?.http_metadata?.contentType ?? null;
    const validSize = Number.isSafeInteger(object?.size) && object.size > 0;
    let status = !object ? 'missing' : validSize ? 'presentNonempty' : object.size === 0 ? 'empty' : 'unknownSize';
    const comparable = key => key.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase();
    const candidates = !object ? objects.filter(candidate => comparable(candidate.key) === comparable(file.deliveredKey))
      .map(candidate => ({ key: candidate.key, match: candidate.key.normalize('NFC') === file.deliveredKey.normalize('NFC') ? 'unicodeNormalizationOnly' : 'spellingOrCaseCandidate', size: candidate.size })) : [];
    if (status !== 'presentNonempty') issues.push({ kind: status, key: file.deliveredKey, questionIds: file.questionIds, candidates });
    if (object && contentType && !(file.type === 'video' ? /^video\//i : /^image\//i).test(contentType)) issues.push({ kind: 'unexpectedContentType', key: file.deliveredKey, contentType, questionIds: file.questionIds });
    return { filename: file.filename, key: file.deliveredKey, questionIds: file.questionIds,
      categories: file.categories, type: file.type, status, size: object?.size ?? null, contentType,
      authenticatedAppAccess: 'unverified', decoding: 'unverified' };
  });
  const counts = {}; records.forEach(record => { counts[record.status] = (counts[record.status] ?? 0) + 1; });
  return { summary: { expectedReferences: files.length, inventoryObjects: objects.length, counts,
    unknownContentType: records.filter(record => record.status !== 'missing' && !record.contentType).length,
    unexpectedContentType: issues.filter(issue => issue.kind === 'unexpectedContentType').length,
    unreferencedInventoryObjects: objects.filter(object => !expected.has(object.key)).length,
    byType: ['image', 'video'].map(type => ({ type, expected: records.filter(record => record.type === type).length,
      presentNonempty: records.filter(record => record.type === type && record.status === 'presentNonempty').length })),
    byCategory: [...new Set(files.flatMap(file => file.categories))].sort().map(category => ({ category,
      expected: records.filter(record => record.categories.includes(category)).length,
      presentNonempty: records.filter(record => record.categories.includes(category) && record.status === 'presentNonempty').length })) }, records, issues,
    unreferencedObjects: objects.filter(object => !expected.has(object.key)).map(object => ({ key: object.key, size: object.size, contentType: object.http_metadata?.contentType ?? null })) };
}
module.exports = { listAllObjects, reconcileRemoteObjects };
