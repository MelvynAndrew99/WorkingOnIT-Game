import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, entrance, parseCity, place, stepCity, type City, type Point, type Trip } from './cityModel.ts';
import { stepIncidents, WORK_SECONDS } from './cityIncidents.ts';
import { bodyTile, roadIndex, signalAxis, trafficTick, TRAFFIC_TICK, TRAVEL_TILES_PER_SECOND } from './cityTraffic.ts';

/** Traffic and persistence fixtures fund their geometry independently of the starter economy. */
function createTestCity() {
  const city = createCity();
  city.funds = 10000;
  return city;
}

const line = (from: number, to: number, y = 6): Point[] => Array.from({length: Math.abs(to-from)+1}, (_, i) => ({x: from + i * Math.sign(to-from), y}));
function tick(city: City): void {
  city.elapsed = Math.round((city.elapsed + TRAFFIC_TICK) * 1e6) / 1e6;
  trafficTick(city, roadIndex(city));
}
function road(): City {
  const city = createTestCity();
  for (let x = 0; x <= 15; x++) place(city, 'road', x, 6);
  return city;
}
function car(city: City, path: Point[], progress: number, extra: Partial<Trip> = {}): Trip {
  const trip: Trip = {id: city.nextId++, homeId: 0, storeId: 0, path, progress, wait: 0, hold: 0, ...extra};
  city.trips.push(trip);
  return trip;
}
/** Real station/incident references and destination make this suitable for save continuation. */
function queuedResponse(): City {
  const city = road();
  place(city, 'policeStation', 0, 4);
  place(city, 'home', 4, 4);
  place(city, 'store', 11, 4);
  place(city, 'road', 10, 5);
  place(city, 'signal', 10, 6);
  const home = city.buildings.find(b => b.kind === 'home')!;
  const store = city.buildings.find(b => b.kind === 'store')!;
  car(city, line(4, 12), 3.5, {homeId: home.id, storeId: store.id, phase: 'outbound', purpose: 'shopping', speed: .25});
  city.incidents.push({id: city.nextId++, x: 14, y: 6, severity: 'minor', status: 'active', createdAt: 0,
    required: ['police'], completedServices: [], rescueDeadline: null, outcome: 'none'});
  city.accidentCount++;
  stepIncidents(city, TRAFFIC_TICK);
  assert.equal(city.trips.filter(t => t.service === 'police').length, 1);
  assert.ok(parseCity(JSON.parse(JSON.stringify(city))), 'fixture is a legal, loadable town');
  return city;
}

test('a station on a red junction dispatches a response into an empty junction', () => {
  const city = road();
  place(city, 'policeStation', 0, 4);
  place(city, 'road', 1, 7);
  place(city, 'signal', 1, 6);
  city.incidents.push({id: city.nextId++, x: 14, y: 6, severity: 'minor', status: 'active', createdAt: 0,
    required: ['police'], completedServices: [], rescueDeadline: null, outcome: 'none'});
  city.accidentCount++;
  assert.equal(signalAxis(city, city.controls[0]), 'ns');
  stepIncidents(city, TRAFFIC_TICK);
  assert.equal(city.trips.length, 1, 'an empty red junction cannot prevent emergency departure');
  assert.deepEqual(city.trips[0].path[0], entrance(city.buildings[0]));
});

test('a siren lets a car already inside the junction clear before the responder enters', () => {
  const city = road();
  for (let y = 3; y <= 9; y++) place(city, 'road', 8, y);
  place(city, 'signal', 8, 6);
  const civilian = car(city, Array.from({length: 7}, (_, i) => ({x: 8, y: i+3})), 3);
  const response = car(city, line(0, 15), 7.5, {phase: 'outbound', service: 'police', speed: 3});
  tick(city);
  assert.ok(civilian.progress > 3, 'yielding cannot freeze traffic already clearing the box');
  assert.equal(response.progress, 7.5, 'red-light exception waits for physical cross traffic');
  for (let i = 0; i < 50; i++) tick(city);
  assert.ok(response.progress > 8, 'response proceeds after cross traffic clears');
});

test('red-light exception never claims a junction with an occupied exit', () => {
  const city = road();
  place(city, 'road', 8, 5); place(city, 'signal', 8, 6);
  car(city, line(0, 15), 9, {phase: 'waiting'});
  const response = car(city, line(0, 15), 7.5, {phase: 'outbound', service: 'police', speed: 3});
  for (let i = 0; i < 40; i++) tick(city);
  assert.equal(bodyTile(response), 7, 'response holds outside the box while exit remains blocked');
});

test('returning crews obey red lights and resume ordinary speed after scene work', () => {
  const city = queuedResponse();
  city.trips = city.trips.filter(t => t.service);
  let response = city.trips[0];
  for (let i = 0; i < 400 && response.phase !== 'working'; i++) stepCity(city, TRAFFIC_TICK);
  assert.equal(response.phase, 'working');
  stepCity(city, WORK_SECONDS.police + TRAFFIC_TICK);
  response = city.trips.find(t => t.service)!;
  assert.equal(response.phase, 'returning');
  const beforeReturn = response.progress;
  tick(city);
  assert.ok(response.progress > beforeReturn, 'return actually moves on clear road');
  assert.ok(response.progress - beforeReturn <= TRAVEL_TILES_PER_SECOND * TRAFFIC_TICK + 1e-9, 'routine return uses ordinary driving speed');
  const red = road(); place(red, 'road', 8, 5); place(red, 'signal', 8, 6);
  const returning = car(red, line(15, 0), 6.5, {phase: 'returning', service: 'police', speed: 2});
  for (let i = 0; i < 40; i++) tick(red);
  assert.equal(returning.progress, 6.5, 'routine return waits at red');
});

const dir = (a: Point, b: Point): string => b.x > a.x ? 'E' : b.x < a.x ? 'W' : b.y > a.y ? 'S' : 'N';
const opposite: Record<string, string> = {E: 'W', W: 'E', N: 'S', S: 'N'};
/** Independent body geometry: a lane transition occupies both lanes, a pass occupies oncoming. */
function assertBodies(city: City): void {
  const bodies = city.trips.filter(t => t.phase !== 'visiting' && t.phase !== 'crashed').map(t => {
    const k = bodyTile(t), p = t.path[k];
    const direction = k < t.path.length-1 ? dir(p, t.path[k+1]) : k > 0 ? dir(t.path[k-1], p) : 'N';
    const pass = t.emergencyPass;
    const lanes = t.phase === 'working' || (t.phase === 'waiting' && t.path.length===1)
      || (k>0 && k<t.path.length-1 && t.path[k-1].x===t.path[k+1].x && t.path[k-1].y===t.path[k+1].y)
      || (pass && pass.stage !== 'passing')
      ? ['N','S','E','W'] : [pass ? opposite[direction] : direction];
    return {id:t.id, p, lanes};
  });
  for(let a=0;a<bodies.length;a++) for(let b=a+1;b<bodies.length;b++) {
    const one=bodies[a], two=bodies[b];
    if(one.p.x!==two.p.x || one.p.y!==two.p.y)continue;
    assert.ok(!one.lanes.some(l=>two.lanes.includes(l)), `t=${city.elapsed}: ${one.id}/${two.id} overlap physical lane at ${one.p.x},${one.p.y}`);
  }
}

function runTicks(city: City, count: number, watch?: () => void): void {
  for(let i=0;i<count;i++) {tick(city); assertBodies(city); watch?.();}
}

test('a realistic red-light queue is passed in the opposing lane and response arrives before green', () => {
  const city=queuedResponse();
  const civilian=city.trips.find(t=>!t.service)!;
  civilian.speed=2;
  civilian.progress=5.5; // x9.5: actually stopped before red junction x10
  const response=city.trips.find(t=>t.service)!;
  let passedBody=false, laneChange=false, yielded=false;
  runTicks(city, 9 / TRAFFIC_TICK,()=>{
    laneChange ||= !!response.emergencyPass;
    yielded ||= civilian.hold>0;
    if(response.emergencyPass?.stage==='passing' && bodyTile(response)>=0) {
      const rp=response.path[bodyTile(response)], cp=civilian.path[bodyTile(civilian)];
      passedBody ||= rp.x===cp.x && rp.y===cp.y;
    }
  });
  assert.ok(laneChange && passedBody && yielded, 'visible passing shares a tile in distinct physical lanes while civilian yields');
  assert.equal(signalAxis(city,city.controls[0]),'ns','east-west light is still red');
  assert.equal(response.phase,'working','responder reaches actual incident access before ordinary traffic can move');
  assert.equal(civilian.progress,5.5,'ordinary driver did not receive a red-light exemption');
});

test('an oncoming body prevents an unsafe opposing-lane pass', () => {
  const city=road();
  const response=car(city,line(0,15),3.5,{phase:'outbound',service:'police',speed:3});
  car(city,line(0,15),4,{speed:0});
  const oncoming=car(city,line(15,0),11,{speed:0}); // same x4 tile, other lane
  runTicks(city,80);
  assert.equal(response.emergencyPass,undefined);
  assert.equal(response.progress,3.5,'physically blocked lanes require a stop');
  city.trips=city.trips.filter(t=>t.id!==oncoming.id);
  runTicks(city,1);
  assert.ok(response.emergencyPass,'clearing oncoming lane permits the maneuver');
});

test('opposing emergency passes serialize their corridor reservations without overlapping', () => {
  const city=road();
  const east=car(city,line(0,15),3.5,{phase:'outbound',service:'police',speed:3});
  car(city,line(0,15),4,{speed:0});
  const west=car(city,line(15,0),8.5,{phase:'outbound',service:'ems',speed:3});
  car(city,line(15,0),9,{speed:0});
  let bothPassed=false;
  runTicks(city,200,()=>{bothPassed ||= !!east.emergencyPass && !!west.emergencyPass;});
  assert.equal(bothPassed,false,'overlapping two-way reservations never activate together');
  assert.ok(east.progress>4 || west.progress>9,'at least one response makes forward progress');
});

for(const stage of ['out','passing','in'] as const) test(`save during emergency ${stage} preserves lane and deterministic continuation`,()=>{
  const city=queuedResponse();
  const civilian=city.trips.find(t=>!t.service)!; civilian.progress=5.5; civilian.speed=2;
  const response=city.trips.find(t=>t.service)!;
  for(let i=0;i<400 && response.emergencyPass?.stage!==stage;i++) tick(city);
  assert.equal(response.emergencyPass?.stage,stage);
  const restored=parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(restored,'mid-maneuver city remains loadable');
  assert.deepEqual(restored,city);
  runTicks(city,240); runTicks(restored,240);
  assert.deepEqual(restored,city,'reservations and physical movement continue identically');
});

test('road closure cannot invalidate a committed pass, and an outbound response crosses a later diversion',()=>{
  const city=queuedResponse();
  const civilian=city.trips.find(t=>!t.service)!; civilian.progress=5.5; civilian.speed=2;
  const response=city.trips.find(t=>t.service)!;
  for(let i=0;i<400 && !response.emergencyPass;i++) tick(city);
  assert.ok(response.emergencyPass);
  const reserved=response.path[response.emergencyPass.end];
  assert.match(place(city,'closure',reserved.x,reserved.y),/passing/);
  assert.equal(city.closures.length,0);
  const start={...response.path[bodyTile(response)]};
  place(city,'closure',12,6); // beyond the reserved junction/merge corridor
  assert.ok(parseCity(JSON.parse(JSON.stringify(city))),'immediate post-edit snapshot loads');
  runTicks(city,240);
  assertBodies(city);
  const here=response.path[bodyTile(response)];
  assert.ok(here.x>=12,'outbound response continues through the civilian diversion');
  assert.ok(here.x>=start.x,'closure cannot teleport response backwards');
  assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
});

test('green lead traffic keeps clearing when an oncoming vehicle prevents the following responder passing',()=>{
  const city=road();
  place(city,'road',8,5); place(city,'signal',8,6);
  city.elapsed=12; // east-west green
  const response=car(city,line(0,15),6.5,{phase:'outbound',service:'police',speed:3});
  const lead=car(city,line(0,15),7.5);
  car(city,line(15,0),8,{speed:0}); // x7 westbound prevents pass, without blocking the green exit
  runTicks(city,60);
  assert.ok(lead.progress>8.5,'same-direction lead car must clear green, even with siren behind');
  assert.ok(response.progress>7.5,'response follows lead traffic through');
});

test('moving oncoming traffic waits outside a committed pass and resumes after merge',()=>{
  const city=road();
  const response=car(city,line(0,15),3.5,{phase:'outbound',service:'police',speed:3});
  car(city,line(0,15),4,{speed:0});
  const oncoming=car(city,line(15,0),7); // x8 still clear of initial pass x3..5
  let held=false, committed=false;
  runTicks(city,240,()=>{held ||= oncoming.hold>0; committed ||= !!response.emergencyPass;});
  assert.ok(committed && held,'moving oncoming body is held by real opposite-lane reservation');
  assert.ok(oncoming.progress>10,'oncoming flow resumes after corridor is released');
});

test('a pass through adjoining junctions reserves off-route members against cross traffic and edits',()=>{
  const city=queuedResponse();
  place(city,'road',9,5); place(city,'road',10,4);
  const civilian=city.trips.find(t=>!t.service)!; civilian.progress=4.5; civilian.speed=2;
  const response=city.trips.find(t=>t.service)!;
  for(let i=0;i<400 && !response.emergencyPass;i++) tick(city);
  assert.ok(response.emergencyPass);
  assert.match(place(city,'closure',10,5),/passing/,'off-route junction member is part of reserved box');
  assert.match(place(city,'road',9,7),/passing/,'cannot extend topology beside reserved box');
  const restored=parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(restored);
  runTicks(restored,240);
  assert.equal(restored.trips.find(t=>t.service)?.phase,'working');
});

test('corrupt lane changes reject impossible direction, lateral state, or overlapping reservations',()=>{
  const city=queuedResponse();
  const civilian=city.trips.find(t=>!t.service)!; civilian.progress=5.5; civilian.speed=2;
  const response=city.trips.find(t=>t.service)!;
  for(let i=0;i<400 && response.emergencyPass?.stage!=='passing';i++) tick(city);
  assert.equal(response.emergencyPass?.stage,'passing');
  const corruptions: ((c:City)=>void)[]=[
    c=>{c.trips.find(t=>t.service)!.emergencyPass!.shift=.5;},
    c=>{c.trips.find(t=>t.service)!.emergencyPass!.end=999;},
    c=>{c.trips.find(t=>t.service)!.phase='returning';},
    c=>{const r=c.trips.find(t=>t.service)!; r.emergencyPass!.end=r.emergencyPass!.start+1;},
    c=>{const r=c.trips.find(t=>t.service)!; c.trips.find(t=>!t.service)!.progress=r.path[r.emergencyPass!.end].x-4;},
  ];
  for(const corrupt of corruptions){const bad=structuredClone(city); corrupt(bad); assert.equal(parseCity(bad),null);}
});
