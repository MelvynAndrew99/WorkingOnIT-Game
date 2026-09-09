/** Logical tiles and routes never depend on sprite dimensions or rendering units. */
import { INITIAL_WIDTH, INITIAL_HEIGHT, initialMap, containsTile, expandedMap, parseMap, type MapBounds, type ExpansionDirection } from './cityMap.ts';
// Compatibility for the current renderer. New rendering/camera code must use city.map.
export const WIDTH = INITIAL_WIDTH;
export const HEIGHT = INITIAL_HEIGHT;
export const TILE_METERS = 10;
export type Tool = 'road' | 'home' | 'store' | 'bulldoze';
export type Point = { x: number; y: number };
export type Building = { id: number; kind: 'home' | 'store'; x: number; y: number; rotation: number };
export type Trip = { id: number; path: Point[]; progress: number; homeId: number; storeId: number };
export type City = {
  version: 1; map: MapBounds; roads: Point[]; buildings: Building[]; trips: Trip[];
  funds: number; elapsed: number; completed: number; nextId: number;
  incomeClock: number; spawnClock: number;
};
export const COSTS = { road: 20, home: 200, store: 400 } as const;
export const INCOME_INTERVAL = 10;
const SPAWN_INTERVAL = 4;
const TRAVEL_TILES_PER_SECOND = 2;
const key = (p: Point) => `${p.x},${p.y}`;
const equal = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const inBounds = (city: City, p: Point) => containsTile(city.map, p);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function createCity(): City {
  return { version: 1, map: initialMap(), roads: [], buildings: [], trips: [], funds: 10000, elapsed: 0, completed: 0, nextId: 1, incomeClock: 0, spawnClock: 0 };
}
/** Free expansion is provisional: preserve the forgiving construction economy. */
export function expandCity(city: City, direction: ExpansionDirection): string {
  const map = expandedMap(city.map, direction);
  if (!map) return 'The map cannot expand further in that direction.';
  city.map = map;
  return `Expanded ${direction}. Your town is now ${map.width} × ${map.height} tiles.`;
}
function transform(b: Building, p: Point): Point {
  let { x, y } = p;
  let w = b.kind === 'home' ? 2 : 3;
  let h = 2;
  for (let r = 0; r < b.rotation; r++) {
    [x, y] = [h - 1 - y, x];
    [w, h] = [h, w];
  }
  return { x: b.x + x, y: b.y + y };
}
export function footprint(b: Building): Point[] {
  const points: Point[] = [];
  for (let y = 0; y < 2; y++) for (let x = 0; x < (b.kind === 'home' ? 2 : 3); x++) points.push(transform(b, { x, y }));
  return points;
}
export function entrance(b: Building): Point {
  return transform(b, { x: b.kind === 'home' ? 0 : 1, y: 2 });
}
export function findPath(city: City, start: Point, end: Point): Point[] | null {
  const roads = new Set(city.roads.map(key));
  if (!roads.has(key(start)) || !roads.has(key(end))) return null;
  const queue = [start];
  const previous = new Map<string, Point | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (equal(p, end)) {
      const result: Point[] = [];
      let cursor: Point | null = p;
      while (cursor) { result.push({ ...cursor }); cursor = previous.get(key(cursor)) ?? null; }
      return result.reverse();
    }
    for (const n of [{ x: p.x + 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y - 1 }]) {
      if (roads.has(key(n)) && !previous.has(key(n))) { previous.set(key(n), p); queue.push(n); }
    }
  }
  return null;
}
function destination(city: City, home: Building): { store: Building; path: Point[] } | null {
  let best: { store: Building; path: Point[] } | null = null;
  for (const store of city.buildings.filter(b => b.kind === 'store')) {
    const path = findPath(city, entrance(home), entrance(store));
    if (path && (!best || path.length < best.path.length)) best = { store, path };
  }
  return best;
}
export function connectedHomes(city: City): number {
  return city.buildings.filter(b => b.kind === 'home' && destination(city, b)).length;
}
/** Current shortest outbound route, independent of any journey already in progress. */
export function routeForHome(city: City, home: Building): Point[] | null {
  if (home.kind !== 'home') return null;
  return destination(city, home)?.path ?? null;
}
/** Planned driving time out and back; excludes waiting for the next departure. */
export function averageTripSeconds(city: City): number | null {
  const routes = city.buildings.filter(b => b.kind === 'home').map(b => routeForHome(city, b)).filter(p => p !== null);
  if (routes.length === 0) return null;
  return routes.reduce((sum, path) => sum + 2 * (path.length - 1) / TRAVEL_TILES_PER_SECOND, 0) / routes.length;
}
export function income(city: City): number { return 200 + connectedHomes(city) * 100; }
function validTrip(city: City, trip: Trip): boolean {
  const home = city.buildings.find(b => b.id === trip.homeId && b.kind === 'home');
  const store = city.buildings.find(b => b.id === trip.storeId && b.kind === 'store');
  const roads = new Set(city.roads.map(key));
  return !!home && !!store && trip.path.length > 0 && equal(trip.path[0], entrance(home))
    && equal(trip.path[trip.path.length - 1], entrance(home)) && trip.path.some(p => equal(p, entrance(store)))
    && trip.path.every((p, i) => roads.has(key(p)) && (i === 0 || Math.abs(p.x - trip.path[i - 1].x) + Math.abs(p.y - trip.path[i - 1].y) === 1));
}
export function place(city: City, tool: Tool, x: number, y: number, rotation = 0): string {
  const p = { x, y };
  if (!inBounds(city, p)) return 'Choose a tile inside the map.';
  const building = city.buildings.find(b => footprint(b).some(tile => equal(tile, p)));
  const roadIndex = city.roads.findIndex(tile => equal(tile, p));
  if (tool === 'bulldoze') {
    if (building) { city.buildings = city.buildings.filter(b => b.id !== building.id); city.funds += COSTS[building.kind]; }
    else if (roadIndex >= 0) { city.roads.splice(roadIndex, 1); city.funds += COSTS.road; }
    else return 'Nothing to remove here.';
    city.trips = city.trips.filter(t => validTrip(city, t));
    return `Removed. Full $${building ? COSTS[building.kind] : COSTS.road} refund.`;
  }
  if (!(tool in COSTS)) return 'Choose a construction tool.';
  if (building || roadIndex >= 0) return 'That tile is occupied.';
  if (city.funds < COSTS[tool]) return 'Wait for the next income payment or remove something for a full refund.';
  if (tool === 'road') { city.roads.push(p); city.funds -= COSTS.road; return 'Road built. Connect the entrance arrows.'; }
  if (!integer(rotation) || rotation > 3) return 'Choose a valid rotation.';
  const candidate: Building = { id: city.nextId, kind: tool, x, y, rotation };
  const tiles = footprint(candidate);
  const access = entrance(candidate);
  if (![...tiles, access].every(p => inBounds(city, p))) return 'The building and its entrance must fit inside the map.';
  const occupied = new Set([...city.roads, ...city.buildings.flatMap(footprint)].map(key));
  if (tiles.some(tile => occupied.has(key(tile)))) return 'The building footprint overlaps construction.';
  if (city.buildings.some(b => footprint(b).some(tile => equal(tile, access)) || tiles.some(tile => equal(tile, entrance(b))))) return 'Leave road access at each entrance arrow.';
  city.buildings.push(candidate); city.nextId++; city.funds -= COSTS[tool];
  return `${tool === 'home' ? 'Home' : 'Store'} built. Place a road on its entrance arrow.`;
}
function spawn(city: City) {
  for (const home of city.buildings.filter(b => b.kind === 'home')) {
    if (city.trips.some(t => t.homeId === home.id)) continue;
    const route = destination(city, home);
    if (!route) continue;
    city.trips.push({ id: city.nextId++, homeId: home.id, storeId: route.store.id, progress: 0,
      path: [...route.path, ...route.path.slice(0, -1).reverse()] });
  }
}
export function stepCity(city: City, dt: number): void {
  if (!finite(dt) || dt === 0) return;
  // Advance exactly across payment/departure boundaries so frame rate cannot change outcomes.
  while (dt > 1e-9) {
    const slice = Math.min(dt, INCOME_INTERVAL - city.incomeClock, SPAWN_INTERVAL - city.spawnClock);
    for (const trip of city.trips) trip.progress += slice * TRAVEL_TILES_PER_SECOND;
    const finished = city.trips.filter(t => t.progress >= t.path.length - 1);
    city.completed += finished.length;
    city.trips = city.trips.filter(t => t.progress < t.path.length - 1);
    city.elapsed += slice; city.incomeClock += slice; city.spawnClock += slice; dt -= slice;
    if (city.incomeClock >= INCOME_INTERVAL - 1e-9) { city.incomeClock = 0; city.funds += income(city); }
    if (city.spawnClock >= SPAWN_INTERVAL - 1e-9) { city.spawnClock = 0; spawn(city); }
  }
}
/** Validate and reconstruct rather than trusting imported objects or retaining references. */
export function parseCity(raw: unknown): City | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const map = parseMap(r.map);
  if (!map) return null;
  const area = map.width * map.height;
  if (r.version !== 1 || !Array.isArray(r.roads) || !Array.isArray(r.buildings) || !Array.isArray(r.trips)
    || r.roads.length > area || r.buildings.length > area / 4 || r.trips.length > area / 4
    || !finite(r.funds) || !finite(r.elapsed) || !integer(r.completed) || !integer(r.nextId) || r.nextId < 1
    || !finite(r.incomeClock) || r.incomeClock >= INCOME_INTERVAL || !finite(r.spawnClock) || r.spawnClock >= SPAWN_INTERVAL) return null;
  const city = createCity();
  city.map = map;
  city.funds = Number.MAX_SAFE_INTEGER;
  const ids = new Set<number>();
  for (const value of r.buildings) {
    if (!value || typeof value !== 'object') return null;
    const b = value as Building;
    if (!integer(b.id) || b.id < 1 || ids.has(b.id) || b.id >= r.nextId || (b.kind !== 'home' && b.kind !== 'store') || !integer(b.rotation) || b.rotation > 3) return null;
    const count = city.buildings.length;
    place(city, b.kind, b.x, b.y, b.rotation);
    if (city.buildings.length !== count + 1) return null;
    city.buildings[count].id = b.id; ids.add(b.id);
  }
  for (const value of r.roads) {
    if (!value || typeof value !== 'object') return null;
    const p = value as Point;
    const count = city.roads.length;
    place(city, 'road', p.x, p.y);
    if (city.roads.length !== count + 1) return null;
  }
  for (const value of r.trips) {
    if (!value || typeof value !== 'object') return null;
    const t = value as Trip;
    if (!integer(t.id) || t.id < 1 || t.id >= r.nextId || ids.has(t.id) || !integer(t.homeId) || !integer(t.storeId)
      || !Array.isArray(t.path) || t.path.length < 1 || t.path.length > area * 2 || !t.path.every(p => p && inBounds(city, p))
      || !finite(t.progress) || t.progress > Math.max(0, t.path.length - 1) || city.trips.some(other => other.homeId === t.homeId)
      || !validTrip(city, t)) return null;
    city.trips.push({ id: t.id, homeId: t.homeId, storeId: t.storeId, progress: t.progress, path: t.path.map(p => ({ x: p.x, y: p.y })) }); ids.add(t.id);
  }
  return { ...city, funds: r.funds, elapsed: r.elapsed, completed: r.completed, nextId: r.nextId, incomeClock: r.incomeClock, spawnClock: r.spawnClock };
}
