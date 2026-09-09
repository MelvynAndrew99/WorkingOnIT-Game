import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, entrance, parseCity, place, stepCity, type City, type Trip } from './cityModel.ts';
import { RESCUE_SECONDS, stepIncidents, type Incident } from './cityIncidents.ts';
import { bodyTile, roadIndex, trafficTick, TRAFFIC_TICK } from './cityTraffic.ts';

/** Real station entrances and construction, funded independently of economy tuning. */
function serviceTown(): City {
  const city = createCity();
  city.funds = 10000;
  place(city, 'hospital', 1, 1);
  place(city, 'fireStation', 5, 1);
  place(city, 'policeStation', 9, 1);
  for (const x of [2, 6, 10]) place(city, 'road', x, 3);
  for (let x = 1; x <= 13; x++) place(city, 'road', x, 4);
  for (let y = 5; y <= 8; y++) place(city, 'road', 8, y);
  assert.equal(city.buildings.length, 3);
  return city;
}

/** Seed the accident only; dispatch, movement, deadlines and clearance use the real simulation. */
function incident(city: City, severity: Incident['severity'] = 'fire', y = 8): Incident {
  const value: Incident = {
    id: city.nextId++, x: 8, y, severity, status: 'active', createdAt: city.elapsed,
    required: severity === 'minor' ? ['police'] : severity === 'serious' ? ['police', 'ems'] : ['police', 'ems', 'fire'],
    completedServices: [], rescueDeadline: severity === 'minor' ? null : city.elapsed + RESCUE_SECONDS,
    outcome: severity === 'minor' ? 'none' : 'pending',
  };
  city.incidents.push(value);
  city.accidentCount++;
  return value;
}

function reload(city: City): City {
  const result = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(result, 'recovery must retain a loadable city');
  assert.deepEqual(result.buildings, city.buildings);
  assert.equal(result.funds, city.funds);
  return result;
}

test('all outbound crews cross a civilian diversion and clearance finishes after return access reopens', () => {
  const city = serviceTown();
  const crash = incident(city);
  place(city, 'closure', 8, 5);
  stepIncidents(city, TRAFFIC_TICK);
  assert.deepEqual(city.trips.map(t => t.service).sort(), ['ems', 'fire', 'police']);
  for (const trip of city.trips) {
    assert.deepEqual(trip.path[0], entrance(city.buildings.find(b => b.id === trip.stationId)!));
    assert.ok(trip.path.some(p => p.x === 8 && p.y === 5));
    assert.ok(!trip.path.some(p => p.x === crash.x && p.y === crash.y));
  }
  const crossed = new Set<string>();
  for (let i = 0; i < 45 / TRAFFIC_TICK; i++) {
    stepCity(city, TRAFFIC_TICK);
    for (const trip of city.trips) {
      const body = trip.path[bodyTile(trip)];
      if (trip.phase === 'outbound' && body.x === 8 && body.y === 5) crossed.add(trip.service!);
    }
  }
  assert.deepEqual([...crossed].sort(), ['ems', 'fire', 'police']);
  assert.equal(crash.status, 'active', 'a returning crew physically occupies the sole scene access while its return is blocked');
  const returning = city.trips.find(t => t.phase === 'waiting' && t.resume === 'returning');
  assert.ok(returning, 'routine return obeys the civilian diversion');
  assert.ok(returning.path[bodyTile(returning)].y > 5);
  const restored = reload(city);
  place(restored, 'closure', 8, 5);
  stepCity(restored, 30);
  assert.equal(restored.trips.length, 0);
  assert.equal(restored.incidents[0].status, 'cleared');
});

test('civilian diversions at station entrances do not suppress outbound service dispatch', () => {
  const city = serviceTown();
  incident(city);
  for (const station of city.buildings) {
    const p = entrance(station);
    place(city, 'closure', p.x, p.y);
  }
  stepIncidents(city, TRAFFIC_TICK);
  assert.deepEqual(city.trips.map(t => t.service).sort(), ['ems', 'fire', 'police']);
  assert.ok(parseCity(city));
  stepCity(city, 3);
  for (const station of city.buildings) {
    const p = entrance(station);
    place(city, 'closure', p.x, p.y);
  }
  stepCity(city, 45);
  assert.equal(city.incidents[0].status, 'cleared');
});

test('an active wreck still blocks EMS and fire access behind it, unlike a civilian diversion', () => {
  const city = serviceTown();
  const distant = incident(city);
  incident(city, 'minor', 5);
  stepIncidents(city, TRAFFIC_TICK);
  assert.equal(city.trips.some(t => t.incidentId === distant.id), false);
  assert.equal(city.trips.filter(t => t.service === 'police').length, 1, 'police can clear the nearer obstruction first');
  stepCity(city, 60);
  assert.equal(city.incidents.every(i => i.status === 'cleared'), true);
  assert.equal(city.fatalities, 0);
});

test('an already dispatched responder chooses another side of the scene after its original access is cut', () => {
  const city = serviceTown();
  const crash = incident(city, 'minor');
  stepIncidents(city, TRAFFIC_TICK);
  const responder = city.trips.find(t => t.service === 'police')!;
  assert.deepEqual(responder.target, { x: 8, y: 7 });
  // Player adds an alternative approach and removes the old link before the responder reaches it.
  for (let y = 5; y <= 8; y++) place(city, 'road', 6, y);
  place(city, 'road', 7, 8);
  place(city, 'bulldoze', 8, 6);
  const restored = reload(city);
  const approaches = new Set<string>();
  for (let tick = 0; tick < 45 / TRAFFIC_TICK; tick++) {
    stepCity(restored, TRAFFIC_TICK);
    const trip = restored.trips.find(t => t.id === responder.id);
    if (trip?.phase === 'working') approaches.add(JSON.stringify(trip.path[bodyTile(trip)]));
  }
  assert.ok(approaches.has(JSON.stringify({ x: 7, y: 8 })), 'existing responder must reach the newly connected side');
  assert.equal(restored.incidents.find(i => i.id === crash.id)!.status, 'cleared');
  assert.equal(restored.trips.length, 0);
});

test('a missed rescue remains a fatality but reconnecting the saved town permits full clearance and continued play', () => {
  const city = serviceTown();
  incident(city);
  place(city, 'bulldoze', 8, 5);
  stepCity(city, RESCUE_SECONDS + 1);
  assert.equal(city.fatalities, 1);
  assert.equal(city.incidents[0].status, 'active');
  assert.equal(city.incidents[0].outcome, 'lost');
  const restored = reload(city);
  place(restored, 'road', 8, 5);
  stepCity(restored, 60);
  assert.equal(restored.incidents[0].status, 'cleared');
  assert.equal(restored.incidents[0].outcome, 'lost');
  assert.equal(restored.fatalities, 1);
  assert.equal(restored.rescuedCount, 0);
  assert.deepEqual([...restored.incidents[0].completedServices].sort(), ['ems', 'fire', 'police']);
  const continued = reload(restored);
  stepCity(continued, 10);
  assert.equal(continued.fatalities, 1);
  assert.equal(continued.trips.length, 0);
});

/** Isolated lane fixture: stationary cars represent a queue with an unobstructed opposing lane. */
test('a responder passes a queue longer than six tiles using a fully clear opposing corridor', () => {
  const city = createCity();
  city.funds = 10000;
  for (let x = 0; x <= 15; x++) place(city, 'road', x, 6);
  const path = Array.from({ length: 16 }, (_, x) => ({ x, y: 6 }));
  for (let x = 3; x <= 11; x++) city.trips.push({
    id: city.nextId++, homeId: 0, storeId: 0, phase: 'outbound',
    path: structuredClone(path), progress: x, wait: 0, hold: 0, speed: 0,
  });
  const responder = {
    id: city.nextId++, homeId: 0, storeId: 0, phase: 'outbound' as const, service: 'police' as const,
    path: structuredClone(path), progress: 2.5, wait: 0, hold: 0,
  };
  city.trips.push(responder);
  let longestCorridor = 0;
  let furthestProgress = responder.progress;
  for (let i = 0; i < 5 / TRAFFIC_TICK; i++) {
    city.elapsed += TRAFFIC_TICK;
    trafficTick(city, roadIndex(city));
    const pass = city.trips.find(t => t.id === responder.id)?.emergencyPass;
    furthestProgress = Math.max(furthestProgress, responder.progress);
    if (pass) longestCorridor = Math.max(longestCorridor, pass.end - pass.start);
  }
  assert.ok(longestCorridor > 6, 'queue length alone must not forbid a physically available pass');
  assert.ok(furthestProgress > 11, 'responder actually clears the queue');
  for (const civilian of city.trips.filter(t => !t.service)) {
    assert.equal(civilian.progress, civilian.id + 2, 'passing never pushes or teleports the blocked cars');
  }
});

test('a returning crew already inside a junction clears it before an outbound responder enters', () => {
  const city = createCity();
  city.funds = 10000;
  for (let x = 0; x <= 15; x++) place(city, 'road', x, 6);
  for (let y = 3; y <= 9; y++) place(city, 'road', 8, y);
  place(city, 'signal', 8, 6);
  const returning = {
    id: city.nextId++, homeId: 0, storeId: 0, phase: 'returning' as const, service: 'police' as const,
    path: Array.from({ length: 7 }, (_, i) => ({ x: 8, y: i + 3 })), progress: 3, wait: 0, hold: 0,
  };
  const outbound = {
    id: city.nextId++, homeId: 0, storeId: 0, phase: 'outbound' as const, service: 'ems' as const,
    path: Array.from({ length: 16 }, (_, x) => ({ x, y: 6 })), progress: 7.5, wait: 0, hold: 0,
  };
  city.trips.push(returning, outbound);
  trafficTick(city, roadIndex(city));
  assert.ok(returning.progress > 3, 'the siren cannot freeze a crew already clearing the junction');
  assert.equal(outbound.progress, 7.5, 'the outbound responder must respect physical occupancy');
  for (let i = 0; i < 40; i++) trafficTick(city, roadIndex(city));
  assert.ok(outbound.progress > 8, 'response continues once the return has made space');
});

test('a stranded customer retains its lane across reload so EMS can pass, then resumes after reconnection', () => {
  const city = createCity();
  city.funds = 10000;
  place(city, 'home', 0, 4);
  place(city, 'store', 12, 4);
  place(city, 'hospital', 1, 2);
  for (let x = 0; x <= 15; x++) place(city, 'road', x, 6);
  place(city, 'road', 2, 4);
  place(city, 'road', 2, 5);
  const customer: Trip = {
    id: city.nextId++, homeId: city.buildings[0].id, storeId: city.buildings[1].id,
    phase: 'outbound', purpose: 'shopping',
    path: Array.from({ length: 14 }, (_, x) => ({ x, y: 6 })), progress: 7, wait: 0, hold: 0,
  };
  city.trips.push(customer);
  place(city, 'closure', 10, 6);
  stepCity(city, 1);
  assert.equal(customer.phase, 'waiting');
  assert.deepEqual(customer.path[bodyTile(customer)], { x: 9, y: 6 });
  assert.ok(customer.path.length > 1, 'waiting must retain the actual eastbound lane geometry');
  const restored = reload(city);
  const savedCustomer = restored.trips.find(t => t.id === customer.id)!;
  assert.deepEqual(savedCustomer.path, customer.path);
  const crash = incident(restored, 'serious');
  crash.x = 14; crash.y = 6;
  let passedBesideCustomer = false;
  let arrived = false;
  for (let i = 0; i < 15 / TRAFFIC_TICK && !arrived; i++) {
    stepCity(restored, TRAFFIC_TICK);
    const ems = restored.trips.find(t => t.service === 'ems');
    if (ems?.emergencyPass?.stage === 'passing') {
      const body = ems.path[bodyTile(ems)];
      passedBesideCustomer ||= body.x === 9 && body.y === 6;
    }
    arrived = ems?.phase === 'working';
    assert.equal(savedCustomer.phase, 'waiting');
    assert.deepEqual(savedCustomer.path[bodyTile(savedCustomer)], { x: 9, y: 6 }, 'passing cannot displace the stranded customer');
  }
  assert.ok(passedBesideCustomer, 'EMS uses the clear opposing lane beside the waiting customer');
  assert.ok(arrived, 'EMS reaches the actual scene beyond the diversion');
  assert.equal(crash.outcome, 'rescued');
  place(restored, 'closure', 10, 6);
  let visited = false;
  for (let i = 0; i < 20 / TRAFFIC_TICK; i++) {
    stepCity(restored, TRAFFIC_TICK);
    visited ||= savedCustomer.phase === 'visiting';
  }
  assert.ok(visited, 'the same saved customer safely reaches the shop after access is restored');
  assert.ok(parseCity(restored));
});

test('same-tick response arrival reserves its scene endpoint against an opposite-lane civilian', () => {
  // Isolated occupancy fixture: both vehicles would otherwise enter the scene access this tick.
  const city = createCity();
  city.funds = 10000;
  for (let x = 0; x <= 3; x++) place(city, 'road', x, 1);
  place(city, 'road', 2, 2);
  const crash = incident(city, 'minor');
  crash.x = 2; crash.y = 2;
  const responder: Trip = {
    id: city.nextId++, homeId: 0, storeId: 0, phase: 'outbound', service: 'police', incidentId: crash.id,
    path: [{ x: 1, y: 1 }, { x: 2, y: 1 }], progress: .5, wait: 0, hold: 0,
  };
  const civilian: Trip = {
    id: city.nextId++, homeId: 0, storeId: 0, phase: 'outbound',
    path: [3, 2, 1, 0].map(x => ({ x, y: 1 })), progress: .5, wait: 0, hold: 0,
  };
  city.trips.push(responder, civilian);
  for (let i = 0; i < 40; i++) {
    trafficTick(city, roadIndex(city));
    assert.deepEqual(civilian.path[bodyTile(civilian)], { x: 3, y: 1 }, 'civilian cannot share an arriving or working crew tile');
  }
  assert.equal(responder.phase, 'working');
  assert.deepEqual(responder.path[bodyTile(responder)], { x: 2, y: 1 });
});
