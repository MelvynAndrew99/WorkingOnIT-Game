/** Functional mission evidence, deliberately no CPU/FPS measurements. Run with Node strip types. */
import fs from 'node:fs/promises';
import {CHALLENGES,challengeAvailable,createChallenge,stepChallenge,challengeSnapshot,challengeProgress,challengeStages,parseChallenge} from '../../../src/game/cityChallenges.ts';
import {solveCampaign} from '../../../src/game/fixtures/campaignSolutions.ts';
import {flowSnapshot} from '../../../src/game/cityFlow.ts';
const out=new URL('./evidence/',import.meta.url);await fs.mkdir(out,{recursive:true});const results=[];
for(const d of CHALLENGES.slice(4).filter(d=>challengeAvailable(d.id))){
 await fs.writeFile(new URL(`${d.id}.json`,out),JSON.stringify(createChallenge(d.id),null,2));
 for(const variant of ['untouched','reference','alternative']){
  const run=createChallenge(d.id);if(variant!=='untouched')solveCampaign(run,variant==='alternative');
  let maximumQueue=0,longestStop=0,longestUnfinished=0,maxBusLoad=0;const returns=new Map();
  for(let n=0;n<7200&&!run.earned&&!run.failed;n++){
   stepChallenge(run,.025);
   for(const h of run.city.history)if(h.service){const list=returns.get(h.service.homeId)??new Map();list.set(`${h.service.purpose}:${h.at}`,{purpose:h.service.purpose,at:h.at,roundTripSeconds:h.service.startedAt===undefined?null:h.at-h.service.startedAt,travelAndQueueSeconds:h.service.startedAt===undefined?null:h.at-h.service.startedAt-(h.service.purpose==='shopping'?5:10)});returns.set(h.service.homeId,list);}
   if(n%40===0){const s=challengeSnapshot(run);maximumQueue=Math.max(maximumQueue,s.waitingVehicles);longestStop=Math.max(longestStop,s.longestStop);longestUnfinished=Math.max(longestUnfinished,...s.homes.map(h=>h.journeySeconds??0));}
   maxBusLoad=Math.max(maxBusLoad,...(run.city.transit?.fleet.map(b=>b.onboard.length+(b.abstractOnboard?.length??0))??[0]));
  }
  results.push({id:d.id,level:CHALLENGES.findIndex(x=>x.id===d.id)+1,variant,earned:run.earned,failed:run.failed??null,simulatedSeconds:run.city.elapsed,budgetUsed:d.budget-run.city.funds,budgetRemaining:run.city.funds,accidents:run.city.accidentCount,maximumQueue,longestStop,longestUnfinished,maxBusLoad,progress:challengeProgress(run),stages:challengeStages(run),shopping:challengeSnapshot(run),leisure:flowSnapshot(run.city,d.homes,'leisure'),busCompleted:run.city.transit?.ridership?.completed??0,busCancelled:run.city.transit?.ridership?.cancelled??0,perHome:run.city.buildings.filter(b=>b.kind==='home').map(b=>({homeId:b.id,returns:[...(returns.get(b.id)?.values()??[])]})),reloadValid:!!parseChallenge(JSON.parse(JSON.stringify(run)))});
 }
}
await fs.writeFile(new URL('comparisons.json',out),JSON.stringify(results,null,2));console.log(results.map(r=>({level:r.level,variant:r.variant,earned:r.earned,seconds:r.simulatedSeconds,budgetUsed:r.budgetUsed,accidents:r.accidents})));
