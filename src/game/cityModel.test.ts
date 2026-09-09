import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, footprint, entrance, place, findPath, connectedHomes, routeForHome, averageTripSeconds, income, stepCity, parseCity, WIDTH, HEIGHT, TILE_METERS } from './cityModel.ts';
import type { Building, City } from './cityModel.ts';

function connectedCity(): City {
  const c = createCity();
  place(c, 'home', 2, 2, 0); // entrance 2,4
  place(c, 'store', 7, 2, 0); // entrance 8,4
  for (let x = 2; x <= 8; x++) place(c, 'road', x, 4);
  return c;
}
test('tile and footprints are independent of artwork; all rotations preserve area and one adjacent entrance', () => {
  assert.deepEqual([WIDTH, HEIGHT, TILE_METERS], [16, 14, 10]);
  for (const kind of ['home', 'store'] as const) for (let rotation = 0; rotation < 4; rotation++) {
    const b: Building = { id: 1, kind, x: 5, y: 5, rotation };
    const tiles = footprint(b), e = entrance(b);
    assert.equal(new Set(tiles.map(p => `${p.x},${p.y}`)).size, kind === 'home' ? 4 : 6);
    assert.equal(tiles.some(p => p.x === e.x && p.y === e.y), false);
    assert.equal(tiles.filter(p => Math.abs(p.x - e.x) + Math.abs(p.y - e.y) === 1).length, 1);
  }
  assert.deepEqual([0, 1, 2, 3].map(rotation => entrance({ id: 1, kind: 'store', x: 5, y: 5, rotation })),
    [{ x: 6, y: 7 }, { x: 4, y: 6 }, { x: 6, y: 4 }, { x: 7, y: 6 }]);
});
test('placement checks footprint, bounds, and reserved entrance; roads can occupy entrances', () => {
  const c = createCity();
  place(c, 'home', 2, 2, 0);
  const baseline = JSON.stringify(c);
  for (const [x, y, r] of [[3, 3, 0], [2, 4, 0], [15, 13, 0], [0, 0, 1]]) {
    place(c, 'store', x, y, r); assert.equal(JSON.stringify(c), baseline);
  }
  place(c, 'road', 2, 4); assert.equal(c.roads.length, 1);
  place(c, 'store', 2, 5, 2); // entrance would be occupied home? north entrance 3,4 is free
  assert.equal(c.buildings.length, 2);
  place(c, 'home', 3, 4, 0); assert.equal(c.buildings.length, 2);
});
test('all construction refunds fully, including removal via a non-anchor building tile', () => {
  const c = connectedCity(); assert.equal(c.funds, 10000 - 200 - 400 - 7 * 20);
  place(c, 'bulldoze', 3, 3); place(c, 'bulldoze', 9, 3);
  for (let x = 2; x <= 8; x++) place(c, 'bulldoze', x, 4);
  assert.equal(c.funds, 10000); assert.equal(c.buildings.length, 0);
  place(c, 'bulldoze', 3, 3); assert.equal(c.funds, 10000);
  c.funds = 0; place(c, 'home', 2, 2); assert.equal(c.buildings.length, 0);
});
test('cardinal connectivity uses real entrances; disconnection cancels trips and reconnection recovers', () => {
  const c = connectedCity(); assert.equal(connectedHomes(c), 1);
  assert.equal(findPath(c, { x: 2, y: 4 }, { x: 8, y: 4 })?.length, 7);
  stepCity(c, 4); assert.equal(c.trips.length, 1);
  place(c, 'bulldoze', 5, 4); assert.equal(connectedHomes(c), 0); assert.equal(c.trips.length, 0);
  place(c, 'road', 5, 5); assert.equal(connectedHomes(c), 0, 'diagonal roads do not connect');
  place(c, 'road', 5, 4); stepCity(c, 4); assert.equal(c.trips.length, 1);
  place(c, 'bulldoze', 8, 2); assert.equal(c.trips.length, 0); assert.equal(connectedHomes(c), 0);
});
test('trips visibly travel to the store and back home before counting completion', () => {
  const c = connectedCity(); stepCity(c, 4);
  assert.equal(c.trips.length, 1);
  const t = c.trips[0]; assert.equal(t.path.length, 13);
  assert.deepEqual(t.path[0], { x: 2, y: 4 }); assert.deepEqual(t.path[6], { x: 8, y: 4 }); assert.deepEqual(t.path[12], t.path[0]);
  stepCity(c, 3); assert.equal(c.trips[0].progress, 6); assert.equal(c.completed, 0);
  stepCity(c, 3); assert.equal(c.completed, 1); assert.equal(c.trips.length, 0);
  stepCity(c, 2); assert.equal(c.trips.length, 1);
});
test('empty cities receive predictable support; connected homes add income with no operating penalty', () => {
  const c = createCity(); assert.equal(income(c), 200);
  stepCity(c, 9); assert.equal(c.funds, 10000); stepCity(c, 1); assert.equal(c.funds, 10200);
  const connected = connectedCity(); const start = connected.funds;
  assert.equal(income(connected), 300); stepCity(connected, 30); assert.equal(connected.funds, start + 900);
});
test('economy and travel results agree across frame rates and save/load mid-payment', () => {
  const a = connectedCity(), b = connectedCity();
  stepCity(a, 60);
  for (let i = 0; i < 3600; i++) stepCity(b, 1 / 60);
  assert.equal(a.funds, b.funds); assert.equal(a.completed, b.completed); assert.equal(a.nextId, b.nextId);
  assert.ok(Math.abs(a.elapsed - b.elapsed) < 1e-6);
  const c = connectedCity(); stepCity(c, 7.25);
  const restored = parseCity(JSON.parse(JSON.stringify(c))); assert.ok(restored); assert.deepEqual(restored, c);
  stepCity(c, 22.75); stepCity(restored, 22.75); assert.deepEqual(restored, c);
  restored.roads[0].x = 0; assert.notEqual(restored.roads[0].x, c.roads[0].x);
});
test('save parser rejects malformed numbers, overlap, off-map access, duplicate IDs, and invalid routes', () => {
  const c = connectedCity(); stepCity(c, 5);
  const mutations: ((v: City) => void)[] = [
    v => { v.funds = NaN; }, v => { v.elapsed = Infinity; }, v => { v.spawnClock = 4; },
    v => { v.nextId = 1; }, v => { v.roads.push(v.roads[0]); },
    v => { v.buildings[1].id = v.buildings[0].id; }, v => { v.buildings[0].x = 15; },
    v => { v.buildings[0].rotation = 4; }, v => { v.roads[0].y = -1; },
    v => { v.trips[0].path[1] = { x: 12, y: 12 }; }, v => { v.trips[0].progress = -1; },
    v => { v.trips[0].homeId = 999; }, v => { v.trips[0].id = v.buildings[0].id; },
  ];
  for (const mutate of mutations) { const copy = structuredClone(c); mutate(copy); assert.equal(parseCity(copy), null); }
  for (const raw of [null, undefined, 12, [], {}, { version: 2 }]) assert.equal(parseCity(raw), null);
});
test('a road shortcut reduces planned roundtrip time and subsequent departures use it', () => {
  const c = createCity();
  assert.equal(averageTripSeconds(c), null);
  place(c, 'home', 2, 2); place(c, 'store', 7, 2);
  assert.equal(routeForHome(c, c.buildings[0]), null);
  for (let y = 4; y <= 6; y++) { place(c, 'road', 2, y); place(c, 'road', 8, y); }
  for (let x = 3; x < 8; x++) place(c, 'road', x, 6);
  assert.equal(averageTripSeconds(c), 10);
  stepCity(c, 4); assert.equal(c.trips[0].path.length, 21);
  for (let x = 3; x < 8; x++) place(c, 'road', x, 4);
  assert.equal(averageTripSeconds(c), 6);
  assert.equal(routeForHome(c, c.buildings[0])?.length, 7);
  assert.equal(c.trips[0].path.length, 21, 'existing journeys finish their chosen route');
  stepCity(c, 12);
  assert.equal(c.completed, 1); assert.equal(c.trips[0].path.length, 13);
});
test('a shared entrance has zero driving distance and completes without dividing by zero', () => {
  const c = createCity();
  place(c, 'home', 2, 2); place(c, 'store', 1, 5, 2); place(c, 'road', 2, 4);
  assert.equal(connectedHomes(c), 1); assert.equal(averageTripSeconds(c), 0);
  stepCity(c, 4); assert.equal(c.trips[0].path.length, 1);
  assert.ok(parseCity(c)); stepCity(c, 0.1); assert.equal(c.completed, 1);
});

test('land expands on every edge without translating existing construction or trips', async () => {
  const { expandCity } = await import('./cityModel.ts');
  const c = connectedCity(); stepCity(c, 5);
  const before = structuredClone(c);
  for (const edge of ['north', 'east', 'south', 'west'] as const) expandCity(c, edge);
  assert.deepEqual(c.map, { x: -8, y: -8, width: 32, height: 30 });
  assert.deepEqual(c.roads, before.roads); assert.deepEqual(c.buildings, before.buildings);
  assert.deepEqual(c.trips, before.trips); assert.equal(c.funds, before.funds);
  assert.equal(connectedHomes(c), 1); assert.equal(c.elapsed, before.elapsed);
  assert.deepEqual(parseCity(JSON.parse(JSON.stringify(c))), c);
});

test('new land accepts construction and routes across old edges, including negative coordinates', async () => {
  const { expandCity } = await import('./cityModel.ts');
  const c = createCity();
  place(c, 'home', -5, 2); assert.equal(c.buildings.length, 0);
  expandCity(c, 'west');
  place(c, 'home', -5, 2); place(c, 'store', 2, 2);
  for (let x = -5; x <= 3; x++) place(c, 'road', x, 4);
  assert.equal(connectedHomes(c), 1);
  assert.equal(findPath(c, { x: -5, y: 4 }, { x: 3, y: 4 })?.length, 9);
  stepCity(c, 5); assert.equal(c.trips.length, 1);
  assert.deepEqual(parseCity(JSON.parse(JSON.stringify(c))), c);
  const before = JSON.stringify(c);
  place(c, 'home', -8, 6, 1); // Its entrance would lie beyond the new west edge.
  assert.equal(JSON.stringify(c), before);
  place(c, 'bulldoze', -4, 3); assert.equal(c.buildings.length, 1); assert.equal(c.trips.length, 0);
});

test('expansion is bounded, rejected expansion is inert, and former fixed limits are removed', async () => {
  const { expandCity } = await import('./cityModel.ts');
  const c = createCity();
  for (let i = 0; i < 10; i++) { expandCity(c, 'east'); expandCity(c, 'south'); }
  assert.deepEqual(c.map, { x: 0, y: 0, width: 64, height: 64 });
  const before = JSON.stringify(c);
  for (const edge of ['north', 'east', 'south', 'west'] as const) expandCity(c, edge);
  assert.equal(JSON.stringify(c), before);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 40; x++) place(c, 'road', x, y);
  assert.equal(c.roads.length, 320);
  assert.equal(findPath(c, { x: 0, y: 0 }, { x: 39, y: 7 })?.length, 47);
  assert.deepEqual(parseCity(JSON.parse(JSON.stringify(c))), c);
  place(c, 'home', 61, 60); assert.equal(c.buildings.length, 1);
  place(c, 'home', 63, 60); assert.equal(c.buildings.length, 1);
});

test('legacy map saves migrate, while malformed or shrunken map saves are rejected', () => {
  const c = connectedCity(); stepCity(c, 5);
  const legacy: Record<string, unknown> = JSON.parse(JSON.stringify(c)); delete legacy.map;
  assert.deepEqual(parseCity(legacy), c);
  for (const map of [null, [], {}, { x: 0, y: 0, width: 65, height: 14 },
    { x: 0, y: 0, width: 16, height: 13 }, { x: 1, y: 0, width: 16, height: 14 },
    { x: -100, y: 0, width: 64, height: 14 }, { x: 0, y: NaN, width: 16, height: 14 }]) {
    assert.equal(parseCity({ ...c, map }), null);
  }
});
