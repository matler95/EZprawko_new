// Physical-device measurements supplied explicitly; never substitutes mock timing for device QA.
const fs=require('node:fs');
const allowed=new Set(['platform','network','flow','cacheState','scenario','startMs','firstFrameMs','downloadBytes','peakCacheBytes','appDataBytes']);
const enums={platform:['android','ios'],network:['wifi','slow','offline'],flow:['study','exam'],cacheState:['cold','warm','partial'],scenario:['start','abandon-restart']};
function stats(values){const s=[...values].sort((a,b)=>a-b);return {count:s.length,min:s[0],median:(s[Math.floor((s.length-1)/2)]+s[Math.floor(s.length/2)])/2,
  p95:s[Math.ceil(s.length*.95)-1],max:s.at(-1)};}
function summarize(rows){
  if(!Array.isArray(rows)||!rows.length||rows.length>10000)throw Error('Expected 1..10000 measured rows');
  const groups=new Map();
  for(const row of rows){
    if(!row || typeof row!=='object' || Object.keys(row).some(key=>!allowed.has(key)))throw Error('Only sanitized measurement fields are accepted');
    for(const [key,values] of Object.entries(enums))if(!values.includes(row[key]))throw Error('Invalid measurement scope');
    for(const key of ['startMs','firstFrameMs','downloadBytes','peakCacheBytes','appDataBytes'])if(!Number.isSafeInteger(row[key])||row[key]<0)throw Error('Expected nonnegative measured integer');
    const key=Object.keys(enums).map(key=>row[key]).join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
  }
  return [...groups].map(([scope,rows])=>({scope,sufficientSample:rows.length>=20,
    startMs:stats(rows.map(r=>r.startMs)),firstFrameMs:stats(rows.map(r=>r.firstFrameMs)),
    downloadBytes:stats(rows.map(r=>r.downloadBytes)),peakCacheBytes:stats(rows.map(r=>r.peakCacheBytes)),appDataBytes:stats(rows.map(r=>r.appDataBytes))}));
}
module.exports={summarize};
if(require.main===module){if(process.argv.length!==3)throw Error('Usage: node scripts/media-measurement-summary.cjs MEASUREMENTS.json');
  console.log(JSON.stringify(summarize(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));}
