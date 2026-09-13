import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, place, type City } from './cityModel.ts';
import { recordConflict } from './cityIncidents.ts';
import { TRAFFIC_TICK } from './cityTraffic.ts';
import { CITY_RULES } from './cityRules.ts';
import { cityPulse, mergePulseIssues, STICKY_SECONDS } from './cityPulse.ts';

function funded(): City {
  const city = createCity();
  city.funds = 10000;
  return city;
}

const contact = { x: 5, y: 5 };
function crossingCity(): City {
  const city = funded();
  place(city, 'home', 0, 3); place(city, 'store', 10, 3);
  place(city, 'home', 5, 0); place(city, 'store', 4, 10);
  for (let x = 0; x <= 11; x++) place(city, 'road', x, 5);
  for (let y = 2; y <= 12; y++) place(city, 'road', 5, y);
  city.trips = [
    { id: city.nextId++, homeId: city.buildings[0].id, storeId: city.buildings[1].id, phase: 'outbound', purpose: 'shopping',
      path: Array.from({ length: 12 }, (_, x) => ({ x, y: 5 })), progress: 4.5, wait: 0, hold: 0 },
    { id: city.nextId++, homeId: city.buildings[2].id, storeId: city.buildings[3].id, phase: 'outbound', purpose: 'work',
      path: Array.from({ length: 11 }, (_, y) => ({ x: 5, y: y + 2 })), progress: 2.5, wait: 0, hold: 0 },
  ];
  return city;
}

function claim(city: City, seconds = TRAFFIC_TICK): boolean {
  city.elapsed = Math.round((city.elapsed + seconds) * 1e6) / 1e6;
  return recordConflict(city, contact, city.trips[0].id, city.trips[1].id, seconds);
}

test('an empty town reports zero commute activity and no issues', () => {
  const pulse = cityPulse(createCity());
  assert.equal(pulse.trips, 0);
  assert.equal(pulse.recent, 0);
  assert.equal(pulse.bus.completed, 0);
  assert.deepEqual(pulse.issues, []);
});

test('purpose counts follow live trips and recent completed history', () => {
  const city = funded();
  city.completed = 12;
  city.elapsed = 80;
  city.history = [
    { at: 30, wait: 1, service: { homeId: 1, purpose: 'shopping', visitedAt: 20 } },
    { at: 40, wait: 2, service: { homeId: 1, purpose: 'leisure', visitedAt: 30 } },
    { at: 70, wait: 0.5, service: { homeId: 1, purpose: 'work', visitedAt: 60 } },
    { at: 75, wait: 1 },
  ];
  city.trips = [
    { id: 1, homeId: 1, storeId: 2, path: [], progress: 0, wait: 0, hold: 0, phase: 'outbound', purpose: 'shopping' },
    { id: 2, homeId: 1, storeId: 3, path: [], progress: 0, wait: 0, hold: 0, phase: 'visiting', purpose: 'leisure' },
    { id: 3, homeId: 1, storeId: 4, path: [], progress: 0, wait: 0, hold: 1, phase: 'returning', purpose: 'work' },
  ];
  const pulse = cityPulse(city);
  assert.equal(pulse.trips, 12);
  assert.equal(pulse.recent, 4);
  assert.equal(pulse.shopping.recent, 2);
  assert.equal(pulse.shopping.driving, 1);
  assert.equal(pulse.leisure.recent, 1);
  assert.equal(pulse.leisure.parked, 1);
  assert.equal(pulse.work.recent, 1);
  assert.equal(pulse.work.driving, 1);
  assert.equal(pulse.waiting, 1);
});

test('failed-yield warnings stay listed after exposure cools until a control is placed', () => {
  const city = crossingCity();
  assert.equal(cityPulse(city).issues.length, 0);
  claim(city);
  city.trips[1].id = city.nextId++;
  claim(city);
  const warned = cityPulse(city);
  assert.equal(warned.issues.some(issue => issue.kind === 'risk' && issue.severity === 'danger' && issue.x === 5 && issue.y === 5), true);

  city.risks = [];
  city.elapsed += 8;
  const watching = cityPulse(city);
  const sticky = watching.issues.find(issue => issue.kind === 'risk' && issue.x === 5 && issue.y === 5);
  assert.ok(sticky);
  assert.equal(sticky.severity, 'watch');
  assert.equal(sticky.sticky, true);

  place(city, 'stop', 5, 5);
  const fixed = cityPulse(city);
  assert.equal(fixed.issues.some(issue => issue.kind === 'risk' && issue.x === 5 && issue.y === 5), false);
});

test('a cooled warning that is never fixed drops after the sticky window', () => {
  const city = crossingCity();
  claim(city);
  city.trips[1].id = city.nextId++;
  claim(city);
  cityPulse(city);
  city.risks = [];
  city.elapsed += STICKY_SECONDS + 1;
  assert.deepEqual(cityPulse(city).issues, []);
});

test('crashes, homes and unserved stops merge into one tracker list', () => {
  const city = funded();
  city.incidents.push({
    id: 9, x: 4, y: 7, severity: 'serious', status: 'active', createdAt: 0,
    required: ['police', 'ems'], completedServices: [], rescueDeadline: 40, outcome: 'pending',
  });
  city.elapsed = 10;
  const pulse = cityPulse(city);
  const issues = mergePulseIssues(pulse, {
    homes: [{ homeId: 2, x: 1, y: 2, reason: 'Entrance needs a road' }],
    busStops: [{ id: 8, x: 6, y: 6, reason: 'No usable road route to this stop and back to its depot.', waiting: 3 }],
  });
  assert.equal(issues[0].kind, 'crash');
  assert.match(issues[0].detail, /30s to rescue/);
  assert.equal(issues.some(issue => issue.kind === 'bus-stop' && issue.severity === 'danger'), true);
  assert.equal(issues.some(issue => issue.kind === 'home' && issue.detail.includes('Entrance')), true);
});

test('warning exposure uses the shared safety threshold', () => {
  assert.equal(CITY_RULES.intersectionSafety.warningExposure, 2.4);
});
