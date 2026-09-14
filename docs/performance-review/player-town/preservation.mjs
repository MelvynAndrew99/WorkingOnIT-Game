import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const before=await import(pathToFileURL((process.argv[2]??'/tmp/player-perf-before')+'/src/game/cityModel.ts'));
const after=await import('../../../src/game/cityModel.ts');
const raw=JSON.parse(readFileSync(new URL('save.json',import.meta.url),'utf8'));
let a=before.parseCity(raw.city),b=after.parseCity(raw.city);assert.ok(a&&b);
const geometry=JSON.stringify([b.roads,b.buildings]),checks=[];
for(let i=0;i<3600;i++){
 if(i===1200){a.closures.push({...a.roads[0]});b.closures.push({...b.roads[0]});}
 if(i===1500){a.closures.at(-1).x=a.roads[1].x;a.closures.at(-1).y=a.roads[1].y;b.closures.at(-1).x=b.roads[1].x;b.closures.at(-1).y=b.roads[1].y;}
 if(i===1800){a=before.parseCity(JSON.parse(JSON.stringify(a)));b=after.parseCity(JSON.parse(JSON.stringify(b)));assert.ok(a&&b);}
 if(i===2400){a.closures.pop();b.closures.pop();}
 before.stepCity(a,1/60);after.stepCity(b,1/60);
 if(i%60===59){assert.deepEqual(b,a);checks.push(i+1);}
}
assert.equal(JSON.stringify([b.roads,b.buildings]),geometry);
const result={equalStateChecks:checks.length,reloadAtSecond:30,closureAddedAt:20,closureMovedInPlaceAt:25,closureRemovedAt:40,geometryPreserved:true};
writeFileSync(new URL('preservation.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
