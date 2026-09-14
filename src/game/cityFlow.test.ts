import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, place, stepCity, parseCity, entrance, findPath, type City} from './cityModel.ts';
import {flowSnapshot} from './cityFlow.ts';
import {flowTown, applyFlowSolution, measureFlow, FLOW_HOMES} from './fixtures/flowTown.ts';
import {connectExternalCity} from './cityExternal.ts';
import {claimMissionReward} from './cityMissions.ts';
import {parseHistory, MAX_HISTORY, METRICS_WINDOW} from './cityTraffic.ts';

function reload(city: City) {
  const saved = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(saved, 'full city must reload'); return saved;
}
function until(city: City, predicate: () => boolean, seconds = 120) {
  for (let i = 0; i < seconds * 40 && !predicate(); i++) stepCity(city, .025);
  assert.ok(predicate(), `condition not reached at ${city.elapsed}`);
}
function corridor(homes = 1) {
  const city = createCity(); city.funds = 10000;
  for (let x = 0; x <= 14; x++) place(city, 'road', x, 6);
  for (let i = 0; i < homes; i++) place(city, 'home', i*2, 4);
  place(city, 'store', 11, 4);
  return city;
}

test('FLOW-01: road bottleneck and two real solutions from the same queued demand', () => {
  const original = flowTown(); stepCity(original, 120);
  const originalJSON = JSON.stringify(original);
  const outcomes = {} as Record<'baseline'|'retimed'|'destinations', ReturnType<typeof measureFlow>>;
  for (const solution of ['baseline','retimed','destinations'] as const) {
    const city = reload(original);
    const commitments = city.trips.map(t => ({id:t.id, homeId:t.homeId, storeId:t.storeId, purpose:t.purpose, path:t.path, progress:t.progress}));
    applyFlowSolution(city, solution);
    assert.deepEqual(city.households, original.households, 'same needs and clocks before intervention');
    assert.deepEqual(city.trips.map(t => ({id:t.id,homeId:t.homeId,storeId:t.storeId,purpose:t.purpose,path:t.path,progress:t.progress})), commitments,
      'new shops and control edits never redirect committed trips');
    const homes = city.buildings.filter(b => b.kind === 'home');
    assert.equal(homes.length, FLOW_HOMES);
    for (const shop of city.buildings.filter(b => b.kind === 'store')) for (const home of homes) {
      assert.ok(findPath(city, entrance(home), entrance(shop)));
      assert.ok(findPath(city, entrance(shop), entrance(home)), 'spare capacity must actually be usable');
    }
    stepCity(city, 60);
    outcomes[solution] = measureFlow(city);
    assert.equal(city.incidents.length, 0, 'compare congestion, not wreck clearance');
    assert.equal(city.external!.gateway, null);
    assert.equal(city.external!.arrivals, 0);
    assert.equal(outcomes[solution].accessHomeSeconds, 0);
    assert.equal(outcomes[solution].capacityHomeSeconds, 0);
    assert.ok(outcomes[solution].minimumSpareSlots >= 3);
    assert.ok(outcomes[solution].pendingNeedSeconds > 0, 'bounded outstanding needs remain visible');
  }
  assert.equal(JSON.stringify(original), originalJSON, 'isolated comparison preserves its source town');
  const baseline = outcomes.baseline;
  assert.ok(baseline.maximumStoppedSeconds > 14);
  assert.ok(baseline.windows.every(w => !w.ready));
  for (const improved of [outcomes.retimed, outcomes.destinations]) {
    assert.ok(improved.returns > baseline.returns * 1.4);
    assert.ok(improved.visits > baseline.visits * 1.4);
    assert.ok(improved.waitingVehicleSeconds < baseline.waitingVehicleSeconds * .7);
    assert.ok(improved.perHome.every(h => h.returns >= 7), 'every approach and household gets repeated actual returns');
    assert.ok(improved.windows.slice(-2).every(w => w.ready));
  }
});

test('FLOW-01: a preplanned good layout qualifies without a forced jam or rising demand', () => {
  const city = flowTown('retimed'); stepCity(city, 180);
  const geometry = JSON.stringify({roads:city.roads, buildings:city.buildings, controls:city.controls});
  const result = measureFlow(city);
  assert.equal(result.readySamples, 180);
  assert.ok(result.windows.every(w => w.ready && w.requiredHomes === FLOW_HOMES));
  assert.equal(JSON.stringify({roads:city.roads,buildings:city.buildings,controls:city.controls}), geometry);
  assert.equal(city.accidentCount, 0);
});

test('FLOW-01: full queued-save reload, pause, receipts and later recovery preserve the town', () => {
  const city = flowTown(); stepCity(city, 120);
  claimMissionReward(city, 'open-for-business');
  const saved = reload(city);
  assert.deepEqual(saved, city, 'new attribution preserves full saved trip state');
  const before = JSON.stringify(saved), snapshot = flowSnapshot(saved, FLOW_HOMES);
  for (let i = 0; i < 100; i++) { stepCity(saved, 0); assert.deepEqual(flowSnapshot(saved, FLOW_HOMES), snapshot); }
  assert.equal(JSON.stringify(saved), before, 'observations and pause cannot mutate progress or time');
  stepCity(city, 30); stepCity(saved, 30);
  assert.deepEqual(saved.history, city.history); assert.deepEqual(saved.trips, city.trips);
  assert.deepEqual(flowSnapshot(saved, FLOW_HOMES), flowSnapshot(city, FLOW_HOMES));
  assert.deepEqual(saved.missions!.claimed, ['open-for-business']);
  const receipts = structuredClone({missions:saved.missions, expansion:saved.expansion, tutorial:saved.tutorial, external:saved.external, roadPaid:saved.roadPaid});
  saved.funds = 0;
  // No land permit or building site is needed for this solution, even at maximum map bounds.
  saved.map = {x:0,y:0,width:64,height:64};
  const roads = structuredClone(saved.roads), buildings = structuredClone(saved.buildings);
  applyFlowSolution(saved, 'retimed'); assert.equal(saved.funds, 0);
  stepCity(saved, 180);
  assert.ok(flowSnapshot(saved, FLOW_HOMES).ready);
  assert.deepEqual(saved.roads, roads); assert.deepEqual(saved.buildings, buildings);
  assert.deepEqual({missions:saved.missions, expansion:saved.expansion, tutorial:saved.tutorial, external:saved.external, roadPaid:saved.roadPaid}, receipts);
  assert.ok(reload(saved));
});

test('FLOW-01: completed shopping without a route home is not a returned journey', () => {
  const city = corridor();
  until(city, () => city.trips.some(t => t.phase === 'visiting'));
  place(city, 'closure', 8, 6);
  until(city, () => city.trips.some(t => t.rewarded));
  let snapshot = flowSnapshot(city, 1);
  assert.equal(snapshot.visits, 1); assert.equal(snapshot.returns, 0); assert.equal(snapshot.ready, false);
  assert.equal(snapshot.homes[0].parkedAwaitingReturn, true);
  assert.equal(snapshot.accessLimitedHomes, 1);
  const saved = reload(city); stepCity(saved, 25);
  snapshot = flowSnapshot(saved, 1);
  assert.ok(snapshot.longestStop >= 25); assert.equal(snapshot.waitingVehicles, 1);
  assert.equal(snapshot.returns, 0); assert.equal(snapshot.visits, 1);
  place(saved, 'closure', 8, 6);
  until(saved, () => flowSnapshot(saved, 1).ready);
  assert.ok(flowSnapshot(saved, 1).returns >= 2);
});

test('FLOW-01: full reachable stores, disconnected routes and traffic are distinct', () => {
  const capacity = corridor(5);
  until(capacity, () => flowSnapshot(capacity, 5).capacityLimitedHomes > 0);
  assert.equal(flowSnapshot(capacity, 5).accessLimitedHomes, 0);
  const access = corridor(1); place(access, 'bulldoze', 8, 6); stepCity(access, 4);
  const snapshot = flowSnapshot(access, 1);
  assert.equal(snapshot.accessLimitedHomes, 1); assert.equal(snapshot.capacityLimitedHomes, 0);
  assert.equal(snapshot.trafficLimitedHomes, 0); assert.equal(snapshot.returns, 0);
  assert.ok(snapshot.pendingNeeds > 0);
  const traffic = flowTown();
  until(traffic, () => flowSnapshot(traffic, FLOW_HOMES).trafficLimitedHomes > 0);
  assert.equal(flowSnapshot(traffic, FLOW_HOMES).capacityLimitedHomes, 0);
  assert.equal(flowSnapshot(traffic, FLOW_HOMES).accessLimitedHomes, 0);
});

test('FLOW-01: averages cannot conceal a disconnected household; demolition retains the fixed target', () => {
  const city = corridor(); stepCity(city, 90);
  assert.ok(flowSnapshot(city, 1).ready);
  const newcomer = city.nextId; place(city, 'home', 0, 0); stepCity(city, 60);
  const snapshot = flowSnapshot(city, 2);
  assert.ok(snapshot.returns > 0 && snapshot.averageCompletedJourneySeconds !== null);
  assert.equal(snapshot.homesWithoutReturn, 1); assert.equal(snapshot.accessLimitedHomes, 1); assert.equal(snapshot.ready, false);
  place(city, 'bulldoze', 0, 0);
  assert.equal(flowSnapshot(city, 2).missingHomes, 1); assert.equal(flowSnapshot(city, 2).ready, false);
  place(city, 'home', 2, 4);
  const replacement = city.buildings.find(b => b.kind === 'home' && b.id > newcomer)!;
  assert.ok(replacement);
  until(city, () => flowSnapshot(city, 2).ready);
  assert.ok(flowSnapshot(city, 2).homes.find(h => h.homeId === replacement.id)!.returns >= 2,
    'legitimate rebuilding qualifies via new service, without permanent attachment to demolished IDs');
});

test('FLOW-01: legacy and malformed attribution preserve saves without inventing local service', () => {
  const city = corridor(); stepCity(city, 60);
  const legacy = structuredClone(city);
  for (const t of legacy.trips) { delete t.startedAt; delete t.visitedAt; }
  for (const h of legacy.history) delete h.service;
  const restored = reload(legacy);
  assert.equal(flowSnapshot(restored, 1).returns, 0);
  assert.equal(flowSnapshot(restored, 1).ready, false);
  until(restored, () => flowSnapshot(restored, 1).ready);
  const malformed = structuredClone(city);
  malformed.history[0].service = {homeId:1,purpose:'shopping',visitedAt:NaN};
  malformed.trips[0].startedAt = city.elapsed + 1000;
  const loaded = parseCity(malformed); assert.ok(loaded);
  assert.equal(loaded.history[0].service, undefined); assert.equal(loaded.trips[0].startedAt, undefined);
  assert.deepEqual(loaded.roads, city.roads); assert.equal(loaded.funds, city.funds);
});

test('FLOW-01: leisure and outside completions never masquerade as household shopping returns', () => {
  const city = corridor(); place(city, 'park', 6, 7, 2); stepCity(city, 180);
  const shopping = city.history.filter(h => h.service?.purpose === 'shopping').length;
  const leisure = city.history.filter(h => h.service?.purpose === 'leisure').length;
  assert.ok(shopping > 0 && leisure > 0);
  assert.equal(flowSnapshot(city, 1).returns, shopping);
  assert.equal(flowSnapshot(city, 1, 'leisure').returns, leisure);
  const outside = createCity(); outside.funds = 10000;
  for (let x=0;x<=14;x++) place(outside, 'road', x, 6);
  place(outside, 'store', 11, 4); connectExternalCity(outside, {x:0,y:6}); stepCity(outside, 90);
  assert.ok(outside.completed > 0); assert.ok(outside.history.every(h => !h.service));
  assert.equal(flowSnapshot(outside, 1).returns, 0); assert.equal(flowSnapshot(outside, 1).state, 'measuring');
});

test('FLOW-01: bounded history expires quietly and unknown samples cannot earn a grade', () => {
  const city = corridor(); stepCity(city, 60);
  const recent = structuredClone(city.history);
  assert.ok(recent.length > 0);
  assert.deepEqual(parseHistory(recent, city.elapsed + METRICS_WINDOW + 1), []);
  assert.equal(parseHistory(Array.from({length:MAX_HISTORY+1}, () => ({at:0,wait:0})), 0), null);
  const empty = createCity(), before = JSON.stringify(empty);
  assert.equal(flowSnapshot(empty, 1).ready, false);
  assert.equal(flowSnapshot(empty, 1).averageCompletedJourneySeconds, null);
  assert.equal(JSON.stringify(empty), before);
});

test('FLOW-01: long leisure journeys cannot starve shopping, including after reload', () => {
  let city = corridor(); place(city, 'park', 6, 7, 2);
  // This roundtrip lasts longer than leisure's 16-second refill. Previously every
  // capped-demand tie picked leisure, so shopping stopped after the initial visit.
  until(city, () => city.households[0]?.lastDeparturePurpose === 'leisure');
  const committed = structuredClone(city.trips[0]);
  city = reload(city);
  assert.deepEqual(city.trips[0], committed);
  assert.equal(city.households[0].lastDeparturePurpose, 'leisure');
  until(city, () => city.households[0].lastDeparturePurpose === 'shopping');
  for (let cycle = 0; cycle < 3; cycle++) {
    stepCity(city, 60);
    assert.ok(city.history.some(h => h.service?.purpose === 'shopping'), 'shopping keeps completing');
    assert.ok(city.history.some(h => h.service?.purpose === 'leisure'), 'leisure keeps completing');
    city = reload(city);
  }
});
