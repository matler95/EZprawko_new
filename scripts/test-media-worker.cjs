const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHmac } = require('node:crypto');

(async () => {
  const filename = path.resolve(__dirname, '../infrastructure/cloudflare-media-worker/src/index.js');
  const { default: worker } = await import(`data:text/javascript;base64,${fs.readFileSync(filename).toString('base64')}`);
  const secret = 'local-test-only-secret';
  const key = 'wideo/test film.mp4';
  const defaults = { aud: 'ezprawko-media', sub: 'test-user', key, exp: Math.floor(Date.now()/1000)+120 };
  const token = (claims = defaults, header = { alg: 'HS256', typ: 'JWT' }, signingKey = secret) => {
    const unsigned = [header,claims].map((item) => Buffer.from(JSON.stringify(item)).toString('base64url')).join('.');
    return `${unsigned}.${createHmac('sha256',signingKey).update(unsigned).digest('base64url')}`;
  };
  let reads = 0;
  const env = { MEDIA_TOKEN_SECRET: secret, MEDIA_BUCKET: { get: async (name) => {
    reads++;
    assert.equal(name,key);
    return { body: 'test-media', httpEtag: '"test-etag"', writeHttpMetadata: (headers) => headers.set('Content-Type','video/mp4') };
  } } };
  const send = (grant, url = `https://example.test/media/${encodeURIComponent(key).replace(/%2F/g,'/')}`, method='GET', configuration=env) =>
    worker.fetch(new Request(url, { method, headers: grant ? { Authorization: `Bearer ${grant}` } : {} }), configuration);
  const good = await send(token());
  assert.equal(good.status,200);
  assert.equal(await good.text(),'test-media');
  assert.equal(good.headers.get('Content-Type'),'video/mp4');
  assert.equal(good.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(good.headers.get('Cache-Control'),'private, max-age=86400');
  const head = await send(token(),undefined,'HEAD');
  assert.equal(head.status,200);
  assert.equal(await head.text(),'');
  const before = reads;
  const invalidClaims = [
    { ...defaults, exp: undefined }, { ...defaults, exp: null }, { ...defaults, exp: String(defaults.exp) },
    { ...defaults, exp: defaults.exp+.5 }, { ...defaults, exp: 0 },
    { ...defaults, exp: Math.floor(Date.now()/1000) }, { ...defaults, exp: Math.floor(Date.now()/1000)+10000 },
    { ...defaults, sub: {} }, { ...defaults, sub: ' ' }, { ...defaults, key: 'another.mp4' },
    { ...defaults, aud: 'another-audience' }, null,
  ];
  for (const claims of invalidClaims) assert.equal((await send(token(claims))).status,401);
  for (const grant of [undefined,'broken',`${token()}.extra`,token(defaults,{ alg: 'none' }),token(defaults,undefined,'wrong-key')]) {
    assert.equal((await send(grant)).status,401);
  }
  assert.equal((await send(token(),undefined,'GET',{ ...env, MEDIA_TOKEN_SECRET: '' })).status,401);
  assert.equal(reads,before,'rejected grants must never access R2');
  for (const name of ['%ZZ','%00bad','%5Cbad','%2Fbad','a%2E%2Eb']) {
    assert.equal((await send(token(),`https://example.test/media/${name}`)).status,404);
  }
  assert.equal((await send(token(),'https://example.test/')).status,404);
  assert.equal((await send(token(),undefined,'POST')).status,405);
  assert.equal((await send(token(),undefined,'GET',{ ...env, MEDIA_BUCKET: { get: async () => null } })).status,404);
  const queryGrant = await send(undefined,`https://example.test/media/${encodeURIComponent(key)}?token=${token()}`);
  assert.equal(queryGrant.status,200);
  const canonicalKey = 'wideo/Ostrożność pkt 8.mp4';
  const canonicalGrant = token({ ...defaults, key: canonicalKey });
  let canonicalReads = 0;
  const canonicalEnv = { ...env, MEDIA_BUCKET: { get: async name => { canonicalReads++; assert.equal(name, canonicalKey); return { body: 'fixture', httpEtag: 'fixture', writeHttpMetadata() {} }; } } };
  const canonicalUrl = `https://example.test/media/${canonicalKey.split('/').map(encodeURIComponent).join('/')}`;
  assert.equal((await send(canonicalGrant, canonicalUrl, 'GET', canonicalEnv)).status, 200);
  assert.equal(canonicalReads, 1);
  const decomposedUrl = `https://example.test/media/${canonicalKey.normalize('NFD').split('/').map(encodeURIComponent).join('/')}`;
  assert.equal((await send(canonicalGrant, decomposedUrl, 'GET', canonicalEnv)).status, 401, 'worker keeps signature bound to exact key');
  assert.equal(canonicalReads, 1, 'mismatched Unicode representation never reads bucket');
  console.log('Media Worker: valid GET/HEAD, object-bound signatures, malformed/expired/missing-exp grants, key parsing and no unauthorized R2 reads passed.');
})().catch((error) => { console.error(error); process.exitCode=1; });
