import { wideRoadTopology } from './cityWideRoads.ts';
import {arriveBus} from './cityTransit.ts';
import { roundaboutIndex, roundaboutEntryBlocked, roundaboutTrafficGaps, addRoundaboutGaps, withRoundaboutIndex, type RoundaboutIndex } from './cityRoundabouts.ts';
import { allowsRoadStep, roadEdgeKey } from './cityDirections.ts';
import {routingSnapshot, responseRoute, weightedRoute, routeCost, worthwhileRoute, type RoutingSnapshot} from './cityRouting.ts';
import {CITY_RULES} from './cityRules.ts';
import {COSTS} from './cityEconomy.ts';
/** Logical queues, junction arbitration, and player traffic control. No artwork or renderer imports. */
import { roadWorkTiles, entrance, isBlocked, blockedTiles, findPath, goalOf, retarget, type City, type Point, type Trip, type TripPurpose } from './cityModel.ts';
import { beginVisit } from './cityVisits.ts';
import { recordConflict, arriveResponse } from './cityIncidents.ts';
import { junctionAreas } from './junctionAreas.ts';

export const TRAFFIC_TICK = 0.025;
export const TRAVEL_TILES_PER_SECOND = 2;
/** Responding vehicles are faster, but still cross one tile boundary at a time. */
export const EMERGENCY_TILES_PER_SECOND = 3;
/** An all-way stop always costs a full halt, even on an empty junction. */
export const STOP_DWELL = 0.8;
/** An uncontrolled junction only costs a look when the driver actually had to stop. */
export const CAUTION_DWELL = 0.4;
export const METRICS_WINDOW = 60;
// Largest map: at most 1024 homes, each departing once per four seconds.
export const MAX_HISTORY = 16384;
/** Unsigned intersections give E/W traffic a 1.5-second approach gap. */
export const PRIORITY_LOOKAHEAD = 3;
/** A junction is a road tile with three or more cardinal road neighbours. */
export const JUNCTION_DEGREE = 3;
/** How long a vehicle stopped past a tile centre waits before backing up to divert. */
export const REPLAN_PATIENCE = 1;

export type ControlKind = 'stop' | 'signal';
export type SignalPreset = 'balanced' | 'ns' | 'ew';
export type JunctionControl = { x: number; y: number; kind: ControlKind; preset: SignalPreset; paid?: number };
export type TripRecord = { at: number; wait: number;
  /** Only an observed local visit followed by a real return earns attribution. */
  service?: { homeId: number; purpose: TripPurpose; visitedAt: number; startedAt?: number };
};
export type TrafficMetrics = { waiting: number; averageWait: number; throughput: number };
export type Axis = 'ns' | 'ew';

const PRESETS: SignalPreset[] = ['balanced', 'ns', 'ew'];
/** Two fixed phases with an all-red clearance between them. Cycle lengths are provisional. */
const TIMING: Record<SignalPreset, { ns: number; ew: number; clear: number }> = {
  balanced: { ns: 10, ew: 10, clear: 1 },
  ns: { ns: 14, ew: 7, clear: 1 },
  ew: { ns: 7, ew: 14, clear: 1 },
};
export const PRESET_LABEL: Record<SignalPreset, string> = {
  balanced: 'balanced', ns: 'favour north-south', ew: 'favour east-west',
};

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const tileKey = (p: Point) => `${p.x},${p.y}`;
const nearby = (p: Point): Point[] => [{ x: p.x + 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y - 1 }];
const heading = (a: Point, b: Point): string => (b.x > a.x ? 'E' : b.x < a.x ? 'W' : b.y > a.y ? 'S' : 'N');
const axisOf = (dir: string): Axis => (dir === 'E' || dir === 'W' ? 'ew' : 'ns');
const phaseOf = (t: Trip) => t.phase ?? 'legacy';
/** Parked visitors are off the carriageway; every other phase has a body on a road tile. */
const onRoad = (t: Trip) => phaseOf(t) !== 'visiting' && !t.sceneParked;
/** Only these phases are trying to drive somewhere this tick. */
const driving = (t: Trip) => {
  const phase = phaseOf(t);
  return phase === 'legacy' || phase === 'outbound' || phase === 'returning';
};
export const isEmergencyResponse = (t: Trip) => !!t.service && (phaseOf(t) === 'outbound' || (phaseOf(t) === 'waiting' && t.resume === 'outbound'));
export const travelLaneOffset = (t: Trip) => t.emergencyPass?.shift ?? (t.laneChange
  ? t.laneChange.from + (t.laneChange.to-t.laneChange.from)*t.laneChange.shift : t.trafficLane ?? 0);
export const emergencyLaneOffset = (t: Trip) => t.emergencyPass?.shift ?? 0;
const stepOf = (t: Trip) => TRAFFIC_TICK * (t.service ? (isEmergencyResponse(t) ? EMERGENCY_TILES_PER_SECOND : TRAVEL_TILES_PER_SECOND) : (t.speed ?? TRAVEL_TILES_PER_SECOND));

export type RoadIndex = { roads: Set<string>; junctions: Set<string>; areas: Map<string, string>; directions?: City['roadDirections']; wideDirections?: Map<string,string>; wideAreas?: Set<string>; roundabouts?:RoundaboutIndex; roundaboutGaps?:Map<string,Set<number>> };
const simulationIndexes = new WeakMap<City, RoadIndex>();
/** Share topology through nested routing/incident helpers only while roads cannot change.
 * Nothing survives the call: edits, reloads and direct model consumers always see fresh roads.
 */
export function withRoadIndex<T>(city: City, action: (index: RoadIndex) => T): T {
  const previous = simulationIndexes.get(city);
  const index = previous ?? roadIndex(city);
  simulationIndexes.set(city, index);
  try { return city.roadDirections ? withRoundaboutIndex(city,()=>action(index)) : action(index); }
  finally {
    if (previous) simulationIndexes.set(city, previous);
    else simulationIndexes.delete(city);
  }
}

/** Roads never change inside one simulation call, so nested helpers reuse its index. */
export function roadIndex(city: City): RoadIndex {
  const prepared = simulationIndexes.get(city);
  if (prepared) return prepared;
  const roads = new Set(city.roads.map(tileKey));
  const junctions = new Set<string>();
  const wide=city.wideRoads?.length?wideRoadTopology(city):undefined,wideDirections=new Map<string,string>();
  for (const p of city.roads) {
    const member=wide?.tiles.get(tileKey(p));
    if (member ? member.junction : nearby(p).filter(n => roads.has(tileKey(n))).length >= JUNCTION_DEGREE) junctions.add(tileKey(p));
    const direction=member?.direction;if(direction)wideDirections.set(tileKey(p),direction);
  }
  const roundabouts=city.roadDirections?roundaboutIndex(city):undefined;
  // A loop's automatic yield must not swallow an adjacent controlled intersection.
  const controlledJunctions=roundabouts?.rings.length
    ? new Set([...junctions].filter(key=>!roundabouts.byTile.has(key))) : junctions;
  const areas=junctionAreas(controlledJunctions);
  const wideAreas=new Set([...(wide?.tiles??[])].filter(([,v])=>v.junction).map(([key])=>areas.get(key)!).filter(Boolean));
  return { roads, junctions, areas, directions: city.roadDirections, ...(wide?.tiles.size?{wideDirections,wideAreas}:{}),
    ...(roundabouts?{roundabouts}:{}) };
}

/**
 * Adjoining junction tiles are one intersection, so one control governs the whole area.
 * Without this a light placed on the far tile of a wide junction would be decorative.
 */
export function governingControl(city: City, index: RoadIndex, p: Point): JunctionControl | undefined {
  if(index.roundabouts?.byTile.has(tileKey(p)))return undefined;
  const area=index.areas.get(tileKey(p));
  return area===undefined ? undefined : (city.controls??[]).find(c=>index.areas.get(tileKey(c))===area);
}

/** One vehicle body reserving one tile. Junction slots also carry the movement they perform. */
type Slot = { tile: string; lane: string; exclusive: boolean; enter: string; exit: string; junction: boolean; area?: string; areaLane?: string; areaEnter?: string; areaExit?: string };
/** Opposing straight-through movements share a junction; every other pair is a conflict. */
function compatible(a: Slot, b: Slot): boolean {
  if (a.exclusive || b.exclusive) return false;
  if (a.enter === b.enter && a.exit === b.exit) return a.lane !== b.lane;
  if (!a.junction || !b.junction) return a.lane !== b.lane;
  return a.enter === a.exit && b.enter === b.exit && axisOf(a.enter) === axisOf(b.enter) && a.enter !== b.enter;
}

export function secondLaneAvailable(index: RoadIndex, path: Point[], i: number): boolean {
  if(!path[i])return false;
  let wideDirection=index.wideDirections?.get(tileKey(path[i]));
  const area=index.areas.get(tileKey(path[i]));
  if(!wideDirection && area && index.wideAreas?.has(area)){
    let before=i,after=i;
    while(before>0 && index.areas.get(tileKey(path[before]))===area)before--;
    while(after+1<path.length && index.areas.get(tileKey(path[after]))===area)after++;
    const incoming=index.wideDirections?.get(tileKey(path[before])),outgoing=index.wideDirections?.get(tileKey(path[after]));
    if(incoming && incoming===outgoing)wideDirection=incoming;
  }
  if(wideDirection) return !!(path[i-1] || path[i+1])
    && (!path[i-1] || heading(path[i-1],path[i])===wideDirection)
    && (!path[i+1] || heading(path[i],path[i+1])===wideDirection);
  if(!index.directions)return false;
  const previous=path[i-1],next=path[i+1];
  return !!(previous || next) && (!previous || !!index.directions[roadEdgeKey(previous,path[i])])
    && (!next || !!index.directions[roadEdgeKey(path[i],next)]);
}
function slotAt(index: RoadIndex, path: Point[], i: number, lane = 0): Slot {
  const p = path[i];
  const prev = i > 0 ? path[i - 1] : null;
  const next = i < path.length - 1 ? path[i + 1] : null;
  const enter = prev ? heading(prev, p) : next ? heading(p, next) : 'N';
  const exit = next ? heading(p, next) : enter;
  const tile = tileKey(p);
  // A vehicle turning back at its destination sweeps the whole tile, so nobody may share it.
  const exclusive = !!prev && !!next && prev.x === next.x && prev.y === next.y;
  const area=index.areas.get(tile);
  let shared:Partial<Slot>={};
  if(area && index.wideAreas?.has(area)){
    let first=i,last=i;
    while(first>0 && index.areas.get(tileKey(path[first-1]))===area)first--;
    while(last+1<path.length && index.areas.get(tileKey(path[last+1]))===area)last++;
    const areaEnter=first>0?heading(path[first-1],path[first]):enter;
    const areaExit=last+1<path.length?heading(path[last],path[last+1]):exit;
    shared={area,areaEnter,areaExit,areaLane:`${area}#${areaEnter}#${tileKey(path[first])}#${lane}`};
  }
  return { ...shared, tile, lane: `${tile}#${lane ? ({N:"S",S:"N",E:"W",W:"E"} as Record<string,string>)[exit] : exit}`, exclusive, enter, exit, junction: index.junctions.has(tile) };
}

/** Actual shared contact movement, including opposing turns under the same green. */
export function conflictingContact(index: RoadIndex, point: Point, a: Trip, b: Trip): boolean {
  const movement = (trip: Trip) => {
    const k = bodyTile(trip);
    const j = [k, k + 1].find(i => trip.path[i] && tileKey(trip.path[i]) === tileKey(point));
    return j === undefined ? null : slotAt(index, trip.path, j, trip.trafficLane??0);
  };
  const first = movement(a), second = movement(b);
  if(first&&second&&axisOf(first.enter)===axisOf(second.enter)){
    const directions=['N','E','S','W'];
    const left=(s:Slot)=>directions[(directions.indexOf(s.enter)+3)%4]===s.exit;
    if(!left(first)&&!left(second))return false;
  }
  // Same-direction followers cannot collide through the failed-yield mechanism.
  return !!first && !!second && first.enter !== second.enter && !compatible(first, second);
}

export function contactAxis(trip: Trip, point: Point): Axis | null {
  const k = bodyTile(trip);
  const j = [k, k + 1].find(i => trip.path[i] && tileKey(trip.path[i]) === tileKey(point));
  if (j === undefined) return null;
  return axisOf(j > 0 ? heading(trip.path[j - 1], trip.path[j])
    : trip.path[1] ? heading(trip.path[0], trip.path[1]) : 'N');
}

/** Entering a junction reserves the whole run of junction tiles plus its first exit tile. */
function heldRange(index: RoadIndex, path: Point[], k: number): [number, number] {
  const last = path.length - 1;
  if(index.roundabouts?.byTile.has(tileKey(path[k])))return [k,Math.min(k+1,last)];
  if (!index.junctions.has(tileKey(path[k]))) return [k, k];
  let j = k;
  while (j < last && index.junctions.has(tileKey(path[j + 1])) && !index.roundabouts?.byTile.has(tileKey(path[j+1]))) j++;
  return [k,index.roundabouts?.byTile.has(tileKey(path[Math.min(j+1,last)]))?j:Math.min(j+1,last)];
}
function heldSlots(index: RoadIndex, path: Point[], k: number, exclusive = false, lane = 0): Slot[] {
  const [start, end] = heldRange(index, path, k);
  const slots: Slot[] = [];
  for (let i = start; i <= end; i++) {
    const slot = slotAt(index, path, i, lane);
    slots.push(exclusive ? { ...slot, exclusive: true } : slot);
  }
  return slots;
}
function tripSlots(index: RoadIndex, trip: Trip, k = bodyTile(trip)): Slot[] {
  const slots=heldSlots(index,trip.path,k,blocksWholeTile(trip),trip.trafficLane??0);
  if(!trip.laneChange)return slots;
  const movement=slotAt(index,trip.path,k),turn=movement.enter!==movement.exit;
  return [...slots,...heldSlots(index,trip.path,k,false,trip.laneChange.to)].map(slot=>turn?{...slot,exclusive:true}:slot);
}
/**
 * A crew working at a scene and a wreck both sit across the carriageway rather than in one lane,
 * so nothing may share their tile, including the vehicle's own turn for home.
 * Waiting vehicles retain their known lane. Old one-point waits have no heading and
 * remain exclusive until a valid route safely recovers their geometry.
 */
const blocksWholeTile = (t: Trip) => phaseOf(t) === 'working' || phaseOf(t) === 'crashed'
  || (phaseOf(t) === 'waiting' && t.path.length === 1);

/** Occupancy: tile -> the slots currently held on it, by vehicle. */
type Grid = Map<string, Map<number, Slot[]>>;
/** Vehicles by id, so an admission check can read the leader it would be following. */
type TripIndex = Map<number, Trip>;
const tripIndex = (city: City): TripIndex => new Map(city.trips.map(t => [t.id, t]));
function claim(grid: Grid, slots: Slot[], id: number): void {
  for (const s of slots) {
    let m = grid.get(s.tile);
    if (!m) { m = new Map(); grid.set(s.tile, m); }
    m.set(id, [...(m.get(id) ?? []), s]);
    if(s.area){const key='wide:'+s.area;let area=grid.get(key);if(!area){area=new Map();grid.set(key,area);}area.set(id,[...(area.get(id)??[]),s]);}
  }
}
function release(grid: Grid, slots: Slot[], id: number): void {
  for (const s of slots) {
    const m = grid.get(s.tile);
    if (m) { m.delete(id); if (m.size === 0) grid.delete(s.tile); }
    if(s.area){const key='wide:'+s.area,area=grid.get(key);area?.delete(id);if(area?.size===0)grid.delete(key);}
  }
}
function vacant(grid: Grid, slot: Slot, id: number): boolean {
  if(slot.area)for(const [owner,slots]of grid.get('wide:'+slot.area)??[]){
    if(owner===id)continue;
    for(const other of slots){
      if(slot.exclusive || other.exclusive)return false;
      const straight=slot.areaEnter===slot.areaExit && other.areaEnter===other.areaExit;
      if(!straight || axisOf(slot.areaEnter!)!==axisOf(other.areaEnter!) || slot.areaLane===other.areaLane)return false;
    }
  }
  const m = grid.get(slot.tile);
  if (!m) return true;
  for (const [owner, slots] of m) {
    if (owner === id) continue;
    for (const other of slots) if (!compatible(slot, other)) return false;
  }
  return true;
}

/** Vehicles occupy tile k while progress is in (k - 0.5, k + 0.5]; they halt on the tile edge. */
export const cellIndex = (progress: number, last: number) => Math.min(last, Math.max(0, Math.ceil(progress - 0.5 - 1e-9)));
/** Index into the trip's own path of the tile its body currently stands on. */
export const bodyTile = (trip: Trip) => cellIndex(trip.progress, trip.path.length - 1);
/** Tiles committed to an active pass, including every member of a crossed junction. */
export function emergencyReservedTiles(city: City): Set<string> {
  const tiles=new Set<string>(),index=roadIndex(city);
  for(const t of city.trips) if(t.emergencyPass) for(const slot of passSlots(index,t)) tiles.add(slot.tile);
  return tiles;
}
/** Road tiles a vehicle body stands on right now, so construction cannot delete it from under one. */
export function occupiedTiles(city: City): Set<string> {
  const tiles = new Set<string>();
  for (const t of city.trips) if (onRoad(t)) {
    tiles.add(tileKey(t.path[bodyTile(t)]));
    if (t.emergencyPass) for (const slot of passSlots(roadIndex(city),t)) tiles.add(slot.tile);
  }
  return tiles;
}

/** Direction edits cannot change occupied geometry or a committed junction/pass. */
export function directionReservedTiles(city: City): Set<string> {
  const index=roadIndex(city), reserved=new Set([...grid(city,index).grid.keys()].filter(key=>!key.startsWith('wide:')));
  for(const trip of city.trips) if(onRoad(trip)) {
    // Rendering interpolates the segment between these centers; protect both ends.
    for(const i of [Math.floor(trip.progress),Math.ceil(trip.progress)]) {
      const p=trip.path[i];if(p)reserved.add(tileKey(p));
    }
  }
  for(const incident of city.incidents)if(incident.status==='active')reserved.add(tileKey(incident));
  return reserved;
}

export function controlAt(city: City, p: Point): JunctionControl | undefined {
  if(city.controls.length===0)return undefined;
  return governingControl(city,roadIndex(city),p);
}

/** Renderer-facing phase. Stop signs report 'red' because they have no green axis. */
export function signalAxis(city: City, control: JunctionControl): Axis | 'red' {
  if (!control || control.kind !== 'signal') return 'red';
  const t = TIMING[control.preset] ?? TIMING.balanced;
  const cycle = t.ns + t.ew + 2 * t.clear;
  // Quantise to the tick grid so phase edges cannot drift with frame chunking.
  const now = Math.round(Math.max(0, city.elapsed) / TRAFFIC_TICK) * TRAFFIC_TICK;
  const phase = now % cycle;
  if (phase < t.ns) return 'ns';
  if (phase < t.ns + t.clear) return 'red';
  if (phase < t.ns + t.clear + t.ew) return 'ew';
  return 'red';
}

/**
 * The green that has just ended, while its all-red clearance is still running.
 * Only a driver who was already rolling on that approach can carry on through it.
 */
export function clearingAxis(city: City, control: JunctionControl): Axis | null {
  if (!control || control.kind !== 'signal') return null;
  const t = TIMING[control.preset] ?? TIMING.balanced;
  const cycle = t.ns + t.ew + 2 * t.clear;
  const now = Math.round(Math.max(0, city.elapsed) / TRAFFIC_TICK) * TRAFFIC_TICK;
  const phase = now % cycle;
  if (phase >= t.ns && phase < t.ns + t.clear) return 'ns';
  if (phase >= t.ns + t.clear + t.ew) return 'ew';
  return null;
}

/**
 * Provisional: a fixed share of ordinary drivers are chancers who take the change rather than
 * the brakes. The share comes from the vehicle id, so a reloaded save replays the same drivers.
 * Buses and responders keep to the signal.
 */
export const RED_RUNNER_SHARE = 4;
export const runsRedLights = (t: Trip) => !t.service && t.busId === undefined
  && (Math.imul(t.id, 2654435761) >>> 24) % RED_RUNNER_SHARE === 0;

/**
 * The east-west vehicle a north-south driver is yielding to, or null when the gap is acceptable.
 * The same pair is what an uncontrolled junction accumulates collision risk from.
 */
function priorityBlocker(city: City, index: RoadIndex, trip: Trip, k: number): number | null {
  const area = index.areas.get(tileKey(trip.path[k + 1]));
  for (const other of city.trips) {
    if (other.id === trip.id || isEmergencyResponse(other) || !driving(other)) continue;
    const first = Math.max(1, Math.floor(other.progress));
    const end = Math.min(other.path.length - 1, Math.ceil(other.progress + PRIORITY_LOOKAHEAD + 1));
    for (let j = first; j <= end; j++) {
      const gap = j - .5 - other.progress;
      if (gap < 0 || gap > PRIORITY_LOOKAHEAD) continue;
      if (index.areas.get(tileKey(other.path[j])) !== area || index.junctions.has(tileKey(other.path[j - 1]))) continue;
      if (axisOf(heading(other.path[j - 1], other.path[j])) === 'ew') return other.id;
    }
  }
  return null;
}

/** No other vehicle anywhere in the junction run. A siren buys space, never a shared tile. */
function junctionClear(index: RoadIndex, g: Grid, trip: Trip, k: number): boolean {
  const area=index.areas.get(tileKey(trip.path[k+1]));
  if(area && index.wideAreas?.has(area))for(const owner of g.get('wide:'+area)?.keys()??[])if(owner!==trip.id)return false;
  const [start, end] = heldRange(index, trip.path, k + 1);
  for (let i = start; i <= end; i++) {
    if(!index.junctions.has(tileKey(trip.path[i])))continue;
    const m = g.get(tileKey(trip.path[i]));
    if (!m) continue;
    for (const owner of m.keys()) if (owner !== trip.id) return false;
  }
  return true;
}

function gated(city: City, index: RoadIndex, g: Grid, trip: Trip, k: number): boolean {
  const circle=index.roundabouts?.byTile.get(tileKey(trip.path[k+1]));
  if(circle)return index.roundabouts!.byTile.get(tileKey(trip.path[k]))===circle
    || !roundaboutEntryBlocked(city,trip,k,index.roundabouts,index.roundaboutGaps);
  const control = governingControl(city, index, trip.path[k + 1]);
  const approach = axisOf(heading(trip.path[k], trip.path[k + 1]));
  // Provisional emergency rule: a responder may claim a red junction only once it is empty.
  const responding = !!trip.service && phaseOf(trip) === 'outbound';
  if (control?.kind === 'signal') {
    if (signalAxis(city, control) === approach) return true;
    // An aggressive driver still rolling at the line takes the change instead of the brakes.
    // The clearance is all-red, so the cross traffic it beats has not been released yet.
    if (!responding && trip.hold === 0 && runsRedLights(trip)
      && clearingAxis(city, control) === approach) return true;
    return responding && junctionClear(index, g, trip, k);
  }
  if (control?.kind === 'stop') {
    if (responding) return junctionClear(index, g, trip, k);
    return trip.hold >= STOP_DWELL - 1e-9;
  }
  // A visible, consistent default priority creates a reason to control a busy crossing.
  // Minor-axis drivers accept a gap; stops and signals replace this priority rule.
  if (!responding && approach === 'ns' && priorityBlocker(city, index, trip, k) !== null) return false;
  return responding || trip.hold === 0 || trip.hold >= CAUTION_DWELL - 1e-9;
}

/** A wreck, a closure or a demolished road all stop entry, however committed the route was. */
function unusable(city: City, index: RoadIndex, p: Point, responding = false): boolean {
  return !index.roads.has(tileKey(p)) || isBlocked(city, p, responding);
}
/**
 * Entering a junction reserves its exit tile too, so nothing ever stops inside the box. Taken
 * literally that reservation costs two tiles of headway: a queue discharges one vehicle per two
 * tile lengths and every driver behind is stopped dead between crossings. A leader still rolling
 * out of the exit tile is different: it gives that tile up before the follower can reach it, so
 * the follower may commit to the junction now and keep the platoon moving at road speed.
 * A stopped leader, a crossing movement, a wide-junction reservation or a responder's exclusive
 * claim all still hold the follower at the line.
 */
function clearingAhead(index: RoadIndex, byId: TripIndex | undefined, g: Grid, trip: Trip, slot: Slot, arrival: number): boolean {
  if (!byId || slot.exclusive || slot.area || isEmergencyResponse(trip)) return false;
  const occupants = g.get(slot.tile);
  if (!occupants) return false;
  for (const [owner, slots] of occupants) {
    if (owner === trip.id || slots.every(other => compatible(slot, other))) continue;
    const other = byId.get(owner);
    if (!other || other.hold > 0 || !driving(other) || other.emergencyPass || other.laneChange) return false;
    const j = bodyTile(other);
    if (tileKey(other.path[j]) !== slot.tile || j >= other.path.length - 1) return false;
    // Only a leader taking the same movement out of the tile is certainly on its way out of it.
    const leader = slotAt(index, other.path, j, other.trafficLane ?? 0);
    if (leader.exclusive || leader.enter !== slot.enter || leader.exit !== slot.exit) return false;
    if ((j + 0.5 - other.progress) / stepOf(other) > arrival) return false;
  }
  return true;
}

function allowed(city: City, index: RoadIndex, grid: Grid, trip: Trip, k: number, byId?: TripIndex): boolean {
  const path = trip.path;
  if (unusable(city, index, path[k + 1], isEmergencyResponse(trip))
    || !allowsRoadStep(city,path[k],path[k+1],index.roads)) return false;
  const target = slotAt(index, path, k + 1, trip.trafficLane??0);
  // Gates apply on entry only; a vehicle already inside a junction run holds it and must clear.
  if ((index.roundabouts?.byTile.has(tileKey(path[k+1])) || !index.junctions.has(tileKey(path[k])) && target.junction)
    && !gated(city,index,grid,trip,k))return false;
  const [start, end] = heldRange(index, path, k + 1);
  for (let i = start; i <= end; i++) {
    if (!allowsRoadStep(city,path[i-1],path[i],index.roads)) return false;
    const slot = slotAt(index, path, i, trip.trafficLane??0);
    if(trip.trafficLane && !secondLaneAvailable(index,path,i))return false;
    // Starting scene work claims both lanes; reserve that space before arrival.
    const required = isEmergencyResponse(trip) && i===path.length-1 ? {...slot, exclusive:true} : slot;
    if (vacant(grid, required, trip.id)) continue;
    // Only the tile past the junction run may be claimed from a leader who is leaving it.
    if (i === end && i > k + 1 && !index.junctions.has(tileKey(path[i]))
      && clearingAhead(index, byId, grid, trip, required, (i - 0.5 - trip.progress) / stepOf(trip))) continue;
    return false;
  }
  return true;
}

function grid(city: City, index: RoadIndex): { grid: Grid; held: Map<number, Slot[]> } {
  const g: Grid = new Map();
  const held = new Map<number, Slot[]>();
  for (const t of city.trips) {
    if (!onRoad(t)) continue;
    const slots = t.emergencyPass ? passSlots(index,t) : tripSlots(index,t);
    if (isEmergencyResponse(t) && !t.emergencyPass) {
      const goal=tileKey(t.path[t.path.length-1]);
      for (const slot of slots) if(slot.tile===goal)slot.exclusive=true;
    }
    held.set(t.id, slots);
    claim(g, slots, t.id);
  }
  return { grid: g, held };
}

/** Reserve the opposing carriageway and both lane-change tiles for the whole maneuver. */
function passSlots(index: RoadIndex, trip: Trip): Slot[] {
  const pass = trip.emergencyPass!;
  const opposite: Record<string,string> = {N:'S',S:'N',E:'W',W:'E'};
  const slots: Slot[] = [];
  for (let i=pass.start;i<=pass.end;i++) {
    const slot=slotAt(index,trip.path,i);
    slots.push({...slot,lane:`${slot.tile}#${opposite[slot.exit]}`,exclusive:i===pass.start || i===pass.end || slot.junction});
  }
  const areas=new Set(slots.filter(s=>s.junction).map(s=>index.areas.get(s.tile)));
  for(const [tile,area] of index.areas) if(areas.has(area) && !slots.some(s=>s.tile===tile))
    slots.push({tile,lane:tile+'#N',exclusive:true,enter:'N',exit:'N',junction:true});
  return slots;
}

/** Yield where there is space: passed cars hold their lane; cars inside junctions keep clearing. */
export function isYielding(city: City, trip: Trip, preparedIndex?: RoadIndex): boolean {
  if (isEmergencyResponse(trip) || !driving(trip) || !city.trips.some(isEmergencyResponse)) return false;
  const k=bodyTile(trip), here=trip.path[k], next=trip.path[k+1];
  const index=preparedIndex ?? roadIndex(city);
  if(index.roundabouts?.byTile.has(tileKey(here)))return false;
  for (const responder of city.trips) {
    if (phaseOf(responder)!=='outbound' || !responder.service || responder.id===trip.id) continue;
    const pass=responder.emergencyPass;
    if (pass && responder.path.slice(pass.start+1,pass.end).some(p=>tileKey(p)===tileKey(here))) return true;
    if (!next || index.junctions.has(tileKey(here))) continue;
    const area=index.areas.get(tileKey(next));
    if (area===undefined) continue;
    if (pass && passSlots(index,responder).some(s=>s.junction && index.areas.get(s.tile)===area)) return true;
    const rk=bodyTile(responder);
    // A stranded exit queue can stop a responder before the junction. Holding
    // the opposing lane as well traps traffic that could clear its way or make
    // an alternate approach usable. Existing admission checks still apply to
    // that traffic; active passing reservations retain priority above.
    if (responder.hold >= REPLAN_PATIENCE && rk + 1 < responder.path.length
      && !index.junctions.has(tileKey(responder.path[rk]))
      && !allowed(city,index,grid(city,index).grid,responder,rk,tripIndex(city))) continue;
    // Yielding must not freeze the vehicle whose occupied space the responder needs.
    // The ordinary movement gate still checks lanes, controls and a clear junction exit.
    if(rk+1<responder.path.length){
      const occupied=tripSlots(index,trip,k);
      const [start,end]=heldRange(index,responder.path,rk+1);
      let mustClear=false;
      for(let i=start;i<=end&&!mustClear;i++){
        const base=slotAt(index,responder.path,i);
        const required=i===responder.path.length-1?{...base,exclusive:true}:base;
        mustClear=occupied.some(slot=>slot.tile===required.tile&&!compatible(required,slot));
      }
      if(mustClear)continue;
    }
    for (let j=rk;j<=Math.min(responder.path.length-1,rk+2);j++) {
      if(index.areas.get(tileKey(responder.path[j]))!==area) continue;
      const from=j>0 ? responder.path[j-1] : responder.path[j];
      const to=j>0 ? responder.path[j] : responder.path[j+1];
      // A lead vehicle can make space by continuing through; never trap it in front of the siren.
      if(to && heading(here,next)===heading(from,to)) continue;
      return true;
    }
  }
  return false;
}

function tryPass(city: City,index: RoadIndex,g: Grid,held: Map<number,Slot[]>,trip: Trip): boolean {
  if (!isEmergencyResponse(trip) || phaseOf(trip)!=='outbound' || trip.hold<TRAFFIC_TICK) return false;
  if(trip.trafficLane || trip.laneChange)return false;
  const k=bodyTile(trip), last=trip.path.length-1;
  if(k+2>last || index.junctions.has(tileKey(trip.path[k])))return false;
  const direction=heading(trip.path[k],trip.path[k+1]);
  if(k>0 && heading(trip.path[k-1],trip.path[k])!==direction)return false;
  // A response may cross a civilian diversion, but never wrecks or working crews.
  const normal=slotAt(index,trip.path,k+1);
  const blockers=g.get(normal.tile);
  if(!blockers || ![...blockers].some(([id,slots])=>id!==trip.id && slots.some(s=>!compatible(normal,s))))return false;
  for(let end=k+1;end<=last;end++) {
    const p=trip.path[end];
    if(unusable(city,index,p,true) || heading(trip.path[end-1],p)!==direction
      || !allowsRoadStep(city,trip.path[end-1],p,index.roads)
      || !allowsRoadStep(city,p,trip.path[end-1],index.roads))break;
    // The merge must finish before a bend or a reversal.
    if(end<last && heading(p,trip.path[end+1])!==direction)break;
    if(end<k+2 || index.junctions.has(tileKey(p)))continue;
    const candidate={...trip,emergencyPass:{start:k,end,stage:'out' as const,shift:0}};
    const slots=passSlots(index,candidate);
    if(slots.some(slot=>!vacant(g,slot,trip.id)))continue;
    trip.emergencyPass=candidate.emergencyPass;
    release(g,held.get(trip.id)??[],trip.id);
    held.set(trip.id,slots);claim(g,slots,trip.id);
    return true;
  }
  return false;
}

function advancePass(trip: Trip): void {
  const pass=trip.emergencyPass!;
  // A 0.4s lateral transition sweeps only the exclusively held start/merge tile.
  if(pass.stage==='out') {
    pass.shift=round6(Math.min(1,pass.shift+TRAFFIC_TICK/0.4));
    if(pass.shift===1)pass.stage='passing';
  } else if(pass.stage==='passing') {
    trip.progress=round6(Math.min(pass.end,trip.progress+stepOf(trip)));
    if(trip.progress===pass.end)pass.stage='in';
  } else {
    pass.shift=round6(Math.max(0,pass.shift-TRAFFIC_TICK/0.4));
    if(pass.shift===0)delete trip.emergencyPass;
  }
  trip.hold=0;
}

/** Reject corrupt corridor geometry/reservations rather than dropping a vehicle's lane on load. */
export function validEmergencyPasses(city: City): boolean {
  const index=roadIndex(city);
  for(const trip of city.trips) {
    const pass=trip.emergencyPass;
    if(!pass)continue;
    if(pass.stage==='out' && bodyTile(trip)!==pass.start)return false;
    const direction=heading(trip.path[pass.start],trip.path[pass.start+1]);
    if(pass.start>0 && heading(trip.path[pass.start-1],trip.path[pass.start])!==direction)return false;
    if(pass.end<trip.path.length-1 && heading(trip.path[pass.end],trip.path[pass.end+1])!==direction)return false;
    for(let i=pass.start;i<=pass.end;i++) {
      if(unusable(city,index,trip.path[i],true) || ((i===pass.start || i===pass.end) && index.junctions.has(tileKey(trip.path[i]))))return false;
      if(i>pass.start && (heading(trip.path[i-1],trip.path[i])!==direction
        || !allowsRoadStep(city,trip.path[i-1],trip.path[i],index.roads)
        || !allowsRoadStep(city,trip.path[i],trip.path[i-1],index.roads)))return false;
    }
    const {grid:g}=grid(city,index);
    if(passSlots(index,trip).some(slot=>!vacant(g,slot,trip.id)))return false;
  }
  return true;
}

/** Saved direction edits may obsolete future routes, never already-committed geometry. */
export function validRoadDirectionCommitments(city:City):boolean {
  const laneTrips=city.trips.filter(t=>t.trafficLane || t.laneChange);
  if(!city.roadDirections && !city.wideRoads?.length)return laneTrips.every(t=>!onRoad(t)||blocksWholeTile(t));
  const index=roadIndex(city);
  if(laneTrips.length){
    const {grid:g}=grid(city,index);
    for(const trip of laneTrips){
      if(!onRoad(trip) || blocksWholeTile(trip))continue;
      const k=bodyTile(trip);
      const [start,end]=heldRange(index,trip.path,k);
      for(let i=start;i<=end;i++)if(!secondLaneAvailable(index,trip.path,i))return false;
      if(trip.emergencyPass)return false;
      if(trip.laneChange){const movement=slotAt(index,trip.path,k);if(movement.exclusive || movement.enter!==movement.exit && trip.laneChange.to!==0)return false;}
      if(tripSlots(index,trip).some(slot=>!vacant(g,slot,trip.id)))return false;
    }
  }
  for(const trip of city.trips) {
    if(!onRoad(trip))continue;
    const low=Math.floor(trip.progress),high=Math.ceil(trip.progress);
    if(low!==high&&!allowsRoadStep(city,trip.path[low],trip.path[high],index.roads))return false;
    if(driving(trip)) {
      const [start,end]=heldRange(index,trip.path,bodyTile(trip));
      for(let i=start+1;i<=end;i++)if(!allowsRoadStep(city,trip.path[i-1],trip.path[i],index.roads))return false;
    }
  }
  return true;
}

/** True when a new vehicle cannot be placed on its home entrance without overlapping traffic. */
export function startBlocked(city: City, index: RoadIndex, path: Point[], responding = false): boolean {
  if (!path.length || isBlocked(city, path[0], responding)) return true;
  if((city.roadDirections || city.wideRoads?.length) && path.some((p,i)=>i>0&&!allowsRoadStep(city,path[i-1],p,index.roads)))return true;
  const control=governingControl(city,index,path[0]);
  if(!responding && path.length>1 && control?.kind==='signal' && signalAxis(city,control)!==axisOf(heading(path[0],path[1])))return true;
  const { grid: g } = grid(city, index);
  const [start, end] = heldRange(index, path, 0);
  if(city.wideRoadWorks){const works=new Set(roadWorkTiles(city).map(tileKey));for(let i=start;i<=end;i++)if(works.has(tileKey(path[i])))return true;}
  for (let i = start; i <= end; i++) if (!vacant(g, {...slotAt(index, path, i), ...(responding && (control || i===path.length-1) ? {exclusive:true} : {})}, -1)) return true;
  return false;
}

/** Old saves allowed intersecting trips. Defer conflicting departures without awarding completions. */
export function migrateLegacyTraffic(city: City): void {
  const index=roadIndex(city), occupied:Grid=new Map();
  city.trips=city.trips.filter(trip=>{
    if(!onRoad(trip))return true;
    const slots=tripSlots(index,trip);
    if(slots.some(slot=>!vacant(occupied,slot,trip.id)))return false;
    claim(occupied,slots,trip.id);return true;
  });
}

/** A wreck clears with its incident; the household keeps the unmet need, not a completion. */
function clearWrecks(city: City): void {
  if (!city.trips.some(t => phaseOf(t) === 'crashed')) return;
  city.trips = city.trips.filter(t => phaseOf(t) !== 'crashed'
    || city.incidents.some(i => i.status === 'active' && i.x === t.path[0].x && i.y === t.path[0].y));
}

/**
 * Route around a new closure or wreck before anything moves, and let a parked-out vehicle
 * rejoin as soon as a road exists again. Keep the approach segment and exact position; a car
 * blocked just beyond a tile centre reverses within its owned tile before changing direction.
 */
function tryRetarget(city:City,index:RoadIndex,trip:Trip,from:Point, avoid?: Set<string>):void {
  const candidate={...trip};
  if(!retarget(city,candidate,from,avoid))return;
  // A congestion detour is optional; retain the current route if no alternate exists.
  if(avoid && candidate.phase==='waiting')return;
  commitTripRoute(city,index,trip,candidate);
}
/** Commit a changed assignment only when its actual lane/junction space is free. */
export function commitTripRoute(city:City,index:RoadIndex,trip:Trip,candidate:Trip):boolean {
  if(trip.laneChange)return false;
  if(!onRoad(trip) || blocksWholeTile(trip)){delete candidate.trafficLane;delete candidate.laneChange;}
  if(candidate.trafficLane){
    const old=slotAt(index,trip.path,bodyTile(trip),1),next=slotAt(index,candidate.path,bodyTile(candidate),1);
    if(!secondLaneAvailable(index,candidate.path,bodyTile(candidate)) || old.enter!==next.enter || old.exit!==next.exit)return false;
  }
  if((city.roadDirections || city.wideRoads?.length) && candidate.phase!=='waiting') {
    for(let i=bodyTile(candidate)+1;i<candidate.path.length;i++)
      if(!allowsRoadStep(city,candidate.path[i-1],candidate.path[i],index.roads))return false;
  }
  const {grid:g}=grid(city,index);
  const slots=tripSlots(index,candidate).map(slot =>
    isEmergencyResponse(candidate) && slot.tile===tileKey(candidate.path[candidate.path.length-1])
      ? {...slot,exclusive:true} : slot);
  // Changing the route can change the occupied lane or turn. Wait for that space before doing so.
  if(city.wideRoadWorks){const works=new Set(roadWorkTiles(city).map(tileKey));if(slots.some(slot=>works.has(slot.tile)))return false;}
  if(slots.some(slot=>!vacant(g,slot,trip.id)))return false;
  if(candidate.trafficLane===undefined)delete trip.trafficLane;
  if(candidate.laneChange===undefined)delete trip.laneChange;
  Object.assign(trip,candidate);return true;
}
function replan(city: City, index: RoadIndex): Set<number> {
  const reversing=new Set<number>();
  let snapshot:RoutingSnapshot|undefined, responseSnapshot:RoutingSnapshot|undefined, queries=0, responseQueries=0;
  // Response work runs first; a separate ordinary quota cannot be consumed by it.
  const ordered=[...city.trips].sort((a,b)=>Number(isEmergencyResponse(b))-Number(isEmergencyResponse(a))
    || (a.nextRouteQueryAt??0)-(b.nextRouteQueryAt??0) || a.id-b.id);
  for (const trip of ordered) {
    const phase = phaseOf(trip);
    const blocked = blockedTiles(city, isEmergencyResponse(trip));
    if (trip.emergencyPass || trip.laneChange) continue;
    const scene=trip.service&&city.incidents.find(i=>i.id===trip.incidentId&&i.completedServices.includes(trip.service!));
    const sceneK=bodyTile(trip),here=trip.path[sceneK];
    if(scene&&trip.hold>=CITY_RULES.routing.sceneReturnRecoverySeconds&&(phase==='returning'||phase==='waiting'&&trip.resume==='returning')&&
      here&&Math.abs(scene.x-here.x)+Math.abs(scene.y-here.y)===1&&trip.progress>sceneK+1e-9){
      trip.progress=round6(Math.max(sceneK,trip.progress-stepOf(trip)));reversing.add(trip.id);continue;
    }
    if (phase === 'waiting') {
      if (trip.target){
        const k=bodyTile(trip);
        if(trip.progress>k+1e-9){
          trip.progress=round6(Math.max(k,trip.progress-stepOf(trip)));
          reversing.add(trip.id);
        }else tryRetarget(city,index,trip,trip.path[k]);
      }
      continue;
    }
    if (phase === 'visiting' || phase === 'crashed' || phase === 'working' || phase === 'bus-dwell') continue;
    const last = trip.path.length - 1;
    if (trip.progress >= last - 1e-9) continue;
    const k = cellIndex(trip.progress, last);
    const safe = trip.progress <= k + 1e-9;
    const stalled = trip.hold >= REPLAN_PATIENCE - 1e-9;
    // Old patrols may be turning across a roundabout exit while yielding to its
    // circulating queue. Abandon that optional patrol, then physically return
    // by another approach. The patrol radius must not imprison the return trip.
    if(trip.patrol && !trip.patrolReturningHome && stalled && trip.hold>=CITY_RULES.routing.civilianReplanSeconds
      && !index.roundabouts?.byTile.has(tileKey(trip.path[k]))
      && index.roundabouts?.byTile.has(tileKey(trip.path[k+1]))
      && slotAt(index,trip.path,k).exclusive) {
      const candidate:Trip={...trip,patrolReturningHome:true};
      const avoid=new Set([tileKey(trip.path[k+1])]);
      if(retarget(city,candidate,trip.path[k],avoid)&&candidate.phase!=='waiting') {
        if(!safe) {
          trip.progress=round6(Math.max(k,trip.progress-stepOf(trip)));
          reversing.add(trip.id);continue;
        }
        if(commitTripRoute(city,index,trip,candidate))continue;
      }
    }
    if (!safe && !stalled) continue;
    let ahead = false;
    for (let i = k + 1; i <= last && !ahead; i++) {
      const tile = tileKey(trip.path[i]);
      ahead = blocked.has(tile) || !index.roads.has(tile)
        || (!!city.roadDirections && !allowsRoadStep(city,trip.path[i-1],trip.path[i],index.roads));
    }
    if (!ahead) {
      // Optional queries never reverse a moving car or rewrite a committed junction.
      // Rotating due times and a per-tick budget keep old routes usable while queries wait.
      if(!trip.patrol && phase!=='legacy') {
        const response=isEmergencyResponse(trip);
        trip.nextRouteQueryAt ??= city.elapsed + (trip.id % CITY_RULES.routing.queryCooldownSeconds)*TRAFFIC_TICK;
        if((safe || trip.hold>=CITY_RULES.routing.civilianReplanSeconds) && (!index.junctions.has(tileKey(trip.path[k])) || trip.hold>=CITY_RULES.routing.civilianReplanSeconds)
          && (response?responseQueries<CITY_RULES.routing.responseQueriesPerTick:queries<CITY_RULES.routing.queriesPerTick) && city.elapsed+1e-9>=trip.nextRouteQueryAt) {
          trip.nextRouteQueryAt=round6(city.elapsed+CITY_RULES.routing.queryCooldownSeconds);
          const goal=goalOf(city,trip);
          if(goal) {
            let view:RoutingSnapshot;
            if(response){responseQueries++;view=responseSnapshot??=routingSnapshot(city,index,true);}
            else {queries++;view=snapshot??=routingSnapshot(city,index);}
            const scene=response?city.incidents.find(i=>i.id===trip.incidentId&&i.status==='active'):undefined;
            const speed=response?EMERGENCY_TILES_PER_SECOND:trip.service?TRAVEL_TILES_PER_SECOND:trip.speed;
            const result=scene?responseRoute(view,trip.path[k],scene,trip.id):weightedRoute(view,trip.path[k],goal,speed,trip.id);
            const old=routeCost(view,trip.path.slice(k),speed,trip.id);
            if(result && worthwhileRoute(old.total,result.cost.total)) {
              if(!safe) {
                // Back up only inside space already owned. Recheck costs/admission at the centre.
                trip.progress=round6(Math.max(k,trip.progress-stepOf(trip)));
                trip.nextRouteQueryAt=city.elapsed;
                reversing.add(trip.id);continue;
              }
              const candidate={...trip};
              if(retarget(city,candidate,trip.path[k],undefined,result.path)&&commitTripRoute(city,index,trip,candidate))continue;
            }
          }
        }
      }
      if (stalled && trip.service && (isEmergencyResponse(trip)||trip.hold>=CITY_RULES.routing.civilianReplanSeconds)) {
        // Retry the same destination around stationary traffic, including newly built roads.
        const remaining = new Set(trip.path.slice(k+1).map(tileKey));
        const avoid = new Set(city.trips.filter(t => t.id!==trip.id && onRoad(t)
          && (t.hold>=REPLAN_PATIENCE || blocksWholeTile(t)))
          .map(t => tileKey(t.path[bodyTile(t)]))
          // Another approach's straight queue may be safely passable. Avoid
          // this blocked route, rather than forbidding every queue in town.
          .filter(tile => !isEmergencyResponse(trip) || remaining.has(tile)));
        avoid.delete(tileKey(trip.path[k]));
        if (trip.path.slice(k+1).some(p=>avoid.has(tileKey(p)))) {
          const candidate={...trip};
          // Do not reverse merely because traffic exists. Without a usable alternative that
          // creates a back-up/creep loop which prevents the queue ahead from ever clearing.
          if(retarget(city,candidate,trip.path[k],avoid) && candidate.phase!=='waiting') {
            if(!safe) {
              trip.progress=round6(Math.max(k,trip.progress-stepOf(trip)));
              reversing.add(trip.id);
            } else commitTripRoute(city,index,trip,candidate);
          }
        }
      }
      continue;
    }
    if(!safe) {
      const next=trip.path[k+1],after=trip.path[k+2];
      const sceneAhead=after&&city.incidents.some(i=>i.status==='active'&&i.x===after.x&&i.y===after.y);
      // A queue facing a distant obstruction must not repeatedly reverse and creep
      // forward when there is still no alternate route. Keep its actual lane.
      if(!trip.service&&next&&!unusable(city,index,next,false)&&!sceneAhead&&trip.target&&!findPath(city,trip.path[k],trip.target))continue;
      // A closure appeared just ahead: back up within the already-owned tile at driving speed.
      // Re-route on reaching its centre, rather than snapping backwards by half a tile.
      trip.progress=round6(Math.max(k,trip.progress-stepOf(trip)));
      reversing.add(trip.id);
      continue;
    }
    tryRetarget(city,index,trip,trip.path[k]);
  }
  return reversing;
}

/** The civilian reserving an incompatible junction movement, if any. */
function crossingBlocker(city: City, index: RoadIndex, g: Grid, byId: Map<number, Trip>, trip: Trip, k: number): number | null {
  const target = slotAt(index, trip.path, k + 1, trip.trafficLane??0);
  const m = g.get(target.tile);
  if (m) for (const [owner, slots] of m) {
    if (owner === trip.id) continue;
    const other = byId.get(owner);
    if (!other || other.service || phaseOf(other) === 'crashed') continue;
    for (const s of slots) {
      if (s.tile !== target.tile || !s.junction || !target.junction) continue;
      if (s.enter === target.enter) continue;
      if (!compatible(target, s)) return owner;
    }
  }
  // The gap-acceptance rule only holds the minor axis, so only that driver can fail to yield.
  if (axisOf(heading(trip.path[k], trip.path[k + 1])) !== 'ns') return null;
  return priorityBlocker(city, index, trip, k);
}

/**
 * Report fresh crossing encounters, including overloaded stops and opposing left turns on green.
 * Normal signal separation and stop dwell still apply. Returns true when the
 * incident module turned sustained conflict into a crash, which invalidates this tick's occupancy.
 */
function detectConflicts(city: City, index: RoadIndex, g: Grid): boolean {
  if (city.trips.length < 2) return false;
  const byId = new Map(city.trips.map(t => [t.id, t] as const));
  const seen = new Set<string>();
  let crashed = false;
  for (const trip of city.trips) {
    if (trip.service || !driving(trip) || isYielding(city,trip,index)) continue;
    const last = trip.path.length - 1;
    if (trip.progress >= last - 1e-9) continue;
    const k = cellIndex(trip.progress, last);
    if (k >= last) continue;
    // Only an actual claim on the junction this tick counts as a conflicting arrival.
    if (round6(trip.progress + stepOf(trip)) <= k + 0.5 + 1e-9) continue;
    const target = trip.path[k + 1];
    if (!index.junctions.has(tileKey(target)) || index.junctions.has(tileKey(trip.path[k]))) continue;
    if (isBlocked(city, target) || !allowsRoadStep(city,trip.path[k],target,index.roads)) continue;
    if(index.roundabouts?.byTile.has(tileKey(target)))continue;
    const control = governingControl(city, index, target);
    // Red means wait, never accumulate danger for obeying it. Stops must finish their halt.
    if (control?.kind === 'signal' && signalAxis(city, control) !== contactAxis(trip, target)) continue;
    if (control?.kind === 'stop' && trip.hold < STOP_DWELL - 1e-9) continue;
    const other = crossingBlocker(city, index, g, byId, trip, k);
    if (other === null) continue;
    const area = index.areas.get(tileKey(target)) ?? tileKey(target);
    if (seen.has(area)) continue;
    seen.add(area);
    if (recordConflict(city, { x: target.x, y: target.y }, trip.id, other, TRAFFIC_TICK)) crashed = true;
  }
  return crashed;
}

/** Arrival is not automatically a completion: responders report to their own module. */
function finish(city: City, g: Grid, held: Map<number, Slot[]>, done: Trip[]): void {
  const credited: Trip[] = [];
  for (const trip of done) {
    release(g, held.get(trip.id) ?? [], trip.id);
    if (trip.busId !== undefined) { arriveBus(city,trip); continue; }
    if (trip.service) { arriveResponse(city, trip); continue; }
    if (phaseOf(trip) === 'outbound') { beginVisit(city, trip); continue; }
    credited.push(trip);
  }
  if (credited.length === 0) return;
  for (const trip of credited) {
    city.completed++;
    if (trip.external && city.external) city.external.completed++;
    const record: TripRecord = { at: round6(city.elapsed), wait: trip.wait };
    if (!trip.external && trip.purpose && trip.rewarded && trip.visitedAt !== undefined
      && phaseOf(trip) === 'returning') {
      record.service = { homeId: trip.homeId, purpose: trip.purpose, visitedAt: trip.visitedAt,
        ...(trip.startedAt !== undefined ? {startedAt: trip.startedAt} : {}) };
    }
    city.history.push(record);
  }
  const ids = new Set(credited.map(t => t.id));
  city.trips = city.trips.filter(t => !ids.has(t.id));
}

/** Can this lane reach another usable merge centre before a turn/exit removes it? */
function laneContinuation(index:RoadIndex,path:Point[],k:number):boolean {
  if(!secondLaneAvailable(index,path,k))return false;
  for(let i=k+1;i<path.length;i++) {
    if(!secondLaneAvailable(index,path,i))return false;
    if(index.wideAreas?.has(index.areas.get(tileKey(path[i]))??'')){
      const [,end]=heldRange(index,path,i);
      for(let j=i;j<=end;j++)if(!secondLaneAvailable(index,path,j))return false;
    }
    const movement=slotAt(index,path,i);
    if(movement.exclusive)return false;
    if(movement.enter===movement.exit)return i<path.length-1;
  }
  return false;
}
/** A lateral move owns both tracks until complete. A recovery merge at a bend owns the whole tile. */
function changeLane(index: RoadIndex, g: Grid, held: Map<number,Slot[]>, trip: Trip): boolean {
  if(!index.directions && !index.wideDirections?.size && !trip.trafficLane && !trip.laneChange)return false;
  if(trip.busId !== undefined || trip.emergencyPass || (!driving(trip) && phaseOf(trip)!=='waiting'))return false;
  if(trip.laneChange){
    trip.laneChange.shift=round6(Math.min(1,trip.laneChange.shift+TRAFFIC_TICK/0.35));
    if(trip.laneChange.shift===1){
      trip.trafficLane=trip.laneChange.to;
      delete trip.laneChange;
      release(g,held.get(trip.id)??[],trip.id);
      const slots=tripSlots(index,trip);held.set(trip.id,slots);claim(g,slots,trip.id);
    }
    return true;
  }
  const k=bodyTile(trip),lane=trip.trafficLane??0;
  if(Math.abs(trip.progress-k)>1e-9)return false;
  const movement=slotAt(index,trip.path,k);
  if(movement.exclusive || movement.enter!==movement.exit && lane===0)return false;
  const future=laneContinuation(index,trip.path,k);
  // Merge before a road becomes two-way or ends. Distribution is stable across reloads.
  const desired:0|1=lane ? (!future || trip.hold>=REPLAN_PATIENCE || phaseOf(trip)==='waiting'?0:1) : (future && (trip.id%2===0 && trip.hold===0 || index.wideDirections?.has(tileKey(trip.path[k])) && !!trip.path[k+1] && !vacant(g,slotAt(index,trip.path,k+1),trip.id)) && driving(trip) ? 1:0);
  if(desired===lane)return false;
  const [start,end]=heldRange(index,trip.path,k);
  if(desired===1 && Array.from({length:end-start+1},(_,j)=>j+start).some(i=>!secondLaneAvailable(index,trip.path,i)))return false;
  const slots=heldSlots(index,trip.path,k,movement.enter!==movement.exit,desired);
  if(slots.some(slot=>!vacant(g,slot,trip.id)))return lane===1&&!future;
  trip.laneChange={from:lane,to:desired,shift:0};
  const both=tripSlots(index,trip);release(g,held.get(trip.id)??[],trip.id);
  held.set(trip.id,both);claim(g,both,trip.id);
  return true;
}

/** One fixed simulation tick. Ordering by waiting time keeps junction service fair. */
export function trafficTick(city: City, index: RoadIndex): void {
  clearWrecks(city);
  const reversing=replan(city, index);
  const { grid: g, held } = grid(city, index);
  if(index.roundabouts?.rings.length)index.roundaboutGaps=roundaboutTrafficGaps(city,index.roundabouts);
  // A crash rewrites who is standing where, so this tick's movement is abandoned.
  if (detectConflicts(city, index, g)) {delete index.roundaboutGaps;return;}
  const rank = (t: Trip) => (index.roundabouts?.byTile.has(tileKey(t.path[bodyTile(t)]))?2:0)
    + (t.service && phaseOf(t) === 'outbound' ? 1 : 0);
  const order = [...city.trips].sort((a, b) => rank(b) - rank(a) || b.hold - a.hold || a.id - b.id);
  const byId = tripIndex(city);
  const done: Trip[] = [];
  for (const trip of order) {
    if(reversing.has(trip.id))continue;
    if(changeLane(index,g,held,trip))continue;
    const phase = phaseOf(trip);
    if (phase === 'visiting' || phase === 'crashed' || phase === 'working' || phase === 'bus-dwell') continue;
    if (phase === 'waiting') {
      trip.hold = round6(trip.hold + TRAFFIC_TICK); trip.wait = round6(trip.wait + TRAFFIC_TICK);
      continue;
    }
    if (trip.emergencyPass) { advancePass(trip); continue; }
    if (tryPass(city,index,g,held,trip)) { advancePass(trip); continue; }
    const last = trip.path.length - 1;
    if (trip.progress >= last - 1e-9) { done.push(trip); continue; }
    const k = cellIndex(trip.progress, last);
    const edge = k + 0.5;
    let next = round6(trip.progress + stepOf(trip));
    if(trip.trafficLane && trip.progress<k && !laneContinuation(index,trip.path,k))next=Math.min(next,k);
    if (isYielding(city,trip,index)) next = trip.progress;
    // Stop on this tile's centre, not its far edge, when the way ahead has gone. From there the
    // vehicle can turn onto a new route without giving back any ground.
    if (k < last && trip.progress <= k + 1e-9 && (unusable(city, index, trip.path[k + 1], isEmergencyResponse(trip))
      || !allowsRoadStep(city,trip.path[k],trip.path[k+1],index.roads))) next = Math.min(next, k);
    else if (next > edge + 1e-9) {
      if (allowed(city, index, g, trip, k, byId)) {
        release(g, held.get(trip.id) ?? [], trip.id);
        const slots = tripSlots(index,trip,k+1).map(slot =>
          isEmergencyResponse(trip) && slot.tile===tileKey(trip.path[last]) ? {...slot,exclusive:true} : slot);
        held.set(trip.id, slots);
        claim(g, slots, trip.id);
      } else next = edge;
    }
    // Even a faster responder crosses at most one tile boundary per tick.
    next = Math.min(next, last, k + 1);
    if (next > trip.progress) { trip.progress = next; trip.hold = 0; }
    else { trip.hold = round6(trip.hold + TRAFFIC_TICK); trip.wait = round6(trip.wait + TRAFFIC_TICK); }
    if(index.roundaboutGaps)addRoundaboutGaps(index.roundabouts!,trip,index.roundaboutGaps);
    if (trip.progress >= last - 1e-9) done.push(trip);
  }
  delete index.roundaboutGaps;
  finish(city, g, held, done);
  pruneHistory(city);
}

/** Records arrive in time order, so an O(1) check keeps the window bounded on quiet ticks too. */
function pruneHistory(city: City): void {
  if (city.history.length > 0 && city.history[0].at <= round6(city.elapsed) - METRICS_WINDOW) {
    city.history = city.history.filter(h => h.at > round6(city.elapsed) - METRICS_WINDOW);
  }
  if (city.history.length > MAX_HISTORY) city.history.splice(0, city.history.length - MAX_HISTORY);
}

/** Waiting is stopped customers now; wait and throughput cover the last 60 simulation seconds. */
export function trafficMetrics(city: City): TrafficMetrics {
  const recent = (city.history ?? []).filter(h => h.at > round6(city.elapsed) - METRICS_WINDOW);
  const waiting = city.trips.filter(t => !t.service && onRoad(t) && t.hold > 1e-9).length;
  const averageWait = recent.length === 0 ? 0 : Math.round(100 * recent.reduce((s, h) => s + h.wait, 0) / recent.length) / 100;
  return { waiting, averageWait, throughput: recent.length };
}

export function isJunctionTile(city: City, p: Point): boolean {
  return roadIndex(city).junctions.has(tileKey(p));
}

/** Modest installation prices; timing changes are free and replacement refunds actual payment. */
export function placeControl(city: City, kind: ControlKind, p: Point): string {
  const index = roadIndex(city);
  if (!index.roads.has(tileKey(p))) return 'Place traffic control on a road tile.';
  if(index.roundabouts?.byTile.has(tileKey(p)))return 'This one-way loop uses Yield automatically. Entering cars wait for circulating traffic.';
  if (!index.junctions.has(tileKey(p))) return 'A junction needs at least three connected roads.';
  // One control governs one intersection, so a stop sign and a light never compete for an approach.
  const existing = governingControl(city, index, p);
  const refund=existing?.paid??0;
  const installation=!(kind==='stop'&&existing?.kind==='stop')&&!(kind==='signal'&&existing?.kind==='signal');
  if(installation){
    if(city.funds+refund<COSTS[kind])return `Need $${COSTS[kind]} to install ${kind==='stop'?'Stops':'Lights'}. Replacement refunds what you paid.`;
    city.funds+=refund-COSTS[kind];
  }
  if (kind === 'stop') {
    if (existing?.kind === 'stop') {
      removeControl(city, p); return 'Stop sign removed.';
    }
    if (existing) { existing.kind = 'stop'; existing.paid=COSTS.stop; existing.preset = 'balanced'; return 'Traffic light replaced by an all-way stop.'; }
    city.controls.push({ x: p.x, y: p.y, kind: 'stop', preset: 'balanced', paid:COSTS.stop });
    return 'All-way stop placed. Cars halt, then take turns.';
  }
  if (existing?.kind === 'signal') {
    existing.preset = PRESETS[(PRESETS.indexOf(existing.preset) + 1) % PRESETS.length];
    return `Traffic light timing: ${PRESET_LABEL[existing.preset]}.`;
  }
  if (existing) { existing.kind = 'signal'; existing.paid=COSTS.signal; existing.preset = 'balanced'; return 'Stop sign replaced by a traffic light (balanced).'; }
  city.controls.push({ x: p.x, y: p.y, kind: 'signal', preset: 'balanced', paid:COSTS.signal });
  return 'Traffic light placed (balanced timing). Adjoining junction tiles share this control.';
}

export function removeControl(city: City, p: Point): boolean {
  const control=governingControl(city,roadIndex(city),p);
  if(!control)return false;
  city.funds+=control.paid??0;
  city.controls=city.controls.filter(c=>c!==control);
  return true;
}

/** Keep the first controller if road construction joins intersections; retire orphan controls. */
export function pruneControls(city: City): void {
  if(city.controls.length===0)return;
  const index=roadIndex(city), seen=new Set<string>();
  city.controls=city.controls.filter(c=>{
    const area=index.areas.get(tileKey(c));
    if(area===undefined || seen.has(area)){city.funds+=c.paid??0;return false;}
    seen.add(area);return true;
  });
}

export function parseControls(raw: unknown, index: RoadIndex, limit: number): JunctionControl[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > limit) return null;
  const seen = new Set<string>();
  const usedAreas = new Set<string>();
  const controls: JunctionControl[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object') return null;
    const c = value as JunctionControl;
    if (!Number.isSafeInteger(c.x) || !Number.isSafeInteger(c.y)) return null;
    if (c.kind !== 'stop' && c.kind !== 'signal') return null;
    if (!PRESETS.includes(c.preset)) return null;
    if(c.paid!==undefined&&(!Number.isSafeInteger(c.paid)||c.paid<0||c.paid>COSTS[c.kind]))return null;
    const at = `${c.x},${c.y}`;
    if (seen.has(at)) return null;
    seen.add(at);
    // Migration: a control whose junction no longer exists is dropped, not treated as corruption.
    const area=index.areas.get(at);
    if(area!==undefined && !usedAreas.has(area)) {
      controls.push({x:c.x,y:c.y,kind:c.kind,preset:c.preset,...(c.paid!==undefined?{paid:c.paid}:{})});usedAreas.add(area);
    }
  }
  return controls;
}

export function parseHistory(raw: unknown, elapsed: number): TripRecord[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_HISTORY) return null;
  const records: TripRecord[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object') return null;
    const h = value as TripRecord;
    if (!Number.isFinite(h.at) || h.at < 0 || h.at > elapsed + 1e-6) return null;
    if (!Number.isFinite(h.wait) || h.wait < 0 || h.wait > elapsed + 1e-6) return null;
    const record: TripRecord = {at: h.at, wait: h.wait};
    const service = h.service;
    // Ancillary attribution corruption cannot discard an otherwise valid town.
    if (service && Number.isSafeInteger(service.homeId) && service.homeId > 0
      && (service.purpose === 'shopping' || service.purpose === 'leisure')
      && Number.isFinite(service.visitedAt) && service.visitedAt >= 0 && service.visitedAt <= h.at
      && (service.startedAt === undefined || (Number.isFinite(service.startedAt)
        && service.startedAt >= 0 && service.startedAt <= service.visitedAt))) {
      record.service = {homeId: service.homeId, purpose: service.purpose, visitedAt: service.visitedAt,
        ...(service.startedAt !== undefined ? {startedAt: service.startedAt} : {})};
    }
    if (h.at > round6(elapsed) - METRICS_WINDOW) records.push(record);
  }
  return records.sort((a,b)=>a.at-b.at);
}

/** Read-only inspector using the same lane reservations and gates as movement. */
export function vehicleDebug(city:City,trip:Trip,index=roadIndex(city),g=grid(city,index).grid){
  const k=bodyTile(trip),position=trip.path[k],next=trip.path[k+1];
  const blockers=new Set<number>();
  const control=next?governingControl(city,index,next):null;
  let reason='Route available; moving or approaching the next tile';
  if(trip.sceneParked){
    if(trip.workRemaining)reason='Parked at scene; crew working';
    else {
      const station=city.buildings.find(b=>b.id===trip.stationId);
      const route=station?findPath(city,position,entrance(station)):null;
      reason=route?'Work complete; waiting for safe merge back onto road':'Work complete; no open road route back to station';
      if(route){const [start,end]=heldRange(index,route,0);for(let i=start;i<=end;i++)for(const id of g.get(tileKey(route[i]))?.keys()??[])if(id!==trip.id)blockers.add(id);}
    }
  }
  else if(trip.phase==='working')reason='Crew working at scene';
  else if(trip.phase==='visiting')reason='Parked at destination';
  else if(trip.phase==='crashed')reason='Vehicle involved in crash';
  else if(trip.emergencyPass)reason=`Emergency pass: ${trip.emergencyPass.stage}`;
  else if(trip.phase==='waiting')reason=trip.target&&findPath(city,position,trip.target,isEmergencyResponse(trip))?'Route exists; waiting for safe lane reservation':'No open route to current target';
  else if(!next)reason='At route endpoint';
  else if(index.roundabouts?.byTile.has(tileKey(next)) && roundaboutEntryBlocked(city,trip,k,index.roundabouts))reason='Yielding to circulating traffic';
  else if(!allowsRoadStep(city,position,next,index.roads))reason='Next road connection runs the other way';
  else if(unusable(city,index,next,isEmergencyResponse(trip)))reason='Next tile is closed, wrecked, or missing';
  else {
    const [start,end]=heldRange(index,trip.path,k+1);
    for(let i=start;i<=end;i++){
      const base=slotAt(index,trip.path,i);
      const slot=isEmergencyResponse(trip)&&i===trip.path.length-1?{...base,exclusive:true}:base;
      for(const [id,slots] of g.get(slot.tile)??[])if(id!==trip.id&&slots.some(other=>!compatible(slot,other)))blockers.add(id);
    }
    if(isYielding(city,trip,index))reason='Yielding to an approaching emergency vehicle';
    else if(blockers.size)reason='Waiting for occupied lane, junction, or scene approach';
    else if(!index.junctions.has(tileKey(position))&&index.junctions.has(tileKey(next))&&!gated(city,index,g,trip,k))
      reason=control?`Waiting at ${control.kind}${control.kind==='signal'?` (${signalAxis(city,control)??'all red'})`:''}`:'Waiting for priority traffic at uncontrolled junction';
  }
  return {id:trip.id,label:trip.busId !== undefined?'Bus':trip.service?.toUpperCase()??'Car',phase:trip.phase??'legacy',intent:trip.resume??trip.phase??'legacy',
    emergency:isEmergencyResponse(trip),patrol:!!trip.patrol,sceneParked:!!trip.sceneParked,cancelledResponse:!!trip.responseCancelled,
    stoppedSeconds:trip.hold,totalWaitSeconds:trip.wait,reason,blockerIds:[...blockers],position:{...position},next:next?{...next}:null,
    progress:trip.progress,target:trip.target?{...trip.target}:trip.path.at(-1)?{...trip.path.at(-1)!}:null,
    stationId:trip.stationId??null,incidentId:trip.incidentId??null,homeId:trip.homeId,destinationId:trip.storeId,
    workRemaining:trip.workRemaining??null,control:control?{...control}:null,path:trip.path.map(p=>({...p}))};
}
export type VehicleDebug = ReturnType<typeof vehicleDebug>;

export function debugVehicles(city:City):VehicleDebug[]{const index=roadIndex(city),g=grid(city,index).grid;return city.trips.map(t=>vehicleDebug(city,t,index,g));}
