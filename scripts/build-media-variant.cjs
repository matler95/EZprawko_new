// Candidate manifest ONLY. Does not edit the app manifest, upload or mark quality approved.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const [reportFile,version,outputFile]=process.argv.slice(2);
if(!reportFile || !/^[a-z0-9-]{1,32}$/.test(version??'') || !outputFile)throw Error('Usage: node scripts/build-media-variant.cjs REPORT VERSION NEW_OUTPUT_FILE');
const output=path.resolve(root,outputFile),relative=path.relative(root,output);
if(relative.startsWith('..') || path.isAbsolute(relative) || fs.existsSync(output) || !relative.startsWith('.media-pilot'+path.sep))throw Error('Output must be a new file under .media-pilot');
const report=JSON.parse(fs.readFileSync(path.resolve(root,reportFile),'utf8'));
const current=require('../assets/data/media-delivery.json');
const candidate={...current,deliveryVersion:version,paths:{},sizes:{...current.sizes},qualityApproved:false,published:false};
const selected=[];
for(const record of report.records){
  if(record.status!=='reviewRequired' || record.candidateBytes>=record.currentlyDeliveredBytes)continue;
  if(!Number.isSafeInteger(record.candidateBytes)||record.candidateBytes<=0||!current.sizes[record.key])throw Error('Invalid candidate size');
  const [kind,...name]=record.key.split('/');const key=kind+'/'+version+'/'+name.join('/');
  candidate.paths[record.key]=key;delete candidate.sizes[record.key];candidate.sizes[key]=record.candidateBytes;
  selected.push({sourceKey:record.key,key,bytes:record.candidateBytes,sha256:record.sha256});
}
fs.writeFileSync(output,JSON.stringify(candidate,null,2)+'\n');
console.log(JSON.stringify({candidateManifest:path.relative(root,output),published:false,qualityApproved:false,selected},null,2));
