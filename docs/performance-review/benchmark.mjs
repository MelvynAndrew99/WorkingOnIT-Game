import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {stepCity,parseCity} from '../../src/game/cityModel.ts';
import {intersectionTown,turningIntersectionTown} from '../../src/game/fixtures/intersectionTown.ts';
const saved=JSON.parse(readFileSync(new URL('../../src/game/fixtures/police-junction-jam.json',import.meta.url),'utf8'));
const cases={busy:()=>intersectionTown(2,'stop'),turning:()=>turningIntersectionTown(),saved:()=>{const c=parseCity(saved.city??saved);if(!c)throw Error('Invalid fixture');return c;}};
for(const [name,make] of Object.entries(cases)){
 const runs=[];let digest;let summary;
 for(let trial=0;trial<4;trial++){
  const city=make();const frames=[];const start=performance.now();
  for(let i=0;i<3600;i++){const at=performance.now();stepCity(city,1/60);frames.push(performance.now()-at);}
  const total=performance.now()-start;frames.sort((a,b)=>a-b);
  digest=createHash('sha256').update(JSON.stringify(city)).digest('hex');
  summary={roads:city.roads.length,trips:city.trips.length,accidents:city.accidentCount,completed:city.completed};
  if(trial)runs.push({totalMs:total,p50Ms:frames[1800],p95Ms:frames[3420],p99Ms:frames[3564],maxMs:frames.at(-1)});
 }
 console.log(JSON.stringify({name,summary,digest,runs}));
}
