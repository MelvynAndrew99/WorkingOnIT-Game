import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]??'/tmp/integrated-model-pristine',tag=process.argv[3]??'before';
const model=await import(pathToFileURL(root+'/src/game/cityModel.ts'));
const digest=city=>createHash('sha256').update(JSON.stringify(city)).digest('hex');
const output={root,node:process.version,steps:3600,dt:1/60,warmupTrials:1,measuredTrials:3,fixtures:[]};
for(const name of ['current']){
 const raw=JSON.parse(readFileSync(new URL('save.json',import.meta.url),'utf8')).city;
 const trials=[];
 for(let trial=0;trial<4;trial++){
  let city=model.parseCity(raw);assert.ok(city);const frames=[],checkpoints=[];
  const initial={roads:city.roads.length,buildings:city.buildings.length,trips:city.trips.length};
  const start=performance.now();
  for(let step=0;step<3600;step++){
   const at=performance.now();model.stepCity(city,1/60);frames.push(performance.now()-at);
   if(step%60===59)checkpoints.push(digest(city));
   if(step===1799){city=model.parseCity(JSON.parse(JSON.stringify(city)));assert.ok(city);}
  }
  const totalMs=performance.now()-start;frames.sort((a,b)=>a-b);
  if(trial)trials.push({totalMs,p50Ms:frames[1800],p95Ms:frames[3420],p99Ms:frames[3564],maxMs:frames.at(-1),checkpoints,finalHash:digest(city),initial,final:{trips:city.trips.length,completed:city.completed,accidents:city.accidentCount}});
 }
 assert.ok(trials.every(t=>t.finalHash===trials[0].finalHash));output.fixtures.push({name,trials});
}
writeFileSync(new URL(`model-${tag}.json`,import.meta.url),JSON.stringify(output,null,2));console.log(JSON.stringify(output.fixtures.map(f=>({name:f.name,trials:f.trials.map(({checkpoints,...t})=>t)})),null,2));
