// Metadata reconciliation only. Presence in a ZIP is not delivery/decoding evidence.
function auditMediaReferences(questions, manifest, archives, mapping) {
  const references = new Map(), issues = [];
  const categoriesById = new Map(questions.map(q => [q.id, new Set(JSON.parse(q.categories))]));
  const manifestNames = new Set();
  for (const item of manifest.media) {
    if (typeof item.filename !== 'string' || !item.filename.trim()) { issues.push({ kind: 'invalidManifestReference' }); continue; }
    if (manifestNames.has(item.filename)) issues.push({ kind: 'duplicateManifestReference', filename: item.filename });
    manifestNames.add(item.filename);
  }
  for (const question of questions) {
    if (question.media_filename === null) continue;
    const name = question.media_filename;
    if (typeof name !== 'string' || !name.trim()) { issues.push({ kind: 'invalidQuestionReference', questionId: question.id }); continue; }
    if (!references.has(name)) references.set(name, { filename: name, questionIds: [], categories: new Set() });
    const reference = references.get(name);
    reference.questionIds.push(question.id);
    categoriesById.get(question.id).forEach(category => reference.categories.add(category));
  }
  const archiveIndex = new Map();
  for (const entry of archives) {
    if (!archiveIndex.has(entry.filename)) archiveIndex.set(entry.filename, []);
    archiveIndex.get(entry.filename).push(entry);
  }
  const keyIndex = new Map(), cacheIndex = new Map(), caseIndex = new Map();
  const group = (index, key, name) => { if (!index.has(key)) index.set(key, []); index.get(key).push(name); };
  const files = [...references.values()].sort((a, b) => a.filename.localeCompare(b.filename, 'en')).map(reference => {
    const name = reference.filename;
    const key = mapping.deliveredMediaKey(name);
    const deliveredFilename = mapping.deliveredMediaFilename(name);
    // Exact current media-cache safeName rule; changes require a regression review.
    const cacheName = deliveredFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const supported = /\.(wmv|mp4|m4v|mov|jpg|jpeg|png|webp)$/i.test(name);
    const matches = archiveIndex.get(name.split('/').at(-1)) ?? [];
    if (!manifestNames.has(name)) issues.push({ kind: 'missingFromManifest', filename: name, questionIds: reference.questionIds });
    if (!supported) issues.push({ kind: 'unsupportedExtension', filename: name, questionIds: reference.questionIds });
    if (name !== name.trim() || name.includes('..') || name.includes('\\') || name.startsWith('/')) issues.push({ kind: 'unsafeReference', filename: name, questionIds: reference.questionIds });
    if (!matches.length) issues.push({ kind: 'missingFromLocalArchives', filename: name, questionIds: reference.questionIds });
    if (matches.some(entry => entry.size === 0)) issues.push({ kind: 'emptyArchiveEntry', filename: name, questionIds: reference.questionIds });
    if (new Set(matches.map(entry => `${entry.size}:${entry.crc}`)).size > 1) issues.push({ kind: 'conflictingArchiveEntries', filename: name, questionIds: reference.questionIds });
    group(keyIndex, key, name); group(cacheIndex, cacheName, name); group(caseIndex, key.toLowerCase(), name);
    return { ...reference, categories: [...reference.categories].sort(), deliveredKey: key, cacheName,
      type: /\.(wmv|mp4|m4v|mov)$/i.test(name) ? 'video' : supported ? 'image' : 'unsupported',
      requiresConversion: /\.wmv$/i.test(name), archiveMatches: matches,
      deliveryAvailability: 'unverified', integrity: 'unverified', questionMediaMatch: 'unverified' };
  });
  for (const [kind, index] of [['deliveredKeyCollision', keyIndex], ['cacheKeyCollision', cacheIndex], ['caseVariantKeys', caseIndex]]) {
    for (const [key, names] of index) if (names.length > 1) issues.push({ kind, key, filenames: names,
      questionIds: names.flatMap(name => references.get(name).questionIds) });
  }
  for (const name of manifestNames) if (!references.has(name)) issues.push({ kind: 'unusedManifestReference', filename: name });
  const issueCounts = {};
  issues.forEach(issue => { issueCounts[issue.kind] = (issueCounts[issue.kind] ?? 0) + 1; });
  const categories = [...new Set(questions.flatMap(q => JSON.parse(q.categories)))].sort();
  const referencedBasenames = new Set(files.map(file => file.filename.split('/').at(-1)));
  const unusedArchiveEntries = archives.filter(entry => !referencedBasenames.has(entry.filename));
  return { summary: { totalQuestions: questions.length,
    questionsWithoutMediaReference: questions.filter(q => q.media_filename === null).length,
    questionsWithMediaReference: questions.filter(q => q.media_filename !== null).length,
    uniqueReferences: files.length, uniqueDeliveredKeys: keyIndex.size, manifestReferences: manifestNames.size,
    localArchiveEntries: archives.length, referencesFoundInArchives: files.filter(file => file.archiveMatches.length).length,
    unusedLocalArchiveEntries: unusedArchiveEntries.length,
    videosRequiringConversion: files.filter(file => file.requiresConversion).length,
    deliveryUnverified: files.length, integrityUnverified: files.length, issueCounts,
    byType: ['image', 'video', 'unsupported'].map(type => ({ type, files: files.filter(file => file.type === type).length })),
    byCategory: categories.map(category => ({ category,
      questionsWithMedia: files.filter(file => file.categories.includes(category)).reduce((sum, file) => sum + file.questionIds.filter(id => categoriesById.get(id).has(category)).length, 0),
      uniqueReferences: files.filter(file => file.categories.includes(category)).length })) }, files, issues, unusedArchiveEntries };
}
module.exports = { auditMediaReferences };
