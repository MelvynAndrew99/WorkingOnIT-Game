import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,expandCity,parseCity,place,stepCity,type City} from './cityModel.ts';
import {expansionSnapshot,parseExpansionProgress,markExpansionBriefingSeen} from './cityExpansion.ts';
import {claimMissionReward,missionSnapshot,refreshMissions} from './cityMissions.ts';
import {tutorialAction,refreshTutorial} from './cityTutorial.ts';
import {connectExternalCity} from './cityExternal.ts';

test('each connected edge stays fixed through other expansions and reload',()=>{
 for(const edge of ['north','east','south','west'] as const){
  let c=createCity();const m=c.map;
  const p=edge==='north'?{x:5,y:m.y}:edge==='south'?{x:5,y:m.y+m.height-1}:edge==='west'?{x:m.x,y:5}:{x:m.x+m.width-1,y:5};
  place(c,'road',p.x,p.y);assert.match(connectExternalCity(c,p),/Outside city connected/);
  const before=structuredClone(c);assert.match(expandCity(c,edge),/outside city connects/);assert.deepEqual(c,before);
  const other=edge==='west'?'east':'west';assert.match(expandCity(c,other),/Expanded/);
  c=reload(c);assert.equal(expansionSnapshot(c).connectedEdge,edge);
  const loaded=structuredClone(c);assert.match(expandCity(c,edge),/outside city connects/);assert.deepEqual(c,loaded);
  assert.deepEqual(c.external!.gateway,p);
 }
});

test('corner connection retains one fixed edge while the perpendicular side grows',()=>{
 let c=createCity();place(c,'road',0,0);connectExternalCity(c,{x:0,y:0});
 assert.equal(expansionSnapshot(c).connectedEdge,'west');
 assert.match(expandCity(c,'north'),/Expanded/);c=reload(c);
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
 const c=createCity();c.funds=20000;expandCity(c,'east');expandCity(c,'south');
 for(let x=0;x<=22;x++)place(c,'road',x,6);
 for(let i=0;i<6;i++)place(c,'home',i*2,4);
 for(const x of [13,17,21])place(c,'store',x,4);
 assert.equal(c.buildings.length,9);return c;
}

test('two free strips persist, preserve the town, and a third needs earned funding',()=>{
 let c=createCity();place(c,'home',2,2);const original=structuredClone(c);
 assert.match(expandCity(c,'west'),/Expanded west/);c=reload(c);assert.match(expandCity(c,'north'),/Expanded north/);
 assert.deepEqual(c.map,{x:-8,y:-8,width:24,height:22});assert.deepEqual(c.buildings,original.buildings);assert.equal(c.funds,original.funds);
 c=reload(c);const before=structuredClone(c);assert.match(expandCity(c,'east'),/Mayor funding needed/);assert.deepEqual(c,before);
 assert.equal(expansionSnapshot(c).freeRemaining,0);assert.equal(expansionSnapshot(c).permits,0);
});

test('invalid directions and maximum boundaries never spend expansion allowances',()=>{
 const c=createCity();const before=structuredClone(c);expandCity(c,'diagonal' as 'north');assert.deepEqual(c,before);
 c.map={x:-8,y:-8,width:64,height:64};const full=structuredClone(c);
 for(const edge of ['north','east','south','west'] as const)expandCity(c,edge);
 assert.deepEqual(c,full);assert.equal(expansionSnapshot(c).freeRemaining,2);
});

test('actual distinct shopping visits earn six- and nine-household permits once, independently of cash claims',()=>{
 let c=shoppingTown();assert.equal(expansionSnapshot(c).level,0);assert.equal(expansionSnapshot(c).canExpand,false);
 until(c,()=>expansionSnapshot(c).level===1);assert.equal(c.missions!.shoppers.length,6);assert.equal(expansionSnapshot(c).permits,1);
 assert.equal(c.missions!.claimed.length,0,'land needs no cash-reward collection');
 c=reload(c);refreshMissions(c);assert.equal(expansionSnapshot(c).permits,1);expandCity(c,'west');
 assert.equal(expansionSnapshot(c).permits,0);const cash=c.funds;assert.equal(claimMissionReward(c,'a-town-to-notice').amount,400);assert.equal(c.funds,cash+400);assert.equal(expansionSnapshot(c).permits,0);
 c=reload(c);assert.equal(claimMissionReward(c,'a-town-to-notice').claimed,false);stepCity(c,60);assert.equal(expansionSnapshot(c).level,1);assert.equal(expansionSnapshot(c).permits,0,'repeat visits cannot refill a spent permit');
 for(const x of [0,3,6])place(c,'home',x,7,2);assert.equal(c.buildings.filter(b=>b.kind==='home').length,9);
 until(c,()=>expansionSnapshot(c).level===2);assert.equal(c.missions!.shoppers.length,9);assert.equal(expansionSnapshot(c).permits,1);
 const landJobs=missionSnapshot(c).items.filter(i=>i.landReward);assert.deepEqual(landJobs.map(j=>[j.target,j.done]),[[6,true],[9,true],[12,false]]);
 markExpansionBriefingSeen(c);c=reload(c);assert.equal(expansionSnapshot(c).briefingSeen,true);assert.equal(expansionSnapshot(c).level,2);
 // Permanent rewards survive loss of access; the next mission still needs real connected demand.
 for(const p of [...c.roads])place(c,'closure',p.x,p.y);refreshMissions(c);
 assert.equal(expansionSnapshot(c).current,0);assert.equal(expansionSnapshot(c).level,2);assert.equal(expansionSnapshot(c).permits,1);
 expandCity(c,'south');c=reload(c);assert.equal(expansionSnapshot(c).permits,0);assert.equal(expansionSnapshot(c).level,2);
});

test('old saves retain expanded geometry and receive introductory permits; malformed metadata cannot refill them',()=>{
 const c=createCity();c.map={x:-16,y:-8,width:48,height:46};place(c,'home',-10,-4);
 const raw=JSON.parse(JSON.stringify(c));delete raw.expansion;const migrated=parseCity(raw)!;assert.ok(migrated);assert.deepEqual(migrated.map,c.map);assert.deepEqual(migrated.buildings,c.buildings);assert.equal(expansionSnapshot(migrated).freeRemaining,2);
 for(const bad of [null,{}, {version:1,used:-1,levels:0,briefingSeen:false},{version:1,used:0,levels:99,briefingSeen:false},{version:1,used:3,levels:0,briefingSeen:false}]){
  const loaded=parseCity({...raw,expansion:bad})!;assert.ok(loaded);assert.deepEqual(loaded.map,c.map);assert.equal(expansionSnapshot(loaded).freeRemaining,0);assert.equal(expansionSnapshot(loaded).permits,0);
 }
 assert.deepEqual(parseExpansionProgress(undefined),{version:1,used:0,levels:0,briefingSeen:false});
});

test('new H guidance gates expansion until its lesson; Skip lifts the lesson gate but retains funding limits',()=>{
 let c=createCity(true);const before=structuredClone(c);assert.match(expandCity(c,'north'),/junction-control/);assert.deepEqual(c,before);
 tutorialAction(c,'skip');assert.match(expandCity(c,'north'),/Expanded/);assert.match(expandCity(c,'east'),/Expanded/);c=reload(c);
 assert.match(expandCity(c,'south'),/Mayor funding/);assert.equal(c.tutorial?.status,'skipped');assert.equal(c.buildings.length,0);
});

test('legacy completed H tutorial is not reopened when the expansion lesson is added',()=>{
 const c=createCity(true);c.tutorial!.hRoad={stage:9};c.tutorial!.status='complete';const saved=reload(c);refreshTutorial(saved);
 assert.equal(saved.tutorial?.status,'complete');assert.equal(saved.tutorial?.hRoad?.stage,9);assert.equal(saved.tutorial?.hRoad?.expansionLesson,undefined);assert.match(expandCity(saved,'west'),/Expanded/);
});


test('active legacy H guidance receives the final expansion lesson without changing construction',()=>{
 const c=createCity(true);c.tutorial!.hRoad={stage:8};place(c,'home',3,2);const buildings=structuredClone(c.buildings),roads=structuredClone(c.roads);
 const loaded=reload(c);assert.equal(loaded.tutorial?.hRoad?.expansionLesson,true);assert.equal(loaded.tutorial?.hRoad?.stage,8);assert.deepEqual(loaded.buildings,buildings);assert.deepEqual(loaded.roads,roads);
});
