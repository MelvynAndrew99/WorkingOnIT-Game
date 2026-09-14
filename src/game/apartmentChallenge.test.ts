import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createChallenge,challengeSnapshot,challengePlace,challengeStages,parseChallenge,stepChallenge} from './cityChallenges.ts';
import {solveCampaign} from './fixtures/campaignSolutions.ts';
import {buildPrivateComplex} from './cityPrivateLanes.ts';
const reload=(r:ReturnType<typeof createChallenge>)=>{const saved=parseChallenge(JSON.parse(JSON.stringify(r)));assert.ok(saved);return saved;};
test('apartment lesson needs placement, applied joining, access and actual returns; two layouts reload and win',()=>{
 for(const alternative of [false,true]){
  let r=createChallenge('another-front-door');assert.doesNotThrow(()=>challengeSnapshot(r));assert.equal(r.city.buildings.filter(b=>b.kind==='apartment').length,0);
  stepChallenge(r,30);assert.equal(r.earned,false);r=reload(r);
  solveCampaign(r,alternative);assert.deepEqual(challengeStages(r).map(s=>s.done),[true,true,true,false]);
  assert.equal(r.city.funds,760);stepChallenge(r,10);assert.equal(r.earned,false);r=reload(r);
  stepChallenge(r,180);assert.ok(r.earned);assert.equal(r.apartmentServed?.length,2);assert.ok(reload(r).earned);
 }
});
test('unjoined blocks and disconnected joined blocks do not earn an award',()=>{
 let r=createChallenge('another-front-door');
 for(const x of [2,8])challengePlace(r.city,'apartment',x,2,0,r.id);
 assert.deepEqual(challengeStages(r).map(s=>s.done),[true,false,false,false]);
 stepChallenge(r,30);assert.equal(r.earned,false);
 const blocks=r.city.buildings.filter(b=>b.kind==='apartment');assert.match(buildPrivateComplex(r.city,blocks[0].id,blocks[1].id),/Complex joined/);
 r=reload(r);stepChallenge(r,60);assert.deepEqual(challengeStages(r).map(s=>s.done),[true,true,false,false]);assert.equal(r.earned,false);
});
test('invalid apartment receipts and unearned completed saves are rejected',()=>{
 const r=createChallenge('another-front-door');solveCampaign(r);
 const raw=JSON.parse(JSON.stringify(r));raw.apartmentServed=[raw.city.buildings.find((b:{kind:string})=>b.kind==='store').id];assert.equal(parseChallenge(raw),null);
 raw.apartmentServed=[];raw.earned=true;assert.equal(parseChallenge(raw),null);
});
test('shopping before joining cannot substitute for trips from the new complex',()=>{
 const r=createChallenge('another-front-door');
 for(const x of [2,8]){challengePlace(r.city,'apartment',x,2,0,r.id);for(let y=6;y<12;y++)challengePlace(r.city,'road',x,y,0,r.id);}
 stepChallenge(r,90);assert.ok(r.city.history.some(h=>h.service?.purpose==='shopping'));assert.equal(r.earned,false);
 // Existing shopping history cannot satisfy the joining objective.
 assert.equal(challengeStages(r)[1].done,false);assert.deepEqual(r.apartmentServed??[],[]);
});
