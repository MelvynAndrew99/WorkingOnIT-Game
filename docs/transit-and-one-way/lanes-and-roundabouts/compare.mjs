import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)));
const baseline=read('baseline-model.json'),current=read('after-model.json');
for(let i=0;i<3;i++)assert.deepEqual(current[i].hashes,baseline[i].hashes,`unchanged full-city checkpoints trial ${i+1}`);
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const timing=rows=>Object.fromEntries(['ms','p50','p95','p99'].map(k=>[k,median(rows.map(r=>r[k]))]));
const result={baseline:'Frozen prior one-way implementation /tmp/oneway-dev/src, immutable supplied player save',trials:3,checkpointsPerTrial:60,allFullCityHashesEqual:true,baselineMedian:timing(baseline),currentMedian:timing(current),limitation:'Model measurements only; no target-device smoothness claim.'};
writeFileSync(new URL('comparison.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
