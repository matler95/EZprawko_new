// Explicit read-only Cloudflare GET audit. Never prints/persists authentication tokens.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { listAllObjects, reconcileRemoteObjects } = require('./media-remote-audit.cjs');
const root = path.resolve(__dirname, '..');
let stage = 'identity';
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--details')) throw Error('Usage: node scripts/audit-media-remote.cjs [--details]');
function wrangler(command) {
  return JSON.parse(execFileSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), ...command, '--json'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 1024 * 1024 }));
}
(async () => {
  const identity = wrangler(['whoami']);
  if (!identity.loggedIn || identity.accounts?.length !== 1) throw Error('Exactly one authenticated Cloudflare account required');
  stage = 'credential';
  const credential = wrangler(['auth', 'token']);
  if (typeof credential.token !== 'string' || !credential.token) throw Error('Existing CLI token unavailable');
  const account = identity.accounts[0].id;
  stage = 'config';
  const configPath = path.join(root, 'infrastructure/cloudflare-media-worker/wrangler.jsonc');
  const parsed = require('typescript').parseConfigFileTextToJson(configPath, fs.readFileSync(configPath, 'utf8'));
  if (parsed.error) throw Error('Invalid Worker configuration');
  const config = parsed.config;
  const bucket = config.r2_buckets.find(item => item.binding === 'MEDIA_BUCKET')?.bucket_name;
  if (!/^[a-f0-9]{32}$/i.test(account) || !/^[a-z0-9-]{3,63}$/.test(bucket ?? '')) throw Error('Invalid configured account/bucket');
  stage = 'inventory';
  const objects = await listAllObjects(async (cursor, startAfter) => {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects`);
    url.searchParams.set('per_page', '1000'); if (cursor) url.searchParams.set('cursor', cursor);
    if (startAfter) url.searchParams.set('start_after', startAfter);
    const response = await fetch(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${credential.token}` } });
    if (!response.ok) throw Error(`Inventory GET HTTP ${response.status}`);
    return response.json();
  });
  stage = 'localReport';
  const local = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/audit-media.cjs'), '--details'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
  const result = reconcileRemoteObjects(local.files, objects);
  result.summary.bucket = bucket; result.summary.checkedAt = new Date().toISOString(); result.summary.inventoryComplete = true;
  result.summary.appAccess = 'unverified'; result.summary.decoding = 'unverified';
  console.log(JSON.stringify(args.includes('--details') ? result : { ...result.summary, issueSample: result.issues.slice(0, 20) }, null, 2));
})().catch(error => {
  // Never echo CLI stderr, raw request bodies, credentials or provider messages.
  const message = /^Inventory GET HTTP \d+$|^Incomplete inventory response$|^Invalid inventory pagination$|^Exactly one authenticated Cloudflare account required$/.test(error.message) ? error.message : 'Remote inventory audit failed; no completeness result available';
  const code = error.cause?.code ?? error.code;
  console.error(`${message}; stage=${stage}; error=${error.name}; code=${typeof code === 'string' && /^[A-Z0-9_]+$/.test(code) ? code : 'unavailable'}`); process.exitCode = 1;
});
