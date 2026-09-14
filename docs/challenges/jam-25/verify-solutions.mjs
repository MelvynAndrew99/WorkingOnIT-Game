import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CHALLENGES,createChallenge,stepChallenge,challengeStages,parseChallenge} from '../../../src/game/cityChallenges.ts';
import {solveCampaign} from '../../../src/game/fixtures/campaignSolutions.ts';
const results=[];
for(const id of ['apartment-avenue','keep-another-way','another-front-door','past-the-wreck','what-a-jam'])for(const alternative of [false,true]){
 const run=createChallenge(id);solveCampaign(run,alternative);stepChallenge(run,240);
 assert.ok(run.earned,JSON.stringify(challengeStages(run)));assert.ok(parseChallenge(JSON.parse(JSON.stringify(run))));
 results.push({level:CHALLENGES.findIndex(d=>d.id===id)+1,id,alternative,seconds:run.finishedAt-run.startedAt,budgetLeft:run.city.funds,shoppingIncome:run.shoppingIncome??0,accidents:run.city.accidentCount,fatalities:run.city.fatalities,stages:challengeStages(run)});
}
await fs.mkdir(new URL('./evidence/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('./evidence/solutions.json',import.meta.url),JSON.stringify(results,null,2));
console.log(results.map(({level,alternative,seconds,budgetLeft})=>({level,alternative,seconds,budgetLeft})));
