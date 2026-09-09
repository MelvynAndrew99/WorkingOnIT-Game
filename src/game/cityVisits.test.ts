import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createCity, place, stepCity, parseCity, findPath, entrance, buildingStatus, demandSummary, income,
  COSTS, STARTING_FUNDS, TRAFFIC_TICK,
} from './cityModel.ts';
import type { Building, City, Trip } from './cityModel.ts';
import {
  VISIT_SECONDS, VISITOR_CAPACITY, SHOP_INCOME, LEISURE_BONUS, LEISURE_BENEFIT_SECONDS,
  LEISURE_INTERVAL, SHOP_CAP, LEISURE_CAP,
} from './cityVisits.ts';

const phaseOf = (t: Trip) => t.phase ?? 'legacy';
function run(city: City, seconds: number, watch?: (c: City) => void): void {
  for (let i = 0; i < Math.round(seconds / TRAFFIC_TICK); i++) { stepCity(city, TRAFFIC_TICK); watch?.(city); }
}
/** Advance until the town reaches a state, so a test never depends on exact departure arithmetic. */
function runUntil(city: City, ready: (c: City) => boolean, limit = 120): void {
  for (let i = 0; i < Math.round(limit / TRAFFIC_TICK); i++) {
    if (ready(city)) return;
    stepCity(city, TRAFFIC_TICK);
  }
  assert.fail(`the town never reached the expected state within ${limit}s`);
}
const parkedAt = (c: City) => c.trips.find(t => phaseOf(t) === 'visiting');
const find = (c: City, kind: Building['kind'], index = 0) => c.buildings.filter(b => b.kind === kind)[index];
/** Traffic fixtures need room to build; they are not new-town budget tests. */
function funded(): City {
  const c = createCity();
  c.funds = 10000;
  return c;
}

/** Homes along a straight corridor, all shopping at one store on its east end. */
function shopTown(homes: number[]): City {
  const c = funded();
  for (let x = 0; x <= 12; x++) place(c, 'road', x, 6);
  for (const x of homes) place(c, 'home', x, 4, 0); // entrance x,6
  place(c, 'store', 10, 4, 0); // entrance 11,6
  return c;
}

test('a visit occupies a reserved slot, and capacity is never oversubscribed by inbound cars', () => {
  const c = shopTown([0, 2, 4, 6, 8]);
  const store = find(c, 'store');
  let peak = 0, sawFull = false, sawUnmet = false;
  run(c, 120, city => {
    const status = buildingStatus(city, store);
    assert.equal(status.capacity, VISITOR_CAPACITY.store);
    assert.ok(status.occupied + status.inbound <= status.capacity,
      `${status.occupied} parked plus ${status.inbound} inbound exceeds ${status.capacity} slots`);
    peak = Math.max(peak, status.occupied + status.inbound);
    if (status.occupied + status.inbound === status.capacity) sawFull = true;
    if (demandSummary(city).shopping > 0) sawUnmet = true;
  });
  assert.equal(peak, VISITOR_CAPACITY.store, 'five homes really do fill a four-slot store');
  assert.ok(sawFull && sawUnmet, 'a full store leaves demand waiting at home instead of overbooking');
  assert.ok(c.completed > 0, 'served customers still finish their journeys');
  // Nobody circles forever and nobody vanishes: every car is either driving, parked, or at home.
  assert.ok(c.trips.every(t => ['outbound', 'visiting', 'returning', 'waiting'].includes(phaseOf(t))));
});

test('a second store takes legitimate overflow instead of every home touring both', () => {
  const c = shopTown([0, 2, 4, 6, 8]);
  place(c, 'store', 8, 7, 2); // entrance 9,6, nearer the western homes
  const [first, second] = c.buildings.filter(b => b.kind === 'store');
  const visits = new Map<number, number>();
  const seen = new Set<number>();
  run(c, 120, city => {
    for (const t of city.trips) {
      if (phaseOf(t) !== 'visiting' || seen.has(t.id)) continue;
      seen.add(t.id);
      visits.set(t.storeId, (visits.get(t.storeId) ?? 0) + 1);
    }
  });
  assert.ok((visits.get(first.id) ?? 0) > 0 && (visits.get(second.id) ?? 0) > 0, 'both stores are used');
  // Each journey serves exactly one destination; a duplicate shop is never a compulsory extra stop.
  assert.equal([...visits.values()].reduce((a, b) => a + b, 0), seen.size);
});

test('a shopping visit is paid once, on completion, and reload cannot pay for it twice', () => {
  const c = shopTown([2]);
  runUntil(c, city => !!parkedAt(city));
  const parked = parkedAt(c)!;
  assert.ok((parked.visitRemaining ?? 0) > 0 && parked.rewarded === false);
  const restored = parseCity(JSON.parse(JSON.stringify(c)));
  assert.ok(restored);
  assert.deepEqual(restored, c, 'a saved visit restores its timer, purpose and payment flag');
  run(c, 60); run(restored, 60);
  assert.equal(restored.funds, c.funds, 'reloading mid-visit does not duplicate the payout');
  assert.equal(restored.completed, c.completed);
  // Income is the served visits plus the small support payments, never one per tick.
  assert.equal(c.funds, 10000 - COSTS.home - COSTS.store - 13 * COSTS.road
    + c.completed * SHOP_INCOME + Math.floor(c.elapsed / 10) * 20);
});

test('a park serves a distinct leisure need, and a duplicate park cannot multiply that income', () => {
  const build = (parks: number) => {
    const c = funded();
    for (let x = 2; x <= 12; x++) place(c, 'road', x, 6);
    place(c, 'home', 2, 4, 0);  // entrance 2,6
    place(c, 'store', 10, 4, 0); // entrance 11,6
    place(c, 'park', 5, 7, 2);   // entrance 6,6
    if (parks > 1) place(c, 'park', 8, 7, 2); // entrance 9,6
    return c;
  };
  const c = build(1);
  const park = find(c, 'park');
  let leisureVisits = 0, longest = 0, peakIncome = 0;
  const counted = new Set<number>();
  run(c, 200, city => {
    peakIncome = Math.max(peakIncome, income(city));
    for (const t of city.trips) {
      if (phaseOf(t) !== 'visiting' || t.purpose !== 'leisure' || counted.has(t.id)) continue;
      counted.add(t.id); leisureVisits++;
      assert.equal(t.storeId, park.id, 'leisure trips go to the park, not the shop');
      longest = Math.max(longest, t.visitRemaining ?? 0);
    }
  });
  assert.ok(leisureVisits > 0, 'leisure demand really does produce park trips');
  assert.ok(longest >= VISIT_SECONDS.park - TRAFFIC_TICK && longest > VISIT_SECONDS.store,
    `a park stay (${longest}s) is longer than a shopping stay`);
  // One household generates one leisure need per interval, whatever the town builds.
  assert.ok(leisureVisits <= Math.ceil(200 / LEISURE_INTERVAL) + LEISURE_CAP,
    `${leisureVisits} park visits from ${Math.ceil(200 / LEISURE_INTERVAL)} needs`);
  const twin = build(2);
  let twinVisits = 0, twinPeakIncome = 0;
  const twinCounted = new Set<number>();
  run(twin, 200, city => {
    twinPeakIncome = Math.max(twinPeakIncome, income(city));
    for (const t of city.trips) {
      if (phaseOf(t) === 'visiting' && t.purpose === 'leisure' && !twinCounted.has(t.id)) { twinCounted.add(t.id); twinVisits++; }
    }
  });
  assert.equal(twinVisits, leisureVisits, 'a second park adds capacity, not extra demand');
  // The benefit belongs to the household, so one park and two parks pay exactly the same.
  assert.equal(twinPeakIncome, peakIncome);
  assert.equal(peakIncome, 20 + LEISURE_BONUS, 'one served household, one bounded tax benefit');
});

test('the park benefit is recurring but bounded, and lapses when leisure is not served', () => {
  const c = funded();
  for (let x = 2; x <= 8; x++) place(c, 'road', x, 6);
  place(c, 'home', 2, 4, 0);  // entrance 2,6
  place(c, 'store', 6, 4, 0); // entrance 7,6
  place(c, 'park', 4, 7, 2);  // entrance 5,6
  runUntil(c, city => income(city) > 20, 200);
  const household = c.households[0];
  assert.ok(household.leisureUntil > c.elapsed);
  assert.ok(household.leisureUntil <= c.elapsed + LEISURE_BENEFIT_SECONDS + 1e-6, 'the window is capped');
  // Bulldozing the park stops future leisure visits, so the benefit runs out on its own.
  runUntil(c, city => !city.trips.some(t => t.storeId === find(city, 'park').id), 200);
  place(c, 'bulldoze', 4, 7);
  run(c, LEISURE_BENEFIT_SECONDS + 1);
  assert.equal(income(c), 20, 'no park, no continuing benefit');
  assert.ok(c.completed > 0, 'the town keeps shopping either way');
});

test('needs are bounded, are consumed by real visits, and unserved demand stays visible', () => {
  const isolated = funded();
  place(isolated, 'home', 2, 4, 0);
  place(isolated, 'road', 2, 6);
  run(isolated, 200);
  const demand = demandSummary(isolated);
  assert.deepEqual(demand, { shopping: SHOP_CAP, leisure: LEISURE_CAP, visits: 0 },
    'with nowhere to go the household accumulates capped, visible demand');
  assert.equal(isolated.trips.length, 0, 'no destination means no phantom traffic');
  // A nearer shop serves the same household faster, so its backlog is visibly smaller.
  const near = funded();
  for (let x = 2; x <= 6; x++) place(near, 'road', x, 6);
  place(near, 'home', 2, 4, 0); place(near, 'store', 4, 4, 0); // entrances 2,6 and 5,6
  const far = shopTown([2]);
  run(near, 200); run(far, 200);
  assert.ok(near.completed > far.completed, `a shorter commute serves more visits (${near.completed} vs ${far.completed})`);
  assert.ok(demandSummary(near).shopping < demandSummary(far).shopping,
    'and leaves less unmet demand at home');
  assert.ok(demandSummary(far).shopping <= SHOP_CAP, 'demand is bounded even when the shop is too far');
  assert.ok(far.completed >= 5);
});

/** Two parallel east-west routes between one home and one store, with no junctions to arbitrate. */
function detourTown(): City {
  const c = funded();
  for (let x = 2; x <= 10; x++) { place(c, 'road', x, 6); place(c, 'road', x, 9); }
  for (const y of [7, 8]) { place(c, 'road', 2, y); place(c, 'road', 10, y); }
  place(c, 'home', 2, 4, 0);   // entrance 2,6
  place(c, 'store', 9, 4, 0);  // entrance 10,6
  return c;
}

test('a closure reroutes traffic over a real detour and reopening restores the short route', () => {
  const c = detourTown();
  assert.equal(findPath(c, { x: 2, y: 6 }, { x: 10, y: 6 })?.length, 9);
  run(c, 4.5); // one car is on the corridor, short of the tile about to close
  const trip = c.trips[0];
  assert.equal(phaseOf(trip), 'outbound');
  assert.equal(place(c, 'closure', 6, 6), 'Road closed. Traffic already on it drives out, new traffic reroutes.');
  assert.equal(findPath(c, { x: 2, y: 6 }, { x: 10, y: 6 })?.length, 15, 'routing goes the long way round');
  run(c, TRAFFIC_TICK);
  assert.equal(phaseOf(trip), 'outbound', 'the driver takes the detour rather than stopping');
  assert.ok(trip.path.some(p => p.y === 9), 'the detour really uses the southern road');
  run(c, 60);
  assert.ok(c.completed > 0, 'the diverted journey still finishes');
  assert.equal(place(c, 'closure', 6, 6), 'Road reopened.');
  assert.equal(findPath(c, { x: 2, y: 6 }, { x: 10, y: 6 })?.length, 9);
});

test('with every route closed a car holds its place visibly, then resumes when a road returns', () => {
  const c = detourTown();
  run(c, 4.5);
  place(c, 'closure', 6, 6); place(c, 'closure', 6, 9);
  run(c, 5);
  const trip = c.trips[0];
  assert.equal(phaseOf(trip), 'waiting', 'a car with no route waits on the road instead of vanishing');
  assert.ok(trip.hold > 1, 'the blockage is measurable, not hidden');
  assert.deepEqual(trip.target, { x: 10, y: 6 }, 'it still intends to reach the same store');
  assert.equal(c.trips.length, 1);
  assert.equal(demandSummary(c).shopping > 0, true, 'the unmet need is retained');
  const restored = parseCity(JSON.parse(JSON.stringify(c)));
  assert.ok(restored, 'a blocked town still saves and loads');
  assert.deepEqual(restored, c);
  place(c, 'closure', 6, 9);
  run(c, 60);
  assert.ok(c.completed > 0, 'reopening a road lets the held journey finish');
});

test('an active incident blocks routing, diverts a driver, and cannot be bulldozed away', () => {
  const c = detourTown();
  run(c, 4.5);
  c.incidents.push({ id: 900, x: 6, y: 6, severity: 'minor', status: 'active', createdAt: c.elapsed,
    required: ['police'], completedServices: [], rescueDeadline: null, outcome: 'none' });
  c.nextId = 901;
  assert.equal(findPath(c, { x: 2, y: 6 }, { x: 10, y: 6 })?.length, 15);
  run(c, TRAFFIC_TICK);
  assert.ok(c.trips[0].path.some(p => p.y === 9), 'traffic diverts around the wreck');
  assert.equal(place(c, 'bulldoze', 6, 6), 'An incident is blocking this tile. Clear it before rebuilding.');
  assert.ok(c.roads.some(p => p.x === 6 && p.y === 6));
  run(c, 60);
  assert.ok(c.completed > 0);
  c.incidents[0].status = 'cleared';
  run(c, TRAFFIC_TICK);
  assert.equal(findPath(c, { x: 2, y: 6 }, { x: 10, y: 6 })?.length, 9, 'clearing restores the road');
});

test('construction cannot delete a road from under a car, a parked visitor, or a responder', () => {
  const c = shopTown([2]);
  place(c, 'hospital', 4, 7, 2); // entrance 5,6
  runUntil(c, city => city.trips.length > 0);
  const occupied = c.trips[0].path[0];
  assert.equal(place(c, 'bulldoze', occupied.x, occupied.y), 'A vehicle is on that road. Wait for it to pass.');
  runUntil(c, city => !!parkedAt(city));
  assert.equal(place(c, 'bulldoze', 10, 4), 'Journeys are booked here. Wait for the visitors to leave.');
  const hospital = find(c, 'hospital');
  c.trips.push({ id: c.nextId++, homeId: 0, storeId: 0, progress: 0, wait: 0, hold: 0,
    path: [entrance(hospital)], phase: 'working', service: 'ems', stationId: hospital.id, speed: 3 });
  assert.equal(place(c, 'bulldoze', 4, 7), 'A hospital vehicle is still out on a call.');
  assert.deepEqual(buildingStatus(c, hospital), { occupied: 1, capacity: 1, inbound: 0, label: 'Vehicle responding' });
});

test('a home is protected while its car is out, then removed cleanly once it is home', () => {
  const c = shopTown([2, 4]);
  run(c, 10);
  assert.equal(c.trips.length, 2);
  const home = find(c, 'home');
  const funds = c.funds;
  assert.equal(place(c, 'bulldoze', home.x, home.y), 'This home has a car out. Wait for it to get back.');
  assert.equal(c.funds, funds, 'a refused removal refunds nothing');
  assert.equal(c.trips.length, 2, 'and deletes nobody');
  // Its journey has to finish before the plot is free again.
  runUntil(c, city => !city.trips.some(t => t.homeId === home.id));
  assert.match(place(c, 'bulldoze', home.x, home.y), /Full \$200 refund/);
  assert.equal(c.households.some(h => h.homeId === home.id), false, 'its demand leaves with it');
  const store = find(c, 'store');
  const status = buildingStatus(c, store);
  assert.ok(status.occupied + status.inbound <= 1, 'the freed visitor slot is released, not leaked');
  run(c, 60);
  assert.ok(c.completed > 0);
});

test('service vehicles share the road but never count as customers, income, or completions', () => {
  // No homes and no shops: every vehicle on this map is a responder.
  const c = funded();
  for (let x = 0; x <= 12; x++) place(c, 'road', x, 6);
  place(c, 'hospital', 1, 7, 2);      // entrance 2,6
  place(c, 'policeStation', 4, 7, 2); // entrance 5,6
  c.incidents.push({ id: c.nextId++, x: 10, y: 6, severity: 'serious', status: 'active', createdAt: 0,
    required: ['police', 'ems'], completedServices: [], rescueDeadline: 90, outcome: 'pending' });
  c.accidentCount = 1;
  const before = c.funds;
  runUntil(c, city => city.trips.filter(t => !!t.service).length === 2);
  assert.ok(c.trips.every(t => t.service), 'both crews are dispatched from their own stations');
  assert.ok(c.trips.every(t => (t.speed ?? 2) > 2), 'responders run at emergency speed');
  const restored = parseCity(JSON.parse(JSON.stringify(c)));
  assert.ok(restored, 'a save taken mid-response reloads');
  assert.deepEqual(restored, c);
  run(c, 20);
  assert.equal(c.completed, 0, 'reaching the scene is never a completed customer journey');
  assert.equal(c.history.length, 0, 'and never enters the traffic metrics window');
  assert.equal(demandSummary(c).visits, 0, 'a responder is not a visitor');
  assert.equal(c.funds, before + Math.floor(c.elapsed / 10) * 20, 'responders earn nothing');
  const hospital = find(c, 'hospital');
  assert.equal(buildingStatus(c, hospital).capacity, 1);
});

test('a new town can afford a starter pair and must earn services from visits', () => {
  const c = createCity();
  assert.equal(c.funds, STARTING_FUNDS);
  place(c, 'home', 0, 4, 0);
  place(c, 'store', 2, 4, 0);
  for (let x = 0; x <= 5; x++) place(c, 'road', x, 6);
  assert.equal(c.buildings.length, 2);
  assert.ok(c.funds < COSTS.hospital);
  const spent = createCity();
  spent.funds = 0;
  place(spent, 'road', 3, 3);
  assert.equal(spent.roads.length, 0, 'construction is refused rather than going into debt');
  stepCity(spent, 10);
  assert.equal(spent.funds, 20, 'support keeps arriving so a stalled town can rebuild');
});

test('version 1 saves load without visit state and keep their old roundtrip until it finishes', () => {
  const c = funded();
  place(c, 'home', 2, 2, 0);  // entrance 2,4
  place(c, 'store', 7, 2, 0); // entrance 8,4
  for (let x = 2; x <= 8; x++) place(c, 'road', x, 4);
  const out = Array.from({ length: 7 }, (_, i) => ({ x: 2 + i, y: 4 }));
  const raw = JSON.parse(JSON.stringify(c)) as Record<string, unknown>;
  raw.version = 1;
  for (const field of ['households', 'closures', 'incidents', 'risks', 'accidentCount', 'rescuedCount', 'fatalities',
    'controls', 'history', 'tickClock']) delete raw[field];
  raw.trips = [{ id: 3, homeId: 1, storeId: 2, progress: 0, path: [...out, ...out.slice(0, -1).reverse()] }];
  raw.nextId = 4;
  const loaded = parseCity(raw);
  assert.ok(loaded, 'a pre-visit save still loads');
  assert.equal(loaded.version, 2);
  assert.deepEqual(loaded.households, []);
  assert.deepEqual([loaded.incidents, loaded.risks, loaded.closures], [[], [], []]);
  assert.deepEqual([loaded.accidentCount, loaded.rescuedCount, loaded.fatalities], [0, 0, 0]);
  assert.equal(loaded.trips[0].phase, undefined, 'the old roundtrip keeps its own rules');
  run(loaded, 6.5);
  assert.equal(loaded.completed, 1, 'and is credited when it gets home');
  run(loaded, 4);
  assert.equal(loaded.trips[0].phase, 'outbound', 'later departures use the new visit model');
  assert.equal(loaded.trips[0].purpose, 'shopping');
});

test('new save fields are validated strictly rather than trusted', () => {
  const c = shopTown([2]);
  runUntil(c, city => !!parkedAt(city));
  for (const mutate of [
    (v: City) => { v.trips[0].phase = 'parked' as never; },
    (v: City) => { v.trips[0].purpose = 'errand' as never; },
    (v: City) => { v.trips[0].visitRemaining = 999; },
    (v: City) => { v.trips[0].rewarded = 'yes' as never; },
    (v: City) => { v.trips[0].speed = 0; },
    (v: City) => { v.trips[0].target = { x: 900, y: 900 }; },
    (v: City) => { v.trips[0].service = 'coastguard' as never; },
    (v: City) => { v.households[0].shopping = SHOP_CAP + 1; },
    (v: City) => { v.households[0].homeId = 77; },
    (v: City) => { v.households.push({ ...v.households[0] }); },
    (v: City) => { v.closures = [{ x: 1.5, y: 6 }]; },
    (v: City) => { v.closures = 'closed' as never; },
  ]) {
    const copy = structuredClone(c); mutate(copy);
    assert.equal(parseCity(copy), null);
  }
  // A closure on a road that no longer exists is dropped, not treated as corruption.
  const orphan = structuredClone(c);
  orphan.closures = [{ x: 3, y: 11 }];
  assert.deepEqual(parseCity(orphan)?.closures, []);
});
