import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, place, stepCity, parseCity, entrances, upgradeApartment, type City} from './cityModel.ts';
import {createApartmentIncident, incidentAccessPoints, isIncidentBlocked, stepIncidents} from './cityIncidents.ts';
import {responseRoute, routingSnapshot} from './cityRouting.ts';
import {roadEdgeKey, roadDirectionForStep} from './cityDirections.ts';

function fixture(secondEntrance = false) {
  const city = createCity(); city.funds = 20000;
  for (const [kind, x] of [['policeStation', 1], ['hospital', 5], ['fireStation', 9]] as const) assert.match(place(city, kind, x, 1), /built/);
  assert.match(place(city, 'apartment', 8, 6), /built/);
  const building = city.buildings.find(b => b.kind === 'apartment')!;
  for (let x = 2; x <= 10; x++) assert.match(place(city, 'road', x, 3), /built/);
  for (let y = 4; y <= 5; y++) assert.match(place(city, 'road', 2, y), /built/);
  for (let x = 3; x <= 9; x++) assert.match(place(city, 'road', x, 5), /built/);
  if (secondEntrance) assert.match(upgradeApartment(city, building.id, {x: 9, y: 5}), /entrance open/);
  return {city, building};
}
function reload(city: City) {
  const saved = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(saved, 'apartment responder state must reload');
  return saved;
}

test('unconnected primary entrance cannot borrow nearby roads; upgrade admits real crews and survives reload', () => {
  const {city, building} = fixture();
  const incident = createApartmentIncident(city, building.id, 'fire')!;
  assert.ok(incident);
  assert.equal(createApartmentIncident(city, building.id), null);
  assert.equal(isIncidentBlocked(city, building), false);
  assert.deepEqual(incidentAccessPoints(city, incident), entrances(building));
  stepCity(city, 2);
  assert.equal(city.trips.filter(t => t.incidentId === incident.id).length, 0);
  assert.deepEqual(incident.completedServices, []);
  const upgraded = reload(city);
  assert.match(upgradeApartment(upgraded, building.id, {x: 9, y: 5}), /entrance open/);
  stepCity(upgraded, 3);
  assert.ok(upgraded.trips.some(t => t.incidentId === incident.id && t.phase === 'outbound'));
  const moving = reload(upgraded);
  let sawWorking = false;
  for (let i = 0; i < 2400 && moving.incidents[0].status === 'active'; i++) {
    stepCity(moving, .025);
    if (!sawWorking && moving.trips.some(t => t.incidentId === incident.id && t.sceneParked)) {
      sawWorking = true;
      assert.ok(reload(moving));
    }
  }
  assert.ok(sawWorking);
  assert.equal(moving.incidents[0].status, 'cleared');
  assert.deepEqual([...moving.incidents[0].completedServices].sort(), ['ems', 'fire', 'police']);
  assert.equal(moving.incidents[0].outcome, 'rescued');
  const crewIds = moving.trips.filter(t => t.incidentId === incident.id).map(t => t.id);
  const returning = reload(moving); stepCity(returning, 40);
  assert.ok(crewIds.every(id => !returning.trips.some(t => t.id === id)));
  assert.ok(reload(returning));
});

test('apartment response obeys one-way approach and civilian Divert exception', () => {
  const {city, building} = fixture(true);
  const incident = createApartmentIncident(city, building.id, 'minor')!;
  const a = {x: 5, y: 5}, b = {x: 6, y: 5};
  city.roadDirections = {[roadEdgeKey(a, b)]: roadDirectionForStep(b, a)};
  assert.equal(responseRoute(routingSnapshot(city, undefined, true), {x: 2, y: 3}, incident), null);
  stepIncidents(city, .025);
  assert.equal(city.trips.filter(t => t.incidentId === incident.id).length, 0);
  delete city.roadDirections;
  city.closures.push(a);
  assert.ok(responseRoute(routingSnapshot(city, undefined, true), {x: 2, y: 3}, incident));
  stepCity(city, 35);
  assert.equal(city.incidents[0].status, 'cleared');
});

test('building incident saves reject fabricated building references, duplicate scenes and invalid crew entrances', () => {
  const {city, building} = fixture(true);
  const incident = createApartmentIncident(city, building.id)!;
  stepCity(city, .025);
  const raw = JSON.parse(JSON.stringify(city));
  assert.ok(parseCity(raw));
  const bad = structuredClone(raw); bad.incidents[0].buildingId = city.buildings[0].id;
  assert.equal(parseCity(bad), null);
  const duplicate = structuredClone(raw); duplicate.incidents.push({...duplicate.incidents[0], id: duplicate.nextId++}); duplicate.accidentCount++;
  assert.equal(parseCity(duplicate), null);
  const wrongEntrance = structuredClone(raw);
  const crew = wrongEntrance.trips.find((t: {incidentId?: number}) => t.incidentId === incident.id);
  assert.ok(crew); crew.path = [{x: 8, y: 5}]; crew.progress = 0; crew.target = {x: 8, y: 5};
  assert.equal(parseCity(wrongEntrance), null);
});

test('a wreck occupying the only apartment entrance blocks response until a second connected entrance opens', () => {
  const {city, building} = fixture();
  for (let y = 6; y <= 10; y++) assert.match(place(city, 'road', 2, y), /built/);
  for (let x = 3; x <= 8; x++) assert.match(place(city, 'road', x, 10), /built/);
  assert.match(place(city, 'home', 0, 10), /built/);
  assert.match(place(city, 'store', 4, 11), /built/);
  const home = city.buildings.find(b => b.kind === 'home')!;
  const store = city.buildings.find(b => b.kind === 'store')!;
  // Existing collision fixture: its wreck occupies the sole enabled apartment approach.
  const crashId = city.nextId++;
  city.incidents.push({id: crashId, x: 8, y: 10, severity: 'minor', status: 'active',
    createdAt: city.elapsed, required: ['police'], completedServices: [], rescueDeadline: null, outcome: 'none'});
  city.accidentCount++;
  const wreckId = city.nextId++;
  city.trips.push({id: wreckId, homeId: home.id, storeId: store.id, phase: 'crashed',
    path: [{x: 8, y: 10}], progress: 0, hold: 0, wait: 0, incidentId: crashId});
  const incident = createApartmentIncident(city, building.id, 'serious')!;
  stepCity(city, 2);
  assert.ok(city.trips.some(t => t.id === wreckId && t.phase === 'crashed'));
  assert.equal(responseRoute(routingSnapshot(city, undefined, true), {x: 6, y: 3}, incident), null);
  assert.equal(city.trips.filter(t => t.incidentId === incident.id).length, 0);
  assert.deepEqual(incident.completedServices, []);
  const opened = reload(city);
  assert.match(upgradeApartment(opened, building.id, {x: 9, y: 5}), /entrance open/);
  let workedWhileWreckBlocked = false;
  for (let i = 0; i < 2400 && opened.incidents.find(s => s.id === incident.id)!.status === 'active'; i++) {
    stepCity(opened, .025);
    if (opened.trips.some(t => t.incidentId === incident.id && t.phase === 'working')) {
      assert.ok(opened.trips.filter(t => t.incidentId === incident.id && t.phase === 'working')
        .every(t => t.path.at(-1)!.x === 9 && t.path.at(-1)!.y === 5));
      if (opened.trips.some(t => t.id === wreckId && t.phase === 'crashed')) workedWhileWreckBlocked = true;
    }
  }
  assert.ok(workedWhileWreckBlocked, 'a real crew must use the new entrance while the original remains physically blocked');
  assert.equal(opened.incidents.find(s => s.id === incident.id)!.status, 'cleared');
  assert.deepEqual([...opened.incidents.find(s => s.id === incident.id)!.completedServices].sort(), ['ems', 'police']);
  assert.ok(reload(opened));
});

test('responders physically use the chosen top or side entrance instead of unselected perimeter roads', () => {
  for (const selected of [{x: 9, y: 5}, {x: 7, y: 7}]) {
    const {city, building} = fixture();
    assert.match(place(city, 'road', 7, 6), /built/);
    assert.match(place(city, 'road', 7, 7), /built/);
    assert.match(upgradeApartment(city, building.id, selected), /entrance open/);
    const incident = createApartmentIncident(city, building.id, 'minor')!;
    const loaded = reload(city);
    let arrived = false;
    for (let i = 0; i < 1600 && loaded.incidents[0].status === 'active'; i++) {
      stepCity(loaded, .025);
      const crew = loaded.trips.find(t => t.incidentId === incident.id && t.phase === 'working');
      if (crew) {
        arrived = true;
        assert.deepEqual(crew.path.at(-1), selected);
      }
    }
    assert.ok(arrived, 'the crew must drive to the selected entrance before work');
    assert.equal(loaded.incidents[0].status, 'cleared');
    assert.ok(reload(loaded));
  }
});
