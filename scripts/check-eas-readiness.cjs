const path = require('node:path');
const PUBLIC_KEYS = ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY','EXPO_PUBLIC_MEDIA_BASE_URL'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function readiness(config, env, profile = 'preview') {
  const issues=[];
  const id=config.extra?.eas?.projectId;
  if(typeof id!=='string'||!UUID.test(id))issues.push('Link the real EAS project: expo.extra.eas.projectId is missing or invalid.');
  if(config.ios?.bundleIdentifier!=='pl.ezprawko.app'||config.android?.package!=='pl.ezprawko.app')issues.push('Both native identifiers must be pl.ezprawko.app.');
  if(config.runtimeVersion?.policy!=='fingerprint')issues.push('Keep the fingerprint runtime compatibility policy.');
  if(id && (config.updates?.enabled!==true||config.updates?.url!==`https://u.expo.dev/${id}`))issues.push('OTA must use the linked project URL and be enabled before a native build.');
  if(profile!=='development') {
    for(const key of PUBLIC_KEYS)if(!env[key]?.trim())issues.push(`Missing EAS environment variable: ${key}.`);
    for(const key of [PUBLIC_KEYS[0],PUBLIC_KEYS[2]])if(env[key]) {
      try { const url=new URL(env[key]);if(url.protocol!=='https:'||url.username||url.password)throw Error(); }
      catch {issues.push(`Use a valid HTTPS URL without embedded credentials for ${key}.`);}
    }
    const key=env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if(key) {
      let safe=key.startsWith('sb_publishable_');
      if(!safe)try {safe=JSON.parse(Buffer.from(key.split('.')[1]??'', 'base64url').toString()).role==='anon';}catch{}
      if(!safe)issues.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be publishable/anon, never service-role or secret.');
    }
  }
  return issues;
}
if(require.main===module) {
  const root=path.resolve(__dirname,'..');
  try {
    require('@expo/env').load(root,{silent:true});
    const config=require('@expo/config').getConfig(root,{skipSDKVersionRequirement:true}).exp;
    const issues=readiness(config,process.env,process.env.EAS_BUILD_PROFILE??'preview');
    if(issues.length){console.error('Build readiness incomplete:\n'+issues.map(v=>`- ${v}`).join('\n'));process.exitCode=1;}
    else console.log('Local build configuration checks passed. Remote account, environment, signing, native build and device QA are not certified.');
  } catch {console.error('Unable to resolve build configuration. Check app.config.ts and the real EAS project link. No credentials were printed.');process.exitCode=1;}
}
module.exports={readiness};
