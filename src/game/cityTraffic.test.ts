import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, place, stepCity, parseCity, expandCity } from './cityModel.ts';
import type { City, Point, Trip } from './cityModel.ts';
import {
  trafficMetrics, signalAxis, controlAt, isJunctionTile, roadIndex,
  TRAFFIC_TICK, STOP_DWELL, CAUTION_DWELL, METRICS_WINDOW, MAX_HISTORY,
} from './cityTraffic.ts';

/** Traffic and persistence fixtures fund their geometry independently of the starter economy. */
function createTestCity() {
  const city = createCity();
  city.funds = 10000;
  return city;
}

const cell = (t: Trip) => Math.min(t.path.length - 1, Math.max(0, Math.ceil(t.progress - 0.5 - 1e-9)));
const dir = (a: Point, b: Point) => (b.x > a.x ? 'E' : b.x < a.x ? 'W' : b.y > a.y ? 'S' : 'N');
const axis = (d: string) => (d === 'E' || d === 'W' ? 'ew' : 'ns');

type Body = { id: number; tile: string; enter: string; exit: string; junction: boolean; reversing: boolean };
/**
 * Parked visitors have left the carriageway and a wreck is scenery its incident owns,
 * so neither is a moving body the lane rules apply to.
 */
const onRoad = (t: Trip) => (t.phase ?? 'legacy') !== 'visiting' && (t.phase ?? 'legacy') !== 'crashed';
function bodies(city: City): Body[] {
  const junctions = roadIndex(city).junctions;
  return city.trips.filter(onRoad).map(t => {
    const i = cell(t), p = t.path[i];
    const prev = i > 0 ? t.path[i - 1] : null, next = i < t.path.length - 1 ? t.path[i + 1] : null;
    const enter = prev ? dir(prev, p) : next ? dir(p, next) : 'N';
    return { id: t.id, tile: `${p.x},${p.y}`, enter, exit: next ? dir(p, next) : enter,
      junction: junctions.has(`${p.x},${p.y}`), reversing: !!prev && !!next && prev.x === next.x && prev.y === next.y };
  });
}
/**
 * A tile is a two-way carriageway: opposing lanes may share it. At a junction only opposing
 * straight-through movements are compatible, and a vehicle turning back never shares at all.
 */
function overlaps(city: City): string[] {
  const found: string[] = [];
  const list = bodies(city);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.tile !== b.tile) continue;
    const straight = a.enter === a.exit && b.enter === b.exit;
    const opposed = axis(a.exit) === axis(b.exit) && a.exit !== b.exit;
    const shareable = !a.reversing && !b.reversing && a.exit !== b.exit && (a.junction ? straight && opposed : true);
    if (!shareable) found.push(`${a.id} and ${b.id} share ${a.tile} (${a.enter}${a.exit} vs ${b.enter}${b.exit})`);
  }
  return found;
}
/** Runs the city while asserting the movement model holds on every tick. */
function run(city: City, seconds: number, watch?: (c: City) => void): void {
  for (let i = 0; i < Math.round(seconds / TRAFFIC_TICK); i++) {
    stepCity(city, TRAFFIC_TICK);
    const bad = overlaps(city);
    assert.equal(bad.length, 0, `t=${city.elapsed.toFixed(3)}: ${bad.join('; ')}`);
    watch?.(city);
  }
}

/** Straight west-east corridor with a stub that makes (8,6) a real junction. */
function corridor(homes: number[] = [0, 2]): City {
  const c = createTestCity();
  for (let x = 0; x <= 14; x++) place(c, 'road', x, 6);
  place(c, 'road', 8, 5);
  for (const x of homes) place(c, 'home', x, 4, 0); // entrance x,6
  place(c, 'store', 11, 4, 0); // entrance 12,6
  return c;
}

/** Busy east-west arm and a lighter north arm meeting at the junction (8,6). */
function tJunction(): City {
  const c = createTestCity();
  for (let x = 0; x <= 14; x++) place(c, 'road', x, 6);
  for (let y = 0; y <= 5; y++) place(c, 'road', 8, y);
  for (const x of [0, 2, 4, 6]) place(c, 'home', x, 4, 0); // entrances 0,6 2,6 4,6 6,6
  for (const x of [0, 2, 4]) place(c, 'home', x, 7, 2); // entrances 1,6 3,6 5,6
  for (const y of [0, 2, 4]) place(c, 'home', 9, y, 1); // entrances 8,0 8,2 8,4
  place(c, 'store', 11, 4, 0); // entrance 12,6
  return c;
}

test('a junction needs three connected roads, and stops toggle while signals cycle presets', () => {
  const c = corridor();
  assert.equal(place(c, 'stop', 3, 6), 'A junction needs at least three connected roads.');
  assert.equal(place(c, 'stop', 3, 3), 'Place traffic control on a road tile.');
  assert.equal(c.controls.length, 0);
  assert.equal(isJunctionTile(c, { x: 8, y: 6 }), true);
  assert.match(place(c, 'stop', 8, 6), /All-way stop placed/);
  assert.deepEqual(c.controls, [{ x: 8, y: 6, kind: 'stop', preset: 'balanced', paid: 25 }]);
  assert.equal(place(c, 'stop', 8, 6), 'Stop sign removed.');
  assert.equal(c.controls.length, 0);
  assert.match(place(c, 'signal', 8, 6), /balanced timing/);
  assert.equal(c.controls[0].preset, 'balanced');
  assert.match(place(c, 'signal', 8, 6), /favour north-south/);
  assert.equal(c.controls[0].preset, 'ns');
  place(c, 'signal', 8, 6); assert.equal(c.controls[0].preset, 'ew');
  place(c, 'signal', 8, 6); assert.equal(c.controls[0].preset, 'balanced');
  // Switching tools replaces the control in place rather than stacking two authorities.
  assert.match(place(c, 'stop', 8, 6), /replaced by an all-way stop/);
  assert.deepEqual(c.controls, [{ x: 8, y: 6, kind: 'stop', preset: 'balanced', paid: 25 }]);
  assert.match(place(c, 'signal', 8, 6), /replaced by a traffic light/);
  assert.equal(c.controls[0].kind, 'signal');
  assert.equal(c.controls.length, 1);
});

test('bulldoze clears a control before its road, and removing roads prunes orphaned controls', () => {
  const c = corridor();
  place(c, 'signal', 8, 6);
  const funds = c.funds;
  assert.equal(place(c, 'bulldoze', 8, 6), 'Traffic light removed. Bulldoze again to remove the road.');
  assert.equal(c.controls.length, 0);
  assert.equal(c.roads.some(p => p.x === 8 && p.y === 6), true, 'the road survives the first bulldoze');
  assert.equal(c.funds, funds+75, 'removing a purchased light refunds its actual payment');
  place(c, 'stop', 8, 6);
  assert.equal(place(c, 'bulldoze', 8, 5), 'Removed. Full $20 refund.');
  assert.deepEqual(c.controls, [], 'the stub is gone, so (8,6) is no longer a junction');
  assert.equal(place(c, 'stop', 8, 6), 'A junction needs at least three connected roads.');
});

test('adjoining junction tiles are one intersection with one governing control', () => {
  const c = createTestCity();
  for (let x = 3; x <= 8; x++) place(c, 'road', x, 5);
  for (const x of [5, 6]) for (const y of [4, 6]) place(c, 'road', x, y);
  assert.equal(isJunctionTile(c, { x: 5, y: 5 }), true);
  assert.equal(isJunctionTile(c, { x: 6, y: 5 }), true);
  // A light on the far tile still gates traffic entering the complex from the near tile.
  place(c, 'signal', 6, 5);
  c.trips.push({ id: 1, homeId: 2, storeId: 3, progress: 0, wait: 0, hold: 0,
    path: Array.from({ length: 6 }, (_, i) => ({ x: 3 + i, y: 5 })) });
  run(c, 2);
  assert.equal(signalAxis(c, c.controls[0]), 'ns', 'the east-west approach is red');
  assert.equal(c.trips[0].progress, 1.5, 'the car halts on the edge of the intersection, not inside it');
  assert.equal(trafficMetrics(c).waiting, 1);
  run(c, 14);
  assert.equal(c.completed, 1, 'the green phase releases the waiting car');
  // Tapping any tile in the same intersection edits the one control without moving its anchor.
  place(c, 'signal', 5, 5);
  assert.equal(c.controls.length, 1);
  assert.deepEqual(c.controls[0], { x: 6, y: 5, kind: 'signal', preset: 'ns', paid: 75 });
  assert.match(place(c, 'stop', 6, 5), /replaced by an all-way stop/);
  assert.deepEqual(c.controls, [{ x: 6, y: 5, kind: 'stop', preset: 'balanced', paid: 25 }]);
  assert.equal(place(c, 'stop', 5, 5), 'Stop sign removed.');
  assert.deepEqual(c.controls, []);
});

test('vehicles queue in one lane without overlapping, and opposing traffic is independent', () => {
  const c = tJunction();
  let sharedJunction = 0, queued = 0;
  run(c, 90, city => {
    const list = bodies(city);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      // The overlap scan already rejects every unsafe pairing, so any sharing here is opposing flow.
      if (a.tile === b.tile && a.junction) sharedJunction++;
    }
    // Followers in one lane keep a whole tile between them and are the ones that wait.
    const lanes = new Map<string, number>();
    for (const b of list) {
      assert.equal(lanes.has(`${b.tile}#${b.exit}`), false, `two vehicles in lane ${b.tile}#${b.exit}`);
      lanes.set(`${b.tile}#${b.exit}`, b.id);
    }
    queued += city.trips.filter(t => t.hold > 0).length;
  });
  assert.ok(c.completed > 0, 'trips complete on the shared corridor');
  assert.ok(sharedJunction > 0, 'opposing straight movements pass through the junction together');
  assert.ok(queued > 0, 'contended demand really does form queues');
});

test('downstream clearance: nothing ever stops inside a junction, and cars wait beside it instead', () => {
  const c = tJunction();
  place(c, 'signal', 8, 6);
  let stalledInBox = 0, waitedBeside = 0;
  run(c, 120, city => {
    const junctions = roadIndex(city).junctions;
    for (const t of city.trips) {
      const p = t.path[cell(t)];
      if (t.hold <= 0) continue;
      if (junctions.has(`${p.x},${p.y}`)) stalledInBox++;
      else if (Math.abs(p.x - 8) + Math.abs(p.y - 6) === 1) waitedBeside++;
    }
  });
  assert.equal(stalledInBox, 0, 'a vehicle only enters a junction when it can clear it, so it never blocks the box');
  assert.ok(waitedBeside > 0, 'blocked vehicles hold on the approach tile');
  assert.ok(c.completed >= 4, `crossing demand still clears the junction (completed ${c.completed})`);
});

test('an all-way stop makes a lone car halt, which costs time an empty junction would not', () => {
  const plain = corridor([2]), stopped = corridor([2]);
  place(stopped, 'stop', 8, 6);
  run(plain, 60); run(stopped, 60);
  assert.equal(trafficMetrics(plain).averageWait, 0, 'an empty uncontrolled corridor never stops a car');
  // The roundtrip crosses the junction twice, so the sign costs two full dwells per completed trip.
  assert.ok(trafficMetrics(stopped).averageWait >= 2 * STOP_DWELL - 1e-9,
    `each crossing pays a full dwell (${trafficMetrics(stopped).averageWait}s)`);
  assert.ok(stopped.completed > 0 && plain.completed > 0, 'both layouts still deliver trips');
});

test('an all-way stop serves every approach; no arm is starved', () => {
  const c = tJunction();
  place(c, 'stop', 8, 6);
  run(c, 90);
  const west = c.buildings.filter(b => b.kind === 'home' && b.y >= 4 && b.x <= 6).map(b => b.id);
  const north = c.buildings.filter(b => b.kind === 'home' && b.x === 9).map(b => b.id);
  assert.equal(north.length, 3);
  const served = new Set(c.trips.map(t => t.homeId));
  assert.ok(c.completed > 0);
  // Every home either has a live trip or has already completed one, so nobody is stuck forever.
  for (const id of [...west, ...north]) {
    const trip = c.trips.find(t => t.homeId === id);
    assert.ok(!trip || trip.hold < 30, `home ${id} waited ${trip?.hold}s at a stop sign`);
  }
  assert.ok(served.size > 0);
});

test('signals run two phases with an all-red clearance and shift green time by preset', () => {
  const c = corridor();
  place(c, 'signal', 8, 6);
  const control = controlAt(c, { x: 8, y: 6 })!;
  const sample = (preset: 'balanced' | 'ns' | 'ew', seconds: number) => {
    control.preset = preset;
    const counts = { ns: 0, ew: 0, red: 0 };
    for (let i = 0; i < seconds / TRAFFIC_TICK; i++) { c.elapsed = i * TRAFFIC_TICK; counts[signalAxis(c, control)]++; }
    return counts;
  };
  const balanced = sample('balanced', 22); // 10s + 1s clearance each way
  assert.deepEqual(balanced, { ns: 400, ew: 400, red: 80 }, 'balanced splits green evenly around the clearance');
  const favourNs = sample('ns', 23), favourEw = sample('ew', 23);
  assert.ok(favourNs.ns > favourNs.ew && favourEw.ew > favourEw.ns);
  assert.equal(favourNs.ns, favourEw.ew, 'the presets are mirror images of each other');
  assert.equal(favourNs.red, favourEw.red, 'clearance never changes with the preset');
  c.elapsed = 0; assert.equal(signalAxis(c, control), 'ns');
  control.preset = 'balanced';
  c.elapsed = 10; assert.equal(signalAxis(c, control), 'red', 'green never runs straight into the conflicting phase');
  c.elapsed = 11; assert.equal(signalAxis(c, control), 'ew');
  c.elapsed = 21; assert.equal(signalAxis(c, control), 'red');
  // A stop sign has no green axis of its own.
  assert.equal(signalAxis(c, { x: 8, y: 6, kind: 'stop', preset: 'balanced', paid: 25 }), 'red');
});

test('a red phase holds cars at the stop line and green releases them', () => {
  const c = corridor();
  place(c, 'signal', 8, 6);
  const control = controlAt(c, { x: 8, y: 6 })!;
  control.preset = 'ns'; // the east-west corridor gets the short green
  let heldAtLine = 0, crossedOnRed = 0;
  run(c, 60, city => {
    for (const t of city.trips) {
      const i = cell(t);
      if (t.path[i].x === 8 && t.path[i].y === 6 && signalAxis(city, control) === 'ns') crossedOnRed++;
      if (t.hold > 0 && Math.abs(t.path[i].x - 8) === 1 && t.path[i].y === 6) heldAtLine++;
    }
  });
  assert.ok(heldAtLine > 0, 'cars visibly wait beside the junction instead of driving through');
  assert.equal(crossedOnRed, 0, 'no east-west car is inside the junction during a north-south green');
  assert.ok(c.completed > 0, 'the corridor still clears');
});

test('same demand, one preset change: favouring the busy axis measurably improves traffic', () => {
  const measure = (preset: 'ns' | 'ew') => {
    const c = tJunction();
    place(c, 'signal', 8, 6);
    controlAt(c, { x: 8, y: 6 })!.preset = preset;
    run(c, 180);
    return { ...trafficMetrics(c), completed: c.completed };
  };
  const busy = measure('ew'); // seven homes approach on the east-west arm, three on the north arm
  const wrong = measure('ns');
  assert.ok(busy.completed > wrong.completed,
    `favouring the busy axis completes more trips (${busy.completed} vs ${wrong.completed})`);
  assert.ok(busy.averageWait < wrong.averageWait,
    `favouring the busy axis cuts average wait (${busy.averageWait}s vs ${wrong.averageWait}s)`);
  assert.ok(busy.throughput >= wrong.throughput);
});

test('metrics report zeros without samples, then track waiting, wait time, and throughput', () => {
  const empty = createTestCity();
  assert.deepEqual(trafficMetrics(empty), { waiting: 0, averageWait: 0, throughput: 0 });
  const c = tJunction();
  place(c, 'stop', 8, 6);
  let peakWaiting = 0;
  run(c, 40, city => { peakWaiting = Math.max(peakWaiting, trafficMetrics(city).waiting); });
  const m = trafficMetrics(c);
  assert.equal(m.waiting, c.trips.filter(t => t.hold > 0).length, 'waiting counts exactly the stopped cars');
  assert.ok(peakWaiting > 0, 'a contested stop junction holds cars');
  assert.ok(m.averageWait > 0 && m.throughput > 0);
  assert.equal(m.throughput, c.history.length);
  // The window is the last 60 simulation seconds and history stays bounded.
  run(c, 120);
  assert.ok(c.history.length <= MAX_HISTORY);
  assert.ok(c.history.every(h => h.at > c.elapsed - METRICS_WINDOW));
  assert.equal(trafficMetrics(c).throughput, c.history.length);
  c.elapsed += METRICS_WINDOW + 1;
  assert.deepEqual(trafficMetrics(c).throughput, 0);
  assert.equal(trafficMetrics(c).averageWait, 0, 'no recent samples reads as zero, not as a stale average');
});

test('queued traffic is identical across frame chunking and survives a save reload', () => {
  const a = tJunction(), b = tJunction();
  place(a, 'signal', 8, 6); place(b, 'signal', 8, 6);
  stepCity(a, 45);
  for (let i = 0; i < 45 * 60; i++) stepCity(b, 1 / 60);
  assert.equal(a.completed, b.completed);
  assert.equal(a.trips.length, b.trips.length);
  assert.deepEqual(a.trips.map(t => t.progress), b.trips.map(t => t.progress));
  assert.deepEqual(a.trips.map(t => t.hold), b.trips.map(t => t.hold));
  assert.equal(a.funds, b.funds);
  // A reload continues the same queues, controls, and history.
  const restored = parseCity(JSON.parse(JSON.stringify(a)));
  assert.ok(restored);
  assert.deepEqual(restored, a);
  stepCity(a, 30); stepCity(restored, 30);
  assert.deepEqual(restored, a);
});

test('saves missing controls, history, queue or town-demand metadata still load', () => {
  const c = tJunction();
  place(c, 'stop', 8, 6);
  stepCity(c, 20);
  const legacy = JSON.parse(JSON.stringify(c)) as Record<string, unknown>;
  delete legacy.controls; delete legacy.history; delete legacy.tickClock;
  delete legacy.households; delete legacy.closures; delete legacy.incidents; delete legacy.risks;
  delete legacy.accidentCount; delete legacy.rescuedCount; delete legacy.fatalities;
  for (const t of legacy.trips as Trip[]) { delete (t as Partial<Trip>).wait; delete (t as Partial<Trip>).hold; }
  const loaded = parseCity(legacy);
  assert.ok(loaded, 'an old save loads instead of being discarded');
  assert.deepEqual(loaded.controls, []);
  assert.deepEqual(loaded.history, []);
  assert.deepEqual([loaded.households, loaded.closures, loaded.incidents, loaded.risks], [[], [], [], []]);
  assert.deepEqual([loaded.accidentCount, loaded.rescuedCount, loaded.fatalities], [0, 0, 0]);
  assert.equal(loaded.tickClock, 0);
  assert.ok(loaded.trips.every(t => t.wait === 0 && t.hold === 0));
  assert.equal(loaded.roads.length, c.roads.length);
  assert.equal(loaded.trips.length, c.trips.length);
  stepCity(loaded, 30);
  assert.ok(loaded.completed > c.completed, 'the migrated city keeps running');
});

test('saved controls and history are validated, and orphaned controls are dropped on load', () => {
  const c = corridor();
  place(c, 'signal', 8, 6);
  stepCity(c, 70);
  assert.ok(c.history.length > 0);
  for (const mutate of [
    (v: City) => { v.controls[0].kind = 'yield' as never; },
    (v: City) => { v.controls[0].preset = 'fast' as never; },
    (v: City) => { v.controls[0].x = 1.5; },
    (v: City) => { v.controls.push({ ...v.controls[0] }); },
    (v: City) => { v.controls = 'none' as never; },
    (v: City) => { v.history[0].wait = NaN; },
    (v: City) => { v.history[0].at = v.elapsed + 10; },
    (v: City) => { v.history = {} as never; },
    (v: City) => { v.trips[0].wait = -1; },
    (v: City) => { v.trips[0].hold = v.trips[0].wait + 5; },
    (v: City) => { v.tickClock = TRAFFIC_TICK; },
  ]) {
    const copy = structuredClone(c); mutate(copy);
    assert.equal(parseCity(copy), null);
  }
  // A control whose junction no longer exists is dropped rather than rejecting the whole save.
  const orphan = structuredClone(c);
  orphan.roads = orphan.roads.filter(p => !(p.x === 8 && p.y === 5));
  const loaded = parseCity(orphan);
  assert.ok(loaded);
  assert.deepEqual(loaded.controls, []);
  // Records older than the metric window are pruned on load rather than kept forever.
  const stale = structuredClone(c);
  stale.history.unshift({ at: 0, wait: 1 });
  assert.equal(parseCity(stale)?.history.some(h => h.at === 0), false);
});

test('a dense grid of demand drains without deadlock or vanished trips', () => {
  const c = createTestCity();
  expandCity(c, 'east'); expandCity(c, 'south');
  for (let y = 2; y <= 14; y += 4) for (let x = 0; x <= 20; x++) place(c, 'road', x, y);
  for (let x = 4; x <= 20; x += 4) for (let y = 2; y <= 14; y++) place(c, 'road', x, y);
  for (const [x, y] of [[0, 0], [2, 0], [8, 0], [10, 0], [14, 0], [16, 0]]) place(c, 'home', x, y, 0);
  for (const [x, y] of [[0, 12], [2, 12], [8, 12], [10, 12], [14, 12], [16, 12]]) place(c, 'home', x, y, 0);
  place(c, 'store', 17, 4, 0);
  place(c, 'store', 5, 8, 0);
  for (const [x, y] of [[4, 6], [8, 6], [12, 6], [4, 10], [8, 10], [12, 10]]) place(c, 'signal', x, y);
  place(c, 'stop', 16, 6); place(c, 'stop', 16, 10);
  assert.ok(c.controls.length >= 6, 'the grid really is controlled');
  assert.ok(c.buildings.filter(b => b.kind === 'home').length >= 8);
  run(c, 240);
  assert.ok(c.completed >= 8, `queued traffic keeps clearing (completed ${c.completed})`);
  assert.ok(c.trips.every(t => t.hold < 60), 'no vehicle is stuck behind a permanent block');
  assert.ok(trafficMetrics(c).throughput > 0);
});

test('a responder drives faster than traffic but obeys the same tile and occupancy limits', async () => {
  const { entrance, findPath } = await import('./cityModel.ts');
  const c = tJunction();
  place(c, 'hospital', 10, 7, 2); // entrance 11,6, on the shopping corridor
  const hospital = c.buildings.find(b => b.kind === 'hospital')!;
  const path = findPath(c, entrance(hospital), { x: 0, y: 6 })!;
  assert.ok(path.length > 10);
  const id = c.nextId++;
  c.trips.push({ id, homeId: 0, storeId: 0, progress: 0, wait: 0, hold: 0, path, phase: 'outbound',
    service: 'ems', stationId: hospital.id, speed: 3, target: { x: 0, y: 6 } });
  let previous = 0, biggestStep = 0, sawEmergencySpeed = false;
  // The shared harness already fails the run if any two bodies ever share a tile unsafely.
  run(c, 30, city => {
    const responder = city.trips.find(t => t.id === id);
    if (!responder) return;
    const moved = responder.progress - previous;
    if (moved > 0) biggestStep = Math.max(biggestStep, moved);
    if (moved > 2 * TRAFFIC_TICK + 1e-9) sawEmergencySpeed = true;
    previous = responder.progress;
  });
  assert.ok(sawEmergencySpeed, 'a responder really is faster than an ordinary car');
  assert.ok(biggestStep <= 3 * TRAFFIC_TICK + 1e-9, `it never exceeds its own speed (${biggestStep} tiles/tick)`);
  assert.ok(biggestStep < 1, 'and never crosses more than one tile boundary in a tick');
  assert.equal(c.history.every(h => h.wait >= 0), true);
});

test('an uncontrolled junction stays safe and costs a cautious look only after stopping', () => {
  const c = tJunction();
  let sawCaution = false;
  run(c, 90, city => {
    for (const t of city.trips) if (t.hold >= CAUTION_DWELL) sawCaution = true;
  });
  assert.ok(c.completed > 0, 'uncontrolled crossing traffic still completes trips');
  assert.ok(sawCaution, 'contended entries pay a cautious pause instead of driving through');
  assert.equal(c.controls.length, 0);
});

test('control prices are atomic, replacements refund payment, timing is free and old controls cannot mint cash',()=>{
 const c=corridor();c.funds=24;const before=structuredClone(c);place(c,'stop',8,6);assert.deepEqual(c,before,'insufficient funds leaves town unchanged');
 c.funds=25;place(c,'stop',8,6);assert.equal(c.funds,0);assert.equal(c.controls[0].paid,25);
 const stopped=structuredClone(c);place(c,'signal',8,6);assert.deepEqual(c,stopped,'replacement needs the net upgrade cost');
 c.funds=50;place(c,'signal',8,6);assert.equal(c.funds,0);assert.equal(c.controls[0].paid,75);
 place(c,'signal',8,6);assert.equal(c.funds,0);assert.equal(c.controls[0].preset,'ns','timing remains editable with no funds');
 const loaded=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(loaded);place(loaded,'stop',8,6);assert.equal(loaded.funds,50);place(loaded,'stop',8,6);assert.equal(loaded.funds,75);
 delete c.controls[0].paid;const legacy=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(legacy);place(legacy,'bulldoze',8,6);assert.equal(legacy.funds,0,'historically free controls refund zero');
 c.controls[0].paid=-1;assert.equal(parseCity(JSON.parse(JSON.stringify(c))),null);
});
