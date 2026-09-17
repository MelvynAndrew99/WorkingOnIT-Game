import {abstractService} from './cityBusRidership.ts';
import {journeyActivitySlots, tryWalkingJourney} from './cityJourneys.ts';
import {tryTransitJourney, transitSummary} from './cityTransit.ts';
import {civilianRoute} from './cityRouting.ts';
import {roadAccessToken, withRoadPathRead} from './cityPathfinding.ts';
/**
 * Household demand, destination capacity, and off-road visits.
 * Counts here are households, not people: one home owns one car; an apartment shares bounded demand across four cars, upgraded to six.
 * No artwork, renderer, or incident imports.
 */
import {
  entrance, entrances, findPath, plannedRoadPath, homeOf, destinationOf, retarget, isDestination,
  type Building, type City, type Point, type Trip, type TripPurpose,
} from './cityModel.ts';
import { TRAVEL_TILES_PER_SECOND, startBlocked, bodyTile, type RoadIndex } from './cityTraffic.ts';
import { recordMissionVisit } from './cityMissions.ts';

export type Household = {
  homeId: number; shopping: number; leisure: number; shopClock: number; leisureClock: number;
  /** Elapsed time this household's recent-leisure tax benefit runs out. */
  leisureUntil: number;
  /** Work demand starts only once an office exists; absence preserves legacy household saves. */
  work?: number; workClock?: number;
  /** Alternate equally urgent purposes without changing a journey already underway. */
  lastDeparturePurpose?: TripPurpose;
};
export type VisitorSlots = { occupied: number; capacity: number; inbound: number; label: string };

/** Provisional demand tuning. Needs are bounded, so duplicate buildings cannot invent income. */
export const SHOP_INTERVAL = 8;
export const SHOP_CAP = 3;
/** Provisional apartment demand: four to six concurrent resident cars sharing one saved need ledger. */
export const APARTMENT_CARS = 6;
const residential = (b: Building) => b.kind === 'home' || b.kind === 'apartment';
export const residentialCarCapacity = (b: Building) => b.kind === 'apartment' ? (b.entranceCount === 2 ? APARTMENT_CARS : 4) : 1;
export const LEISURE_INTERVAL = 16;
export const LEISURE_CAP = 1;
export const WORK_INTERVAL = 32;
export const WORK_CAP = 1;
export const officeVisitorCapacity = (b: Building): number => b.entranceCount === 2 ? 16 : 8;
/** Time parked at a destination, off the carriageway, before the drive home. */
export const VISIT_SECONDS: Record<'store' | 'park' | 'office', number> = { store: 5, park: 10, office: 10 };
/** First-version slots combine parking and activity capacity; they can split later. */
export const VISITOR_CAPACITY: Record<'store' | 'park' | 'office', number> = { store: 4, park: 8, office: 8 };
/** Paid once, on a completed shopping visit. */
export const SHOP_INCOME = 100;
/**
 * A park is not a second shop. A completed leisure visit makes that one household contribute a
 * little more tax for a bounded window, so parks pay through households served, never per park.
 */
export const LEISURE_BENEFIT_SECONDS = 60;
export const LEISURE_BONUS = 15;
/** Seconds of extra driving a household accepts to avoid one busy visitor slot. */
export const CROWD_PENALTY = 2;
export const MAX_VISIT_SECONDS = Math.max(...Object.values(VISIT_SECONDS));

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const phaseOf = (t: Trip) => t.phase ?? 'legacy';
const kindOf = (b: Building): 'store' | 'park' | 'office' => b.kind === 'office' ? 'office' : b.kind === 'park' ? 'park' : 'store';
const destinationKind = (purpose: TripPurpose) => purpose === 'work' ? 'office' : purpose === 'shopping' ? 'store' : 'park';
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Stagger by id so households do not all depart on the same four-second boundary. */
export function newHousehold(homeId: number): Household {
  return { homeId, shopping: 1, leisure: 0, leisureUntil: 0,
    shopClock: (homeId % 4) * (SHOP_INTERVAL / 4), leisureClock: (homeId % 4) * (LEISURE_INTERVAL / 4) };
}
/** Extra tax from households with a recent park visit. Bounded by households, not by parks. */
export function leisureBonus(city: City): number {
  let total = 0;
  for (const h of city.households) {
    if (h.leisureUntil > round6(city.elapsed) && city.buildings.some(b => b.id === h.homeId && residential(b))) total += LEISURE_BONUS;
  }
  return total;
}
export function householdFor(city: City, homeId: number): Household {
  let found = city.households.find(h => h.homeId === homeId);
  if (!found) { found = newHousehold(homeId);
    const home = city.buildings.find(b => b.id === homeId);
    if (home?.kind === 'apartment') found.shopping = residentialCarCapacity(home);
    city.households.push(found); }
  return found;
}
/** Needs accumulate to a cap. Unserved demand stays at the home instead of becoming income. */
export function growDemand(city: City, seconds: number): void {
  const hasOffices = city.buildings.some(b => b.kind === 'office');
  for (const home of city.buildings) {
    if (!residential(home)) continue;
    const h = householdFor(city, home.id);
    if (hasOffices) {
      h.work ??= residentialCarCapacity(home);
      h.workClock = round6((h.workClock ?? 0) + seconds * residentialCarCapacity(home));
      while (h.workClock >= WORK_INTERVAL) {
        h.workClock = round6(h.workClock - WORK_INTERVAL);
        h.work = Math.min(WORK_CAP * residentialCarCapacity(home), h.work + 1);
      }
    }
    h.shopClock = round6(h.shopClock + seconds * residentialCarCapacity(home));
    while (h.shopClock >= SHOP_INTERVAL) { h.shopClock = round6(h.shopClock - SHOP_INTERVAL); h.shopping = Math.min(SHOP_CAP * residentialCarCapacity(home), h.shopping + 1); }
    h.leisureClock = round6(h.leisureClock + seconds * residentialCarCapacity(home));
    while (h.leisureClock >= LEISURE_INTERVAL) { h.leisureClock = round6(h.leisureClock - LEISURE_INTERVAL); h.leisure = Math.min(LEISURE_CAP * residentialCarCapacity(home), h.leisure + 1); }
  }
}
/** Occupied counts parked cars; inbound counts reserved slots already driving here. */
export function visitorSlots(city: City, b: Building): { occupied: number; inbound: number; capacity: number } {
  let occupied = 0, inbound = 0;
  for (const t of city.trips) {
    if (t.busId !== undefined || t.service || t.storeId !== b.id) continue;
    const phase = phaseOf(t);
    if (phase === 'visiting') occupied++;
    // A car held up on its way home has already given its slot back.
    else if (phase === 'outbound' || (phase === 'waiting' && t.resume === 'outbound')) inbound++;
  }
  if(city.transit){const travelers=journeyActivitySlots(city.transit.journeys,b.id);occupied+=travelers.occupied;inbound+=travelers.inbound;}
  return { occupied, inbound, capacity: b.kind === 'office' ? officeVisitorCapacity(b) : VISITOR_CAPACITY[kindOf(b)] };
}
/**
 * Choose by driving time plus a penalty for slots already taken or reserved, so a busy near
 * store loses to a quieter one and a distant duplicate is never a compulsory tour.
 */
export function chooseDestination(city: City, home: Building, purpose: TripPurpose, index?: RoadIndex):
  { building: Building; path: Point[] } | null {
  if (home.kind !== 'apartment' && purpose !== 'work') return chooseDestinationFrom(city, entrance(home), purpose);
  return chooseDestinationForDoors(city, entrances(home), purpose, index);
}
function chooseDestinationForDoors(city: City, doors: Point[], purpose: TripPurpose, index?: RoadIndex):
  {building: Building; path: Point[]} | null {
  const kind = destinationKind(purpose);
  for (const allowBlocked of [false, true]) {
    let best: {building: Building; path: Point[]; cost: number} | null = null;
    const route = allowBlocked ? plannedRoadPath : findPath;
    for (const building of city.buildings) {
      if (building.kind !== kind) continue;
      const slots = visitorSlots(city, building);
      if (slots.occupied + slots.inbound >= slots.capacity) continue;
      const destinationDoors = entrances(building);
      if (!destinationDoors.some(from => doors.some(door => route(city, from, door)))) continue;
      for (const door of doors) for (const target of destinationDoors) {
        const path = route(city, door, target);
        if (!path || (index && startBlocked(city, index, path))) continue;
        const cost = (path.length - 1) / TRAVEL_TILES_PER_SECOND + (slots.occupied + slots.inbound) * CROWD_PENALTY;
        if (!best || cost < best.cost || (cost === best.cost && building.id < best.building.id)) best = {building, path, cost};
      }
    }
    if (best) return {building: best.building, path: best.path};
  }
  return null;
}
export function chooseDestinationFrom(city: City, origin: Point, purpose: TripPurpose):
  { building: Building; path: Point[] } | null {
  if (purpose === 'work') return chooseDestinationForDoors(city, [origin], purpose);
  const kind = destinationKind(purpose);
  let best: { building: Building; path: Point[]; cost: number } | null = null;
  for(const allowBlocked of [false,true]) {
  for (const b of city.buildings) {
    if (b.kind !== kind) continue;
    const slots = visitorSlots(city, b);
    if (slots.occupied + slots.inbound >= slots.capacity) continue;
    const path = allowBlocked?plannedRoadPath(city,origin,entrance(b)):findPath(city, origin, entrance(b));
    if (!path) continue;
    if ((city.roadDirections || city.wideRoads) && !(allowBlocked?plannedRoadPath(city,entrance(b),origin):findPath(city,entrance(b),origin))) continue;
    const cost = (path.length - 1) / TRAVEL_TILES_PER_SECOND + (slots.occupied + slots.inbound) * CROWD_PENALTY;
    if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && b.id < best.building.id))
      best = { building: b, path, cost };
  }
  if(best)return {building:best.building,path:best.path};
  }
  return null;
}
/** Prefer urgency; alternate ties so neither purpose can monopolize a household car. */
function purposeFor(h: Household): TripPurpose | null {
  const leisureUrgency = h.leisure / LEISURE_CAP, shoppingUrgency = h.shopping / SHOP_CAP;
  if (h.leisure > 0 && (leisureUrgency > shoppingUrgency
    || (leisureUrgency === shoppingUrgency && h.lastDeparturePurpose !== 'leisure'))) return 'leisure';
  if (h.shopping > 0) return 'shopping';
  return h.leisure > 0 ? 'leisure' : null;
}
export function spawnTrips(city: City, index: RoadIndex): void {
  for (const home of city.buildings) {
    if (!residential(home)) continue;
    const active = city.trips.filter(t => !t.service && t.homeId === home.id);
    const journeys = city.transit?.journeys.filter(j => j.homeId === home.id && !j.external) ?? [];
    if (active.length + journeys.length >= residentialCarCapacity(home)) continue;
    const h = householdFor(city, home.id);
    // During the tutorial emergency, finish the current round trip first, then
    // keep the shopping assignment instead of substituting a reachable park.
    const starter = city.tutorial?.status === 'active' ? city.tutorial.hRoad : undefined;
    const shoppingLesson = !!starter && starter.stage >= 5 && starter.stage <= 7
      && city.incidents.some(i => i.id === starter.incidentId && i.status === 'active');
    // Needs are consumed on completed visits; reserve unpaid apartment assignments until then.
    const available = home.kind === 'apartment' ? {...h,
      shopping: Math.max(0, h.shopping - active.filter(t => !t.rewarded && t.purpose === 'shopping').length),
      leisure: Math.max(0, h.leisure - active.filter(t => !t.rewarded && t.purpose === 'leisure').length),
      ...(h.work !== undefined ? {work: Math.max(0, h.work - active.filter(t => !t.rewarded && t.purpose === 'work').length)} : {}),
    } : h;
    const first = shoppingLesson ? (available.shopping > 0 ? 'shopping' : null) : purposeFor(available);
    if (!first && !(available.work ?? 0)) continue;
    // A missing or full park must never block shopping, and the reverse.
    const order: TripPurpose[] = shoppingLesson ? ['shopping'] : first === 'leisure' ? ['leisure', 'shopping'] : ['shopping', 'leisure'];
    if (!shoppingLesson && (available.work ?? 0) > 0) {
      if (h.lastDeparturePurpose !== 'work') order.unshift('work'); else order.push('work');
    }
    for (const purpose of order) {
      if ((available[purpose] ?? 0) <= 0) continue;
      const choice = chooseDestination(city, home, purpose, index);
      if(city.transit && home.kind === 'home' && purpose !== 'work'){
        const back=choice?findPath(city,entrance(choice.building),entrance(home)):null;
        const roadKeys=new Set(choice?.path.map(p=>`${p.x},${p.y}`));
        const queue=city.trips.filter(t=>!t.service&&t.phase!=='visiting'&&roadKeys.has(`${t.path[bodyTile(t)].x},${t.path[bodyTile(t)].y}`));
        const carCost=choice&&back?(choice.path.length+back.length-2)/TRAVEL_TILES_PER_SECOND+queue.reduce((n,t)=>n+2+Math.min(20,t.hold),0):Infinity;
        if(tryWalkingJourney(city,home,purpose,carCost)||!abstractService(city)&&tryTransitJourney(city,entrance(home),home.id,purpose,carCost)) {h.lastDeparturePurpose=purpose;break;}
      }
      if (!choice) continue;
      const goal = choice.path[choice.path.length - 1];
      const path=civilianRoute(city, choice.path[0], goal) ?? choice.path;
      if(startBlocked(city,index,path))continue;
      h.lastDeparturePurpose = purpose;
      city.trips.push({ id: city.nextId++, homeId: home.id, storeId: choice.building.id, progress: 0,
        wait: 0, hold: 0, startedAt: round6(city.elapsed), path, phase: 'outbound', purpose, visitRemaining: 0, rewarded: false,
        target: { ...goal } });
      break;
    }
  }
}
/** The car leaves the travel lane here; its visitor slot stays reserved until it safely departs. */
export function beginVisit(city: City, trip: Trip): void {
  const destination = destinationOf(city, trip);
  if (!destination) { trip.phase = 'returning'; retarget(city, trip, trip.path[bodyTile(trip)]); return; }
  delete trip.trafficLane; delete trip.laneChange;
  trip.phase = 'visiting';
  trip.visitRemaining = VISIT_SECONDS[kindOf(destination)];
  trip.hold = 0;
}
function consumeNeed(city: City, trip: Trip): void {
  const h = city.households.find(x => x.homeId === trip.homeId);
  if (!h) return;
  if (trip.purpose === 'work') h.work = Math.max(0, (h.work ?? 0) - 1);
  else if (trip.purpose === 'leisure') h.leisure = Math.max(0, h.leisure - 1);
  else h.shopping = Math.max(0, h.shopping - 1);
}
/**
 * Visits are paid once, when the stay actually completes, and only against a real household need.
 * A parked car that cannot rejoin the road keeps its slot rather than vanishing.
 */
export function stepVisits(city: City, index: RoadIndex, dt: number): void {
  const leaving: number[] = [];
  for (const trip of city.trips) {
    if (trip.busId !== undefined || trip.service || phaseOf(trip) !== 'visiting') continue;
    const remaining = trip.visitRemaining ?? 0;
    if (remaining > 0) { trip.visitRemaining = round6(Math.max(0, remaining - dt)); continue; }
    const home = homeOf(city, trip);
    if (!home && !trip.external) { leaving.push(trip.id); continue; }
    if (!trip.rewarded) {
      const household = city.households.find(x => x.homeId === trip.homeId);
      if (trip.purpose === 'leisure') {
        if (household) household.leisureUntil = round6(city.elapsed + LEISURE_BENEFIT_SECONDS);
      } else if (trip.purpose !== 'work') city.funds += SHOP_INCOME;
      consumeNeed(city, trip);
      if (trip.purpose !== 'work') recordMissionVisit(city, trip);
      if (!trip.external && trip.purpose) trip.visitedAt = round6(city.elapsed);
      trip.rewarded = true;
    }
    const doors = trip.external ? [trip.external.origin] : entrances(home!);
    const destination = destinationOf(city, trip);
    const origins = destination?.kind === 'office' ? entrances(destination) : [trip.path[trip.path.length - 1]];
    const paths = origins.flatMap(from => doors.map(goal => civilianRoute(city, from, goal, trip)))
      .filter((path): path is Point[] => !!path).sort((a,b) => a.length - b.length);
    const path = paths.find(candidate => !startBlocked(city, index, candidate));
    const goal = path?.[path.length - 1] ?? doors[0];
    trip.target = { ...goal };
    if (!path) continue;
    delete trip.trafficLane; delete trip.laneChange;
    trip.phase = 'returning';
    trip.path = path;
    trip.progress = 0;
    trip.hold = 0;
  }
  if (leaving.length > 0) city.trips = city.trips.filter(t => !leaving.includes(t.id));
}
const roadIssueCache = new WeakMap<City, {
 token: object; buildings: number[]; issues: ReadonlyMap<number, string | null>;
}>();

/** Derived UI data only. Validate once per report/frame, then use constant-time lookups.
 * Exact entrance values notice in-place edits and loads without save fields or edit hooks.
 * Traffic queues, parking and elapsed time do not affect these access warnings. */
export function homeRoadIssues(city: City): ReadonlyMap<number, string | null> {
 return withRoadPathRead(city, () => {
  const token = roadAccessToken(city);
  const buildings: number[] = [];
  for (const b of city.buildings) {
   if (!residential(b) && b.kind !== 'store') continue;
   const doors = b.kind === 'store' ? [entrance(b)] : entrances(b);
   buildings.push(b.id, b.kind === 'store' ? 0 : 1, doors.length);
   for (const p of doors) buildings.push(p.x, p.y);
  }
  const cached = roadIssueCache.get(city);
  if (cached?.token === token && cached.buildings.length === buildings.length &&
      buildings.every((value, i) => value === cached.buildings[i])) return cached.issues;
  const issues = new Map(city.buildings.filter(residential).map(b => [b.id, homeRoadIssue(city, b)]));
  roadIssueCache.set(city, {token, buildings, issues});
  return issues;
 });
}

/** Access failures are separate from full parking and temporary traffic queues. */
export function homeRoadIssue(city:City, home:Building):string|null {
 const shops=city.buildings.filter(b=>b.kind==='store');
 if(!shops.length)return 'No Store built';
 const doors=entrances(home);
 if(!doors.some(from=>city.roads.some(p=>p.x===from.x&&p.y===from.y)))return 'Entrance needs a road';
 if(!shops.some(shop=>doors.some(from=>findPath(city,from,entrance(shop)))))return 'No route to Store';
 if(!shops.some(shop=>doors.some(from=>findPath(city,from,entrance(shop)))&&doors.some(to=>findPath(city,entrance(shop),to))))return 'Return route blocked';
 return null;
}
/** HUD-facing occupancy for one building. Numbers are households, not people. */
export function buildingStatus(city: City, b: Building, accessIssues?: ReadonlyMap<number, string | null>): VisitorSlots {
  if(b.kind==='busStation'||b.kind==='busStop')return {occupied:0,inbound:0,capacity:b.kind==='busStation'?2:0,label:transitSummary(city)};
  if (isDestination(b)) {
    const slots = visitorSlots(city, b);
    const parkedCars=city.trips.filter(t=>t.busId===undefined&&!t.service&&t.storeId===b.id&&t.phase==='visiting').length;
    const label = `${slots.occupied} of ${slots.capacity} activity places used, ${parkedCars} cars parked`
      + (slots.inbound > 0 ? `, ${slots.inbound} on the way` : '');
    return { occupied: slots.occupied, capacity: slots.capacity, inbound: slots.inbound, label };
  }
  if (residential(b)) {
    const roadIssue = accessIssues?.has(b.id) ? accessIssues.get(b.id) : homeRoadIssue(city,b);
    const journey=city.transit?.journeys.find(j=>j.homeId===b.id&&!j.external);
    const carsOut = city.trips.filter(t => !t.service && t.homeId === b.id).length;
    const out = !!journey || carsOut > 0;
    const h = city.households.find(x => x.homeId === b.id);
    const waiting = (h?.shopping ?? 0) + (h?.leisure ?? 0) + (h?.work ?? 0);
    if (b.kind === 'apartment') return {occupied: carsOut, capacity: residentialCarCapacity(b), inbound: 0,
      label: `${carsOut}/${residentialCarCapacity(b)} cars out, ${waiting} trips wanted · ${entrances(b).length} entrance${entrances(b).length === 1 ? '' : 's'}${roadIssue?` · ${roadIssue}`:''}`};
    return { occupied: out ? 1 : 0, capacity: 1, inbound: 0,
      label: `${journey ? (journey.mode==='bus'?'Traveler using bus':'Traveler walking') : out ? 'Car out' : 'Car at home'}, ${waiting} trip${waiting === 1 ? '' : 's'} wanted${roadIssue?` · ${roadIssue}`:''}` };
  }
  const responding = city.trips.some(t => t.service && t.stationId === b.id);
  return { occupied: responding ? 1 : 0, capacity: 1, inbound: 0, label: city.trips.some(t=>t.stationId===b.id&&t.patrol)?'Police on local patrol':responding ? 'Vehicle responding' : 'Vehicle ready' };
}
/** Unmet household needs and current parked visits, for the HUD and for demand checks. */
export function demandSummary(city: City): { shopping: number; leisure: number; visits: number } {
  let shopping = 0, leisure = 0;
  for (const h of city.households) {
    if (!city.buildings.some(b => b.id === h.homeId && residential(b))) continue;
    shopping += h.shopping; leisure += h.leisure;
  }
  return { shopping, leisure, visits: city.trips.filter(t => t.busId === undefined && !t.service && phaseOf(t) === 'visiting').length+(city.transit?.journeys.filter(j=>j.state==='visiting').length??0) };
}
/**
 * Missing households migrate to fresh demand; corrupt records reject the save.
 * Records are kept in saved order so a reload equals the live town.
 */
export function parseHouseholds(raw: unknown, city: City): Household[] | null {
  if (raw === undefined) return city.trips.some(t => !t.service && (homeOf(city,t)?.kind === 'apartment' || t.purpose === 'work')) ? null : [];
  if (!Array.isArray(raw) || raw.length > city.buildings.length) return null;
  const seen = new Set<number>();
  const households: Household[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object') return null;
    const h = value as Household;
    if (!integer(h.homeId) || seen.has(h.homeId)) return null;
    const home = city.buildings.find(b => b.id === h.homeId && residential(b));
    if (!home) return null;
    if (!integer(h.shopping) || h.shopping > SHOP_CAP * residentialCarCapacity(home) || !integer(h.leisure) || h.leisure > LEISURE_CAP * residentialCarCapacity(home)) return null;
    if ((h.work === undefined) !== (h.workClock === undefined)) return null;
    if (h.work === undefined && city.trips.some(t => t.homeId === home.id && t.purpose === 'work')) return null;
    if (h.work !== undefined && (!integer(h.work) || h.work > WORK_CAP * residentialCarCapacity(home) || !finite(h.workClock) || h.workClock >= WORK_INTERVAL)) return null;
    if (home.kind === 'apartment' || h.work !== undefined || city.trips.some(t => t.homeId === home.id && t.purpose === 'work')) {
      for (const purpose of ['shopping', 'leisure', 'work'] as const) {
        if (home.kind !== 'apartment' && purpose !== 'work') continue;
        const reserved = city.trips.filter(t => !t.service && t.homeId === home.id && !t.rewarded && t.purpose === purpose).length;
        if (reserved > (h[purpose] ?? 0)) return null;
      }
    }
    if (!finite(h.shopClock) || h.shopClock >= SHOP_INTERVAL || !finite(h.leisureClock) || h.leisureClock >= LEISURE_INTERVAL) return null;
    const leisureUntil = h.leisureUntil === undefined ? 0 : h.leisureUntil;
    // A save cannot award itself an unbounded or backdated tax benefit.
    if (!finite(leisureUntil) || leisureUntil > city.elapsed + LEISURE_BENEFIT_SECONDS + 1e-6) return null;
    if (h.lastDeparturePurpose !== undefined && h.lastDeparturePurpose !== 'shopping' && h.lastDeparturePurpose !== 'leisure' && h.lastDeparturePurpose !== 'work') return null;
    seen.add(h.homeId);
    households.push({ homeId: h.homeId, shopping: h.shopping, leisure: h.leisure,
      shopClock: h.shopClock, leisureClock: h.leisureClock, leisureUntil,
      ...(h.work !== undefined ? {work: h.work, workClock: h.workClock} : {}),
      ...(h.lastDeparturePurpose !== undefined ? {lastDeparturePurpose:h.lastDeparturePurpose} : {}) });
  }
  if (city.trips.some(t => !t.service && (homeOf(city,t)?.kind === 'apartment' || t.purpose === 'work') && !seen.has(t.homeId))) return null;
  return households;
}
/** A save must not claim more visitors or reservations than a destination could ever hold. */
export function capacityRespected(city: City): boolean {
  for (const b of city.buildings) {
    if (!isDestination(b)) continue;
    const slots = visitorSlots(city, b);
    if (slots.occupied + slots.inbound > slots.capacity) return false;
  }
  return true;
}
