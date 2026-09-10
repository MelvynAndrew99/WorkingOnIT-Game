import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, place, stepCity, parseCity, entrance, STALL_SECONDS, constructionPriceForCity, COSTS, type City } from './cityModel.ts';

/** Independent real-demand fixture: no injected cars, risks, incidents or severity counters. */
function playerBuiltTraffic(): City {
  const city = createCity();
  city.funds = 20000;
  for (let x = 0; x <= 14; x++) place(city, 'road', x, 6);
  for (let y = 0; y <= 5; y++) place(city, 'road', 8, y);
  for (const x of [0, 2, 4, 6]) place(city, 'home', x, 4, 0);
  for (const x of [0, 2, 4]) place(city, 'home', x, 7, 2);
  for (const y of [0, 2, 4]) place(city, 'home', 9, y, 1);
  place(city, 'store', 11, 4, 0);
  place(city, 'store', 13, 7, 2);
  return city;
}
function until(city: City, ready: () => boolean, seconds = 240): void {
  for (let tick = 0; tick < seconds * 40 && !ready(); tick++) stepCity(city, .025);
  assert.ok(ready(), `Condition not reached by ${city.elapsed.toFixed(3)} seconds`);
}
function services(city: City): void {
  place(city, 'policeStation', 0, 10, 0);
  place(city, 'hospital', 4, 10, 0);
  place(city, 'fireStation', 9, 10, 0);
  for (let x = 0; x <= 15; x++) place(city, 'road', x, 12);
  for (let y = 6; y <= 12; y++) place(city, 'road', 12, y);
}

test('teaching fixture exposes a real warning, collision and all three dispatched service types', () => {
  const city = playerBuiltTraffic();
  assert.equal(city.trips.length, 0);
  until(city, () => city.risks.length > 0);
  assert.equal(city.incidents.length, 0, 'players see a warning before the collision');
  assert.ok(city.trips.length > 1, 'household AI produces the conflicting traffic');
  until(city, () => city.incidents.length > 0);
  assert.equal(city.incidents[0].createdAt, 38.375);
  assert.equal(city.incidents[0].severity, 'minor');
  assert.equal(city.trips.filter(t => t.phase === 'crashed').length, 2);
  services(city);
  const seen = new Set<string>();
  const checkDispatch = () => {
    for (const trip of city.trips) {
      if (!trip.service || seen.has(trip.service)) continue;
      seen.add(trip.service);
      const station = city.buildings.find(b => b.id === trip.stationId);
      assert.ok(station);
      assert.deepEqual(trip.path[0], entrance(station), 'responders originate at their station entrance');
      assert.ok(trip.path.length > 1, 'arrival is actual travel, not a cutscene');
    }
    return city.accidentCount === 3;
  };
  until(city, checkDispatch);
  place(city, 'stop', 8, 6);
  until(city, () => { checkDispatch(); return city.incidents.every(i => i.status === 'cleared'); });
  assert.deepEqual([...seen].sort(), ['ems', 'fire', 'police']);
  assert.deepEqual(city.incidents.map(i => i.severity), ['minor', 'serious', 'fire']);
  for (const incident of city.incidents) assert.deepEqual([...incident.completedServices].sort(), [...incident.required].sort());
  assert.equal(city.rescuedCount, 2);
  assert.equal(city.fatalities, 0);
  const count = city.accidentCount;
  stepCity(city, 90);
  assert.equal(city.accidentCount, count, 'installed control prevents recurrence');
});

test('a worked road bypass moves traffic without pretending to rescue or clear the wreck', () => {
  const city = playerBuiltTraffic();
  until(city, () => city.incidents.length > 0);
  const completed = city.completed;
  for (let y = 7; y <= 9; y++) place(city, 'road', 7, y);
  for (let x = 8; x <= 12; x++) place(city, 'road', x, 9);
  for (let y = 7; y <= 8; y++) place(city, 'road', 12, y);
  place(city, 'stop', 7, 6);
  place(city, 'stop', 12, 6);
  stepCity(city, 40);
  assert.ok(city.completed > completed);
  assert.equal(city.incidents.length, 1);
  assert.equal(city.incidents[0].status, 'active');
  assert.deepEqual(city.incidents[0].completedServices, []);
  assert.equal(city.rescuedCount, 0);
  assert.equal(city.trips.filter(t => t.phase === 'crashed').length, 2);
});

test('a pending natural rescue reloads with the same deadline, travel and outcome', () => {
  const city = playerBuiltTraffic();
  until(city, () => city.incidents.length > 0);
  services(city);
  until(city, () => city.incidents.some(i => i.outcome === 'pending'));
  stepCity(city, .1);
  const loaded = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(loaded);
  const pending = city.incidents.find(i => i.outcome === 'pending')!;
  assert.equal(loaded.incidents.find(i => i.id === pending.id)!.rescueDeadline, pending.rescueDeadline);
  stepCity(city, 60);
  stepCity(loaded, 60);
  assert.deepEqual(loaded, city);
  assert.equal(city.incidents.find(i => i.id === pending.id)!.outcome, 'rescued');
});

import { tutorialAction, tutorialSnapshot, refreshTutorial } from './cityTutorial.ts';

test('player-built tutorial finishes safely with earned visits, controlled crossing and a real bypass', () => {
  const city = createCity();
  tutorialAction(city, 'start');
  const waitFor = (id: string) => until(city, () => { refreshTutorial(city); return tutorialSnapshot(city).currentId === id; }, 480);
  assert.match(tutorialAction(city, 'assist').message, /Keep building/);
  assert.equal(city.buildings.length, 0);
  place(city, 'home', 2, 2, 0);
  place(city, 'store', 7, 2, 0);
  for (let x = 2; x <= 8; x++) place(city, 'road', x, 4);
  const afterBuild = city.funds;
  assert.equal(city.completed, 0, 'construction alone does not invent a visit');
  waitFor('park-visit');
  assert.ok(city.funds > afterBuild, 'the first shopping visit pays real money');
  until(city, () => city.funds >= constructionPriceForCity(city, 'park') + 2 * constructionPriceForCity(city, 'road'), 120);
  assert.match(place(city, 'park', 4, 7, 2), /built/);
  for (const y of [5, 6]) assert.match(place(city, 'road', 5, y), /built/);
  waitFor('driver-rules');
  tutorialAction(city, 'acknowledge-drivers');
  waitFor('junction-control');
  place(city, 'stop', 5, 4);
  waitFor('accident-response');
  assert.equal(tutorialSnapshot(city).canPractice, false);
  assert.equal(tutorialSnapshot(city).canAcknowledgeSafety, true);
  tutorialAction(city, 'acknowledge-safety');
  assert.equal(tutorialSnapshot(city).currentId, 'detour');
  assert.equal(city.accidentCount, 0);
  assert.equal(city.rescuedCount, 0);
  assert.deepEqual(city.tutorial!.observedServices, []);
  until(city, () => city.funds >= 7 * COSTS.road, 120);
  // Connect both horizontal approaches around the player's T junction at (5,4).
  for (const x of [4, 6]) for (const y of [3, 2, 1]) assert.match(place(city, 'road', x, y), /built/);
  assert.match(place(city, 'road', 5, 1), /built/);
  refreshTutorial(city);
  assert.equal(city.tutorial!.status, 'complete');
  assert.equal(tutorialSnapshot(city).completed, tutorialSnapshot(city).total);
  assert.equal(city.tutorial!.practice, undefined);
  assert.equal(city.incidents.length, 0);
  const loaded = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(loaded);
  assert.deepEqual(loaded.tutorial, city.tutorial);
  assert.ok(city.completed > 0);
  assert.equal(city.external?.gateway, null, 'completing lessons does not silently connect outside traffic');
});

test('unrelated outbound trips cannot earn a detour lesson around a blocked crossing', () => {
  const city = playerBuiltTraffic();
  tutorialAction(city, 'start');
  until(city, () => city.incidents.length > 0);
  place(city, 'home', 0, 10, 0);
  place(city, 'store', 4, 10, 0);
  for (let x = 0; x <= 5; x++) place(city, 'road', x, 12);
  until(city, () => city.trips.some(t => t.phase === 'outbound' && t.path.length > 1 && t.path.every(p => p.y === 12)));
  assert.ok(city.incidents.some(i => i.status === 'active'));
  refreshTutorial(city);
  assert.ok(!city.tutorial!.completed.includes('detour'), 'only a genuine alternative around this blockage teaches the bypass');
});

test('fire response lesson does not finish while the fire wreck still awaits another required crew', () => {
  const city = playerBuiltTraffic();
  tutorialAction(city, 'start');
  until(city, () => city.incidents.length > 0);
  Object.assign(city.incidents[0],{severity:'fire',required:['police','ems','fire'],rescueDeadline:city.elapsed+90,outcome:'pending'});
  services(city);
  until(city,()=>city.trips.some(t=>t.service==='ems'&&t.phase==='working'));
  city.trips.find(t=>t.service==='ems'&&t.phase==='working')!.workRemaining=60;
  until(city, () => city.incidents.some(i => i.severity === 'fire' && i.completedServices.includes('fire') && i.status === 'active'));
  refreshTutorial(city);
  assert.ok(city.tutorial!.observedServices.includes('fire'));
  assert.ok(!city.tutorial!.completed.includes('rescue'));
  until(city, () => city.incidents.some(i => i.severity === 'fire' && i.status === 'cleared'));
  refreshTutorial(city);
  assert.ok(city.tutorial!.completed.includes('rescue'));
});


test('a newly controlled crossing with an active wreck cannot acknowledge a prevented accident', () => {
  const city=playerBuiltTraffic();
  city.tutorial!.completed=['first-visit','park-visit','driver-rules'];
  until(city,()=>city.incidents.some(i=>i.status==='active'));
  place(city,'stop',8,6);
  assert.equal(tutorialSnapshot(city).canAcknowledgeSafety,false);
  tutorialAction(city,'acknowledge-safety');
  assert.ok(!city.tutorial!.completed.includes('rescue'));
  assert.ok(city.incidents.some(i=>i.status==='active'));
});


test('real incident rescue stall grants finite player-placed stations and access roads', () => {
  const city = playerBuiltTraffic();
  city.tutorial!.completed = ['first-visit', 'park-visit', 'driver-rules', 'junction-control'];
  until(city, () => city.incidents.some(i => i.status === 'active'));
  refreshTutorial(city);
  assert.equal(tutorialSnapshot(city).currentId, 'rescue');
  until(city, () => constructionPriceForCity(city, 'hospital') === 0, STALL_SECONDS + 5);
  const funds = city.funds;
  services(city);
  assert.equal(city.funds, funds - 5 * COSTS.road, 'three stations and sixteen roads are waived, five extra roads are paid');
  for (const kind of ['policeStation', 'hospital', 'fireStation']) assert.equal(city.buildings.find(b => b.kind === kind)?.paid, 0);
  const loaded = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(loaded);
  assert.deepEqual(loaded.economy, city.economy);
  until(city, () => city.incidents.some(i => i.severity === 'fire' && i.status === 'cleared'));
  refreshTutorial(city);
  assert.deepEqual([...city.tutorial!.observedServices].sort(), ['ems', 'fire', 'police']);
  assert.ok(city.tutorial!.completed.includes('rescue'));
});
