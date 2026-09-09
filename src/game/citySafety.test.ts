// Lead integration regressions for physical continuity, construction, and persistence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {startBlocked,roadIndex} from './cityTraffic.ts';
import {createCity,place,stepCity,parseCity,buildingStatus} from './cityModel.ts';

/** Traffic and persistence fixtures fund their geometry independently of the starter economy. */
function createTestCity() {
  const city = createCity();
  city.funds = 10000;
  return city;
}

function drivingTown() {
  const c=createTestCity();
  place(c,'home',1,1);place(c,'store',6,1);
  for(let x=1;x<=7;x++)place(c,'road',x,3);
  stepCity(c,4.1);
  assert.ok(c.trips.some(t=>t.phase==='outbound'));
  return c;
}

test('occupied homes and inbound destinations cannot delete active journeys',()=>{
  const c=drivingTown(),snapshot=structuredClone(c);
  place(c,'bulldoze',1,1);
  assert.deepEqual(c,snapshot,'Removing a home must wait for its car to return');
  place(c,'bulldoze',6,1);
  assert.deepEqual(c,snapshot,'A reserved destination must keep its inbound journey');
});

test('a home with a crashed car cannot erase the accident participants',()=>{
  const c=drivingTown();c.trips[0].phase='crashed';
  const snapshot=structuredClone(c);
  place(c,'bulldoze',1,1);
  assert.deepEqual(c,snapshot);
});

test('removing an unoccupied road ahead does not snap the car backwards',()=>{
  const c=drivingTown(),t=c.trips[0];
  const before={path:structuredClone(t.path),progress:t.progress};
  assert.ok(before.progress>0 && before.progress<.5);
  place(c,'bulldoze',5,3);
  assert.equal(c.roads.some(p=>p.x===5&&p.y===3),false);
  assert.deepEqual({path:t.path,progress:t.progress},before,'Re-plan at a safe tile centre during movement');
});

test('save parsing rejects null path entries without throwing',()=>{
  const c=drivingTown();(c.trips[0].path as unknown[])[0]=null;
  assert.doesNotThrow(()=>assert.equal(parseCity(c),null));
});

test('save parsing rejects fractional building coordinates',()=>{
  const c=createTestCity();place(c,'home',1,1);
  c.buildings[0].x=1.25;
  assert.equal(parseCity(c),null);
});

test('a returning car waiting for a road does not reserve a new destination slot',()=>{
  const c=drivingTown(),t=c.trips[0],b=c.buildings.find(b=>b.kind==='store')!;
  t.phase='waiting';t.resume='returning';
  assert.equal(buildingStatus(c,b).inbound,0);
});

test('same-lane arrivals cannot turn a junction warning into a collision',()=>{
  const c=createTestCity();c.elapsed=10;
  const path=Array.from({length:6},(_,x)=>({x,y:3}));
  c.roads=[...path,{x:2,y:2}];
  c.trips=[{id:1,homeId:1,storeId:0,path:structuredClone(path),progress:1.5,wait:0,hold:0},
    {id:2,homeId:2,storeId:0,path:structuredClone(path),progress:.5,wait:0,hold:0}];
  c.nextId=3;
  c.risks=[{x:2,y:3,exposure:5.99,lastConflictAt:10,firstId:1,secondId:2}];
  stepCity(c,.025);
  assert.equal(c.accidentCount,0,'Following cars are not conflicting crossing movements');
});

test('a town saved immediately after removing a road ahead retains its moving journey',()=>{
  const c=drivingTown();
  place(c,'bulldoze',5,3);
  const restored=parseCity(JSON.parse(JSON.stringify(c)));
  assert.ok(restored,'A construction edit must never produce a save the game rejects');
  assert.equal(restored.trips.length,c.trips.length);
  assert.equal(restored.funds,c.funds);
});

test('working crews reserve their scene tile through the return maneuver',()=>{
  const c=createTestCity(),path=[{x:1,y:3},{x:2,y:3}];c.roads=path;
  c.trips=[{id:1,homeId:0,storeId:0,path,progress:1,wait:0,hold:0,service:'police',phase:'working',workRemaining:1}];
  assert.equal(startBlocked(c,roadIndex(c),[path[1],path[0]]),true,
    'A crew working in the road needs space to turn home safely');
});

test('park benefits saved after the first minute use the restored city clock',()=>{
  const c=createTestCity();place(c,'home',1,1);c.elapsed=120;
  c.households=[{homeId:1,shopping:1,leisure:0,shopClock:0,leisureClock:0,leisureUntil:170}];
  const restored=parseCity(JSON.parse(JSON.stringify(c)));
  assert.ok(restored);assert.deepEqual(restored.households,c.households);
});

test('a closure placed immediately ahead never snaps a car back to the tile centre',()=>{
  const c=drivingTown();stepCity(c,.05);
  const t=c.trips[0];assert.equal(t.progress,.3);
  place(c,'closure',2,3);
  let previous=t.path[0].x+t.progress;
  for(let i=0;i<70;i++) {
    stepCity(c,.025);
    const k=Math.floor(t.progress),a=t.path[k],b=t.path[Math.min(k+1,t.path.length-1)];
    const now:number=a.x+(b.x-a.x)*(t.progress-k);
    assert.ok(Math.abs(now-previous)<=.050001,`Unexpected position jump ${previous} -> ${now}`);
    previous=now;
  }
  assert.equal(t.phase,'waiting');
});

test('park-benefit expiry pays the same income across frame partitions',()=>{
  const a=createTestCity();place(a,'home',1,1);
  a.households=[{homeId:1,shopping:1,leisure:0,shopClock:0,leisureClock:0,leisureUntil:20}];
  const b=structuredClone(a),before=a.funds;
  stepCity(a,20);for(let i=0;i<200;i++)stepCity(b,.1);
  assert.equal(a.funds,b.funds);
  assert.equal(a.funds-before,55,'Support twice, recreation benefit only before its expiry');
});
