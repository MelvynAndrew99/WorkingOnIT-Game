import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, parseCity, place, stepCity, type City} from './cityModel.ts';
import {flowReport, flowSnapshot, refreshFlowProgress, roadFlowSnapshot} from './cityFlow.ts';
import {claimMissionReward, missionSnapshot} from './cityMissions.ts';
import {tutorialAction} from './cityTutorial.ts';
import {applyFlowSolution, flowTown, FLOW_HOMES} from './fixtures/flowTown.ts';

const earned = (city: City) => city.missions!.completed.includes('neighborhood-flow');
function reload(city: City) {
  const restored = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(restored, 'the complete city save remains loadable');
  return restored;
}
function until(city: City, condition: () => boolean, seconds = 240) {
  for (let i = 0; i < seconds * 4 && !condition(); i++) stepCity(city, .25);
  assert.ok(condition(), `condition not reached at ${city.elapsed.toFixed(2)}s`);
}
function eligibleTown(solution: 'baseline' | 'retimed' | 'destinations' = 'baseline') {
  const city = flowTown(solution);
  tutorialAction(city, 'skip');
  until(city, () => city.missions!.completed.includes('word-on-the-street'));
  refreshFlowProgress(city);
  return city;
}

test('FLOW-02: real service does not bypass tutorial or prerequisite gates', () => {
  const city = flowTown('retimed');
  tutorialAction(city, 'start');
  stepCity(city, 180);
  assert.ok(flowSnapshot(city, FLOW_HOMES).ready, 'good traffic is physically demonstrated');
  assert.equal(city.tutorial!.status, 'active');
  assert.equal(earned(city), false);
  assert.equal(missionSnapshot(city).items.find(j => j.id === 'neighborhood-flow')!.available, false);
  const empty = createCity(); tutorialAction(empty, 'skip');
  refreshFlowProgress(empty);
  assert.equal(earned(empty), false);
  assert.equal(missionSnapshot(empty).items.find(j => j.id === 'neighborhood-flow')!.available, false);
  tutorialAction(city, 'skip');
  until(city, () => earned(city));
  assert.equal(city.external!.gateway, null, 'flow never supplies outside-traffic consent');
  assert.equal(city.external!.arrivals, 0);
});

test('FLOW-02: good initial geometry earns once from actual returns and keeps its receipt', () => {
  const city = eligibleTown('retimed');
  const geometry = structuredClone({roads: city.roads, buildings: city.buildings, controls: city.controls});
  until(city, () => earned(city));
  const snapshot = flowSnapshot(city, FLOW_HOMES);
  assert.ok(snapshot.homes.every(h => h.returns >= 1));
  assert.deepEqual({roads: city.roads, buildings: city.buildings, controls: city.controls}, geometry);
  assert.equal(city.accidentCount, 0);
  assert.equal(city.missions!.completed.filter(id => id === 'neighborhood-flow').length, 1);
  assert.equal(flowReport(city).earned, true);
  // A later access failure must stay visible without revoking earned recognition.
  place(city, 'closure', 10, 6);
  stepCity(city, 90);
  assert.ok(flowReport(city).accessLimitedHomes > 0);
  assert.equal(earned(city), true);
  assert.equal(earned(reload(city)), true);
});

test('FLOW-02: pause and read-only reports preserve qualification; reload resumes the same simulation', () => {
  const city = eligibleTown('retimed');
  until(city, () => city.missions!.flow?.readySince !== undefined);
  assert.equal(earned(city), false, 'one qualifying sample is not sustained service');
  const frozen = JSON.stringify(city);
  for (let i = 0; i < 20; i++) {
    stepCity(city, 0);
    flowReport(city, {x: 8, y: 6});
    missionSnapshot(city);
  }
  assert.equal(JSON.stringify(city), frozen, 'UI polling and pause never advance observation time');
  const saved = reload(city);
  assert.deepEqual(saved.missions, city.missions);
  until(city, () => earned(city));
  stepCity(saved, city.elapsed - saved.elapsed);
  assert.equal(earned(saved), true);
  assert.deepEqual(saved.missions, city.missions);
  assert.deepEqual(saved.history, city.history);
  assert.deepEqual(saved.trips, city.trips);
});

test('FLOW-02: demolition cannot shrink a target, while rebuilt households can earn it', () => {
  const city = flowTown(); tutorialAction(city, 'skip');
  // Capture the chosen town size before departures, so normal removal guards permit relocation.
  city.missions!.completed.push('open-for-business', 'word-on-the-street');
  refreshFlowProgress(city);
  assert.equal(city.missions!.flow!.targetHomes, FLOW_HOMES);
  const oldHome = city.buildings.find(b => b.kind === 'home' && b.x === 2 && b.y === 4)!;
  place(city, 'bulldoze', oldHome.x, oldHome.y);
  assert.equal(city.buildings.some(b => b.id === oldHome.id), false);
  applyFlowSolution(city, 'retimed'); stepCity(city, 150);
  assert.equal(city.missions!.flow!.targetHomes, FLOW_HOMES);
  assert.equal(earned(city), false);
  assert.equal(flowReport(city).targetHomes, FLOW_HOMES);
  place(city, 'home', oldHome.x, oldHome.y);
  const replacement = city.buildings.find(b => b.kind === 'home' && b.x === oldHome.x && b.y === oldHome.y)!;
  assert.notEqual(replacement.id, oldHome.id);
  until(city, () => earned(city));
  assert.ok(flowSnapshot(city, FLOW_HOMES).homes.find(h => h.homeId === replacement.id)!.returns >= 1);
});

test('FLOW-02: missing or malformed optional flow state preserves old cash and land receipts', () => {
  const city = eligibleTown('retimed'); until(city, () => earned(city));
  assert.equal(claimMissionReward(city, 'open-for-business').claimed, true);
  const receipt = structuredClone(city.missions!), land = structuredClone(city.expansion);
  for (const badFlow of [undefined, null, {targetHomes: -1}, {targetHomes: 9, checkedAt: Infinity}]) {
    const raw = JSON.parse(JSON.stringify(city));
    if (badFlow === undefined) delete raw.missions.flow;
    else raw.missions.flow = badFlow;
    const restored = parseCity(raw); assert.ok(restored);
    assert.deepEqual(restored.missions!.completed, receipt.completed);
    assert.deepEqual(restored.missions!.claimed, receipt.claimed);
    assert.deepEqual(restored.missions!.shoppers, receipt.shoppers);
    assert.deepEqual(restored.expansion, land);
    assert.equal(restored.funds, city.funds);
    assert.equal(claimMissionReward(restored, 'open-for-business').claimed, false);
    assert.equal(earned(restored), true);
    assert.deepEqual(restored.roads, city.roads);
    assert.deepEqual(restored.tutorial, city.tutorial);
    assert.deepEqual(restored.external, city.external);
  }
});

test('FLOW-02: two real queued-town solutions earn at identical demand without changing old receipts', () => {
  const original = flowTown(); stepCity(original, 120);
  assert.equal(claimMissionReward(original, 'open-for-business').claimed, true);
  const frozen = JSON.stringify(original);
  for (const solution of ['retimed', 'destinations'] as const) {
    const city = reload(original);
    const claimed = structuredClone(city.missions!.claimed), land = structuredClone(city.expansion);
    const consent = structuredClone(city.external), paid = structuredClone(city.roadPaid);
    const priorReceipts = [...city.missions!.completed];
    const trips = structuredClone(city.trips);
    applyFlowSolution(city, solution);
    assert.deepEqual(city.trips, trips, 'edits never fabricate committed-trip progress');
    tutorialAction(city, 'skip');
    until(city, () => earned(city));
    assert.equal(city.missions!.flow!.targetHomes, FLOW_HOMES);
    assert.ok(flowSnapshot(city, FLOW_HOMES).homes.every(h => h.returns >= 1));
    assert.deepEqual(city.missions!.claimed, claimed);
    for (const id of priorReceipts) assert.ok(city.missions!.completed.includes(id));
    assert.deepEqual(city.expansion, land);
    assert.deepEqual(city.external, consent);
    for (const [tile, amount] of Object.entries(paid ?? {})) assert.equal(city.roadPaid![tile], amount);
    assert.equal(earned(reload(city)), true);
  }
  assert.equal(JSON.stringify(original), frozen);
});

test('FLOW-02: reports distinguish road waiting, reserved destination capacity and missing access', () => {
  const traffic = flowTown();
  until(traffic, () => flowSnapshot(traffic, FLOW_HOMES).waitingVehicles > 0);
  const queued = flowReport(traffic, {x: 8, y: 6});
  assert.ok(queued.waitingVehicles > 0);
  assert.equal(queued.accessLimitedHomes, 0);
  assert.equal(queued.capacityLimitedHomes, 0);
  assert.ok(queued.selectedRoad, 'selected existing approaches expose their own traffic');
  assert.equal(flowReport(traffic, {x: 0, y: 0}).selectedRoad, null);
  const capacity = createCity(); capacity.funds = 10000;
  for (let x = 0; x <= 14; x++) place(capacity, 'road', x, 6);
  for (let x = 0; x <= 8; x += 2) place(capacity, 'home', x, 4);
  place(capacity, 'store', 11, 4);
  until(capacity, () => flowReport(capacity).capacityLimitedHomes > 0);
  assert.equal(flowReport(capacity).accessLimitedHomes, 0);
  const access = reload(capacity); place(access, 'closure', 10, 6);
  const disconnected = flowReport(access);
  assert.ok(disconnected.accessLimitedHomes > 0);
  assert.equal(disconnected.capacityLimitedHomes, 0);
  assert.ok(disconnected.pendingNeeds > 0, 'unserved needs remain present in access failure');
  const before = JSON.stringify(access);
  for (let i = 0; i < 10; i++) flowReport(access, {x: 10, y: 6});
  assert.equal(JSON.stringify(access), before);
});

test('FLOW-02: mixed shopping and leisure journeys can earn without removing the park', () => {
  let city = createCity(); city.funds = 10000;
  for (let x = 0; x <= 14; x++) place(city, 'road', x, 6);
  for (let x = 0; x <= 10; x += 2) place(city, 'home', x, 4);
  place(city, 'store', 12, 4);
  place(city, 'park', 6, 7, 2);
  assert.equal(city.buildings.filter(b => b.kind === 'home').length, 6);
  assert.equal(city.buildings.filter(b => b.kind === 'store').length, 1);
  assert.equal(city.buildings.filter(b => b.kind === 'park').length, 1);
  tutorialAction(city, 'skip');
  until(city, () => city.history.some(h => h.service?.purpose === 'leisure'));
  city = reload(city);
  until(city, () => earned(city), 360);
  assert.ok(city.history.some(h => h.service?.purpose === 'leisure'));
  assert.ok(flowSnapshot(city, 6).homes.every(h => h.returns >= 1));
  assert.equal(city.buildings.filter(b => b.kind === 'park').length, 1);
});


test('FLOW-02: selected approaches exclude nearby disconnected roads and never grade empty traffic as smooth', () => {
  const city = createCity(); city.funds = 10000;
  for (const x of [2,3,4]) place(city, 'road', x, 6);
  place(city, 'road', 3, 4); // Two tiles away geometrically, but not connected.
  city.trips.push({id:city.nextId++,homeId:0,storeId:0,path:[{x:3,y:4}],progress:0,wait:30,hold:30});
  const quiet = roadFlowSnapshot(city, {x:3,y:6});
  assert.equal(quiet!.vehicles, 0); assert.equal(quiet!.label, 'Quiet');
  place(city, 'road', 3, 5);
  const connected = roadFlowSnapshot(city, {x:3,y:6});
  assert.equal(connected!.vehicles, 1); assert.equal(connected!.waiting, 1);
  assert.equal(connected!.label, 'Jammed');
  place(city, 'closure', 3, 6);
  assert.equal(roadFlowSnapshot(city, {x:3,y:6})!.label, 'Diverted');
});
