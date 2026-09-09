import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, place, stepCity, signalAxis, trafficMetrics, parseCity} from './cityModel.ts';

/** Traffic and persistence fixtures fund their geometry independently of the starter economy. */
function createTestCity() {
  const city = createCity();
  city.funds = 10000;
  return city;
}

// Integration review regression: a controller must never be decorative on a junction run.
test('a light on adjoining junction tiles gates traffic entering the junction complex',()=>{
  const c=createTestCity();
  for(let x=3;x<=8;x++)place(c,'road',x,5);
  for(const x of [5,6])for(const y of [4,6])place(c,'road',x,y);
  place(c,'signal',6,5);
  assert.equal(c.controls.length,1);
  c.trips.push({id:1,homeId:2,storeId:3,path:Array.from({length:6},(_,i)=>({x:3+i,y:5})),progress:0,wait:0,hold:0});
  stepCity(c,2);
  assert.equal(signalAxis(c,c.controls[0]),'ns');
  assert.ok(c.trips[0].progress<=2.5,'eastbound traffic must wait before the red signal');
  assert.ok(trafficMetrics(c).waiting>0);
  stepCity(c,14);
  assert.equal(c.completed,1,'the eventual green must release the waiting car');
});

test('adjoining tiles edit one controller and removal preserves the roads',()=>{
  const c=createTestCity();
  for(let x=3;x<=8;x++)place(c,'road',x,5);
  for(const x of [5,6])for(const y of [4,6])place(c,'road',x,y);
  place(c,'signal',6,5);place(c,'signal',5,5);
  assert.equal(c.controls.length,1);assert.equal(c.controls[0].preset,'ns');
  const roads=structuredClone(c.roads);
  place(c,'bulldoze',5,5);
  assert.equal(c.controls.length,0);assert.deepEqual(c.roads,roads);
});

test('joining two controlled intersections retires the extra controller explicitly',()=>{
  const c=createTestCity();
  for(let x=3;x<=9;x++)place(c,'road',x,5);
  for(const x of [5,7])for(const y of [4,6])place(c,'road',x,y);
  place(c,'signal',5,5);place(c,'stop',7,5);
  assert.equal(c.controls.length,2);
  const message=place(c,'road',6,4);
  assert.equal(c.controls.length,1);assert.equal(c.controls[0].x,5);
  assert.match(message,/share.*control/);
});

test('recent throughput is not silently capped at 512 completions',()=>{
  const c=createTestCity();c.elapsed=60;c.completed=600;
  c.history=Array.from({length:600},()=>({at:59,wait:0}));
  c.roads=[{x:1,y:1}];
  c.trips=[{id:1,homeId:2,storeId:3,path:[{x:1,y:1}],progress:0,wait:0,hold:0}];
  stepCity(c,.025);
  assert.equal(trafficMetrics(c).throughput,601);
});

/**
 * Ten homes crossing one junction to reach shops on the far side. Two stores are needed
 * because visitor capacity, not the road, would otherwise be what limits the demand.
 */
function competingTown(){
  const c=createTestCity();
  for(let x=0;x<=14;x++)place(c,'road',x,6);
  for(let y=0;y<=5;y++)place(c,'road',8,y);
  for(const x of [0,2,4,6])place(c,'home',x,4,0);
  for(const x of [0,2,4])place(c,'home',x,7,2);
  for(const y of [0,2,4])place(c,'home',9,y,1);
  place(c,'store',11,4,0); // entrance 12,6
  place(c,'store',13,7,2); // entrance 14,6, on the same corridor and not a new junction
  return c;
}

test('stops and lights restore service to the yielding side at unchanged demand',()=>{
  const measure=(control:'none'|'stop'|'signal')=>{
    const c=competingTown();
    const north=new Set(c.buildings.filter(b=>b.kind==='home' && b.x===9).map(b=>b.id));
    if(control!=='none')place(c,control,8,6);
    if(control==='signal')c.controls[0].preset='ew';
    let served=0;
    for(let i=0;i<7200;i++){
      const before=[...c.trips];stepCity(c,.025);const live=new Set(c.trips.map(t=>t.id));
      served+=before.filter(t=>!live.has(t.id)&&north.has(t.homeId)).length;
    }
    return {served,oldest:Math.max(0,...c.trips.map(t=>t.hold))};
  };
  const unsigned=measure('none'),stop=measure('stop'),signal=measure('signal');
  assert.ok(unsigned.oldest>60,'uncontrolled priority visibly disadvantages the minor approach');
  for(const controlled of [stop,signal]){
    assert.ok(controlled.served>unsigned.served*2,'control restores completed journeys on the yielding approach');
    assert.ok(controlled.oldest<20,'served traffic must not leave a permanent queue');
  }
});

/** The same corridor and junction, but every home shops on the far side: no crossing movement. */
function oneWayTown(){
  const c=createTestCity();
  for(let x=0;x<=14;x++)place(c,'road',x,6);
  for(let y=0;y<=5;y++)place(c,'road',8,y);
  for(const x of [0,2,4,6])place(c,'home',x,4,0);
  for(const x of [0,2,4])place(c,'home',x,7,2);
  place(c,'store',11,4,0);place(c,'store',13,7,2);
  return c;
}

test('an uncontrolled crossing builds visible risk, and a control removes it entirely',()=>{
  const unsigned=competingTown();
  for(let i=0;i<2400;i++)stepCity(unsigned,.025);
  assert.ok(unsigned.risks.length>0 || unsigned.incidents.length>0,
    'sustained conflicting arrivals are reported where the player can see them');
  const controlled=competingTown();
  place(controlled,'stop',8,6);
  for(let i=0;i<2400;i++)stepCity(controlled,.025);
  assert.deepEqual(controlled.risks,[],'a stop sign cancels the warning');
  assert.deepEqual(controlled.incidents,[],'and prevents the failed-yield crash');
  assert.ok(controlled.completed>unsigned.completed);
});

test('a queue on one road is never reported as a conflict, however long it waits',()=>{
  const c=oneWayTown();
  let queued=0;
  for(let i=0;i<3600;i++){stepCity(c,.025);queued+=c.trips.filter(t=>t.hold>0).length;}
  assert.ok(queued>0,'following traffic really does queue at the junction');
  assert.deepEqual(c.risks,[],'same-axis following and opposing traffic is not a failed yield');
  assert.deepEqual(c.incidents,[]);
  assert.ok(c.completed>0);
});

test('the rolling traffic window agrees across frame sizes at its exact boundary',()=>{
  const a=competingTown(),b=competingTown();stepCity(a,180);
  for(let i=0;i<10800;i++)stepCity(b,1/60);
  assert.equal(a.completed,b.completed);
  assert.deepEqual(trafficMetrics(a),trafficMetrics(b));
  assert.deepEqual(a.history,b.history);
});


test('overlapping trips from pre-queue saves do not deadlock the restored town',()=>{
  const c=createTestCity();place(c,'home',4,4);place(c,'home',9,2,1);place(c,'store',11,4);
  for(let x=4;x<=12;x++)place(c,'road',x,6);
  for(let y=2;y<6;y++)place(c,'road',8,y);
  stepCity(c,4);assert.equal(c.trips.length,2);
  const raw=JSON.parse(JSON.stringify(c));
  raw.elapsed=6;raw.incomeClock=6;raw.spawnClock=2;
  delete raw.controls;delete raw.history;delete raw.tickClock;
  for(const trip of raw.trips){trip.progress=4;delete trip.wait;delete trip.hold;}
  const restored=parseCity(raw);assert.ok(restored);
  assert.deepEqual(restored.roads,c.roads);assert.deepEqual(restored.buildings,c.buildings);
  assert.equal(restored.funds,c.funds);assert.equal(restored.completed,c.completed);
  assert.equal(restored.trips.length,1,'one conflicting legacy departure is deferred, not credited');
  stepCity(restored,90);
  assert.ok(restored.completed>1,'both homes remain available to dispatch more trips');
});
