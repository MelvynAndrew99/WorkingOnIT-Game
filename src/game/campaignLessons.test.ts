import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CHALLENGES,createChallenge,stepChallenge,parseChallenge,challengeAvailable,challengeHasIncome,challengeStages,challengePlace,challengeDirections,nextChallenge} from './cityChallenges.ts';
import {CAMPAIGN_LEVELS} from './fixtures/campaignTown.ts';
import {solveCampaign} from './fixtures/campaignSolutions.ts';
import {applyBusRoute,buyBus,setBusRouteRunning} from './cityTransit.ts';
const playable=CAMPAIGN_LEVELS.filter(d=>d.objective!=='emergency');
for(const d of playable)test(`${d.id}: untouched puzzle, reference and alternative use real journeys within budget`,()=>{
 const base=createChallenge(d.id);stepChallenge(base,180);assert.equal(base.earned,false);
 for(const alternative of [false,true]){
  const r=createChallenge(d.id);solveCampaign(r,alternative);const funds=r.city.funds;assert.ok(funds>=0);
  stepChallenge(r,180);assert.equal(r.earned,true,JSON.stringify(challengeStages(r)));assert.equal(r.failed,undefined);if(!challengeHasIncome(r.id))assert.equal(r.city.funds,funds);
  assert.equal(r.city.accidentCount,0);assert.equal(r.city.buildings.filter(b=>b.kind==='home').length,d.homes);
  assert.ok(challengeStages(r).every(s=>s.done));assert.ok(parseChallenge(JSON.parse(JSON.stringify(r))));
  const frozen=JSON.stringify(r);stepChallenge(r,180);assert.equal(JSON.stringify(r),frozen);
 }
});
test('all 25 jam slots are playable, ordered by prerequisites, and keep unique saved identities',()=>{
 assert.equal(CHALLENGES.length,25);assert.equal(new Set(CHALLENGES.map(d=>d.id)).size,25);
 assert.ok(CHALLENGES.every(d=>challengeAvailable(d.id)));
 assert.deepEqual(CHALLENGES.slice(0,7).map(d=>d.id),['first-road','neighborhood-roads','shared-streets','stop-and-share','safe-crossing','green-for-the-queue','shopping-flow']);
 assert.equal(nextChallenge('around-the-island')?.id,'apartment-avenue');
 assert.equal(nextChallenge('first-bus-service')?.id,'another-front-door');assert.equal(nextChallenge('another-front-door')?.id,'a-town-that-works');assert.equal(nextChallenge('district-recovery')?.id,'what-a-jam');assert.equal(nextChallenge('what-a-jam'),undefined);
});
test('every new lesson preserves pause, mid-journey reload and frame-independent results',()=>{
 for(const d of playable){
  const a=createChallenge(d.id);solveCampaign(a);stepChallenge(a,12.013);
  const b=parseChallenge(JSON.parse(JSON.stringify(a)))!;assert.ok(b);
  const paused=JSON.stringify(b);stepChallenge(b,0);assert.equal(JSON.stringify(b),paused);
  stepChallenge(a,168);for(let n=0;n<840;n++)stepChallenge(b,.2);
  assert.deepEqual(b.city,a.city,d.id);assert.deepEqual(challengeStages(b),challengeStages(a));assert.equal(b.finishedAt,a.finishedAt);
 }
});
test('one-way lesson protects the main street and requires a directed usable return, not decorative arrows',()=>{
 const r=createChallenge('one-way-home'),saved=JSON.stringify(r.city);
 const main=Array.from({length:12},(_,i)=>({x:i+2,y:6}));
 assert.equal(challengeDirections(r.city,main,'two-way',r.id).ok,false);
 assert.equal(challengeDirections(r.city,main,'reverse',r.id).ok,false);
 challengePlace(r.city,'bulldoze',5,6,0,r.id);assert.equal(JSON.stringify(r.city),saved);
 solveCampaign(r);const edges=r.city.roadDirections!;
 for(const key of Object.keys(edges))if(key.includes(',10'))delete edges[key];
 stepChallenge(r,120);assert.equal(r.earned,false,'two-way return with a few arrows is not the taught one-way street');
});
test('park stages cannot be satisfied by shopping or a disconnected park; earlier work counts',()=>{
 const r=createChallenge('shops-and-strolls');stepChallenge(r,80);assert.equal(r.served?.length,6);assert.equal(r.earned,false);
 challengePlace(r.city,'park',8,8,2,r.id);stepChallenge(r,80);assert.equal(r.earned,false);assert.equal(r.leisureServed?.length,0);
 challengePlace(r.city,'road',9,7,0,r.id);challengePlace(r.city,'signal',9,6,0,r.id);stepChallenge(r,100);assert.equal(r.earned,true);
});
test('a missing loop cannot receive the roundabout award; the center island is protected',()=>{
 const r=createChallenge('around-the-island');const n=r.city.roads.length;
 challengePlace(r.city,'road',8,6,0,r.id);assert.equal(r.city.roads.length,n);
 solveCampaign(r);delete r.city.roadDirections;stepChallenge(r,90);assert.equal(r.earned,false);
});
test('bus setup and boarding cannot award returns, and passenger receipts survive an onboard reload',()=>{
 let r=createChallenge('first-bus-service');const c=r.city,depot=c.buildings.find(b=>b.kind==='busStation')!,stops=c.buildings.filter(b=>b.kind==='busStop');
 assert.equal(challengeStages(r)[0].done,false,'buying a bus is an explicit outstanding objective');
 applyBusRoute(c,depot.id,stops.map(b=>b.id));stepChallenge(r,40);assert.equal(r.earned,false);
 assert.equal(challengeStages(r)[0].done,false,'choosing stops does not satisfy buying the bus');
 buyBus(c,depot.id);stepChallenge(r,40);assert.equal(r.earned,false);
 assert.equal(challengeStages(r)[0].done,true);
 assert.equal(challengeStages(r)[2].done,false,'a purchased bus still needs service started');
 setBusRouteRunning(c,depot.id,true);
 for(let i=0;i<4000;i++){stepChallenge(r,.025);if(r.city.transit?.fleet.some(b=>b.abstractOnboard?.length))break;}
 assert.ok(r.city.transit?.fleet.some(b=>b.abstractOnboard?.length));assert.equal(r.busServed?.length??0,0);assert.equal(r.earned,false);
 r=parseChallenge(JSON.parse(JSON.stringify(r)))!;assert.ok(r);stepChallenge(r,180);
 assert.equal(r.busServed?.length,4);assert.equal(r.earned,true);
});
test('fixed set pieces cannot fund solutions; newly placed destinations refund once and no outside tools work',()=>{
 for(const d of playable){const r=createChallenge(d.id),home=r.city.buildings.find(b=>b.kind==='home')??r.city.buildings[0],funds=r.city.funds;
  const before=JSON.stringify(r.city);challengePlace(r.city,'bulldoze',home.x,home.y,0,r.id);challengePlace(r.city,'home',0,0,0,r.id);
  assert.equal(JSON.stringify(r.city),before);assert.equal(r.city.funds,funds);
 }
 const r=createChallenge('shops-and-strolls');challengePlace(r.city,'park',8,7,2,r.id);assert.equal(r.city.funds,900);
 challengePlace(r.city,'bulldoze',8,7,0,r.id);assert.equal(r.city.funds,1200);challengePlace(r.city,'bulldoze',8,7,0,r.id);assert.equal(r.city.funds,1200);
});
