import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const roots={before:process.argv[2]??'/tmp/integrated-model-pristine',after:process.cwd()};
const raw=JSON.parse(readFileSync(new URL('model-busy.json',import.meta.url))).city;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const results=[];
for(const [tag,root] of Object.entries(roots)){
 const {parseCity}=await import(pathToFileURL(root+'/src/game/cityModel.ts'));
 const {intersectionSafetySnapshot}=await import(pathToFileURL(root+'/src/game/cityIncidents.ts'));
 const city=parseCity(raw);assert.ok(city);const cityHash=hash(city),trials=[];let outputHash;
 for(let trial=0;trial<4;trial++){
  const start=performance.now();let result;
  for(let i=0;i<100;i++)result=intersectionSafetySnapshot(city);
  const totalMs=performance.now()-start;
  const resultHash=hash(result);assert.equal(hash(city),cityHash,'read must preserve full city');
  if(outputHash)assert.equal(resultHash,outputHash);outputHash=resultHash;
  if(trial)trials.push({totalMs,perReportMs:totalMs/100});
 }
 results.push({tag,root,callsPerTrial:100,warmupTrials:1,trials,cityHash,outputHash});
}
assert.equal(results[0].outputHash,results[1].outputHash);assert.equal(results[0].cityHash,results[1].cityHash);
writeFileSync(new URL('model-hud-final.json',import.meta.url),JSON.stringify(results,null,2));console.log(results);
