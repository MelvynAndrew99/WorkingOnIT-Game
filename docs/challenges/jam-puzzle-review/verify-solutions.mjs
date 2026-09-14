import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {CHALLENGES,createChallenge,stepChallenge,challengeStages,parseChallenge} from '../../../src/game/cityChallenges.ts';
import {solveEmergency} from '../../../src/game/fixtures/emergencySolutions.ts';
const out=new URL('./evidence/',import.meta.url);mkdirSync(out,{recursive:true});
const results=[];
for(const [index,definition] of CHALLENGES.entries()){
 if(index<19)continue;
 const untouched=createChallenge(definition.id);stepChallenge(untouched,180);assert.equal(untouched.earned,false);
 const layouts=[];
 for(const alternative of [false,true]){
  const r=createChallenge(definition.id),originalAccidents=r.city.accidentCount;
  solveEmergency(r,alternative);const saved=parseChallenge(JSON.parse(JSON.stringify(r)));assert.ok(saved);
  stepChallenge(r,240);stepChallenge(saved,240);assert.ok(r.earned);assert.deepEqual(saved.city,r.city);assert.deepEqual(saved.emergency,r.emergency);
  assert.equal(r.city.accidentCount,originalAccidents);assert.equal(r.city.fatalities,0);assert.ok(r.city.funds>=0);assert.ok(challengeStages(r).every(s=>s.done));
  layouts.push(JSON.stringify({roads:r.city.roads,directions:r.city.roadDirections,buildings:r.city.buildings}));
  results.push({level:index+1,id:r.id,alternative,fundsLeft:r.city.funds,simulatedCompletion:r.finishedAt,additionalAccidents:0,earned:r.earned,stages:challengeStages(r)});
 }
 assert.notEqual(layouts[0],layouts[1]);
}
writeFileSync(new URL('solutions.json',out),JSON.stringify(results,null,2));console.log(results.map(({level,alternative,fundsLeft})=>({level,alternative,fundsLeft})));
