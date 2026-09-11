import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,parseCity,place,stepCity,type City,type Trip} from './cityModel.ts';
import {recordConflict,intersectionSafetySnapshot,incidentSummary,stepIncidents} from './cityIncidents.ts';
import {intersectionTown,quietIntersectionTown,separateApproaches,turningIntersectionTown} from './fixtures/intersectionTown.ts';
import {CITY_RULES} from './cityRules.ts';

function observe(city:City,seconds:number){
  const returned=new Map<number,number>();let warned:number|undefined,peak=0;
  for(let n=0;n<seconds*40&&!city.accidentCount;n++){
    stepCity(city,.025);
    if(incidentSummary(city).warning)warned??=city.elapsed;
    for(const r of city.risks)peak=Math.max(peak,r.exposure);
    for(const h of city.history)if(h.service?.purpose==='shopping'&&!returned.has(h.service.homeId))returned.set(h.service.homeId,h.at);
  }
  return {returned,warned,peak};
}
function servesEveryHome(city:City,result:ReturnType<typeof observe>){
  assert.equal(city.accidentCount,0);
  assert.equal(result.returned.size,city.buildings.filter(b=>b.kind==='home').length,'no safe score by starving a household');
  assert.ok(Math.max(...result.returned.values())<180,'every first shopping return is bounded');
}

test('Level 2 stays quiet and serves all three households over ten simulated minutes',()=>{
  const city=quietIntersectionTown(),result=observe(city,600);
  servesEveryHome(city,result);assert.equal(result.warned,undefined);assert.ok(city.completed>60);
});

test('usage makes an unsigned crossing dangerous, while a stop remains sufficient at moderate demand',()=>{
  const unsafe=intersectionTown(),risk=observe(unsafe,90);
  assert.equal(unsafe.accidentCount,1);assert.ok(unsafe.incidents[0].createdAt<30);
  assert.ok(risk.warned!==undefined&&unsafe.incidents[0].createdAt-risk.warned>=3-1e-6);
  const moderate=intersectionTown(0,'stop'),result=observe(moderate,600);
  servesEveryHome(moderate,result);
});

test('heavier conflicting traffic overloads stops; lights or separate routes serve the same 18 homes',()=>{
  const overloaded=intersectionTown(2,'stop'),risk=observe(overloaded,120);
  assert.equal(overloaded.accidentCount,1);assert.ok(risk.warned!==undefined);
  assert.ok(overloaded.incidents[0].createdAt-risk.warned>=3-1e-6);
  for(const redesign of [false,true]){
    const safe=intersectionTown(2,redesign?undefined:'signal');
    if(redesign)separateApproaches(safe);
    assert.deepEqual(safe.buildings,overloaded.buildings,'same demand and destination capacity');
    const result=observe(safe,600);servesEveryHome(safe,result);assert.equal(result.warned,undefined);
  }
});

test('a long shared green exposes heavy opposing turns; a shorter phase safely serves every household',()=>{
  const unsafe=turningIntersectionTown();unsafe.controls[0].preset='ew';
  const risk=observe(unsafe,120);assert.equal(unsafe.accidentCount,1);
  assert.ok(risk.warned!==undefined&&unsafe.incidents[0].createdAt-risk.warned>=3-1e-6);
  const safe=turningIntersectionTown();safe.controls[0].preset='ns';
  assert.deepEqual(safe.buildings,unsafe.buildings);
  const result=observe(safe,600);servesEveryHome(safe,result);assert.equal(result.warned,undefined);
});

function claims():City {
  const city=createCity();city.funds=10000;city.tutorial!.status='complete';
  for(let x=0;x<5;x++)place(city,'road',x,2);
  for(let y=0;y<5;y++)place(city,'road',2,y);
  const trip=(id:number,path:Trip['path']):Trip=>({id,homeId:0,storeId:0,path,progress:1.5,wait:0,hold:0,phase:'outbound'});
  city.trips=[trip(10,Array.from({length:5},(_,x)=>({x,y:2}))),trip(11,Array.from({length:5},(_,y)=>({x:2,y})))];
  city.nextId=12;return city;
}

test('stationary waiting and ordinary red lights never turn stored exposure into an accident',()=>{
  for(const control of [false,true]){
    const c=claims();if(control)place(c,'signal',2,2);
    else c.trips.forEach(t=>t.hold=10);
    for(let n=0;n<600;n++){c.elapsed+=.025;recordConflict(c,{x:2,y:2},10,11,.025);}
    assert.equal(c.accidentCount,0);assert.equal(c.risks.length,0);
  }
});

test('opposing through traffic and right turns do not create a failed-left-turn hazard',()=>{
  const c=claims();place(c,'signal',2,2);c.elapsed=12;
  c.trips[1].path=Array.from({length:5},(_,x)=>({x:4-x,y:2}));
  for(const right of [false,true]){
    if(right)c.trips[0].path=[{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:2,y:3},{x:2,y:4}];
    assert.equal(recordConflict(c,{x:2,y:2},10,11,.025),false);assert.deepEqual(c.risks,[]);
  }
});

test('a full warning cannot crash stationary cars or overlap an uninvolved vehicle at contact',()=>{
  for(const occupied of [false,true]){
    const c=claims();c.elapsed=10;
    c.risks=[{x:2,y:2,exposure:6,lastConflictAt:9,warnedAt:5,firstId:10,secondId:11}];
    if(occupied)c.trips.push({id:c.nextId++,homeId:0,storeId:0,path:[{x:2,y:2}],progress:0,hold:0,wait:0,phase:'waiting'});
    else c.trips.forEach(t=>t.hold=10);
    assert.equal(recordConflict(c,{x:2,y:2},10,11,.025),false);assert.equal(c.accidentCount,0);
    assert.ok(c.trips.every(t=>t.phase!=='crashed'));
  }
});

test('multi-tile intersections share one meter and one encounter per tick',()=>{
  const c=claims();place(c,'road',3,1);place(c,'road',3,3);
  c.elapsed=.025;recordConflict(c,{x:2,y:2},10,11,.025);
  const firstExposure=c.risks[0].exposure;
  c.trips[0].progress=2.5;c.trips[1].path=Array.from({length:5},(_,y)=>({x:3,y}));
  c.trips[1].id=c.nextId++;
  recordConflict(c,{x:3,y:2},10,c.trips[1].id,.025);
  assert.equal(c.risks.length,1);assert.equal(c.risks[0].exposure,firstExposure);
  c.elapsed+=.025;recordConflict(c,{x:3,y:2},10,c.trips[1].id,.025);
  assert.equal(c.risks.length,1);assert.ok(c.risks[0].exposure>firstExposure);
  assert.equal(intersectionSafetySnapshot(c).length,1);
  const exposure=c.risks[0].exposure,encounters=c.risks[0].encounters!.length;
  c.risks.push({...structuredClone(c.risks[0]),x:3,exposure:1.5});
  stepIncidents(c,.025);
  assert.equal(c.risks.length,1,'old per-tile meters or newly joined areas are normalized');
  assert.equal(c.risks[0].exposure,exposure,'joining areas does not add old exposure together');
  assert.equal(c.risks[0].encounters!.length,encounters,'historical encounters are not counted twice');
});

test('saved warning, encounter window and frame chunking preserve the same later collision',()=>{
  const city=intersectionTown(2,'stop');
  while(!incidentSummary(city).warning&&city.elapsed<60)stepCity(city,.025);
  assert.ok(incidentSummary(city).warning);assert.equal(city.accidentCount,0);
  const raw=JSON.parse(JSON.stringify(city)),loaded=parseCity(raw)!;assert.ok(loaded);
  assert.deepEqual(loaded.risks,city.risks);
  const before=JSON.stringify(city);intersectionSafetySnapshot(city);assert.equal(JSON.stringify(city),before,'debug inspection is read-only');
  stepCity(city,30);for(let n=0;n<120;n++)stepCity(loaded,.25);
  assert.deepEqual(loaded,city);assert.equal(city.accidentCount,1);
  const legacy=structuredClone(raw);for(const r of legacy.risks){delete r.encounters;delete r.control;delete r.warnedAt;}
  assert.ok(parseCity(legacy),'legacy risk fields remain readable without changing incidents or town geometry');
  for(const corrupt of ['future','duplicate','unknown-id','control']){
    const bad=structuredClone(raw),r=bad.risks.find((r:{encounters?:unknown[]})=>r.encounters?.length);
    if(corrupt==='future')r.encounters[0].at=bad.elapsed+1;
    if(corrupt==='duplicate')r.encounters.push({...r.encounters[0]});
    if(corrupt==='unknown-id')r.encounters[0].secondId=bad.nextId;
    if(corrupt==='control')r.control='random';
    assert.equal(parseCity(bad),null,corrupt);
  }
  assert.equal(CITY_RULES.intersectionSafety.warningSeconds,3);
});
