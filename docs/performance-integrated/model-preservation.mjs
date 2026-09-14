import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const before=await import(pathToFileURL((process.argv[2]??'/tmp/integrated-model-pristine')+'/src/game/cityModel.ts'));
const after=await import('../../src/game/cityModel.ts');
const evidence=[];
for(const name of ['small','busy']){
 const raw=JSON.parse(readFileSync(new URL(`model-${name}.json`,import.meta.url))).city;
 let a=before.parseCity(raw),b=after.parseCity(raw);assert.ok(a&&b);const checks=[];
 for(let i=0;i<3600;i++){
  if(i===1200){a.closures.push({...a.roads[0]});b.closures.push({...b.roads[0]});}
  if(i===1500){Object.assign(a.closures.at(-1),a.roads[1]);Object.assign(b.closures.at(-1),b.roads[1]);}
  if(i===1800){a=before.parseCity(JSON.parse(JSON.stringify(a)));b=after.parseCity(JSON.parse(JSON.stringify(b)));assert.ok(a&&b);}
  if(i===2400){a.closures.pop();b.closures.pop();}
  before.stepCity(a,1/60);after.stepCity(b,1/60);
  if(i%60===59){assert.deepEqual(b,a);checks.push({step:i+1,sha256:createHash('sha256').update(JSON.stringify(b)).digest('hex')});}
 }
 evidence.push({name,checks,closureAddedAt:20,closureMovedInPlaceAt:25,reloadAt:30,closureRemovedAt:40});
}
writeFileSync(new URL(`model-preservation${process.argv[3] ? '-'+process.argv[3] : ''}.json`,import.meta.url),JSON.stringify(evidence,null,2));console.log(evidence.map(({checks,...e})=>({...e,equalFullStateCheckpoints:checks.length})));
