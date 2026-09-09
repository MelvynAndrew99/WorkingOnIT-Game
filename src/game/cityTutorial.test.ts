import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, parseCity, place, stepCity, COSTS, STALL_SECONDS, constructionPriceForCity} from './cityModel.ts';
import {createTutorialProgress,parseTutorialProgress,tutorialAction,tutorialSnapshot,refreshTutorial} from './cityTutorial.ts';

test('legacy saves offer optional tutorial; malformed teaching metadata never discards town',()=>{
  const city=createCity();place(city,'home',0,0);const old={...city};delete old.tutorial;
  assert.equal(parseCity(old)?.tutorial?.status,'available');
  assert.deepEqual(parseTutorialProgress({version:1,status:'active',completed:['same','same']},city),createTutorialProgress());
  assert.equal(parseCity({...city,tutorial:{nonsense:true}})?.buildings.length,1);
  const raw=JSON.parse(JSON.stringify(city));
  raw.tutorial={version:1,status:'active',completed:['first-visit'],assisted:[],observedServices:[],accidentSeen:false,noticedIncident:false};
  raw.economy={version:1,waived:['first-visit'],allowance:{home:0,store:1,road:12}};
  const loaded=parseCity(raw)!;
  assert.deepEqual(loaded.economy?.waived,['first-visit']);
  assert.equal(loaded.buildings.length,1);
});
test('skip persists while preserving construction, cash, and future resume progress',()=>{
  const city=createCity();place(city,'home',0,0);
  const geometry=JSON.stringify([city.roads,city.buildings.map(b=>({id:b.id,kind:b.kind,x:b.x,y:b.y})),city.funds]);
  tutorialAction(city,'acknowledge-drivers');tutorialAction(city,'skip');const saved=parseCity(JSON.parse(JSON.stringify(city)))!;
  assert.equal(saved.tutorial?.status,'skipped');assert.equal(JSON.stringify([saved.roads,saved.buildings.map(b=>({id:b.id,kind:b.kind,x:b.x,y:b.y})),saved.funds]),geometry);
  tutorialAction(saved,'resume');assert.ok(saved.tutorial?.completed.includes('driver-rules'));
});
test('legacy assist never lays out a town; stalled grant is ordinary placement at zero',()=>{
  const city=createCity();place(city,'home',0,0);const original=structuredClone(city.buildings[0]);const cash=city.funds;
  const result=tutorialAction(city,'assist');assert.match(result.message,/Keep building/);assert.equal(city.funds,cash);assert.deepEqual(city.buildings[0],original);
  assert.equal(city.buildings.length,1);
  stepCity(city,STALL_SECONDS);
  assert.equal(constructionPriceForCity(city,'store'),0);
  assert.equal(constructionPriceForCity(city,'hospital'),COSTS.hospital);
  const afterSupport = city.funds;
  assert.equal(afterSupport, cash + 120, 'sixty seconds include six normal support payments');
  place(city,'store',6,0,0);
  assert.equal(city.funds,afterSupport);
  assert.equal(city.buildings.find(b=>b.kind==='store')?.paid,0);
  const after=city.funds;
  place(city,'bulldoze',6,0);
  assert.equal(city.funds,after);
  tutorialAction(city,'assist');
  assert.equal(city.buildings.filter(b=>b.kind==='store').length,0);
});
test('removed practice action preserves fresh and historical towns in every tutorial status',()=>{
  for(const legacy of [false,true]) for(const status of ['active','available','skipped','complete'] as const){
    const city=createCity();place(city,'home',0,0);
    city.tutorial!.status=status;
    if(legacy){city.tutorial!.practice={x:0,y:0};city.tutorial!.assisted=['practice'];city.buildings[0].paid=0;}
    const loaded=parseCity(JSON.parse(JSON.stringify(city)))!;
    assert.ok(loaded);
    const before=structuredClone(loaded);
    tutorialAction(loaded,'practice');
    assert.deepEqual(loaded,before,'obsolete action cannot change geometry, cash, grants, receipts or progress');
    assert.equal(tutorialSnapshot(loaded).canPractice,false);
  }
  const noMetadata=createCity();delete noMetadata.tutorial;
  const before=structuredClone(noMetadata);tutorialAction(noMetadata,'practice');assert.deepEqual(noMetadata,before);
});
test('player-built safe crossing acknowledgement is lesson-specific and never invents a rescue',()=>{
  const city=createCity();
  for(let x=2;x<=8;x++)place(city,'road',x,6);
  for(let y=3;y<=5;y++)place(city,'road',5,y);
  place(city,'stop',5,6);refreshTutorial(city);
  assert.equal(tutorialSnapshot(city).canAcknowledgeSafety,false,'earlier lessons still need completion');
  tutorialAction(city,'acknowledge-safety');assert.ok(!city.tutorial!.completed.includes('rescue'));
  city.tutorial!.completed=['first-visit','park-visit','driver-rules','junction-control'];
  assert.equal(tutorialSnapshot(city).canAcknowledgeSafety,true);
  tutorialAction(city,'acknowledge-safety');
  assert.equal(city.accidentCount,0);assert.equal(city.rescuedCount,0);assert.equal(city.fatalities,0);
  assert.ok(city.tutorial!.completed.includes('rescue'));assert.deepEqual(city.tutorial!.observedServices,[]);
  assert.equal(city.tutorial!.practice,undefined);
});
test('unrelated road traffic never proves an incident bypass',()=>{
  const city=createCity();city.tutorial!.accidentSeen=true;
  refreshTutorial(city);assert.ok(!city.tutorial!.completed.includes('detour'));
});

test('obsolete practice action does not consume the current lesson waiver',()=>{
  const city=createCity();
  stepCity(city,STALL_SECONDS);
  assert.equal(constructionPriceForCity(city,'home'),0);
  const remaining=city.economy!.allowance!.home;
  tutorialAction(city,'practice');
  assert.equal(city.economy!.allowance!.home,remaining);
  assert.equal(constructionPriceForCity(city,'store'),0);
});

test('snapshot prices and mayor copy follow the current stalled lesson',()=>{
  const city=createCity();
  assert.equal(tutorialSnapshot(city).prices.home,COSTS.home);
  assert.equal(tutorialSnapshot(city).canAssist,false);
  assert.equal(tutorialSnapshot(city).waiver?.status,'waiting');
  stepCity(city,STALL_SECONDS);
  const snap=tutorialSnapshot(city);
  assert.equal(snap.prices.home,0);
  assert.equal(snap.prices.hospital,COSTS.hospital);
  assert.ok(snap.waived?.reason);
  assert.equal(snap.lessons[0].hint.includes('free example'),false);
});
