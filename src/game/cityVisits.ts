/**
 * Household demand, destination capacity, and off-road visits.
 * Counts here are households, not people: one home owns one car and one visitor slot.
 * No artwork, renderer, or incident imports.
 */
import {
  entrance, findPath, plannedRoadPath, homeOf, destinationOf, retarget, isDestination,
  type Building, type City, type Point, type Trip, type TripPurpose,
} from './cityModel.ts';
import { TRAVEL_TILES_PER_SECOND, startBlocked, bodyTile, type RoadIndex } from './cityTraffic.ts';
import { recordMissionVisit } from './cityMissions.ts';

export type Household = {
  homeId: number; shopping: number; leisure: number; shopClock: number; leisureClock: number;
  /** Elapsed time this household's recent-leisure tax benefit runs out. */
  leisureUntil: number;
};
export type VisitorSlots = { occupied: number; capacity: number; inbound: number; label: string };

/** Provisional demand tuning. Needs are bounded, so duplicate buildings cannot invent income. */
export const SHOP_INTERVAL = 8;
export const SHOP_CAP = 3;
export const LEISURE_INTERVAL = 16;
export const LEISURE_CAP = 1;
/** Time parked at a destination, off the carriageway, before the drive home. */
export const VISIT_SECONDS: Record<'store' | 'park', number> = { store: 5, park: 10 };
/** First-version slots combine parking and activity capacity; they can split later. */
export const VISITOR_CAPACITY: Record<'store' | 'park', number> = { store: 4, park: 8 };
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
export const MAX_VISIT_SECONDS = Math.max(VISIT_SECONDS.store, VISIT_SECONDS.park);

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const phaseOf = (t: Trip) => t.phase ?? 'legacy';
const kindOf = (b: Building): 'store' | 'park' => (b.kind === 'park' ? 'park' : 'store');
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
    if (h.leisureUntil > round6(city.elapsed) && city.buildings.some(b => b.id === h.homeId && b.kind === 'home')) total += LEISURE_BONUS;
  }
  return total;
}
export function householdFor(city: City, homeId: number): Household {
  let found = city.households.find(h => h.homeId === homeId);
  if (!found) { found = newHousehold(homeId); city.households.push(found); }
  return found;
}
/** Needs accumulate to a cap. Unserved demand stays at the home instead of becoming income. */
export function growDemand(city: City, seconds: number): void {
  for (const home of city.buildings) {
    if (home.kind !== 'home') continue;
    const h = householdFor(city, home.id);
    h.shopClock = round6(h.shopClock + seconds);
    while (h.shopClock >= SHOP_INTERVAL) { h.shopClock = round6(h.shopClock - SHOP_INTERVAL); h.shopping = Math.min(SHOP_CAP, h.shopping + 1); }
    h.leisureClock = round6(h.leisureClock + seconds);
    while (h.leisureClock >= LEISURE_INTERVAL) { h.leisureClock = round6(h.leisureClock - LEISURE_INTERVAL); h.leisure = Math.min(LEISURE_CAP, h.leisure + 1); }
  }
}
/** Occupied counts parked cars; inbound counts reserved slots already driving here. */
export function visitorSlots(city: City, b: Building): { occupied: number; inbound: number; capacity: number } {
  let occupied = 0, inbound = 0;
  for (const t of city.trips) {
    if (t.service || t.storeId !== b.id) continue;
    const phase = phaseOf(t);
    if (phase === 'visiting') occupied++;
    // A car held up on its way home has already given its slot back.
    else if (phase === 'outbound' || (phase === 'waiting' && t.resume === 'outbound')) inbound++;
  }
  return { occupied, inbound, capacity: VISITOR_CAPACITY[kindOf(b)] };
}
/**
 * Choose by driving time plus a penalty for slots already taken or reserved, so a busy near
 * store loses to a quieter one and a distant duplicate is never a compulsory tour.
 */
export function chooseDestination(city: City, home: Building, purpose: TripPurpose):
  { building: Building; path: Point[] } | null {
  return chooseDestinationFrom(city, entrance(home), purpose);
}
export function chooseDestinationFrom(city: City, origin: Point, purpose: TripPurpose):
  { building: Building; path: Point[] } | null {
  const kind = purpose === 'shopping' ? 'store' : 'park';
  let best: { building: Building; path: Point[]; cost: number } | null = null;
  for(const allowBlocked of [false,true]) {
  for (const b of city.buildings) {
    if (b.kind !== kind) continue;
    const slots = visitorSlots(city, b);
    if (slots.occupied + slots.inbound >= slots.capacity) continue;
    const path = allowBlocked?plannedRoadPath(city,origin,entrance(b)):findPath(city, origin, entrance(b));
    if (!path) continue;
    const cost = (path.length - 1) / TRAVEL_TILES_PER_SECOND + (slots.occupied + slots.inbound) * CROWD_PENALTY;
    if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && b.id < best.building.id))
      best = { building: b, path, cost };
  }
  if(best)return {building:best.building,path:best.path};
  }
  return null;
}
/** Leisure is taken first once it has built up, so a park never starves behind constant shopping. */
function purposeFor(h: Household): TripPurpose | null {
  if (h.leisure > 0 && h.leisure / LEISURE_CAP >= h.shopping / SHOP_CAP) return 'leisure';
  if (h.shopping > 0) return 'shopping';
  return h.leisure > 0 ? 'leisure' : null;
}
export function spawnTrips(city: City, index: RoadIndex): void {
  for (const home of city.buildings) {
    if (home.kind !== 'home') continue;
    if (city.trips.some(t => !t.service && t.homeId === home.id)) continue;
    const h = householdFor(city, home.id);
    // During the tutorial emergency, finish the current round trip first, then
    // keep the shopping assignment instead of substituting a reachable park.
    const starter = city.tutorial?.status === 'active' ? city.tutorial.hRoad : undefined;
    const shoppingLesson = !!starter && starter.stage >= 5 && starter.stage <= 7
      && city.incidents.some(i => i.id === starter.incidentId && i.status === 'active');
    const first = shoppingLesson ? (h.shopping > 0 ? 'shopping' : null) : purposeFor(h);
    if (!first) continue;
    // A missing or full park must never block shopping, and the reverse.
    const order: TripPurpose[] = shoppingLesson ? ['shopping'] : first === 'leisure' ? ['leisure', 'shopping'] : ['shopping', 'leisure'];
    for (const purpose of order) {
      if ((purpose === 'shopping' ? h.shopping : h.leisure) <= 0) continue;
      const choice = chooseDestination(city, home, purpose);
      if (!choice || startBlocked(city, index, choice.path)) continue;
      const goal = choice.path[choice.path.length - 1];
      city.trips.push({ id: city.nextId++, homeId: home.id, storeId: choice.building.id, progress: 0,
        wait: 0, hold: 0, path: choice.path, phase: 'outbound', purpose, visitRemaining: 0, rewarded: false,
        target: { ...goal } });
      break;
    }
  }
}
/** The car leaves the travel lane here; its visitor slot stays reserved until it safely departs. */
export function beginVisit(city: City, trip: Trip): void {
  const destination = destinationOf(city, trip);
  if (!destination) { trip.phase = 'returning'; retarget(city, trip, trip.path[bodyTile(trip)]); return; }
  trip.phase = 'visiting';
  trip.visitRemaining = VISIT_SECONDS[kindOf(destination)];
  trip.hold = 0;
}
function consumeNeed(city: City, trip: Trip): void {
  const h = city.households.find(x => x.homeId === trip.homeId);
  if (!h) return;
  if (trip.purpose === 'leisure') h.leisure = Math.max(0, h.leisure - 1);
  else h.shopping = Math.max(0, h.shopping - 1);
}
/**
 * Visits are paid once, when the stay actually completes, and only against a real household need.
 * A parked car that cannot rejoin the road keeps its slot rather than vanishing.
 */
export function stepVisits(city: City, index: RoadIndex, dt: number): void {
  const leaving: number[] = [];
  for (const trip of city.trips) {
    if (trip.service || phaseOf(trip) !== 'visiting') continue;
    const remaining = trip.visitRemaining ?? 0;
    if (remaining > 0) { trip.visitRemaining = round6(Math.max(0, remaining - dt)); continue; }
    const home = homeOf(city, trip);
    if (!home && !trip.external) { leaving.push(trip.id); continue; }
    if (!trip.rewarded) {
      const household = city.households.find(x => x.homeId === trip.homeId);
      if (trip.purpose === 'leisure') {
        if (household) household.leisureUntil = round6(city.elapsed + LEISURE_BENEFIT_SECONDS);
      } else city.funds += SHOP_INCOME;
      consumeNeed(city, trip);
      recordMissionVisit(city, trip);
      trip.rewarded = true;
    }
    const goal = trip.external ? trip.external.origin : entrance(home!);
    trip.target = { ...goal };
    const path = findPath(city, trip.path[trip.path.length - 1], goal);
    if (!path || startBlocked(city, index, path)) continue;
    trip.phase = 'returning';
    trip.path = path;
    trip.progress = 0;
    trip.hold = 0;
  }
  if (leaving.length > 0) city.trips = city.trips.filter(t => !leaving.includes(t.id));
}
/** Access failures are separate from full parking and temporary traffic queues. */
export function homeRoadIssue(city:City, home:Building):string|null {
 const shops=city.buildings.filter(b=>b.kind==='store');
 if(!shops.length)return 'No Store built';
 const from=entrance(home);
 if(!city.roads.some(p=>p.x===from.x&&p.y===from.y))return 'Entrance needs a road';
 if(!shops.some(shop=>findPath(city,from,entrance(shop))))return 'No route to Store';
 if(!shops.some(shop=>findPath(city,from,entrance(shop))&&findPath(city,entrance(shop),from)))return 'Return route blocked';
 return null;
}
/** HUD-facing occupancy for one building. Numbers are households, not people. */
export function buildingStatus(city: City, b: Building): VisitorSlots {
  if (isDestination(b)) {
    const slots = visitorSlots(city, b);
    const label = `${slots.occupied} of ${slots.capacity} visitor slots used`
      + (slots.inbound > 0 ? `, ${slots.inbound} on the way` : '');
    return { occupied: slots.occupied, capacity: slots.capacity, inbound: slots.inbound, label };
  }
  if (b.kind === 'home') {
    const out = city.trips.some(t => !t.service && t.homeId === b.id);
    const h = city.households.find(x => x.homeId === b.id);
    const waiting = (h?.shopping ?? 0) + (h?.leisure ?? 0);
    return { occupied: out ? 1 : 0, capacity: 1, inbound: 0,
      label: `${out ? 'Car out' : 'Car at home'}, ${waiting} trip${waiting === 1 ? '' : 's'} wanted${homeRoadIssue(city,b)?` · ${homeRoadIssue(city,b)}`:''}` };
  }
  const responding = city.trips.some(t => t.service && t.stationId === b.id);
  return { occupied: responding ? 1 : 0, capacity: 1, inbound: 0, label: responding ? 'Vehicle responding' : 'Vehicle ready' };
}
/** Unmet household needs and current parked visits, for the HUD and for demand checks. */
export function demandSummary(city: City): { shopping: number; leisure: number; visits: number } {
  let shopping = 0, leisure = 0;
  for (const h of city.households) {
    if (!city.buildings.some(b => b.id === h.homeId && b.kind === 'home')) continue;
    shopping += h.shopping; leisure += h.leisure;
  }
  return { shopping, leisure, visits: city.trips.filter(t => !t.service && phaseOf(t) === 'visiting').length };
}
/**
 * Missing households migrate to fresh demand; corrupt records reject the save.
 * Records are kept in saved order so a reload equals the live town.
 */
export function parseHouseholds(raw: unknown, city: City): Household[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > city.buildings.length) return null;
  const seen = new Set<number>();
  const households: Household[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object') return null;
    const h = value as Household;
    if (!integer(h.homeId) || seen.has(h.homeId)) return null;
    if (!integer(h.shopping) || h.shopping > SHOP_CAP || !integer(h.leisure) || h.leisure > LEISURE_CAP) return null;
    if (!finite(h.shopClock) || h.shopClock >= SHOP_INTERVAL || !finite(h.leisureClock) || h.leisureClock >= LEISURE_INTERVAL) return null;
    const leisureUntil = h.leisureUntil === undefined ? 0 : h.leisureUntil;
    // A save cannot award itself an unbounded or backdated tax benefit.
    if (!finite(leisureUntil) || leisureUntil > city.elapsed + LEISURE_BENEFIT_SECONDS + 1e-6) return null;
    if (!city.buildings.some(b => b.id === h.homeId && b.kind === 'home')) return null;
    seen.add(h.homeId);
    households.push({ homeId: h.homeId, shopping: h.shopping, leisure: h.leisure,
      shopClock: h.shopClock, leisureClock: h.leisureClock, leisureUntil });
  }
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
