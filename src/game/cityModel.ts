import {routingSnapshot,responseRoute,civilianRoute} from './cityRouting.ts';
import {patrolAvoid} from './cityPatrols.ts';
/** Logical tiles and routes never depend on sprite dimensions or rendering units. */
import { INITIAL_WIDTH, INITIAL_HEIGHT, initialMap, containsTile, expandedMap, parseMap, type MapBounds, type ExpansionDirection } from './cityMap.ts';
import {
  TRAFFIC_TICK, TRAVEL_TILES_PER_SECOND, roadIndex, trafficTick, migrateLegacyTraffic,
  placeControl, controlAt, removeControl, pruneControls, parseControls, parseHistory, occupiedTiles, bodyTile, isEmergencyResponse, validEmergencyPasses, emergencyReservedTiles,
  type JunctionControl, type TripRecord,
} from './cityTraffic.ts';
import {
  growDemand, spawnTrips, stepVisits, parseHouseholds, capacityRespected, leisureBonus,
  MAX_VISIT_SECONDS, type Household,
} from './cityVisits.ts';
import { parseIncidentState, stepIncidents, type Incident, type JunctionRisk, type ServiceKind } from './cityIncidents.ts';
import { createExternalConnection, parseExternalConnection, retryAutomaticConnection, stepExternal, validExternalTrip, type ExternalConnection } from './cityExternal.ts';
import { createTutorialProgress, parseTutorialProgress, refreshTutorial, noteTutorialConstruction, type TutorialProgress } from './cityTutorial.ts';
import { createMissionProgress, parseMissionProgress, type MissionProgress } from './cityMissions.ts';
import {initializeStarter, starterPlacementError} from './cityStarterTutorial.ts';
import {createExpansionProgress,expansionSnapshot,refreshExpansionProgress,parseExpansionProgress,type ExpansionProgress} from './cityExpansion.ts';
import {
  COSTS, STARTING_FUNDS, constructionPriceForCity, paidForBuilding, clearRoadPayment,
  recordBuildingPayment, recordRoadPayment, consumeGrant, parseRoadPaid, parseEconomyProgress,
  createEconomyProgress, type EconomyProgress,
} from './cityEconomy.ts';
export {
  trafficMetrics, signalAxis, isJunctionTile, controlAt, TRAFFIC_TICK, STOP_DWELL, CAUTION_DWELL,
  METRICS_WINDOW, MAX_HISTORY, JUNCTION_DEGREE, PRESET_LABEL, EMERGENCY_TILES_PER_SECOND,
} from './cityTraffic.ts';
export type { JunctionControl, ControlKind, SignalPreset, TripRecord, TrafficMetrics, Axis } from './cityTraffic.ts';
export {
  buildingStatus, demandSummary, VISIT_SECONDS, VISITOR_CAPACITY, SHOP_INCOME,
  LEISURE_BONUS, LEISURE_BENEFIT_SECONDS, SHOP_INTERVAL, SHOP_CAP, LEISURE_INTERVAL, LEISURE_CAP,
} from './cityVisits.ts';
export type { Household, VisitorSlots } from './cityVisits.ts';
export type { Incident, JunctionRisk, ServiceKind } from './cityIncidents.ts';
export {
  COSTS, STARTING_FUNDS, STALL_SECONDS, WAIVER_BUDGET, constructionPrice, constructionPriceForCity,
  toolPrices, paidForBuilding, paidForRoad, constructionChanged, createEconomyProgress,
} from './cityEconomy.ts';
export type { EconomyProgress, PricedTool } from './cityEconomy.ts';
// Compatibility for the current renderer. New rendering/camera code must use city.map.
export const WIDTH = INITIAL_WIDTH;
export const HEIGHT = INITIAL_HEIGHT;
export const TILE_METERS = 10;
export type BuildingKind = 'home' | 'store' | 'park' | 'hospital' | 'fireStation' | 'policeStation';
export type Tool = BuildingKind | 'road' | 'bulldoze' | 'stop' | 'signal' | 'closure';
export type Point = { x: number; y: number };
export type Building = { id: number; kind: BuildingKind; x: number; y: number; rotation: number; paid?: number; patrolReadyAt?: number };
/**
 * Journey stage. Missing phase is a pre-visit save: one immediate roundtrip, credited on return.
 * outbound/returning drive, visiting is parked off the carriageway, waiting holds a road tile
 * with its intent intact, crashed is an immobile civilian wreck, working is a responder on scene.
 */
export type TripPhase = 'legacy' | 'outbound' | 'visiting' | 'returning' | 'waiting' | 'crashed' | 'working';
export type TripPurpose = 'shopping' | 'leisure';
/** progress and path stay the only source of vehicle position; wait/hold are queue metadata. */
export type Trip = {
  /** Optional query schedule survives reload; derived costs do not. */
  nextRouteQueryAt?: number;
  patrol?: true;
  /** This real crew was replaced and must return without doing scene work. */
  responseCancelled?: true;
  sceneParked?: true;
  external?: { origin: Point };
  id: number; path: Point[]; progress: number; homeId: number; storeId: number; wait: number; hold: number;
  /** Every field below is optional so pre-visit saves and their fixtures still load. */
  phase?: TripPhase; purpose?: TripPurpose; visitRemaining?: number; rewarded?: boolean;
  service?: ServiceKind; stationId?: number; incidentId?: number; workRemaining?: number; speed?: number;
  /** Where this vehicle is still heading, kept across a closure or a rebuilt road. */
  target?: Point; resume?: TripPhase;
  /** Reserved straight overtaking corridor; shift is a continuous 0..1 lateral position. */
  emergencyPass?: { start: number; end: number; stage: 'out' | 'passing' | 'in'; shift: number };
};
export type City = {
  expansion?:ExpansionProgress;
  tutorial?: TutorialProgress;
  external?: ExternalConnection;
  missions?: MissionProgress;
  economy?: EconomyProgress;
  version: 2; map: MapBounds; roads: Point[]; buildings: Building[]; trips: Trip[];
  controls: JunctionControl[]; history: TripRecord[]; households: Household[];
  incidents: Incident[]; risks: JunctionRisk[]; closures: Point[];
  roadPaid?: Record<string, number>;
  funds: number; elapsed: number; completed: number; nextId: number;
  accidentCount: number; rescuedCount: number; fatalities: number;
  incomeClock: number; spawnClock: number; tickClock: number;
};
/** Footprints before rotation. The entrance sits one tile beyond the bottom row. */
export const SIZES: Record<BuildingKind, { w: number; h: number }> = {
  home: { w: 2, h: 2 }, store: { w: 3, h: 2 }, park: { w: 3, h: 3 },
  hospital: { w: 3, h: 2 }, fireStation: { w: 3, h: 2 }, policeStation: { w: 3, h: 2 },
};
export const LABELS: Record<BuildingKind, string> = {
  home: 'Home', store: 'Store', park: 'Park', hospital: 'Hospital', fireStation: 'Fire station', policeStation: 'Police station',
};
/** Which emergency service each station dispatches. Incident dispatch reads this, never artwork. */
export const SERVICE_OF: Record<BuildingKind, ServiceKind | null> = {
  home: null, store: null, park: null, hospital: 'ems', fireStation: 'fire', policeStation: 'police',
};
export const INCOME_INTERVAL = 10;
/**
 * Baseline support is deliberately small: completed visits, not connectivity, fund the town.
 * It only exists so a stalled economy can still afford a road. Provisional value.
 */
export const BASE_SUPPORT = 20;
const SPAWN_INTERVAL = 4;
const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const key = (p: Point) => `${p.x},${p.y}`;
const equal = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const inBounds = (city: City, p: Point) => containsTile(city.map, p);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const point = (v: unknown): v is Point => !!v && typeof v === 'object'
  && Number.isSafeInteger((v as Point).x) && Number.isSafeInteger((v as Point).y);

export function createCity(guidedStarter=false): City {
  const city:City = { version: 2, expansion:createExpansionProgress(), tutorial: createTutorialProgress(true), external: createExternalConnection(), missions: createMissionProgress(),
    economy: {...createEconomyProgress(), stallLesson:'first-visit', stallAt:0, stallMark:0}, map: initialMap(), roads: [], buildings: [], trips: [], controls: [], history: [],
    households: [], incidents: [], risks: [], closures: [],
    funds: STARTING_FUNDS, elapsed: 0, completed: 0, nextId: 1,
    accidentCount: 0, rescuedCount: 0, fatalities: 0, incomeClock: 0, spawnClock: 0, tickClock: 0 };
  if(guidedStarter)initializeStarter(city);
  return city;
}
/** Consume a free strip or an earned permit only after a successful map change. */
export function expandCity(city: City, direction: ExpansionDirection): string {
  const map = expandedMap(city.map, direction);
  if (!map) return 'The map cannot expand further in that direction.';
  refreshExpansionProgress(city);
  const funding=expansionSnapshot(city);
  if(!funding.canExpand)return funding.lockedReason;
  city.map = map;
  city.expansion!.used++;
  refreshTutorial(city);
  return `Expanded ${direction}. Your town is now ${map.width} × ${map.height} tiles. ${city.expansion!.used===2?'The mayor now funds land through completed growth missions.':funding.freeRemaining?'Free introductory expansion.':'One earned land permit used.'}`;
}
function transform(b: Building, p: Point): Point {
  let { x, y } = p;
  let { w, h } = SIZES[b.kind] ?? SIZES.home;
  for (let r = 0; r < b.rotation; r++) {
    [x, y] = [h - 1 - y, x];
    [w, h] = [h, w];
  }
  return { x: b.x + x, y: b.y + y };
}
export function footprint(b: Building): Point[] {
  const { w, h } = SIZES[b.kind] ?? SIZES.home;
  const points: Point[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) points.push(transform(b, { x, y }));
  return points;
}
export function entrance(b: Building): Point {
  const { h } = SIZES[b.kind] ?? SIZES.home;
  return transform(b, { x: b.kind === 'home' ? 0 : 1, y: h });
}
export const isStation = (b: Building): boolean => SERVICE_OF[b.kind] !== null;
export const isDestination = (b: Building): boolean => b.kind === 'store' || b.kind === 'park';
/** Stations of one service, in stable id order, for deterministic dispatch choices. */
export function stations(city: City, service: ServiceKind): Building[] {
  return city.buildings.filter(b => SERVICE_OF[b.kind] === service).sort((a, b) => a.id - b.id);
}
/** Civilian diversions admit responding services; active wrecks always block entry. */
export function isBlocked(city: City, p: Point, responding = false): boolean {
  return (!responding && city.closures.some(c => equal(c, p)))
    || city.incidents.some(i => i.status === 'active' && i.x === p.x && i.y === p.y);
}
/** Every tile new traffic may not enter. Empty in a town with no closures and no incidents. */
export function blockedTiles(city: City, responding = false): Set<string> {
  const set = new Set<string>();
  if (!responding) for (const c of city.closures) set.add(key(c));
  for (const i of city.incidents) if (i.status === 'active') set.add(`${i.x},${i.y}`);
  return set;
}
/** The start tile is always allowed so a vehicle caught inside a closure can still drive out. */
export function findPath(city: City, start: Point, end: Point, responding = false, avoid: Set<string> = new Set()): Point[] | null {
  const roads = new Set(city.roads.map(key));
  if (!roads.has(key(start)) || !roads.has(key(end))) return null;
  const blocked = blockedTiles(city, responding);
  for (const tile of avoid) if (tile !== key(start)) blocked.add(tile);
  if (blocked.has(key(end))) return null;
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
      if (roads.has(key(n)) && !blocked.has(key(n)) && !previous.has(key(n))) { previous.set(key(n), p); queue.push(n); }
    }
  }
  return null;
}
/** Planning may retain a journey through a temporary obstruction; movement still obeys it. */
export function plannedRoadPath(city:City,start:Point,end:Point):Point[]|null {
  return findPath({...city,incidents:[],closures:[]},start,end);
}
/** Nearest reachable store. Connectivity and the route readout ignore capacity on purpose. */
function nearestStore(city: City, home: Building): { store: Building; path: Point[] } | null {
  let best: { store: Building; path: Point[] } | null = null;
  for (const store of city.buildings.filter(b => b.kind === 'store')) {
    const path = findPath(city, entrance(home), entrance(store));
    if (path && (!best || path.length < best.path.length)) best = { store, path };
  }
  return best;
}
export function connectedHomes(city: City): number {
  return city.buildings.filter(b => b.kind === 'home' && nearestStore(city, b)).length;
}
/** Current shortest outbound route, independent of any journey already in progress. */
export function routeForHome(city: City, home: Building): Point[] | null {
  if (home.kind !== 'home') return null;
  return nearestStore(city, home)?.path ?? null;
}
/** Planned driving time out and back; excludes waiting for the next departure and the visit itself. */
export function averageTripSeconds(city: City): number | null {
  const routes = city.buildings.filter(b => b.kind === 'home').map(b => routeForHome(city, b)).filter(p => p !== null);
  if (routes.length === 0) return null;
  return routes.reduce((sum, path) => sum + 2 * (path.length - 1) / TRAVEL_TILES_PER_SECOND, 0) / routes.length;
}
/** Small unconditional support, plus the tax benefit of households with a recent park visit. */
export function income(city: City): number { return BASE_SUPPORT + leisureBonus(city); }
export const homeOf = (city: City, trip: Trip): Building | undefined =>
  city.buildings.find(b => b.id === trip.homeId && b.kind === 'home');
export const destinationOf = (city: City, trip: Trip): Building | undefined =>
  city.buildings.find(b => b.id === trip.storeId && isDestination(b));
/** Where a vehicle is still heading, so a detour or a rebuilt road can resume the same journey. */
export function goalOf(city: City, trip: Trip): Point | null {
  const phase = trip.phase ?? 'legacy';
  if (phase === 'waiting') return trip.target ?? null;
  if (trip.service) return trip.target ?? trip.path[trip.path.length - 1] ?? null;
  if (phase === 'outbound') {
    const destination = destinationOf(city, trip);
    if (destination) return entrance(destination);
  }
  if (trip.external) return trip.external.origin;
  const home = homeOf(city, trip);
  return home ? entrance(home) : null;
}
/**
 * A vehicle keeps its exact world position while it is still approaching the centre of the tile
 * it stands on, because the tile it came from stays the first step of the new route. Only a
 * vehicle already stopped past that centre by a blockage has to give back up to half a tile.
 */
const beforeCentre = (trip: Trip, k: number) => k >= 1 && trip.progress > k - 0.5 && trip.progress <= k + 1e-9;
/**
 * Re-plan one vehicle from a tile it is standing on. Passing the tile its body currently
 * occupies keeps the vehicle exactly where it is; passing any other tile places it there.
 * Returns false only when the trip has nowhere left to belong.
 */
export function retarget(city: City, trip: Trip, from: Point, avoid?: Set<string>, selectedRoute?: Point[]): boolean {
  if (trip.emergencyPass) return false;
  let goal = goalOf(city, trip);
  if (!goal) return false;
  if (!from) return false;
  const body = bodyTile(trip);
  const k = trip.path[body] && equal(trip.path[body], from) ? body : -1;
  const phase = trip.phase ?? 'legacy';
  const active: TripPhase = phase === 'waiting' ? (trip.resume ?? 'returning')
    : phase === 'legacy' ? 'returning' : phase;
  const smooth = beforeCentre(trip, k);
  const lead = smooth ? [{ ...trip.path[k - 1] }] : [];
  const offset = smooth ? round6(trip.progress - (k - 1)) : 0;
  const responding = isEmergencyResponse(trip);
  if(trip.patrol)avoid=new Set([...patrolAvoid(city,trip),...(avoid??[])]);
  let route = selectedRoute ?? (trip.service && !responding && !trip.patrol && !avoid
    ? civilianRoute(city,from,goal,trip) : findPath(city, from, goal, responding, avoid));
  if(!route&&!trip.service&&!avoid){
    const planned=plannedRoadPath(city,from,goal);
    // Advance along existing clear roads, stopping before the first blocked tile.
    const leavesSceneAccess=planned?.[2]&&city.incidents.some(i=>i.status==='active'&&i.x===planned[2].x&&i.y===planned[2].y);
    if(planned&&planned.length>1&&!isBlocked(city,planned[1])&&!leavesSceneAccess)route=planned;
  }
  if (responding) {
    const incident = city.incidents.find(i => i.id === trip.incidentId && i.status === 'active');
    if (incident) {
      // Selected optional paths already compared all scene approaches on one snapshot.
      route = selectedRoute ?? responseRoute(routingSnapshot(city,roadIndex(city),true),from,incident,trip.id,avoid)?.path ?? null;
      if(route)goal=route[route.length-1];
    }
  }
  trip.target = { ...goal };
  if (route) {
    trip.path = [...lead, ...route];
    trip.progress = offset;
    trip.phase = active;
    return true;
  }
  // Keep the local approach and departure geometry while no route exists. It records
  // the lane actually occupied, including corners, without reserving an entire old route.
  if (k >= 0) {
    const start = Math.max(0, k - 1);
    trip.path = trip.path.slice(start, k + 2).map(p => ({...p}));
    trip.progress = round6(trip.progress - start);
  } else {
    trip.path = [{...from}];
    trip.progress = 0;
  }
  trip.phase = 'waiting';
  trip.resume = active;
  return true;
}
function contiguous(city: City, path: Point[]): boolean {
  return path.length > 0 && path.every((p, i) => point(p) && inBounds(city, p)
    && (i === 0 || Math.abs(p.x - path[i - 1].x) + Math.abs(p.y - path[i - 1].y) === 1));
}
/** Geometry only. Incident ownership of service ids and deadlines is validated by cityIncidents. */
function validTrip(city: City, trip: Trip): boolean {
  const roads = new Set(city.roads.map(key));
  if (!contiguous(city, trip.path)) return false;
  // The vehicle must stand on a road. Road ahead may already be demolished: it re-plans there.
  const here = trip.path[bodyTile(trip)];
  if (!here || !roads.has(key(here))) return false;
  const last = trip.path.length - 1;
  if (!(trip.progress <= last + 1e-9)) return false;
  const phase = trip.phase ?? 'legacy';
  if (trip.service) return phase === 'outbound' || phase === 'returning' || phase === 'working' || phase === 'waiting';
  const home = homeOf(city, trip);
  if (trip.external ? !validExternalTrip(city, trip) : !home) return false;
  if (phase === 'legacy') {
    const store = city.buildings.find(b => b.id === trip.storeId && b.kind === 'store');
    return !!store && equal(trip.path[0], entrance(home!)) && equal(trip.path[last], trip.external?.origin ?? entrance(home!))
      && trip.path.some(p => equal(p, entrance(store)));
  }
  if (phase === 'crashed') return trip.path.length === 1 && trip.progress === 0;
  // A held vehicle stands on its own tile, optionally still showing the tile it arrived from.
  if (phase === 'waiting') return trip.path.length <= 3 && point(trip.target);
  const destination = destinationOf(city, trip);
  if (phase === 'returning') return equal(trip.path[last], trip.external?.origin ?? entrance(home!));
  if (!destination) return false;
  if (phase === 'visiting') return equal(trip.path[last], entrance(destination)) && trip.progress === last;
  return phase === 'outbound' && equal(trip.path[last], entrance(destination));
}
/**
 * Construction never rewrites a route. A vehicle whose road ahead was removed keeps driving
 * and re-plans at the next safe tile centre; only a vehicle whose own tile is gone is dropped.
 */
function revalidateTrips(city: City): void {
  const roads = new Set(city.roads.map(key));
  city.trips = city.trips.filter(trip => {
    if (!trip.service && !trip.external && !homeOf(city, trip)) return false;
    if ((trip.phase ?? 'legacy') === 'visiting') return !!destinationOf(city, trip);
    const here = trip.path[bodyTile(trip)];
    return !!here && roads.has(key(here));
  });
}
/**
 * Occupied construction is protected rather than deleted. Removing a home would erase its
 * journey, and with it a crash victim and any rescue deadline attached to that vehicle.
 */
function removalGuard(city: City, b: Building): string | null {
  if (isStation(b) && city.trips.some(t => t.service && t.stationId === b.id))
    return b.kind==='policeStation' ? 'A police vehicle is out on patrol or a call. Remove the station when it returns.' : `A ${LABELS[b.kind].toLowerCase()} vehicle is still out on a call.`;
  if (b.kind === 'home' && city.trips.some(t => !t.service && t.homeId === b.id))
    return 'This home has a car out. Wait for it to get back.';
  if (isDestination(b) && city.trips.some(t => !t.service && t.storeId === b.id))
    return 'Journeys are booked here. Wait for the visitors to leave.';
  return null;
}
function charge(city: City, tool: Tool): number | string {
  const price = constructionPriceForCity(city, tool);
  if (city.funds < price) return 'Wait for the next income payment or remove something for a full refund.';
  city.funds -= price;
  if (price === 0 && tool in COSTS) consumeGrant(city, tool);
  return price;
}
export function place(city: City, tool: Tool, x: number, y: number, rotation = 0): string {
  const tutorialError=starterPlacementError(city,tool,x,y,rotation);if(tutorialError)return tutorialError;
  const p = { x, y };
  if (!inBounds(city, p)) return 'Choose a tile inside the map.';
  const building = city.buildings.find(b => footprint(b).some(tile => equal(tile, p)));
  const tileIndex = city.roads.findIndex(tile => equal(tile, p));
  if (tool === 'stop' || tool === 'signal') {
    const before = JSON.stringify(city.controls);
    const message = placeControl(city, tool, p);
    if (JSON.stringify(city.controls) !== before) noteTutorialConstruction(city, tool);
    return message;
  }
  if (tool === 'closure') {
    if (tileIndex < 0) return 'Close a road tile.';
    const closed = city.closures.findIndex(c => equal(c, p));
    if (closed >= 0) { city.closures.splice(closed, 1); return 'Road reopened.'; }
    if (emergencyReservedTiles(city).has(key(p))) return 'An emergency vehicle is passing here. Wait for it to merge.';
    city.closures.push({ x, y });
    return 'Road closed. Traffic already on it drives out, new traffic reroutes.';
  }
  if (tool === 'bulldoze') {
    const control = controlAt(city, p);
    if (control) {
      removeControl(city, p);
      return `${control.kind === 'stop' ? 'Stop sign' : 'Traffic light'} removed. Bulldoze again to remove the road.`;
    }
    if (isBlocked(city, p) && city.incidents.some(i => i.status === 'active' && i.x === x && i.y === y))
      return 'An incident is blocking this tile. Clear it before rebuilding.';
    if (building) {
      const guard = removalGuard(city, building);
      if (guard) return guard;
      const refund = paidForBuilding(building);
      city.buildings = city.buildings.filter(b => b.id !== building.id);
      city.funds += refund;
      if (building.kind === 'home') city.households = city.households.filter(h => h.homeId !== building.id);
      pruneControls(city);
      revalidateTrips(city);
      return `Removed. Full $${refund} refund.`;
    } else if (tileIndex >= 0) {
      if (occupiedTiles(city).has(key(p))) return 'A vehicle is on that road. Wait for it to pass.';
      const refund = clearRoadPayment(city, p);
      city.roads.splice(tileIndex, 1);
      city.closures = city.closures.filter(c => !equal(c, p));
      city.funds += refund;
      pruneControls(city);
      revalidateTrips(city);
      return `Removed. Full $${refund} refund.`;
    } else return 'Nothing to remove here.';
  }
  if (!(tool in COSTS)) return 'Choose a construction tool.';
  if (building || tileIndex >= 0) return 'That tile is occupied.';
  if (tool === 'road') {
    if ([...emergencyReservedTiles(city)].some(k => { const [qx,qy]=k.split(',').map(Number); return Math.abs(qx-x)+Math.abs(qy-y)<=1; })) return 'An emergency vehicle is passing nearby. Wait for it to merge.';
    const priced = charge(city, tool);
    if (typeof priced === 'string') return priced;
    city.roads.push(p);
    recordRoadPayment(city, p, priced);
    noteTutorialConstruction(city, tool);
    const count=city.controls.length; if(count>0)pruneControls(city);
    return city.controls.length<count ? 'Road built. Joined intersections now share their first control; extra controls removed.' : 'Road built. Unsigned junctions give E/W traffic priority.';
  }
  if (!integer(rotation) || rotation > 3) return 'Choose a valid rotation.';
  const candidate: Building = { id: city.nextId, kind: tool, x, y, rotation };
  const tiles = footprint(candidate);
  const access = entrance(candidate);
  if (![...tiles, access].every(tile => inBounds(city, tile))) return 'The building and its entrance must fit inside the map.';
  const occupied = new Set([...city.roads, ...city.buildings.flatMap(footprint)].map(key));
  if (tiles.some(tile => occupied.has(key(tile)))) return 'The building footprint overlaps construction.';
  if (city.buildings.some(b => footprint(b).some(tile => equal(tile, access)) || tiles.some(tile => equal(tile, entrance(b))))) return 'Leave road access at each entrance arrow.';
  const priced = charge(city, tool);
  if (typeof priced === 'string') return priced;
  recordBuildingPayment(candidate, priced);
  city.buildings.push(candidate); city.nextId++;
  noteTutorialConstruction(city, tool);
  return `${LABELS[tool]} built. ${city.roads.some(p=>equal(p,access))?'Its entrance is connected.':'Place a road on its entrance arrow.'}`;
}
export function stepCity(city: City, dt: number): void {
  if (!finite(dt) || dt === 0) return;
  retryAutomaticConnection(city);
  const index = roadIndex(city);
  // Advance exactly across tick/payment/departure boundaries so frame rate cannot change outcomes.
  while (dt > 1e-9) {
    const slice = Math.min(dt, INCOME_INTERVAL - city.incomeClock, SPAWN_INTERVAL - city.spawnClock, TRAFFIC_TICK - city.tickClock);
    city.elapsed += slice; city.incomeClock += slice; city.spawnClock += slice; city.tickClock += slice; dt -= slice;
    if (city.tickClock >= TRAFFIC_TICK - 1e-9) {
      city.tickClock = 0;
      trafficTick(city, index);
      stepVisits(city, index, TRAFFIC_TICK);
      // Exactly one incident step per traffic tick, with or without vehicles on the road.
      stepIncidents(city, TRAFFIC_TICK);
      stepExternal(city, index, TRAFFIC_TICK);
      refreshTutorial(city);
    }
    if (city.incomeClock >= INCOME_INTERVAL - 1e-9) { city.incomeClock = 0; city.funds += income(city); }
    if (city.spawnClock >= SPAWN_INTERVAL - 1e-9) {
      city.spawnClock = 0;
      growDemand(city, SPAWN_INTERVAL);
      spawnTrips(city, index);
    }
  }
}
function parsePoints(raw: unknown, roads: Set<string>, limit: number): Point[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > limit) return null;
  const seen = new Set<string>();
  const points: Point[] = [];
  for (const value of raw) {
    if (!point(value)) return null;
    const at = key(value);
    if (seen.has(at)) return null;
    seen.add(at);
    // A closure whose road is gone is dropped on load rather than treated as corruption.
    if (roads.has(at)) points.push({ x: value.x, y: value.y });
  }
  return points;
}
const PHASES: TripPhase[] = ['legacy', 'outbound', 'visiting', 'returning', 'waiting', 'crashed', 'working'];
const SERVICES: ServiceKind[] = ['ems', 'fire', 'police'];
/** Copy only the optional fields the save actually carries, so a reload equals the live trip. */
function parseTrip(city: City, raw: Trip, nextId: number): Trip | null {
  const wait = raw.wait === undefined ? 0 : raw.wait;
  const hold = raw.hold === undefined ? 0 : raw.hold;
  if (!integer(raw.id) || raw.id < 1 || raw.id >= nextId || !integer(raw.homeId) || !integer(raw.storeId)
    || !finite(raw.progress) || !finite(wait) || !finite(hold) || hold > wait + 1e-6) return null;
  // Path entries are validated before they are read, so a null or malformed tile rejects the save.
  if (!raw.path.every(p => point(p) && containsTile(city.map, p))) return null;
  const trip: Trip = { id: raw.id, homeId: raw.homeId, storeId: raw.storeId, progress: raw.progress, wait, hold,
    path: raw.path.map(p => ({ x: p.x, y: p.y })) };
  if(raw.nextRouteQueryAt!==undefined){if(!finite(raw.nextRouteQueryAt))return null;trip.nextRouteQueryAt=raw.nextRouteQueryAt;}
  if(raw.patrol!==undefined){if(raw.patrol!==true||raw.service!=='police'||raw.incidentId!==undefined)return null;trip.patrol=true;}
  if(raw.sceneParked!==undefined){if(raw.sceneParked!==true||!raw.service||raw.phase!=='working'||raw.responseCancelled||raw.patrol)return null;trip.sceneParked=true;}
  if(raw.responseCancelled!==undefined){if(raw.responseCancelled!==true||!raw.service||raw.patrol||raw.incidentId===undefined)return null;trip.responseCancelled=true;}
  if (raw.phase !== undefined) { if (!PHASES.includes(raw.phase)) return null; trip.phase = raw.phase; }
  if (raw.purpose !== undefined) {
    if (raw.purpose !== 'shopping' && raw.purpose !== 'leisure') return null;
    trip.purpose = raw.purpose;
  }
  if (raw.visitRemaining !== undefined) {
    if (!finite(raw.visitRemaining) || raw.visitRemaining > MAX_VISIT_SECONDS) return null;
    trip.visitRemaining = raw.visitRemaining;
  }
  if (raw.rewarded !== undefined) { if (typeof raw.rewarded !== 'boolean') return null; trip.rewarded = raw.rewarded; }
  if (raw.service !== undefined) { if (!SERVICES.includes(raw.service)) return null; trip.service = raw.service; }
  if (raw.stationId !== undefined) {
    if (!integer(raw.stationId) || raw.stationId >= nextId) return null;
    trip.stationId = raw.stationId;
  }
  if (raw.incidentId !== undefined) {
    if (!integer(raw.incidentId) || raw.incidentId >= nextId) return null;
    trip.incidentId = raw.incidentId;
  }
  if (raw.workRemaining !== undefined) {
    if (!finite(raw.workRemaining) || raw.workRemaining > 120) return null;
    trip.workRemaining = raw.workRemaining;
  }
  if (raw.speed !== undefined) {
    if (!finite(raw.speed) || raw.speed <= 0 || raw.speed > 8) return null;
    trip.speed = raw.speed;
  }
  if (raw.target !== undefined) {
    if (!point(raw.target) || !containsTile(city.map, raw.target)) return null;
    trip.target = { x: raw.target.x, y: raw.target.y };
  }
  if (raw.resume !== undefined) { if (!PHASES.includes(raw.resume)) return null; trip.resume = raw.resume; }
  if (raw.emergencyPass !== undefined) {
    const p = raw.emergencyPass;
    if (!p || !trip.service || trip.phase !== 'outbound' || !integer(p.start) || !integer(p.end)
      || p.end < p.start + 2 || p.end >= trip.path.length || !finite(p.shift) || p.shift > 1
      || !['out', 'passing', 'in'].includes(p.stage) || trip.progress < p.start || trip.progress > p.end
      || (p.stage === 'passing' && p.shift !== 1) || (p.stage === 'in' && trip.progress !== p.end)) return null;
    trip.emergencyPass = { start:p.start, end:p.end, stage:p.stage, shift:p.shift };
  }
  if (raw.external !== undefined) {
    if (!raw.external || typeof raw.external !== 'object' || !point(raw.external.origin)) return null;
    trip.external = { origin: { ...raw.external.origin } };
    if (!validExternalTrip(city, trip)) return null;
  }
  return trip;
}
function parsePaidAmount(raw: unknown, cap: number): number | undefined | null {
  if (raw === undefined) return undefined;
  if (!integer(raw) || raw > cap) return null;
  return raw;
}
/** Validate and reconstruct rather than trusting imported objects or retaining references. */
export function parseCity(raw: unknown): City | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const map = parseMap(r.map);
  if (!map) return null;
  const area = map.width * map.height;
  if ((r.version !== 1 && r.version !== 2) || !Array.isArray(r.roads) || !Array.isArray(r.buildings) || !Array.isArray(r.trips)
    || r.roads.length > area || r.buildings.length > area / 4 || r.trips.length > area / 2
    || !finite(r.funds) || !finite(r.elapsed) || !integer(r.completed) || !integer(r.nextId) || r.nextId < 1
    || !finite(r.incomeClock) || r.incomeClock >= INCOME_INTERVAL || !finite(r.spawnClock) || r.spawnClock >= SPAWN_INTERVAL) return null;
  // Legacy saves predate queues, controls, visits and incidents; missing fields migrate to defaults.
  const tickClock = r.tickClock === undefined ? 0 : r.tickClock;
  if (!finite(tickClock) || tickClock >= TRAFFIC_TICK) return null;
  const history = parseHistory(r.history, r.elapsed);
  if (!history) return null;
  const city = createCity();
  city.map = map;
  city.funds = Number.MAX_SAFE_INTEGER;
  const ids = new Set<number>();
  const savedPaid: (number | undefined)[] = [];
  for (const value of r.buildings) {
    if (!value || typeof value !== 'object') return null;
    const b = value as Building;
    // Object.hasOwn, not `in`: a save must not name a prototype member as a building kind.
    if (!integer(b.id) || b.id < 1 || ids.has(b.id) || b.id >= r.nextId
      || typeof b.kind !== 'string' || !Object.hasOwn(SIZES, b.kind)
      || !Number.isSafeInteger(b.x) || !Number.isSafeInteger(b.y)
      || !integer(b.rotation) || b.rotation > 3) return null;
    const paid = parsePaidAmount(b.paid, COSTS[b.kind]);
    if (paid === null) return null;
    const count = city.buildings.length;
    place(city, b.kind, b.x, b.y, b.rotation);
    if (city.buildings.length !== count + 1) return null;
    city.buildings[count].id = b.id; ids.add(b.id);
    if(b.patrolReadyAt!==undefined){
      if(b.kind!=='policeStation'||!finite(b.patrolReadyAt))return null;city.buildings[count].patrolReadyAt=b.patrolReadyAt;
    }
    savedPaid.push(paid);
  }
  for (const value of r.roads) {
    if (!value || typeof value !== 'object') return null;
    const p = value as Point;
    const count = city.roads.length;
    place(city, 'road', p.x, p.y);
    if (city.roads.length !== count + 1) return null;
  }
  for (let i = 0; i < city.buildings.length; i++) {
    const paid = savedPaid[i];
    if (paid === undefined) delete city.buildings[i].paid;
    else city.buildings[i].paid = paid;
  }
  const restoredRoads = parseRoadPaid(r.roadPaid, city.roads, area);
  if (restoredRoads === null) return null;
  if (restoredRoads === undefined) delete city.roadPaid;
  else city.roadPaid = Object.keys(restoredRoads).length ? restoredRoads : undefined;
  const roads = new Set(city.roads.map(key));
  const closures = parsePoints(r.closures, roads, area);
  if (!closures) return null;
  city.closures = closures;
  const external = parseExternalConnection(r.external, city.map);
  if (!external) return null;
  city.external = external;
  for (const value of r.trips) {
    if (!value || typeof value !== 'object') return null;
    const t = value as Trip;
    if (!Array.isArray(t.path) || t.path.length < 1 || t.path.length > area * 2) return null;
    const trip = parseTrip(city, t, r.nextId);
    if (!trip || ids.has(trip.id) || trip.wait > r.elapsed + 1e-6
      || (!trip.service && !trip.external && city.trips.some(other => !other.service && !other.external && other.homeId === trip.homeId))
      || !validTrip(city, trip)) return null;
    city.trips.push(trip); ids.add(trip.id);
  }
  if (city.external.completed + city.trips.filter(t=>t.external).length > city.external.arrivals
    || city.trips.filter(t=>t.external).length > 16) return null;
  if (r.trips.some(t => t.wait === undefined || t.hold === undefined)) migrateLegacyTraffic(city);
  const controls = parseControls(r.controls, roadIndex(city), area);
  if (!controls) return null;
  city.elapsed = r.elapsed; // Validate time-based household benefits against the restored clock.
  const households = parseHouseholds(r.households, city);
  if (!households || !capacityRespected(city)) return null;
  city.households = households;
  city.controls = controls;
  city.history = history;
  city.funds = r.funds; city.elapsed = r.elapsed; city.completed = r.completed;
  city.nextId = r.nextId; city.incomeClock = r.incomeClock; city.spawnClock = r.spawnClock; city.tickClock = tickClock;
  // Incidents own their own validation and reconstruct their counters onto this detached city.
  if (!parseIncidentState(r, city) || !validEmergencyPasses(city)) return null;
  const economy = parseEconomyProgress(r.economy, city.elapsed);
  if (!economy) return null;
  city.economy = economy;
  city.missions = parseMissionProgress(r.missions, city.nextId);
  city.tutorial = parseTutorialProgress(r.tutorial, city);
  city.expansion = parseExpansionProgress(r.expansion);
  return city;
}
