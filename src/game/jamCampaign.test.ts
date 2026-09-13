import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {CHALLENGES,challengeUnlockedBy,createChallenge,challengePlace,stepChallenge,parseChallenge,challengeStages,hasSecondEntrance,jamRewardEarned} from './cityChallenges.ts';
import {solveCampaign} from './fixtures/campaignSolutions.ts';
import {solveEmergency} from './fixtures/emergencySolutions.ts';
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
test('progression opens Level 1 first and requires the immediately preceding permanent award',()=>{
 const awards=new Set<string>(),has=(id:string)=>awards.has(id);
 for(let index=0;index<25;index++){
  assert.deepEqual(CHALLENGES.filter(d=>challengeUnlockedBy(d.id,has)).map(d=>d.id),CHALLENGES.slice(0,index+1).map(d=>d.id));
  awards.add(CHALLENGES[index].id);
 }
 const sparse=new Set(['green-for-the-queue']);
 assert.ok(challengeUnlockedBy('shopping-flow',id=>sparse.has(id)));
 assert.equal(challengeUnlockedBy('one-way-home',id=>sparse.has(id)),false,'an earlier award does not skip the preceding mission');
});

test('a normal road repair or disconnected four-lane decoration cannot complete the wide-road lesson',()=>{
 const r=createChallenge('apartment-avenue');
 for(let x=9;x<=14;x++)challengePlace(r.city,'road',x,10,0,r.id);
 for(let x=2;x<=6;x++)challengePlace(r.city,'wideRoad',x,16,0,r.id);
 stepChallenge(r,180);assert.ok((r.served?.length??0)>0);assert.equal(r.routeServed?.length,0);assert.equal(r.earned,false);
});
test('second entrance proof requires actual returns through it and survives reload',()=>{
 const r=createChallenge('another-front-door');
 for(let y=6;y<=11;y++)challengePlace(r.city,'road',16,y,0,r.id);
 challengePlace(r.city,'signal',16,12,0,r.id);
 assert.ok(hasSecondEntrance(r.city));assert.equal(r.earned,false);assert.equal(r.routeServed?.length??0,0);
 solveCampaign(r);const saved=parseChallenge(copy(r));assert.ok(saved);assert.equal(saved.routeServed?.length,4);
 stepChallenge(saved,1);assert.ok(saved.earned);
});
test('income comes from completed shopping visits, never idle support, refunds or replayed receipts',()=>{
 let r=createChallenge('keep-another-way');stepChallenge(r,120);assert.equal(r.city.funds,160);assert.equal(r.shoppingIncome??0,0);
 for(let x=10;x<=12;x++)challengePlace(r.city,'road',x,6,0,r.id);
 for(let i=0;i<2000&&(r.shoppingIncome??0)<100;i++)stepChallenge(r,.025);
 assert.ok((r.shoppingIncome??0)>=100);assert.equal(r.earned,false,'cash alone is not the lesson');
 r=parseChallenge(copy(r))!;assert.ok(r);const funds=r.city.funds,income=r.shoppingIncome;
 stepChallenge(r,.025);assert.equal(r.city.funds,funds);assert.equal(r.shoppingIncome,income,'a loaded rewarded visit cannot pay twice');
 const before=r.shoppingIncome;challengePlace(r.city,'road',0,0,0,r.id);challengePlace(r.city,'bulldoze',0,0,0,r.id);assert.equal(r.shoppingIncome,before);
});
test('a rescue entrance beyond the wreck cannot count as a usable civilian diversion',()=>{
 const r=createChallenge('past-the-wreck');
 for(let y=6;y<=11;y++)challengePlace(r.city,'road',16,y,0,r.id);
 for(let x=16;x<=21;x++)challengePlace(r.city,'road',x,9,0,r.id);
 challengePlace(r.city,'closure',8,10,0,r.id);
 assert.equal(hasSecondEntrance(r.city),false);assert.equal(r.emergency!.neighborhoodDiverted,undefined);
 stepChallenge(r,90);assert.ok(r.emergency!.scenes[0].cleared,'real police can clear from this side');
 assert.equal(r.emergency!.neighborhoodCleared,undefined,'clearance cannot retroactively invent useful pre-clearance access');assert.equal(r.earned,false);
});
test('new rescue receipts preserve useful diversion, real clearance, reopening and later journeys',()=>{
 const r=createChallenge('past-the-wreck'),snapshots:typeof r[]=[];
 solveEmergency(r,false,s=>snapshots.push(copy(s)));
 assert.ok(snapshots[0].emergency!.neighborhoodDiverted!==undefined);
 assert.equal(snapshots[0].emergency!.neighborhoodCleared,undefined);
 assert.equal(snapshots[1].emergency!.neighborhoodReopened,undefined);
 assert.equal(r.emergency!.recovered.length,0);assert.equal(r.earned,false);
 const restored=parseChallenge(copy(r));assert.ok(restored);stepChallenge(restored,180);assert.ok(restored.earned);
 for(const mutate of [(s:typeof r)=>s.emergency!.neighborhoodDiverted=-1,(s:typeof r)=>delete s.emergency!.neighborhoodCleared]){const bad=copy(r);mutate(bad);assert.equal(parseChallenge(bad),null);}
});
test('old Level 19 remains readable for archival and does not turn into the new neighborhood map',()=>{
 const old=JSON.parse(readFileSync(new URL('../../docs/challenges/levels-15-24/evidence/past-the-wreck.json',import.meta.url),'utf8'));
 const restored=parseChallenge(old);assert.ok(restored);assert.equal(restored.revision,3);assert.equal(restored.emergency!.scenes[0].y,8);
 assert.equal(createChallenge('past-the-wreck').revision,4);
});
test('finale accepts different permanent road layouts and grants the song entitlement only on completion',()=>{
 const layouts:string[]=[];
 for(const alternative of [false,true]){
  const r=createChallenge('what-a-jam');assert.equal(jamRewardEarned(r),false);
  solveEmergency(r,alternative);assert.equal(jamRewardEarned(r),false);
  stepChallenge(r,240);assert.ok(challengeStages(r).every(s=>s.done));assert.ok(jamRewardEarned(r));
  assert.ok(jamRewardEarned(parseChallenge(copy(r))!));layouts.push(JSON.stringify({roads:r.city.roads,buildings:r.city.buildings}));
 }
 assert.notEqual(layouts[0],layouts[1]);assert.equal(jamRewardEarned({...createChallenge('first-road'),earned:true}),false);
});
