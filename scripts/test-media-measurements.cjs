const assert=require('node:assert/strict'),{summarize}=require('./media-measurement-summary.cjs');
const rows=Array.from({length:20},(_,i)=>({platform:'android',network:'wifi',flow:'exam',cacheState:'warm',scenario:'abandon-restart',startMs:i+1,firstFrameMs:i+2,downloadBytes:100,peakCacheBytes:1000,appDataBytes:2000}));
const [report]=summarize(rows);assert(report.sufficientSample);assert.equal(report.startMs.median,10.5);assert.equal(report.startMs.p95,19);
assert.equal(summarize(rows.slice(0,2))[0].sufficientSample,false);assert.throws(()=>summarize([{...rows[0],url:'private'}]),/sanitized/);
assert.throws(()=>summarize([{...rows[0],startMs:-1}]),/nonnegative/);assert.throws(()=>summarize([{...rows[0],platform:'serial-number'}]),/scope/);
console.log('Device measurement summaries: grouping, nearest-rank p95, median, sample-size gate and secret/invalid-field rejection passed. These are synthetic unit-test values, not physical measurements.');
