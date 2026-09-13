import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, place, stepCity, parseCity, entrance, entrances, upgradeApartment, retarget, TRAFFIC_TICK, type City, type Trip} from './cityModel.ts';
import {chooseDestination, householdFor, growDemand, spawnTrips, residentialCarCapacity, SHOP_CAP, LEISURE_CAP, buildingStatus} from './cityVisits.ts';
import {roadIndex} from './cityTraffic.ts';

function fixture(secondary = false) {
  const city = createCity(); city.funds = 100000;
  place(city, 'apartment', 2, 3);
  const apartment = city.buildings.find(b => b.kind === 'apartment')!;
  assert.ok(apartment);
  const y = secondary ? 2 : 7;
  for (let x = 1; x <= 12; x++) place(city, 'road', x, y);
  place(city, 'store', 10, y - 2);
  return {city, apartment};
}
function run(city: City, seconds: number, observe?: () => void) {
  for (let t = 0; t < seconds / TRAFFIC_TICK; t++) {stepCity(city, TRAFFIC_TICK); observe?.();}
}

test('apartments generate multiple real journeys, bounded by their upgrade, and reload them intact', () => {
  const {city, apartment} = fixture();
  place(city, 'bulldoze', 10, 5);
  for (let x = 12; x <= 15; x++) place(city, 'road', x, 7);
  for (let y = 8; y <= 12; y++) place(city, 'road', 15, y);
  for (let x = 3; x < 15; x++) place(city, 'road', x, 12);
  place(city, 'park', 2, 9); // Long real outings expose the resident-car bounds.
  let peak = 0;
  run(city, 90, () => {
    peak = Math.max(peak, city.trips.length);
    assert.ok(city.trips.length <= 4);
  });
  assert.equal(peak, 4);
  assert.ok(city.completed > 0);
  const loaded = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(loaded);
  assert.deepEqual(loaded.households, city.households);
  assert.deepEqual(loaded.trips, city.trips);
  const before = {...householdFor(city, apartment.id)};
  upgradeApartment(city, apartment.id, {x: 4, y: 2});
  assert.equal(residentialCarCapacity(apartment), 6);
  assert.deepEqual(householdFor(city, apartment.id), before, 'upgrade preserves existing needs');
  run(city, 90, () => {
    peak = Math.max(peak, city.trips.length);
    assert.ok(city.trips.length <= 6);
  });
  assert.equal(peak, 6);
  assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
  assert.equal(buildingStatus(city, apartment).capacity, 6);
});

test('a second entrance provides physical departure and return without a primary approach', () => {
  const {city, apartment} = fixture(true);
  assert.equal(chooseDestination(city, apartment, 'shopping'), null);
  upgradeApartment(city, apartment.id, {x: 4, y: 2});
  const doors = entrances(apartment);
  const route = chooseDestination(city, apartment, 'shopping');
  assert.ok(route);
  assert.deepEqual(route.path[0], doors[1]);
  assert.notDeepEqual(route.path[0], entrance(apartment));
  let returned = false;
  run(city, 45, () => {
    for (const trip of city.trips) if (trip.phase === 'returning') {
      returned = true;
      assert.deepEqual(trip.path.at(-1), doors[1]);
      assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
    }
  });
  assert.ok(returned && city.completed > 0);
});

test('apartment unpaid assignments reserve demand and corrupt reservations reject reload', () => {
  const {city, apartment} = fixture();
  const demand = householdFor(city, apartment.id);
  demand.shopping = 1; demand.leisure = 0;
  spawnTrips(city, roadIndex(city));
  assert.equal(city.trips.length, 1);
  // Put the first vehicle off-road at its real destination to free the entrance.
  const trip = city.trips[0]; trip.phase = 'visiting'; trip.progress = trip.path.length - 1; trip.visitRemaining = 5;
  spawnTrips(city, roadIndex(city));
  assert.equal(city.trips.length, 1, 'one request cannot launch two paid visits');
  assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
  const missing = JSON.parse(JSON.stringify(city));
  missing.households = [];
  assert.equal(parseCity(missing), null);
  delete missing.households;
  assert.equal(parseCity(missing), null);
  demand.shopping = 0;
  assert.equal(parseCity(JSON.parse(JSON.stringify(city))), null);
});

test('higher apartment population grows bounded needs without enlarging old home demand', () => {
  const {city, apartment} = fixture();
  const demand = householdFor(city, apartment.id);
  growDemand(city, 1000);
  assert.equal(demand.shopping, SHOP_CAP * 4);
  assert.equal(demand.leisure, LEISURE_CAP * 4);
  upgradeApartment(city, apartment.id, {x: 4, y: 2});
  growDemand(city, 1000);
  assert.equal(demand.shopping, SHOP_CAP * 6);
  assert.equal(demand.leisure, LEISURE_CAP * 6);
  assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
});


test('an active resident return replans through a chosen side entrance when its original access closes', () => {
  const {city, apartment} = fixture();
  for (let x = 6; x <= 9; x++) place(city, 'road', x, 5);
  place(city, 'road', 9, 6);
  let returningId: number | undefined;
  for (let i = 0; i < 60 / TRAFFIC_TICK && returningId === undefined; i++) {
    stepCity(city, TRAFFIC_TICK);
    returningId = city.trips.find(t => t.phase === 'returning')?.id;
  }
  assert.ok(returningId !== undefined, 'a real visit has finished and the car has begun its return');
  const original = city.trips.find(t => t.id === returningId)!;
  assert.deepEqual(original.path.at(-1), entrance(apartment));
  const chosen = {x: 6, y: 5};
  upgradeApartment(city, apartment.id, chosen);
  place(city, 'closure', entrance(apartment).x, entrance(apartment).y);
  let usedSide = false;
  for (let i = 0; i < 60 / TRAFFIC_TICK; i++) {
    stepCity(city, TRAFFIC_TICK);
    const trip = city.trips.find(t => t.id === returningId);
    if (!trip) break;
    if (trip.path.at(-1)?.x === chosen.x && trip.path.at(-1)?.y === chosen.y) {
      usedSide = true;
      assert.ok(parseCity(JSON.parse(JSON.stringify(city))), 'the replanned real journey reloads');
    }
  }
  assert.ok(usedSide, 'the existing journey selects the newly connected side door');
  assert.ok(!city.trips.some(t => t.id === returningId), 'the original car physically finishes its journey');
  assert.ok(city.completed > 0);
});


test('apartment returns retain a congestion-aware route selected by the traffic planner', () => {
  const {city, apartment} = fixture();
  for (let x = 2; x <= 11; x++) place(city, 'road', x, 9);
  for (const x of [2, 11]) place(city, 'road', x, 8);
  const direct = Array.from({length: 10}, (_, i) => ({x: 11 - i, y: 7}));
  const selected = [{x: 11, y: 7}, {x: 11, y: 8},
    ...Array.from({length: 10}, (_, i) => ({x: 11 - i, y: 9})), {x: 2, y: 8}, {x: 2, y: 7}];
  const trip: Trip = {id: city.nextId++, homeId: apartment.id, storeId: 0,
    phase: 'returning', path: direct, progress: 0, wait: 0, hold: 0, target: entrance(apartment)};
  assert.ok(retarget(city, trip, direct[0], undefined, selected));
  assert.deepEqual(trip.path, selected, 'a longer bypass selected for traffic cost must not become the shortest congested road again');
  assert.deepEqual(trip.target, entrance(apartment));
});
