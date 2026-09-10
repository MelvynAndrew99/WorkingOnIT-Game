import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, entrance, parseCity, place, stepCity, type City, type Trip } from './cityModel.ts';
import { arriveResponse, incidentSummary, parseIncidentState, recordConflict, stepIncidents, RISK_THRESHOLD, RESCUE_SECONDS, WORK_SECONDS, type Incident, type ServiceKind } from './cityIncidents.ts';
import { TRAFFIC_TICK, bodyTile } from './cityTraffic.ts';

/** Traffic and persistence fixtures fund their geometry independently of the starter economy. */
function createTestCity() {
  const city = createCity();
  city.funds = 10000;
  return city;
}

const contact = { x: 5, y: 5 };
/** Real placeable homes/destinations and road paths, held at actual incompatible approach claims. */
function crossingCity(): City {
  const city = createTestCity();
  place(city, 'home', 0, 3); place(city, 'store', 10, 3);
  place(city, 'home', 5, 0); place(city, 'store', 4, 10);
  for (let x = 0; x <= 11; x++) place(city, 'road', x, 5);
  for (let y = 2; y <= 12; y++) place(city, 'road', 5, y);
  city.trips = [
    { id: city.nextId++, homeId: city.buildings[0].id, storeId: city.buildings[1].id, phase: 'outbound',
      path: Array.from({ length: 12 }, (_, x) => ({ x, y: 5 })), progress: 4.5, wait: 0, hold: 0 },
    { id: city.nextId++, homeId: city.buildings[2].id, storeId: city.buildings[3].id, phase: 'outbound',
      path: Array.from({ length: 11 }, (_, y) => ({ x: 5, y: y + 2 })), progress: 2.5, wait: 0, hold: 0 },
  ];
  return city;
}
function claim(city: City, seconds = TRAFFIC_TICK): boolean {
  city.elapsed = Math.round((city.elapsed + seconds) * 1e6) / 1e6;
  return recordConflict(city, contact, city.trips[0].id, city.trips[1].id, seconds);
}
/** Seeded fixture isolates response lifecycle from the independently checked accident trigger. */
function seedIncident(city: City, severity: Incident['severity'] = 'fire', x = 8, y = 7): Incident {
  const required: ServiceKind[] = severity === 'minor' ? ['police'] : severity === 'serious' ? ['police', 'ems'] : ['police', 'ems', 'fire'];
  const incident: Incident = { id: city.nextId++, x, y, severity, status: 'active', createdAt: city.elapsed,
    required, completedServices: [], rescueDeadline: severity === 'minor' ? null : city.elapsed + RESCUE_SECONDS,
    outcome: severity === 'minor' ? 'none' : 'pending' };
  city.incidents.push(incident); city.accidentCount++;
  return incident;
}
function serviceCity(): City {
  const city = createTestCity();
  place(city, 'hospital', 1, 1); place(city, 'fireStation', 5, 1); place(city, 'policeStation', 9, 1);
  for (const x of [2, 6, 10]) place(city, 'road', x, 3);
  for (let x = 1; x <= 13; x++) place(city, 'road', x, 4);
  for (let y = 5; y <= 8; y++) place(city, 'road', 8, y);
  for (let x = 6; x <= 10; x++) place(city, 'road', x, 8);
  seedIncident(city);
  return city;
}
function reload(city: City): City {
  const restored = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(restored, 'valid emergency snapshot must load');
  return restored;
}

test('actual crossing claims warn before threshold, accumulate once per tick, then crash only the pair', () => {
  const city = crossingCity();
  assert.equal(claim(city), false);
  assert.match(incidentSummary(city).warning, /failed-yield risk/i);
  const exposure = city.risks[0].exposure;
  recordConflict(city, contact, city.trips[1].id, city.trips[0].id, TRAFFIC_TICK);
  assert.equal(city.risks[0].exposure, exposure, 'reversed duplicate report cannot double exposure');
  for (let tick = 1; tick < RISK_THRESHOLD / TRAFFIC_TICK - 1; tick++) assert.equal(claim(city), false);
  assert.equal(city.incidents.length, 0);
  assert.equal(claim(city), true);
  assert.equal(city.accidentCount, 1); assert.equal(city.incidents[0].severity, 'minor');
  assert.deepEqual(city.trips.map(t => [t.phase, t.path, t.progress]), [['crashed', [contact], 0], ['crashed', [contact], 0]]);
  assert.equal(city.completed, 0); assert.equal(city.risks.length, 0);
  assert.ok(parseCity(city));
});

test('quiet roads, same-lane traffic, distant vehicles and non-junctions cannot produce accidents', () => {
  const empty = crossingCity(); empty.trips = [];
  assert.equal(recordConflict(empty, contact, 5, 6, 100), false);
  const following = crossingCity(); following.trips[1].path = following.trips[0].path.map(p => ({ ...p })); following.trips[1].progress = 4.25;
  assert.equal(claim(following, 100), false);
  const distant = crossingCity(); distant.trips[1].progress = 0;
  assert.equal(claim(distant, 100), false);
  const straight = crossingCity();
  assert.equal(recordConflict(straight, { x: 4, y: 5 }, straight.trips[0].id, straight.trips[1].id, 100), false);
  for (const city of [empty, following, distant, straight]) { assert.equal(city.accidentCount, 0); assert.equal(city.risks.length, 0); }
});

for (const control of ['stop', 'signal'] as const) test(`${control} cancels an existing conflict warning and prevents its crash`, () => {
  const city = crossingCity(); claim(city, 3);
  place(city, control, contact.x, contact.y);
  assert.equal(claim(city, 10), false);
  assert.equal(city.risks.length, 0); assert.equal(incidentSummary(city).warning, ''); assert.equal(city.accidentCount, 0);
});

test('dispatch begins at each actual station entrance and defers an occupied same-lane entrance', () => {
  const city = serviceCity();
  const police = city.buildings.find(b => b.kind === 'policeStation')!;
  const obstruction: Trip = { id: city.nextId++, homeId: 0, storeId: 0, path: [entrance(police), { x: 10, y: 4 }, { x: 9, y: 4 }], progress: 0, wait: 0, hold: 0, phase: 'waiting' };
  city.trips.push(obstruction);
  stepIncidents(city, TRAFFIC_TICK);
  assert.equal(city.trips.some(t => t.service === 'police'), false);
  assert.ok(city.trips.some(t => t.service === 'ems')); assert.ok(city.trips.some(t => t.service === 'fire'));
  city.trips = city.trips.filter(t => t.id !== obstruction.id);
  stepIncidents(city, TRAFFIC_TICK);
  assert.equal(city.trips.filter(t => t.service).length, 3);
  for (const trip of city.trips) {
    assert.deepEqual(trip.path[0], entrance(city.buildings.find(b => b.id === trip.stationId)!));
    assert.equal(trip.progress, 0);
    const access = trip.path.at(-1)!;
    assert.equal(Math.abs(access.x - 8) + Math.abs(access.y - 7), 1);
    assert.equal(trip.path.some(p => p.x === 8 && p.y === 7), false, 'route never drives through wreck');
  }
});

test('all three crews drive, work, and return; EMS alone never clears a burning wreck', () => {
  const city = serviceCity();
  const completedKinds = new Set<ServiceKind>(); const seenWorking = new Set<ServiceKind>(); const seenReturning = new Set<ServiceKind>();
  for (let tick = 0; tick < 80 / TRAFFIC_TICK; tick++) {
    stepCity(city, TRAFFIC_TICK);
    for (const trip of city.trips) {
      if (trip.phase === 'working') seenWorking.add(trip.service!);
      if (trip.phase === 'returning') seenReturning.add(trip.service!);
    }
    const incident = city.incidents[0];
    for (const service of incident.completedServices) completedKinds.add(service);
    if (!incident.completedServices.includes('fire')) assert.equal(incident.status, 'active');
  }
  assert.deepEqual([...seenWorking].sort(), ['ems', 'fire', 'police']);
  assert.deepEqual([...seenReturning].sort(), ['ems', 'fire', 'police']);
  assert.deepEqual([...completedKinds].sort(), ['ems', 'fire', 'police']);
  assert.equal(city.incidents[0].status, 'cleared'); assert.equal(city.incidents[0].outcome, 'rescued');
  assert.equal(city.trips.length, 0); assert.equal(city.completed, 0); assert.equal(city.history.length, 0);
});

test('rescue at the exact deadline is timely, while missed deadlines count once through reload', () => {
  const timely = serviceCity(); stepIncidents(timely, TRAFFIC_TICK);
  const ems = timely.trips.find(t => t.service === 'ems')!;
  timely.elapsed = timely.incidents[0].rescueDeadline!;
  arriveResponse(timely, ems); stepIncidents(timely, TRAFFIC_TICK);
  assert.equal(timely.incidents[0].outcome, 'rescued'); assert.equal(timely.rescuedCount, 1); assert.equal(timely.fatalities, 0);
  const restored = reload(timely); stepCity(restored, 10);
  assert.equal(restored.rescuedCount, 1); assert.equal(restored.fatalities, 0);
  const late = serviceCity(); stepIncidents(late, TRAFFIC_TICK);
  late.elapsed = late.incidents[0].rescueDeadline! + TRAFFIC_TICK;
  arriveResponse(late, late.trips.find(t => t.service === 'ems')!); stepIncidents(late, TRAFFIC_TICK);
  assert.equal(late.incidents[0].outcome, 'lost'); assert.equal(late.fatalities, 1); assert.equal(late.rescuedCount, 0);
  const afterLoss = reload(late); stepCity(afterLoss, 100);
  assert.equal(afterLoss.fatalities, 1); assert.equal(afterLoss.rescuedCount, 0);
});

test('no service, disconnected service, and already busy service remain distinct and leave wreck active', () => {
  const absent = createTestCity(); place(absent, 'road', 8, 7); seedIncident(absent);
  assert.match(incidentSummary(absent).details[0].needs, /no hospital/);
  assert.match(incidentSummary(absent).details[0].needs, /no fire station/);
  assert.match(incidentSummary(absent).details[0].needs, /no police station/);
  stepCity(absent, RESCUE_SECONDS + 1); assert.equal(absent.incidents[0].status, 'active'); assert.equal(absent.fatalities, 1);
  const unreachable = serviceCity(); place(unreachable, 'bulldoze', 2, 3);
  assert.match(incidentSummary(unreachable).details[0].needs, /EMS \(unreachable\)/);
  const busy = serviceCity(); stepIncidents(busy, TRAFFIC_TICK);
  const second = seedIncident(busy, 'serious', 6, 8);
  assert.match(incidentSummary(busy).details.find(d => d.id === second.id)!.needs, /EMS \(busy\)/);
  assert.match(incidentSummary(busy).details.find(d => d.id === second.id)!.needs, /police \(busy\)/);
});

test('paused snapshots preserve responder work and deadline clocks and resume identically', () => {
  const city = serviceCity();
  for (let tick = 0; tick < 30 / TRAFFIC_TICK && !city.trips.some(t => t.phase === 'working'); tick++) stepCity(city, TRAFFIC_TICK);
  assert.ok(city.trips.some(t => t.phase === 'working'));
  const before = JSON.stringify(city);
  stepCity(city, 0); stepIncidents(city, 0);
  assert.equal(JSON.stringify(city), before);
  const restored = reload(city); assert.deepEqual(restored, city);
  stepCity(city, 50); for (let i = 0; i < 500; i++) stepCity(restored, 0.1);
  assert.deepEqual(restored.incidents, city.incidents);
  assert.deepEqual(restored.trips, city.trips);
  assert.deepEqual([restored.rescuedCount, restored.fatalities, restored.completed], [city.rescuedCount, city.fatalities, city.completed]);
});

test('incident parser rejects corrupt records, counters and response references without aliasing valid data', () => {
  const city = serviceCity(); stepIncidents(city, TRAFFIC_TICK);
  const mutations: ((c: City) => void)[] = [
    c => { c.incidents[0].required = ['ems']; }, c => { c.incidents[0].completedServices = ['ems', 'ems']; },
    c => { c.incidents[0].id = c.buildings[0].id; }, c => { c.incidents[0].createdAt = 99; },
    c => { c.incidents[0].rescueDeadline = NaN; }, c => { c.fatalities = 2; },
    c => { c.trips[0].incidentId = c.nextId - 1; }, c => { c.trips[0].stationId = c.buildings[0].id; },
  ];
  for (const mutate of mutations) { const copy = structuredClone(city); mutate(copy); assert.equal(parseCity(copy), null); }
  const restored = reload(city); restored.incidents[0].completedServices.push('fire');
  assert.deepEqual(city.incidents[0].completedServices, []);
  assert.equal(parseIncidentState({}, structuredClone(city)), false, 'legacy missing incidents cannot retain responders');
  assert.equal(WORK_SECONDS.fire > WORK_SECONDS.ems, true);
});

test('response parser rejects duplicate station dispatch and services the incident does not require', () => {
  const city = serviceCity(); stepIncidents(city, TRAFFIC_TICK);
  const duplicate = structuredClone(city);
  duplicate.trips.push({ ...structuredClone(duplicate.trips[0]), id: duplicate.nextId++ });
  assert.equal(parseCity(duplicate), null, 'a station cannot have two concurrent responders');
  const wrongNeed = serviceCity();
  Object.assign(wrongNeed.incidents[0], { severity: 'minor', required: ['police'], rescueDeadline: null, outcome: 'none' });
  stepIncidents(wrongNeed, TRAFFIC_TICK);
  const wrongResponse = wrongNeed.trips[0]; wrongResponse.service = 'ems';
  wrongResponse.stationId = wrongNeed.buildings.find(b => b.kind === 'hospital')!.id;
  assert.equal(parseCity(wrongNeed), null, 'an EMS response cannot reference a police-only incident');
});

test('response parser validates actual work positions, response endpoints, return endpoints, and waiting intent', () => {
  const city = serviceCity(); stepIncidents(city, TRAFFIC_TICK);
  const corruptions: [string, (c: City) => void][] = [
    ['outbound endpoint must adjoin wreck', c => { c.trips[0].path.pop(); c.trips[0].target = c.trips[0].path.at(-1); }],
    ['working body must have arrived', c => { c.trips[0].phase = 'working'; c.trips[0].workRemaining = 6; }],
    ['returning endpoint must be station entrance', c => { c.trips[0].phase = 'returning'; }],
    ['waiting resume cannot be a civilian visit', c => { const t = c.trips[0]; t.phase = 'waiting'; t.resume = 'visiting'; t.path = [t.path[0]]; t.progress = 0; }],
    ['waiting outbound target must adjoin wreck', c => { const t = c.trips[0]; t.phase = 'waiting'; t.resume = 'outbound'; t.path = [t.path[0]]; t.target = { ...t.path[0] }; t.progress = 0; }],
  ];
  for (const [label, mutate] of corruptions) {
    const copy = structuredClone(city); mutate(copy); assert.equal(parseCity(copy), null, label);
  }
});

test('crashed civilians must reference the incident at their own contact tile', () => {
  const city = crossingCity(); claim(city, RISK_THRESHOLD);
  seedIncident(city, 'minor', 4, 5);
  assert.ok(parseCity(city), 'two distinct seeded incident records are valid before reference corruption');
  city.trips[0].incidentId = city.incidents[1].id;
  assert.equal(parseCity(city), null);
});

test('a responder with a severed return route waits physically and resumes after the road reopens', () => {
  const city = serviceCity();
  Object.assign(city.incidents[0], { severity: 'minor', required: ['police'], rescueDeadline: null, outcome: 'none' });
  for (let tick = 0; tick < 30 / TRAFFIC_TICK && !city.trips.some(t => t.phase === 'working'); tick++) stepCity(city, TRAFFIC_TICK);
  const responder = city.trips.find(t => t.service === 'police')!;
  assert.equal(responder.phase, 'working');
  const access = { ...responder.path.at(-1)! };
  place(city, 'closure', 8, 5);
  stepCity(city, WORK_SECONDS.police + 1);
  assert.equal(responder.phase, 'working'); assert.equal(responder.sceneParked,true);assert.equal(responder.workRemaining,0);
  assert.deepEqual(responder.path[bodyTile(responder)], access, 'waiting responder stays on its actual access tile');
  assert.deepEqual(responder.target, access);
  const restored = reload(city); assert.equal(restored.trips[0].sceneParked,true);
  place(restored, 'closure', 8, 5); stepCity(restored, 20);
  assert.equal(restored.trips.filter(t=>!t.patrol).length, 0); assert.equal(restored.incidents[0].status, 'cleared');
});

test('cooled conflict risk expires and a quiet junction never finishes an old warning as an accident', () => {
  const city = crossingCity(); claim(city, RISK_THRESHOLD - TRAFFIC_TICK);
  city.trips = [];
  city.elapsed += 2; stepIncidents(city, TRAFFIC_TICK);
  assert.equal(city.risks.length, 0); assert.equal(city.accidentCount, 0);
  assert.equal(incidentSummary(city).warning, '');
});

/** The same legal ten-home crossing used by traffic-flow integration, with unseeded demand. */
function competingTown(): City {
  const city = createTestCity();
  for (let x = 0; x <= 14; x++) place(city, 'road', x, 6);
  for (let y = 0; y <= 5; y++) place(city, 'road', 8, y);
  for (const x of [0, 2, 4, 6]) place(city, 'home', x, 4, 0);
  for (const x of [0, 2, 4]) place(city, 'home', x, 7, 2);
  for (const y of [0, 2, 4]) place(city, 'home', 9, y, 1);
  place(city, 'store', 11, 4); place(city, 'store', 13, 7, 2);
  return city;
}

test('ordinary moving traffic warns then crashes from zero exposure; stops and lights prevent that same conflict', () => {
  const unsigned = competingTown();
  assert.equal(unsigned.risks.length, 0); assert.equal(unsigned.trips.length, 0);
  let warnedBeforeCrash = false;
  for (let tick = 0; tick < 60 / TRAFFIC_TICK; tick++) {
    stepCity(unsigned, TRAFFIC_TICK);
    if (!unsigned.accidentCount && incidentSummary(unsigned).warning) warnedBeforeCrash = true;
  }
  assert.ok(warnedBeforeCrash, 'the movement hook produces a visible warning before any crash');
  assert.equal(unsigned.accidentCount, 1, 'real trips reach the threshold without seeded exposure or API claims');
  assert.equal(unsigned.trips.filter(t => t.phase === 'crashed').length, 2);
  assert.deepEqual({ x: unsigned.incidents[0].x, y: unsigned.incidents[0].y }, { x: 8, y: 6 });
  assert.ok(parseCity(unsigned), 'a naturally produced crash is saveable');
  for (const kind of ['stop', 'signal'] as const) {
    const controlled = competingTown(); place(controlled, kind, 8, 6);
    stepCity(controlled, 60);
    assert.equal(controlled.accidentCount, 0); assert.deepEqual(controlled.risks, []);
    assert.ok(controlled.completed > 0, `${kind} safely serves the actual demand`);
  }
});
