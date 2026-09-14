import {journeyAsTrip} from './cityJourneys.ts';
import {hasJourneyAccess} from './cityTransit.ts';
/** FLOW-01 measurement foundation. Read-only, with no rewards, timers or demand changes. */
import {entrance, findPath, goalOf, type City, type TripPurpose} from './cityModel.ts';
import {bodyTile, METRICS_WINDOW} from './cityTraffic.ts';
import {visitorSlots} from './cityVisits.ts';
import {CITY_RULES} from './cityRules.ts';
import {withRoadPathRead} from './cityPathfinding.ts';

/** Prototype parameters, not selected mission balance or professional LOS thresholds. */
export const FLOW_PROTOTYPE = {returnsPerHome: 2, maximumStoppedSeconds: 20, maximumJourneySeconds: 60} as const;

/**
 * The caller retains the original household count throughout a comparison. Growth raises the
 * requirement; demolition cannot lower it. Replacement homes can qualify through new journeys.
 * Counts refer to the last 60 simulated seconds. No wall-clock timer or failure receipt exists.
 */
export function flowSnapshot(city: City, targetHomes: number, purpose: TripPurpose = 'shopping',
  rules: {returnsPerHome:number;maximumStoppedSeconds:number;maximumJourneySeconds:number} = FLOW_PROTOTYPE) {
  return withRoadPathRead(city, () => readFlowSnapshot(city, targetHomes, purpose, rules));
}
function readFlowSnapshot(city: City, targetHomes: number, purpose: TripPurpose,
  rules: {returnsPerHome:number;maximumStoppedSeconds:number;maximumJourneySeconds:number}) {
  if (!Number.isSafeInteger(targetHomes) || targetHomes < 1) throw new Error('Flow needs a fixed positive household target');
  const now = Math.round(city.elapsed * 1e6) / 1e6, since = now - METRICS_WINDOW;
  const kind = purpose === 'shopping' ? 'store' : 'park';
  const destinations = city.buildings.filter(b => b.kind === kind).map(b => ({...b, ...visitorSlots(city, b)}));
  const records = city.history.filter(h => h.at > since && h.at <= now && h.service?.purpose === purpose);
  const homes = city.buildings.filter(b => b.kind === 'home').map(home => {
    const household = city.households.find(h => h.homeId === home.id);
    const car = city.trips.find(t => t.homeId === home.id && !t.service && !t.external);
    const journey=city.transit?.journeys.find(j=>j.homeId===home.id&&!j.external);
    const trip=car??(journey?journeyAsTrip(journey):undefined);
    const returns = records.filter(h => h.service!.homeId === home.id);
    const liveVisit = trip?.purpose === purpose && trip.rewarded && trip.visitedAt !== undefined
      && trip.visitedAt > since ? 1 : 0;
    const visits = returns.filter(h => h.service!.visitedAt > since).length + liveVisit;
    const reachable = destinations.filter(d => hasJourneyAccess(city,entrance(home),entrance(d)));
    const goal = trip?.phase === 'visiting' ? entrance(home) : trip ? goalOf(city, trip) : null;
    const committedAccess = journey ? !!journey.blockedReason : !!trip && !!goal && !findPath(city, trip.path[bodyTile(trip)], goal);
    const access = reachable.length === 0 || committedAccess;
    const pending = household?.[purpose] ?? 0;
    // A completed parked stay awaiting its return merge must remain visible too.
    const parkedWait = trip?.phase === 'visiting' && trip.rewarded && trip.visitedAt !== undefined
      ? Math.max(0, now - trip.visitedAt) : 0;
    const stoppedSeconds = Math.max(trip?.hold ?? 0, parkedWait);
    const traffic = !!trip && !committedAccess && stoppedSeconds >= CITY_RULES.diagnostics.stoppedSeconds;
    const capacity = !trip && pending > 0 && reachable.length > 0
      && reachable.every(d => d.occupied + d.inbound >= d.capacity);
    const journeySeconds = trip?.startedAt !== undefined ? Math.max(0, now - trip.startedAt) : null;
    const qualified = returns.length >= rules.returnsPerHome && !access && !capacity
      && stoppedSeconds <= rules.maximumStoppedSeconds
      && (journeySeconds === null || journeySeconds <= rules.maximumJourneySeconds);
    return {homeId: home.id, visits, returns: returns.length, pending, access, capacity, traffic,
      stoppedSeconds, journeySeconds, qualified,
      carOut: !!car, purpose: trip?.purpose ?? null,
      returning: trip?.phase === 'returning' || (trip?.phase === 'waiting' && trip.resume === 'returning'),
      parkedAwaitingReturn: trip?.phase === 'visiting' && !!trip.rewarded,
      unknownJourneyAge: !!trip && trip.startedAt === undefined};
  });
  const requiredHomes = Math.max(targetHomes, homes.length);
  const attributed = records.filter(h => homes.some(home => home.homeId === h.service!.homeId));
  const durations = attributed.filter(h => h.service!.startedAt !== undefined)
    .map(h => h.at - h.service!.startedAt!);
  const qualifiedHomes = homes.filter(h => h.qualified).length;
  const ready = qualifiedHomes >= requiredHomes;
  return {observedAt: now, windowSeconds: METRICS_WINDOW, targetHomes, requiredHomes, qualifiedHomes, ready,
    state: ready ? 'serving' as const : homes.some(h => h.access || h.capacity || h.traffic)
      ? 'restricted' as const : 'measuring' as const,
    visits: homes.reduce((sum, h) => sum + h.visits, 0), returns: attributed.length,
    pendingNeeds: homes.reduce((sum, h) => sum + h.pending, 0),
    homesWithoutReturn: homes.filter(h => h.returns === 0).length,
    missingHomes: Math.max(0, targetHomes - homes.length),
    waitingVehicles: homes.filter(h => h.stoppedSeconds >= CITY_RULES.diagnostics.stoppedSeconds).length,
    longestStop: Math.max(0, ...homes.map(h => h.stoppedSeconds)),
    averageCompletedJourneySeconds: durations.length ? durations.reduce((a,b) => a+b, 0) / durations.length : null,
    accessLimitedHomes: homes.filter(h => h.access).length,
    capacityLimitedHomes: homes.filter(h => h.capacity).length,
    trafficLimitedHomes: homes.filter(h => h.traffic).length,
    spareDestinationSlots: destinations.reduce((sum,d) => sum + d.capacity - d.occupied - d.inbound, 0),
    homes};
}
export type FlowSnapshot = ReturnType<typeof flowSnapshot>;

/** Saved observation state lives inside existing mission progress, not a new mission system. */
export type FlowProgress = {
  targetHomes: number; checkedAt: number; readySince?: number;
  label: string; candidate: string; candidateSince: number;
};
export const FLOW_MISSION_ID = 'neighborhood-flow';
const FLOW_MINIMUM_HOMES = 6;
// Civic service accepts one real shopping return per household. The stricter two-return
// FLOW-01 comparison stays available; mixed leisure trips must not invalidate useful service.
export const FLOW_OBJECTIVE_RULES = {returnsPerHome:1, maximumStoppedSeconds:20, maximumJourneySeconds:60};
const FLOW_SETTLE_SECONDS = 4;
const LABEL_SETTLE_SECONDS = 4;
const LABELS = ['Measuring', 'Smooth', 'Busy', 'Crawling', 'Jammed', 'Routes missing', 'Destinations full'];

export function parseFlowProgress(raw: unknown, elapsed: number): FlowProgress | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const p = raw as FlowProgress;
  const time = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= elapsed + 1e-6;
  if (!Number.isSafeInteger(p.targetHomes) || p.targetHomes < FLOW_MINIMUM_HOMES || p.targetHomes > 1024
    || !time(p.checkedAt) || !time(p.candidateSince) || p.candidateSince > p.checkedAt
    || !LABELS.includes(p.label) || !LABELS.includes(p.candidate)
    || (p.readySince !== undefined && (!time(p.readySince) || p.readySince > p.checkedAt))) return undefined;
  return {targetHomes:p.targetHomes, checkedAt:p.checkedAt, label:p.label, candidate:p.candidate,
    candidateSince:p.candidateSince, ...(p.readySince !== undefined ? {readySince:p.readySince} : {})};
}
function labelFor(snapshot: FlowSnapshot): string {
  if (snapshot.accessLimitedHomes) return 'Routes missing';
  if (snapshot.capacityLimitedHomes) return 'Destinations full';
  if (snapshot.longestStop > 20 || snapshot.homes.some(h => (h.journeySeconds ?? 0) > 60)) return 'Jammed';
  if (snapshot.longestStop >= 10) return 'Crawling';
  if (!snapshot.returns) return 'Measuring';
  return snapshot.ready ? 'Smooth' : 'Busy';
}
/** Simulation-time sampling freezes on pause, keeps receipts forever and never alters demand. */
export function refreshFlowProgress(city: City): void {
  const missions = city.missions;
  if (!missions || !['complete','skipped'].includes(city.tutorial?.status ?? '')
    || !missions.completed.includes('word-on-the-street')) return;
  const now = Math.round(city.elapsed * 1e6) / 1e6;
  const homes = city.buildings.filter(b => b.kind === 'home').length;
  const p = missions.flow ??= {targetHomes: Math.max(FLOW_MINIMUM_HOMES, homes), checkedAt:0,
    label:'Measuring', candidate:'Measuring', candidateSince:0};
  if (!missions.completed.includes(FLOW_MISSION_ID)) p.targetHomes = Math.max(p.targetHomes, homes);
  if (now < p.checkedAt + 1 - 1e-6) return;
  p.checkedAt = now;
  const snapshot = flowSnapshot(city, p.targetHomes, 'shopping', FLOW_OBJECTIVE_RULES), candidate = labelFor(snapshot);
  if (p.candidate !== candidate) { p.candidate = candidate; p.candidateSince = now; }
  if (now - p.candidateSince >= LABEL_SETTLE_SECONDS) p.label = candidate;
  if (!missions.completed.includes(FLOW_MISSION_ID)) {
    if (!snapshot.ready) delete p.readySince;
    else {
      p.readySince ??= now;
      if (now - p.readySince >= FLOW_SETTLE_SECONDS) missions.completed.push(FLOW_MISSION_ID);
    }
  }
}

/** Current approach counts: intentionally no invented throughput on an empty road. */
export function roadFlowSnapshot(city: City, point: {x:number;y:number}) {
  if (!city.roads.some(p => p.x === point.x && p.y === point.y)) return null;
  const roads = new Set(city.roads.map(p=>`${p.x},${p.y}`)), nearby = new Set([`${point.x},${point.y}`]);
  let frontier = [point];
  for(let distance=0;distance<2;distance++){
    const next: {x:number;y:number}[] = [];
    for(const p of frontier)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const q={x:p.x+dx,y:p.y+dy},key=`${q.x},${q.y}`;
      if(roads.has(key)&&!nearby.has(key)){nearby.add(key);next.push(q);}
    }
    frontier=next;
  }
  const trips = city.trips.filter(t => !t.service && !['visiting','working'].includes(t.phase ?? '')
    && nearby.has(`${t.path[bodyTile(t)].x},${t.path[bodyTile(t)].y}`));
  const waiting = trips.filter(t => t.phase==='crashed' || t.hold >= CITY_RULES.diagnostics.stoppedSeconds).length;
  const longestStop = Math.max(0, ...trips.map(t => t.hold));
  return {...point, vehicles:trips.length, waiting, longestStop,
    label: city.closures.some(p=>p.x===point.x&&p.y===point.y) ? 'Diverted' : trips.some(t=>t.phase==='crashed') ? 'Jammed' : !trips.length ? 'Quiet' : longestStop > 20 ? 'Jammed' : longestStop >= 10 ? 'Crawling' : waiting ? 'Busy' : 'Moving'};
}
export function flowReport(city: City, selectedRoad: {x:number;y:number} | null = null) {
  const snapshot = flowSnapshot(city, city.missions?.flow?.targetHomes ?? Math.max(FLOW_MINIMUM_HOMES, city.buildings.filter(b=>b.kind==='home').length), 'shopping', FLOW_OBJECTIVE_RULES);
  const reason = snapshot.missingHomes ? `${snapshot.missingHomes} more homes needed for this neighborhood.`
    : snapshot.accessLimitedHomes ? `${snapshot.accessLimitedHomes} homes need a shopping or return route.`
    : snapshot.capacityLimitedHomes ? `${snapshot.capacityLimitedHomes} homes await space reserved by visitors or arriving cars.`
    : snapshot.waitingVehicles ? `${snapshot.waitingVehicles} cars waiting on roads or at shop exits.`
    : snapshot.homesWithoutReturn ? `${snapshot.homesWithoutReturn} homes still need a recent shopping return.`
    : snapshot.ready ? 'Every household is shopping and getting home. Keep this service going.'
    : 'Keep shopping trips going to measure service.';
  return {label:city.missions?.flow?.label ?? labelFor(snapshot), reason,
    visits:snapshot.visits, returns:snapshot.returns, pendingNeeds:snapshot.pendingNeeds,
    waitingVehicles:snapshot.waitingVehicles, accessLimitedHomes:snapshot.accessLimitedHomes,
    capacityLimitedHomes:snapshot.capacityLimitedHomes, homesWithoutReturn:snapshot.homesWithoutReturn,
    qualifiedHomes:snapshot.qualifiedHomes, targetHomes:snapshot.requiredHomes,
    earned:city.missions?.completed.includes(FLOW_MISSION_ID) ?? false,
    selectedRoad:selectedRoad ? roadFlowSnapshot(city, selectedRoad) : null};
}
export type FlowReport = ReturnType<typeof flowReport>;
