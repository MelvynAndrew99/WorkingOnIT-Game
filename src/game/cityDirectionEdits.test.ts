import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,findPath,parseCity,type City,type Point,type Trip} from './cityModel.ts';
import {applyRoadDirections} from './cityDirectionEdits.ts';
import {allowsRoadStep,roadEdgeKey,roadDirectionForStep} from './cityDirections.ts';
import {trafficTick,roadIndex,startBlocked,commitTripRoute,validEmergencyPasses} from './cityTraffic.ts';
const p=(x:number,y=6):Point=>({x,y});
function town():City {
  const c=createCity();c.funds=100000;
  for(let x=2;x<=12;x++)place(c,'road',x,6);
  place(c,'home',2,4);place(c,'store',11,4);
  return c;
}
function car(path:Point[],progress=0):Trip {return {id:100,path,progress,homeId:1,storeId:2,wait:0,hold:0,phase:'outbound',purpose:'shopping',target:{...path.at(-1)!}};}

test('direction strokes are atomic, reversible, free and preserve unselected branches',()=>{
  const c=town();place(c,'road',5,5);const funds=c.funds;
  const run=[p(3),p(4),p(5),p(6)];
  assert.ok(applyRoadDirections(c,run,'forward').ok);
  assert.equal(findPath(c,p(6),p(3)),null);assert.ok(allowsRoadStep(c,p(5),p(5,5)));
  assert.ok(applyRoadDirections(c,run,'reverse').ok);
  assert.equal(findPath(c,p(3),p(6)),null);assert.ok(findPath(c,p(6),p(3)));
  assert.ok(applyRoadDirections(c,run,'two-way').ok);assert.equal(c.roadDirections,undefined);
  assert.equal(c.funds,funds);
  for(const points of [[p(3),p(8)],[p(3),p(4),p(3)],[p(3),p(4),p(4,5)]]) {
    const before=JSON.stringify(c);assert.equal(applyRoadDirections(c,points,'forward').ok,false);assert.equal(JSON.stringify(c),before);
  }
});
test('occupied interpolated segments and committed junction exits reject the entire stroke',()=>{
  const c=town();place(c,'road',5,5);
  c.trips=[car([p(4),p(5),p(6),p(7)],1)];
  // The car is in junction 5,6; exit 6,6 belongs to its movement reservation.
  for(const run of [[p(6),p(7)],[p(2),p(3),p(4)]]) {
    if(run[0].x===2)c.trips[0].progress=.3;
    const before=JSON.stringify(c);assert.equal(applyRoadDirections(c,run,'forward').ok,false);assert.equal(JSON.stringify(c),before);
  }
  c.trips=[];assert.ok(applyRoadDirections(c,[p(6),p(7)],'forward').ok);
});
test('active distant route edit preserves position and trip identity, then uses a legal detour',()=>{
  const c=town();for(let x=3;x<=9;x++)place(c,'road',x,7);
  c.trips=[car(Array.from({length:11},(_,i)=>p(i+2)),.2)];c.trips[0].homeId=c.buildings[0].id;c.trips[0].storeId=c.buildings[1].id;c.nextId=101;
  const before=structuredClone(c.trips);
  assert.ok(applyRoadDirections(c,[p(7),p(8)],'reverse').ok);assert.deepEqual(c.trips,before);
  const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);assert.deepEqual(loaded.trips,c.trips);
  let detoured=false;
  for(let i=0;i<500;i++) {
    const old=c.trips.find(t=>t.id===100),oldPath=old?.path,oldProgress=old?.progress??0;
    trafficTick(c,roadIndex(c));c.elapsed+=.025;
    const t=c.trips.find(t=>t.id===100);if(!t)break;
    detoured ||= t.path.some(p=>p.y===7);
    assert.ok(t.progress< t.path.length);
    if(t.path===oldPath&&Math.ceil(oldProgress-.5)!==Math.ceil(t.progress-.5))
      assert.ok(allowsRoadStep(c,t.path[Math.max(0,Math.ceil(oldProgress-.5))],t.path[Math.ceil(t.progress-.5)]));
  }
  assert.ok(detoured);assert.ok(c.trips.some(t=>t.id===100&&t.phase==='visiting'));
});
test('stale forbidden paths cannot spawn, be committed, cross a boundary or earn crash exposure',()=>{
  const c=town(),path=[p(7),p(8),p(9)];
  assert.ok(applyRoadDirections(c,[p(8),p(7)],'forward').ok);
  for(const responding of [false,true])assert.equal(startBlocked(c,roadIndex(c),path,responding),true);
  const t=car(path);c.trips=[t];
  assert.equal(commitTripRoute(c,roadIndex(c),t,{...t,path}),false);
  for(let i=0;i<80;i++)trafficTick(c,roadIndex(c));
  assert.equal(t.path[Math.ceil(t.progress-.5)].x,7);assert.equal(c.accidentCount,0);
});
test('one-way corridors do not invent an opposing lane for emergency passing',()=>{
  const c=town(),path=[p(4),p(5),p(6),p(7),p(8)];
  assert.ok(applyRoadDirections(c,path,'forward').ok);
  const responder={...car(path),id:101,service:'ems' as const,phase:'outbound' as const,hold:1};
  c.trips=[responder,{...car(path),id:102,progress:1,phase:'waiting',target:p(6)}];
  trafficTick(c,roadIndex(c));assert.equal(responder.emergencyPass,undefined);
  responder.emergencyPass={start:0,end:3,stage:'out',shift:0};assert.equal(validEmergencyPasses(c),false);
});
test('starter direction gate matches roads; parked visits do not block empty road edits',()=>{
  const starter=createCity(true),a=starter.roads[0],b=starter.roads.find(p=>p.x===a.x+1&&p.y===a.y)!;
  assert.equal(applyRoadDirections(starter,[a,b],'forward').ok,false);
  starter.tutorial!.status='skipped';assert.ok(applyRoadDirections(starter,[a,b],'forward').ok);
  const c=town();c.trips=[{...car([p(5),p(6)],1),phase:'visiting'}];
  assert.ok(applyRoadDirections(c,[p(5),p(6)],'forward').ok);
});

test('load rejects direction conflicts on occupied geometry while allowing obsolete future suffixes',()=>{
  const c=town();c.trips=[car(Array.from({length:11},(_,i)=>p(i+2)),.6)];
  c.trips[0].homeId=c.buildings[0].id;c.trips[0].storeId=c.buildings[1].id;c.nextId=101;
  assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
  c.roadDirections={[roadEdgeKey(p(2),p(3))]:roadDirectionForStep(p(3),p(2))};
  assert.equal(parseCity(JSON.parse(JSON.stringify(c))),null);
  c.roadDirections={[roadEdgeKey(p(7),p(8))]:roadDirectionForStep(p(8),p(7))};
  assert.ok(parseCity(JSON.parse(JSON.stringify(c))),'future illegal suffix can replan at next safe center');
});
