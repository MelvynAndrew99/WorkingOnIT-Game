import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {parseCity, isResidential, stepCity} from '../../../src/game/cityModel.ts';
import {homeRoadIssue, homeRoadIssues} from '../../../src/game/cityVisits.ts';
import {withRoadPathRead} from '../../../src/game/cityPathfinding.ts';
const fixtures = ['../../performance-integrated/model-small.json','../../performance-integrated/model-busy.json','../../performance-integrated/current-town/save.json'];
const results=[];
for(const fixture of fixtures){
 const raw=JSON.parse(readFileSync(new URL(fixture,import.meta.url))).city;
 const city=parseCity(raw);assert.ok(city);
 const homes=city.buildings.filter(b=>b.kind==='home');
 const oldRead=()=>withRoadPathRead(city,()=>homes.map(b=>homeRoadIssue(city,b)));
 const newRead=()=>withRoadPathRead(city,()=>{const issues=homeRoadIssues(city);return homes.map(b=>issues.get(b.id));});
 assert.deepEqual(newRead(),oldRead());
 const saved=JSON.stringify(city),trials=[];
 for(let trial=0;trial<6;trial++){
  const times={};
  for(const mode of trial%2?['cached','original']:['original','cached']){
   const read=mode==='original'?oldRead:newRead,start=performance.now();
   for(let frame=0;frame<3600;frame++)read();
   times[mode]=performance.now()-start;
  }
  if(trial)trials.push(times);
 }
 assert.equal(JSON.stringify(city),saved);
 // Exercise evolving traffic and changes between frames against the unchanged oracle.
 let live=parseCity(raw),control=parseCity(raw);let checkpoints=0;
 for(let step=0;step<1800;step++){
  for(const c of [live,control]){
   if(step===300)c.closures.push({...c.roads[0]});
   if(step===600)Object.assign(c.closures.at(-1),c.roads[1]);
   if(step===1200)c.closures.pop();
  }
  if(step===900){live=parseCity(JSON.parse(JSON.stringify(live)));control=parseCity(JSON.parse(JSON.stringify(control)));}
  const issues=homeRoadIssues(live);
  if(step%30===0){for(const b of live.buildings.filter(isResidential))assert.equal(issues.get(b.id),homeRoadIssue(live,b));}
  stepCity(live,1/60);stepCity(control,1/60);
  if(step%30===29){assert.deepEqual(live,control);checkpoints++;}
 }
 const median=key=>trials.map(t=>t[key]).sort((a,b)=>a-b)[2];
 results.push({fixture,roads:city.roads.length,homes:homes.length,buildings:city.buildings.length,frames:3600,trials,medianOriginalMs:median('original'),medianCachedMs:median('cached'),identicalFullStateCheckpoints:checkpoints});
}
const output={node:process.version,results};
writeFileSync(new URL('results.json',import.meta.url),JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
