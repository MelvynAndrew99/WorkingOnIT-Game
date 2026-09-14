import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,expandCity,parseCity,place,stepCity,unlockPlot,type City} from './cityModel.ts';
import {expansionSnapshot,parseExpansionProgress,markExpansionBriefingSeen} from './cityExpansion.ts';
import {claimMissionReward,refreshMissions} from './cityMissions.ts';
import {tutorialAction,refreshTutorial} from './cityTutorial.ts';
import {connectExternalCity} from './cityExternal.ts';

test('each connected edge stays fixed through other expansions and reload',()=>{
 for(const edge of ['north','east','south','west'] as const){
  let c=createCity();const m=c.map;
  const p=edge==='north'?{x:5,y:m.y}:edge==='south'?{x:5,y:m.y+m.height-1}:edge==='west'?{x:m.x,y:5}:{x:m.x+m.width-1,y:5};
  place(c,'road',p.x,p.y);assert.match(connectExternalCity(c,p),/Outside city connected/);
  const before=structuredClone(c);assert.match(expandCity(c,edge),/outside city connects/);assert.deepEqual(c,before);
  const other=edge==='west'?'east':edge==='east'?'west':edge==='north'?'south':'north';
  const message=expandCity(c,other);
  if(other==='west'||other==='north')assert.match(message,/cannot expand further|outside city connects/);
  else assert.match(message,/New land opened|Bought land|free plot|Further plots/);
  c=reload(c);assert.equal(expansionSnapshot(c).connectedEdge,edge);
  const loaded=structuredClone(c);assert.match(expandCity(c,edge),/outside city connects/);assert.deepEqual(c,loaded);
  assert.deepEqual(c.external!.gateway,p);
 }
});

test('corner connection retains one fixed edge while the perpendicular side grows',()=>{
 let c=createCity();place(c,'road',0,0);connectExternalCity(c,{x:0,y:0});
 assert.equal(expansionSnapshot(c).connectedEdge,'west');
 assert.match(expandCity(c,'south'),/New land opened|free plot/);c=reload(c);
 assert.equal(expansionSnapshot(c).connectedEdge,'west');assert.match(expandCity(c,'west'),/outside city connects/);
});

test('legacy interior gateway and existing land survive reload without relocation',()=>{
 const c=createCity();place(c,'road',0,6);connectExternalCity(c,{x:0,y:6});
 c.map={...c.map,x:-8,width:c.map.width+8};
 const loaded=reload(c);assert.deepEqual(loaded.map,c.map);assert.deepEqual(loaded.external,c.external);
 assert.equal(expansionSnapshot(loaded).connectedEdge,null);
});

function reload(c:City){const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);return loaded;}
function until(c:City,ready:()=>boolean){for(let i=0;i<1600&&!ready();i++)stepCity(c,.25);assert.ok(ready(),`not reached after ${c.elapsed}s`);}
function shoppingTown(){
 const c=createCity();c.funds=20000;c.tutorial!.status='skipped';unlockPlot(c,1);unlockPlot(c,4);
 for(let x=0;x<=22;x++)place(c,'road',x,6);
 for(let i=0;i<6;i++)place(c,'home',i*2,4);
 for(const x of [13,17,21])place(c,'store',x,4);
 assert.equal(c.buildings.length,9);return c;
}

test('two free plots persist, preserve the town, and a third spends cash',()=>{
 let c=createCity();c.tutorial!.status='skipped';place(c,'home',2,2);const original=structuredClone(c);
 assert.match(unlockPlot(c,1),/New land opened/);c=reload(c);assert.match(unlockPlot(c,4),/Further plots cost money/);
 assert.deepEqual(c.buildings,original.buildings);assert.equal(c.funds,original.funds);
 c=reload(c);const before=structuredClone(c);c.funds=0;assert.match(unlockPlot(c,2),/costs \$/);assert.deepEqual(c.land,before.land);
 assert.equal(expansionSnapshot(c).freeRemaining,0);
});

test('invalid plot ids and a full envelope never spend money',()=>{
 const c=createCity();c.tutorial!.status='skipped';const before=structuredClone(c);unlockPlot(c,-1);unlockPlot(c,99);assert.deepEqual(c,before);
 c.funds=50000;
 for(let id=1;id<12;id++)unlockPlot(c,id);
 const full=structuredClone(c);
 for(const edge of ['north','east','south','west'] as const)expandCity(c,edge);
 assert.deepEqual(c,full);
});

test('actual distinct shopping visits still earn growth levels independently of cash land purchases',()=>{
 let c=shoppingTown();assert.equal(expansionSnapshot(c).level,0);
 until(c,()=>expansionSnapshot(c).level===1);assert.equal(c.missions!.shoppers.length,6);
 c=reload(c);refreshMissions(c);assert.equal(expansionSnapshot(c).level,1);
 const cash=c.funds;assert.equal(claimMissionReward(c,'a-town-to-notice').amount,400);assert.equal(c.funds,cash+400);
 c=reload(c);assert.equal(claimMissionReward(c,'a-town-to-notice').claimed,false);stepCity(c,60);assert.equal(expansionSnapshot(c).level,1);
 for(const x of [0,3,6])place(c,'home',x,7,2);assert.equal(c.buildings.filter(b=>b.kind==='home').length,9);
 until(c,()=>expansionSnapshot(c).level===2);assert.equal(c.missions!.shoppers.length,9);
 markExpansionBriefingSeen(c);c=reload(c);assert.equal(expansionSnapshot(c).briefingSeen,true);assert.equal(expansionSnapshot(c).level,2);
 for(const p of [...c.roads])place(c,'closure',p.x,p.y);refreshMissions(c);
 assert.equal(expansionSnapshot(c).current,0);assert.equal(expansionSnapshot(c).level,2);
});

test('old saves retain expanded geometry and receive introductory free unlocks; malformed metadata cannot refill them',()=>{
 const c=createCity();c.map={x:-16,y:-8,width:48,height:46};place(c,'home',-10,-4);
 const raw=JSON.parse(JSON.stringify(c));delete raw.expansion;delete raw.land;const migrated=parseCity(raw)!;assert.ok(migrated);assert.deepEqual(migrated.buildings,c.buildings);assert.equal(expansionSnapshot(migrated).freeRemaining,2);
 for(const bad of [null,{}, {version:1,used:-1,levels:0,briefingSeen:false},{version:1,used:0,levels:99,briefingSeen:false},{version:1,used:3,levels:0,briefingSeen:false}]){
  const loaded=parseCity({...raw,expansion:bad,land:undefined})!;assert.ok(loaded);assert.deepEqual(loaded.buildings,c.buildings);
 }
 assert.deepEqual(parseExpansionProgress(undefined),{version:1,used:0,levels:0,briefingSeen:false});
});

test('new H guidance gates land buying until its lesson; Skip lifts the lesson gate but keeps two free plots',()=>{
 let c=createCity(true);const before=structuredClone(c);assert.match(expandCity(c,'east'),/junction-control/);assert.deepEqual(c,before);
 tutorialAction(c,'skip');assert.match(expandCity(c,'east'),/New land opened/);assert.match(expandCity(c,'south'),/New land opened|Further plots/);c=reload(c);
 assert.equal(c.land!.freeUnlocks,0);assert.equal(c.tutorial?.status,'skipped');assert.equal(c.buildings.length,0);
});

test('legacy completed H tutorial is not reopened when the expansion lesson is added',()=>{
 const c=createCity(true);c.tutorial!.hRoad={stage:9};c.tutorial!.status='complete';const saved=reload(c);refreshTutorial(saved);
 assert.equal(saved.tutorial?.status,'complete');assert.equal(saved.tutorial?.hRoad?.stage,9);assert.equal(saved.tutorial?.hRoad?.expansionLesson,undefined);assert.match(expandCity(saved,'east'),/New land opened|free plot/);
});


test('active legacy H guidance receives the final expansion lesson without changing construction',()=>{
 const c=createCity(true);c.tutorial!.hRoad={stage:8};place(c,'home',3,2);const buildings=structuredClone(c.buildings),roads=structuredClone(c.roads);
 const loaded=reload(c);assert.equal(loaded.tutorial?.hRoad?.expansionLesson,true);assert.equal(loaded.tutorial?.hRoad?.stage,8);assert.deepEqual(loaded.buildings,buildings);assert.deepEqual(loaded.roads,roads);
});
