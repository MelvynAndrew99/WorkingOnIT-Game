import {routingSnapshot, responseRoute, weightedRoute, routeCost, worthwhileRoute, type RoutingSnapshot} from './cityRouting.ts';
import {CITY_RULES} from './cityRules.ts';
import {COSTS} from './cityEconomy.ts';
/** Logical queues, junction arbitration, and player traffic control. No artwork or renderer imports. */
import { entrance, isBlocked, blockedTiles, findPath, goalOf, retarget, type City, type Point, type Trip } from './cityModel.ts';
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
export type TripRecord = { at: number; wait: number };
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
export const emergencyLaneOffset = (t: Trip) => t.emergencyPass?.shift ?? 0;
const stepOf = (t: Trip) => TRAFFIC_TICK * (t.service ? (isEmergencyResponse(t) ? EMERGENCY_TILES_PER_SECOND : TRAVEL_TILES_PER_SECOND) : (t.speed ?? TRAVEL_TILES_PER_SECOND));

export type RoadIndex = { roads: Set<string>; junctions: Set<string>; areas: Map<string, string> };
/** Roads never change inside one simulation call, so this index is built once per step. */
export function roadIndex(city: City): RoadIndex {
  const roads = new Set(city.roads.map(tileKey));
  const junctions = new Set<string>();
  for (const p of city.roads) {
    if (nearby(p).filter(n => roads.has(tileKey(n))).length >= JUNCTION_DEGREE) junctions.add(tileKey(p));
  }
  return { roads, junctions, areas: junctionAreas(junctions) };
}

/**
 * Adjoining junction tiles are one intersection, so one control governs the whole area.
 * Without this a light placed on the far tile of a wide junction would be decorative.
 */
export function governingControl(city: City, index: RoadIndex, p: Point): JunctionControl | undefined {
  const area=index.areas.get(tileKey(p));
  return area===undefined ? undefined : (city.controls??[]).find(c=>index.areas.get(tileKey(c))===area);
}

/** One vehicle body reserving one tile. Junction slots also carry the movement they perform. */
type Slot = { tile: string; lane: string; exclusive: boolean; enter: string; exit: string; junction: boolean };
/** Opposing straight-through movements share a junction; every other pair is a conflict. */
function compatible(a: Slot, b: Slot): boolean {
  if (a.exclusive || b.exclusive) return false;
  if (!a.junction || !b.junction) return a.lane !== b.lane;
  return a.enter === a.exit && b.enter === b.exit && axisOf(a.enter) === axisOf(b.enter) && a.enter !== b.enter;
}

function slotAt(index: RoadIndex, path: Point[], i: number): Slot {
  const p = path[i];
  const prev = i > 0 ? path[i - 1] : null;
  const next = i < path.length - 1 ? path[i + 1] : null;
  const enter = prev ? heading(prev, p) : next ? heading(p, next) : 'N';
  const exit = next ? heading(p, next) : enter;
  const tile = tileKey(p);
  // A vehicle turning back at its destination sweeps the whole tile, so nobody may share it.
  const exclusive = !!prev && !!next && prev.x === next.x && prev.y === next.y;
  return { tile, lane: `${tile}#${exit}`, exclusive, enter, exit, junction: index.junctions.has(tile) };
}

/** Entering a junction reserves the whole run of junction tiles plus its first exit tile. */
function heldRange(index: RoadIndex, path: Point[], k: number): [number, number] {
  const last = path.length - 1;
  if (!index.junctions.has(tileKey(path[k]))) return [k, k];
  let j = k;
  while (j < last && index.junctions.has(tileKey(path[j + 1]))) j++;
  return [k, Math.min(j + 1, last)];
}
function heldSlots(index: RoadIndex, path: Point[], k: number, exclusive = false): Slot[] {
  const [start, end] = heldRange(index, path, k);
  const slots: Slot[] = [];
  for (let i = start; i <= end; i++) {
    const slot = slotAt(index, path, i);
    slots.push(exclusive ? { ...slot, exclusive: true } : slot);
  }
  return slots;
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
function claim(grid: Grid, slots: Slot[], id: number): void {
  for (const s of slots) {
    let m = grid.get(s.tile);
    if (!m) { m = new Map(); grid.set(s.tile, m); }
    m.set(id, [...(m.get(id) ?? []), s]);
  }
}
function release(grid: Grid, slots: Slot[], id: number): void {
  for (const s of slots) {
    const m = grid.get(s.tile);
    if (m) { m.delete(id); if (m.size === 0) grid.delete(s.tile); }
  }
}
function vacant(grid: Grid, slot: Slot, id: number): boolean {
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
  const control = governingControl(city, index, trip.path[k + 1]);
  const approach = axisOf(heading(trip.path[k], trip.path[k + 1]));
  // Provisional emergency rule: a responder may claim a red junction only once it is empty.
  const responding = !!trip.service && phaseOf(trip) === 'outbound';
  if (control?.kind === 'signal') {
    if (signalAxis(city, control) === approach) return true;
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
function allowed(city: City, index: RoadIndex, grid: Grid, trip: Trip, k: number): boolean {
  const path = trip.path;
  if (unusable(city, index, path[k + 1], isEmergencyResponse(trip))) return false;
  const target = slotAt(index, path, k + 1);
  // Gates apply on entry only; a vehicle already inside a junction run holds it and must clear.
  if (!index.junctions.has(tileKey(path[k])) && target.junction && !gated(city, index, grid, trip, k)) return false;
  const [start, end] = heldRange(index, path, k + 1);
  for (let i = start; i <= end; i++) {
    const slot = slotAt(index, path, i);
    // Starting scene work claims both lanes; reserve that space before arrival.
    if (!vacant(grid, isEmergencyResponse(trip) && i===path.length-1
      ? {...slot, exclusive:true} : slot, trip.id)) return false;
  }
  return true;
}

function grid(city: City, index: RoadIndex): { grid: Grid; held: Map<number, Slot[]> } {
  const g: Grid = new Map();
  const held = new Map<number, Slot[]>();
  for (const t of city.trips) {
    if (!onRoad(t)) continue;
    const slots = t.emergencyPass ? passSlots(index,t) : heldSlots(index, t.path, cellIndex(t.progress, t.path.length - 1), blocksWholeTile(t));
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
  for (const responder of city.trips) {
    if (phaseOf(responder)!=='outbound' || !responder.service || responder.id===trip.id) continue;
    const pass=responder.emergencyPass;
    if (pass && responder.path.slice(pass.start+1,pass.end).some(p=>tileKey(p)===tileKey(here))) return true;
    if (!next || index.junctions.has(tileKey(here))) continue;
    const area=index.areas.get(tileKey(next));
    if (area===undefined) continue;
    if (pass && passSlots(index,responder).some(s=>s.junction && index.areas.get(s.tile)===area)) return true;
    const rk=bodyTile(responder);
    // Yielding must not freeze the vehicle whose occupied space the responder needs.
    // The ordinary movement gate still checks lanes, controls and a clear junction exit.
    if(rk+1<responder.path.length){
      const occupied=heldSlots(index,trip.path,k,blocksWholeTile(trip));
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
    if(unusable(city,index,p,true) || heading(trip.path[end-1],p)!==direction)break;
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
      if(i>pass.start && heading(trip.path[i-1],trip.path[i])!==direction)return false;
    }
    const {grid:g}=grid(city,index);
    if(passSlots(index,trip).some(slot=>!vacant(g,slot,trip.id)))return false;
  }
  return true;
}

/** True when a new vehicle cannot be placed on its home entrance without overlapping traffic. */
export function startBlocked(city: City, index: RoadIndex, path: Point[], responding = false): boolean {
  if (isBlocked(city, path[0], responding)) return true;
  const control=governingControl(city,index,path[0]);
  if(!responding && path.length>1 && control?.kind==='signal' && signalAxis(city,control)!==axisOf(heading(path[0],path[1])))return true;
  const { grid: g } = grid(city, index);
  const [start, end] = heldRange(index, path, 0);
  for (let i = start; i <= end; i++) if (!vacant(g, {...slotAt(index, path, i), ...(responding && (control || i===path.length-1) ? {exclusive:true} : {})}, -1)) return true;
  return false;
}

/** Old saves allowed intersecting trips. Defer conflicting departures without awarding completions. */
export function migrateLegacyTraffic(city: City): void {
  const index=roadIndex(city), occupied:Grid=new Map();
  city.trips=city.trips.filter(trip=>{
    if(!onRoad(trip))return true;
    const slots=heldSlots(index,trip.path,cellIndex(trip.progress,trip.path.length-1),blocksWholeTile(trip));
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
  const {grid:g}=grid(city,index);
  const slots=heldSlots(index,candidate.path,bodyTile(candidate),blocksWholeTile(candidate)).map(slot =>
    isEmergencyResponse(candidate) && slot.tile===tileKey(candidate.path[candidate.path.length-1])
      ? {...slot,exclusive:true} : slot);
  // Changing the route can change the occupied lane or turn. Wait for that space before doing so.
  if(slots.some(slot=>!vacant(g,slot,trip.id)))return false;
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
    if (trip.emergencyPass) continue;
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
    if (phase === 'visiting' || phase === 'crashed' || phase === 'working') continue;
    const last = trip.path.length - 1;
    if (trip.progress >= last - 1e-9) continue;
    const k = cellIndex(trip.progress, last);
    const safe = trip.progress <= k + 1e-9;
    const stalled = trip.hold >= REPLAN_PATIENCE - 1e-9;
    if (!safe && !stalled) continue;
    let ahead = false;
    for (let i = k + 1; i <= last && !ahead; i++) {
      const tile = tileKey(trip.path[i]);
      ahead = blocked.has(tile) || !index.roads.has(tile);
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
        const avoid = new Set(city.trips.filter(t => t.id!==trip.id && onRoad(t)
          && (t.hold>=REPLAN_PATIENCE || blocksWholeTile(t)))
          .map(t => tileKey(t.path[bodyTile(t)])));
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

/** The civilian this driver is actually in conflict with at an unsigned junction, if any. */
function crossingBlocker(city: City, index: RoadIndex, g: Grid, byId: Map<number, Trip>, trip: Trip, k: number): number | null {
  const target = slotAt(index, trip.path, k + 1);
  const m = g.get(target.tile);
  if (m) for (const [owner, slots] of m) {
    if (owner === trip.id) continue;
    const other = byId.get(owner);
    if (!other || other.service || phaseOf(other) === 'crashed') continue;
    for (const s of slots) {
      if (s.tile !== target.tile || !s.junction || !target.junction) continue;
      // Same-axis pairs are following or opposing traffic, never a failed yield.
      if (axisOf(s.enter) === axisOf(target.enter)) continue;
      if (!compatible(target, s)) return owner;
    }
  }
  // The gap-acceptance rule only holds the minor axis, so only that driver can fail to yield.
  if (axisOf(heading(trip.path[k], trip.path[k + 1])) !== 'ns') return null;
  return priorityBlocker(city, index, trip, k);
}

/**
 * Report real crossing conflicts at uncontrolled junctions so risk can build where the player
 * can see it. A control on that intersection removes the report entirely. Returns true when the
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
    if (governingControl(city, index, target) || isBlocked(city, target)) continue;
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
    if (trip.service) { arriveResponse(city, trip); continue; }
    if (phaseOf(trip) === 'outbound') { beginVisit(city, trip); continue; }
    credited.push(trip);
  }
  if (credited.length === 0) return;
  for (const trip of credited) {
    city.completed++;
    if (trip.external && city.external) city.external.completed++;
    city.history.push({ at: round6(city.elapsed), wait: trip.wait });
  }
  const ids = new Set(credited.map(t => t.id));
  city.trips = city.trips.filter(t => !ids.has(t.id));
}

/** One fixed simulation tick. Ordering by waiting time keeps junction service fair. */
export function trafficTick(city: City, index: RoadIndex): void {
  clearWrecks(city);
  const reversing=replan(city, index);
  const { grid: g, held } = grid(city, index);
  // A crash rewrites who is standing where, so this tick's movement is abandoned.
  if (detectConflicts(city, index, g)) return;
  const rank = (t: Trip) => (t.service && phaseOf(t) === 'outbound' ? 1 : 0);
  const order = [...city.trips].sort((a, b) => rank(b) - rank(a) || b.hold - a.hold || a.id - b.id);
  const done: Trip[] = [];
  for (const trip of order) {
    if(reversing.has(trip.id))continue;
    const phase = phaseOf(trip);
    if (phase === 'visiting' || phase === 'crashed' || phase === 'working') continue;
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
    if (isYielding(city,trip,index)) next = trip.progress;
    // Stop on this tile's centre, not its far edge, when the way ahead has gone. From there the
    // vehicle can turn onto a new route without giving back any ground.
    if (k < last && trip.progress <= k + 1e-9 && unusable(city, index, trip.path[k + 1], isEmergencyResponse(trip))) next = Math.min(next, k);
    else if (next > edge + 1e-9) {
      if (allowed(city, index, g, trip, k)) {
        release(g, held.get(trip.id) ?? [], trip.id);
        const slots = heldSlots(index, trip.path, k + 1).map(slot =>
          isEmergencyResponse(trip) && slot.tile===tileKey(trip.path[last]) ? {...slot,exclusive:true} : slot);
        held.set(trip.id, slots);
        claim(g, slots, trip.id);
      } else next = edge;
    }
    // Even a faster responder crosses at most one tile boundary per tick.
    next = Math.min(next, last, k + 1);
    if (next > trip.progress) { trip.progress = next; trip.hold = 0; }
    else { trip.hold = round6(trip.hold + TRAFFIC_TICK); trip.wait = round6(trip.wait + TRAFFIC_TICK); }
    if (trip.progress >= last - 1e-9) done.push(trip);
  }
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
    if (h.at > round6(elapsed) - METRICS_WINDOW) records.push({ at: h.at, wait: h.wait });
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
  return {id:trip.id,label:trip.service?.toUpperCase()??'Car',phase:trip.phase??'legacy',intent:trip.resume??trip.phase??'legacy',
    emergency:isEmergencyResponse(trip),patrol:!!trip.patrol,sceneParked:!!trip.sceneParked,cancelledResponse:!!trip.responseCancelled,
    stoppedSeconds:trip.hold,totalWaitSeconds:trip.wait,reason,blockerIds:[...blockers],position:{...position},next:next?{...next}:null,
    progress:trip.progress,target:trip.target?{...trip.target}:trip.path.at(-1)?{...trip.path.at(-1)!}:null,
    stationId:trip.stationId??null,incidentId:trip.incidentId??null,homeId:trip.homeId,destinationId:trip.storeId,
    workRemaining:trip.workRemaining??null,control:control?{...control}:null,path:trip.path.map(p=>({...p}))};
}
export type VehicleDebug = ReturnType<typeof vehicleDebug>;

export function debugVehicles(city:City):VehicleDebug[]{const index=roadIndex(city),g=grid(city,index).grid;return city.trips.map(t=>vehicleDebug(city,t,index,g));}
