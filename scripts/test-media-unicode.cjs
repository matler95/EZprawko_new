// Actual app mapping and cache with in-memory transport; no live media downloads.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), modules = new Map(), files = new Map(), grants = [], downloads = [];
const directory = 'file:///cache/question-media/';
const native = { cacheDirectory: 'file:///cache/', makeDirectoryAsync: async () => {},
  getInfoAsync: async uri => files.has(uri) ? { exists: true, isDirectory: false, size: files.get(uri), modificationTime: 1 } : { exists: false },
  downloadAsync: async (url, uri, options) => { downloads.push({ url, options }); files.set(uri, require('../assets/data/media-delivery.json').sizes[decodeURIComponent(new URL(url).pathname.slice('/media/'.length))] ?? 123); return { status: 200 }; },
  moveAsync: async ({ from, to }) => { files.set(to, files.get(from)); files.delete(from); },
  deleteAsync: async uri => files.delete(uri),
  readDirectoryAsync: async () => [...files.keys()].filter(uri => uri.startsWith(directory)).map(uri => uri.slice(directory.length)) };
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  new Function('require', 'exports', 'process', ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop:true } }).outputText)(name => {
    if (name.startsWith('@/assets/')) return require(path.join(root,name.slice(2)));
    if (name === 'expo-file-system/legacy') return native;
    if (name === '@/services/media-auth') return { mediaGrant: async key => { grants.push(key); return 'test-grant'; } };
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    throw Error(name);
  }, exports, { env: { EXPO_PUBLIC_MEDIA_BASE_URL: 'https://media.invalid/media', EXPO_PUBLIC_SUPABASE_URL: 'https://auth.invalid' } });
  modules.set(file, exports); return exports;
}
(async () => {
  const mapping = load('src/config/media.ts'), cache = load('src/services/media-cache.ts');
  const original = 'Ostroz\u0307nos\u0301c\u0301 pkt 8.wmv';
  const canonical = original.normalize('NFC');
  assert.equal(mapping.deliveredMediaKey(original), 'wideo/Ostrożność pkt 8.mp4');
  assert.equal(mapping.deliveredMediaKey('Ostroznos\u0301c\u0301 pkt 13.wmv'), 'wideo/Ostrozność pkt 13.mp4');
  assert.equal(mapping.deliveredMediaKey('wideo/' + original), 'wideo/Ostrożność pkt 8.mp4', 'existing folder remains single');
  assert.equal(mapping.deliveredMediaKey('DSC_0055.JPG'), 'zdjecia/DSC_0055.JPG', 'case is never folded');
  assert.equal(mapping.deliveredMediaKey('5-9.2021.wmv'), 'wideo/5-9.2021.mp4', 'no speculative bis substitution');
  const [first, second] = await Promise.all([cache.cachedMediaUri(original), cache.cachedMediaUri(canonical)]);
  assert.equal(first, second); assert.equal(grants.length, 1); assert.equal(downloads.length, 1);
  assert.equal(decodeURIComponent(new URL(downloads[0].url).pathname.slice('/media/'.length)), grants[0], 'signed key equals exact requested key');
  assert.equal(grants[0], 'wideo/Ostrożność pkt 8.mp4');
  assert.equal(downloads[0].options.headers.Authorization, 'Bearer test-grant');
  assert.equal(await cache.cachedMediaUri(original, true), first);
  assert.equal(await cache.cachedMediaUri(canonical, true), first);
  assert.equal(grants.length, 1, 'warm cache variants do not request another grant');
  const oldName = original.replace(/\.wmv$/i, '.mp4').replace(/[^a-zA-Z0-9._-]/g, '_');
  assert.notEqual(first, directory + oldName, 'legacy noncanonical cache is not falsely reused');
  console.log('Media Unicode: actual NFC delivery mapping for both affected questions, exact grant/URL identity, shared cache/download lock, case/folder preservation and no guessed replacements passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
