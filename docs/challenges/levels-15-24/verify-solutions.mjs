import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {EMERGENCY_LEVELS} from '../../../src/game/fixtures/emergencyTown.ts';
import {createChallenge,stepChallenge,challengeStages} from '../../../src/game/cityChallenges.ts';
import {solveEmergency} from '../../../src/game/fixtures/emergencySolutions.ts';
const out=new URL('./evidence/',import.meta.url);await fs.mkdir(out,{recursive:true});
const results=[];
for(const [i,d]of EMERGENCY_LEVELS.entries()){
 const start=createChallenge(d.id);await fs.writeFile(new URL(`${d.id}.json`,out),JSON.stringify(start,null,2));
 for(const alternative of [false,true]){
  const run=createChallenge(d.id);solveEmergency(run,alternative);stepChallenge(run,240);assert.ok(run.earned);
  results.push({level:i+15,id:d.id,alternative,simulationSeconds:run.finishedAt-run.startedAt,budget:d.budget,fundsLeft:run.city.funds,additionalAccidents:run.city.accidentCount-start.city.accidentCount,evidence:run.emergency,stages:challengeStages(run)});
 }
}
await fs.writeFile(new URL('solutions.json',out),JSON.stringify(results,null,2));
console.log(results.map(r=>({level:r.level,alternative:r.alternative,simulationSeconds:r.simulationSeconds,fundsLeft:r.fundsLeft})));
