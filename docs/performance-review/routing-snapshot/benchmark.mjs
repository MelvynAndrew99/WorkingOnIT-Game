import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const beforeRoot=process.argv[2]??'/tmp/won-routing-before';
const before={model:await import(pathToFileURL(beforeRoot+'/src/game/cityModel.ts')),routing:await import(pathToFileURL(beforeRoot+'/src/game/cityRouting.ts')),traffic:await import(pathToFileURL(beforeRoot+'/src/game/cityTraffic.ts'))};
const after={model:await import('../../../src/game/cityModel.ts'),routing:await import('../../../src/game/cityRouting.ts'),traffic:await import('../../../src/game/cityTraffic.ts')};
const fixtures=['../../performance-integrated/model-small.json','../../performance-integrated/model-busy.json','../../performance-integrated/current-town/save.json'].filter(f=>!process.env.FIXTURE||f.includes(process.env.FIXTURE));
const results=[];
const digest=c=>createHash('sha256').update(JSON.stringify(c)).digest('hex');
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
for(const fixture of fixtures){
 const raw=JSON.parse(readFileSync(new URL(fixture,import.meta.url))).city;
 const cities={before:before.model.parseCity(raw),after:after.model.parseCity(raw)};assert.ok(cities.before&&cities.after);
 const indices={before:before.traffic.roadIndex(cities.before),after:after.traffic.roadIndex(cities.after)};
 const micro=[];
 for(const response of [false,true]){
  const {revision,...expected}=before.routing.routingSnapshot(cities.before,indices.before,response);
  assert.deepEqual(after.routing.routingSnapshot(cities.after,indices.after,response),expected);
  const times={before:[],after:[]};
  for(let trial=0;trial<6;trial++)for(const mode of trial%2?['after','before']:['before','after']){
   const mod=mode==='before'?before:after,start=performance.now();let sum=0;
   for(let n=0;n<3000;n++)sum+=mod.routing.routingSnapshot(cities[mode],indices[mode],response).roads.size;
   assert.equal(sum,indices[mode].roads.size*3000);
   if(trial)times[mode].push(performance.now()-start);
  }
  micro.push({response,snapshots:3000,trials:times,medianBeforeMs:median(times.before),medianAfterMs:median(times.after)});
 }
 const simulation={before:[],after:[]};
 for(let trial=0;trial<Number(process.env.MODEL_TRIALS??3)+1;trial++){
  const checks={};
  for(const mode of trial%2?['after','before']:['before','after']){
   const mod=mode==='before'?before:after;let c=mod.model.parseCity(raw);const frames=[],hashes=[];
   for(let step=0;step<3600;step++){
    const at=performance.now();mod.model.stepCity(c,1/60);frames.push(performance.now()-at);
    if(step%60===59)hashes.push(digest(c));
    if(step===1799){c=mod.model.parseCity(JSON.parse(JSON.stringify(c)));assert.ok(c);}
   }
   checks[mode]=hashes;
   if(trial){const sorted=[...frames].sort((a,b)=>a-b);simulation[mode].push({totalMs:frames.reduce((a,b)=>a+b,0),p95Ms:sorted[3420],p99Ms:sorted[3564],hashes});}
  }
  assert.deepEqual(checks.after,checks.before);
 }
 let a=before.model.parseCity(raw),b=after.model.parseCity(raw),snapshotChecks=0,routeChecks=0;
 for(let step=0;step<1800;step++){
  for(const c of [a,b]){
   if(step===300)c.closures.push({...c.roads[0]});
   if(step===600)Object.assign(c.closures.at(-1),c.roads[1]);
   if(step===1200)c.closures.pop();
  }
  if(step===900){a=before.model.parseCity(JSON.parse(JSON.stringify(a)));b=after.model.parseCity(JSON.parse(JSON.stringify(b)));}
  before.model.stepCity(a,1/60);after.model.stepCity(b,1/60);
  if(step%30===29){
   assert.deepEqual(b,a);
   for(const response of [false,true]){
    const s=before.routing.routingSnapshot(a,undefined,response),t=after.routing.routingSnapshot(b,undefined,response);
    const {revision,...expected}=s;assert.deepEqual(t,expected);snapshotChecks++;
    const points=a.roads.filter((_,i)=>i%Math.max(1,Math.floor(a.roads.length/4))===0).slice(0,4);
    for(const start of points)for(const goal of points){assert.deepEqual(after.routing.weightedRoute(t,start,goal),before.routing.weightedRoute(s,start,goal));routeChecks++;}
    if(response)for(const incident of a.incidents.filter(i=>i.status==='active'))for(const start of points){assert.deepEqual(after.routing.responseRoute(t,start,incident),before.routing.responseRoute(s,start,incident));routeChecks++;}
   }
  }
 }
 const result={fixture,roads:a.roads.length,micro,simulation,medianSimulationBeforeMs:median(simulation.before.map(t=>t.totalMs)),medianSimulationAfterMs:median(simulation.after.map(t=>t.totalMs)),editedRun:{identicalFullStateCheckpoints:60,snapshotChecks,routeChecks}};
 results.push(result);console.log(JSON.stringify({fixture,micro:micro.map(({trials,...s})=>s),medianSimulationBeforeMs:result.medianSimulationBeforeMs,medianSimulationAfterMs:result.medianSimulationAfterMs,editedRun:result.editedRun}));
}
writeFileSync(new URL(process.env.RESULT_FILE??'results.json',import.meta.url),JSON.stringify({node:process.version,results},null,2));
