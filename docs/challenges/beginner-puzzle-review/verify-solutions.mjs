import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {CHALLENGES,createChallenge,stepChallenge,challengeStages,parseChallenge} from '../../../src/game/cityChallenges.ts';
import {solveBeginnerPuzzle} from './solutions.ts';
const out=new URL('./evidence/',import.meta.url);mkdirSync(out,{recursive:true});const results=[];
for(const [index,d] of CHALLENGES.slice(0,10).entries()){
 const untouched=createChallenge(d.id);stepChallenge(untouched,180);assert.equal(untouched.earned,false,d.id);
 for(const alternative of [false,true]){
  const r=createChallenge(d.id);solveBeginnerPuzzle(r,alternative);stepChallenge(r,5);
  const saved=parseChallenge(JSON.parse(JSON.stringify(r)));assert.ok(saved);
  stepChallenge(r,240);stepChallenge(saved,240);assert.ok(r.earned,d.id);assert.deepEqual(saved.city,r.city);assert.equal(saved.earned,r.earned);
  assert.equal(r.city.accidentCount,0);assert.ok(r.city.funds>=0);
  results.push({level:index+1,id:r.id,alternative,funds:r.city.funds,finishedAt:r.finishedAt,stages:challengeStages(r)});
 }
}
writeFileSync(new URL('solutions.json',out),JSON.stringify(results,null,2));console.log(results.map(({level,alternative,funds})=>({level,alternative,funds})));
