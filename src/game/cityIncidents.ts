import {routingSnapshot,weightedRoute,routeCost,civilianRoute} from './cityRouting.ts';
import {stepPolicePatrols} from './cityPatrols.ts';
import {CITY_RULES} from './cityRules.ts';
/** Intersection conflicts, service dispatch, and rescue outcomes. No renderer or HUD imports. */
import { entrance, findPath, retarget, stations, SERVICE_OF, isBlocked, type City, type Point, type Trip } from './cityModel.ts';
import { commitTripRoute, startBlocked, roadIndex, bodyTile, governingControl, conflictingContact, contactAxis, signalAxis, EMERGENCY_TILES_PER_SECOND, TRAVEL_TILES_PER_SECOND, TRAFFIC_TICK, type RoadIndex } from './cityTraffic.ts';

export type ServiceKind = 'ems' | 'fire' | 'police';
export type Incident = {
  id: number; x: number; y: number;
  cause?: 'impaired-driving';
  /** Saved teaching override; retain the original roster for already dispatched crew validation. */
  tutorialEmsOnly?: boolean;
  severity: 'minor' | 'serious' | 'fire';
  status: 'active' | 'cleared';
  createdAt: number;
  required: ServiceKind[];
  completedServices: ServiceKind[];
  rescueDeadline: number | null;
  outcome: 'none' | 'pending' | 'rescued' | 'lost';
};
export function incidentServices(incident:Incident):ServiceKind[] { return incident.tutorialEmsOnly ? ['ems'] : incident.required; }
export type JunctionRisk = {
  x: number; y: number; exposure: number; lastConflictAt: number; firstId: number; secondId: number;
  /** Distinct real encounters, bounded to a simulated-time window; also feeds future map diagnostics. */
  encounters?: {firstId: number; secondId: number; at: number}[];
  control?: 'stop' | 'signal';
  warnedAt?: number;
};

/** Encounter exposure at which a fresh failed yield can crash after a visible warning. Provisional. */
export const RISK_THRESHOLD = CITY_RULES.intersectionSafety.crashExposure;
/** Simultaneous wrecks. Further conflicts still warn. */
export const MAX_ACTIVE_INCIDENTS = 3;
/** Serious/fire rescue clock. A game deadline, not a real medical response time. */
export const RESCUE_SECONDS = 90;
export const WORK_SECONDS: Record<ServiceKind, number> = { police: 6, ems: 6, fire: 10 };
/** Sustained stationary response before an available backup may take over. */
export const BACKUP_WAIT_SECONDS = CITY_RULES.routing.emergencyBackupSeconds;
const MAX_CLEARED = 16;
const SAFETY = CITY_RULES.intersectionSafety;
const SEVERITIES = ['minor', 'serious', 'fire'] as const;
const SERVICE_ORDER: ServiceKind[] = ['police', 'ems', 'fire'];
const NEEDS: Record<(typeof SEVERITIES)[number], ServiceKind[]> = {
  minor: ['police'], serious: ['police', 'ems'], fire: ['police', 'ems', 'fire'],
};
const SERVICE_LABEL: Record<ServiceKind, string> = { ems: 'EMS', fire: 'fire', police: 'police' };
const STATION_LABEL: Record<ServiceKind, string> = { ems: 'hospital', fire: 'fire station', police: 'police station' };
const OUTCOMES: Incident['outcome'][] = ['none', 'pending', 'rescued', 'lost'];

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
const key = (p: Point) => `${p.x},${p.y}`;
const at = (p: Point, x: number, y: number) => p.x === x && p.y === y;
const copy = (p: Point): Point => ({ x: p.x, y: p.y });
const nearby = (p: Point): Point[] =>
  [{ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }];
const phaseOf = (t: Trip) => t.phase ?? 'legacy';
const drivingCivilian = (t: Trip) => !t.service && (phaseOf(t) === 'legacy' || phaseOf(t) === 'outbound' || phaseOf(t) === 'returning');
const active = (city: City) => city.incidents.filter(i => i.status === 'active');
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const isId = (v: unknown): v is number => isInt(v) && v >= 1;
const isCount = (v: unknown): v is number => isInt(v) && v >= 0;
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isService = (v: unknown): v is ServiceKind => v === 'ems' || v === 'fire' || v === 'police';

export function isIncidentBlocked(city: City, p: Point): boolean {
  return city.incidents.some(i => i.status === 'active' && at(p, i.x, i.y));
}

function areaOf(city: City, p: Point): string | undefined {
  return roadIndex(city).areas.get(key(p));
}

function sameIntersection(city: City, a: Point, b: Point): boolean {
  const area = areaOf(city, a);
  return area !== undefined && areaOf(city, b) === area;
}

function inIncidentArea(city: City, p: Point): boolean {
  for (const i of city.incidents) {
    if (i.status !== 'active') continue;
    if (at(p, i.x, i.y) || sameIntersection(city, p, i)) return true;
  }
  return false;
}

function cancelRisks(city: City, p: Point): void {
  const area = areaOf(city, p);
  city.risks = city.risks.filter(r => (area === undefined ? !at(r, p.x, p.y) : areaOf(city, r) !== area));
}

/** Body or the tile it is actually claiming this tick must sit on/beside the contact tile. */
function nearContact(trip: Trip, point: Point): boolean {
  if (trip.path.length === 0) return false;
  const k = bodyTile(trip);
  const here = trip.path[k];
  if (here && at(here,point.x,point.y)) return true;
  const next = trip.path[k + 1];
  return !!next && at(next, point.x, point.y);
}

function livePair(city: City, point: Point, firstId: number, secondId: number, index: RoadIndex): [Trip, Trip] | null {
  if (firstId === secondId) return null;
  const first = city.trips.find(t => t.id === firstId);
  const second = city.trips.find(t => t.id === secondId);
  if (!first || !second || !drivingCivilian(first) || !drivingCivilian(second)) return null;
  if (!nearContact(first, point) || !nearContact(second, point)) return null;
  if (!conflictingContact(index, point, first, second)) return null;
  // A pair sitting still is waiting, not a new failed-yield encounter.
  if (first.hold > TRAFFIC_TICK && second.hold > TRAFFIC_TICK) return null;
  return [first, second];
}

export function recordConflict(city: City, point: Point, firstId: number, secondId: number, dt: number): boolean {
  const training=city.tutorial?.status==='active'?city.tutorial.hRoad:undefined;
  // This teaching arc owns one explicitly scripted event; ordinary crashes resume after it.
  if(training)return false;
  if (!Number.isFinite(dt) || dt <= 0 || !isId(firstId) || !isId(secondId) || firstId === secondId) return false;
  const index = roadIndex(city);
  const control = governingControl(city, index, point);
  const area=index.areas.get(key(point));
  let risk = city.risks.find(r => index.areas.get(key(r))===area);
  if(risk && risk.control!==control?.kind){cancelRisks(city,point);risk=undefined;}
  if (inIncidentArea(city, point)) { cancelRisks(city, point); return false; }
  const pair = livePair(city,point,firstId,secondId,index);
  if(!index.junctions.has(key(point)) || !pair)return false;
  // Signals protect perpendicular movements. Only incompatible turns sharing green remain exposed.
  if(control?.kind==='signal' && pair.some(t=>contactAxis(t,point)!==signalAxis(city,control)))return false;
  if (!risk) {
    risk = { x: point.x, y: point.y, exposure: 0, lastConflictAt: round6(city.elapsed), firstId, secondId,
      encounters:[], ...(control?{control:control.kind}:{}) };
    city.risks.push(risk);
  }
  risk.encounters=(risk.encounters??[]).filter(e=>e.at>city.elapsed-SAFETY.encounterWindowSeconds);
  const first=Math.min(firstId,secondId),second=Math.max(firstId,secondId);
  if(risk.encounters.some(e=>Math.abs(e.at-city.elapsed)<1e-9))return false;
  if(risk.encounters.some(e=>e.firstId===first&&e.secondId===second))return false;
  risk.encounters.push({firstId:first,secondId:second,at:round6(city.elapsed)});
  risk.firstId=firstId;risk.secondId=secondId;
  const vehicles=new Set(risk.encounters.flatMap(e=>[e.firstId,e.secondId])).size;
  if(control && vehicles<SAFETY.controlledConflictVehicles)return false;
  const weight=control?.kind==='signal'?SAFETY.signalTurnEncounterExposure:control?SAFETY.controlledEncounterExposure:SAFETY.unsignedEncounterExposure;
  risk.exposure=Math.min(RISK_THRESHOLD,round6(risk.exposure+weight));
  risk.lastConflictAt=round6(city.elapsed);
  if(risk.exposure>=SAFETY.warningExposure)risk.warnedAt??=round6(city.elapsed);
  if (risk.exposure + 1e-9 < RISK_THRESHOLD) return false;
  if(city.elapsed-(risk.warnedAt??city.elapsed)<SAFETY.warningSeconds-1e-9)return false;
  if (active(city).length >= MAX_ACTIVE_INCIDENTS) return false;
  // A contact cannot consume a third civilian or overlap a responder already on the tile.
  if(city.trips.some(t=>!pair.includes(t)&&!t.sceneParked&&phaseOf(t)!=='visiting'
    &&t.path[bodyTile(t)]&&at(t.path[bodyTile(t)],point.x,point.y)))return false;
  const severity = SEVERITIES[city.accidentCount % SEVERITIES.length];
  createIncident(city,point,pair,severity);
  return true;
}

function createIncident(city:City,point:Point,pair:Trip[],severity:Incident['severity'],cause?:Incident['cause']):void {
  const incident: Incident = {
    id: city.nextId++, x: point.x, y: point.y, severity, status: 'active', createdAt: round6(city.elapsed),
    ...(cause?{cause}:{}), required: [...NEEDS[severity]], completedServices: [],
    rescueDeadline: severity === 'minor' ? null : round6(city.elapsed + RESCUE_SECONDS),
    outcome: severity === 'minor' ? 'none' : 'pending',
  };
  city.incidents.push(incident);
  city.accidentCount += 1;
  cancelRisks(city, point);
  const contact = copy(point);
  for (const trip of pair) {
    trip.phase = 'crashed';
    trip.path = [copy(contact)];
    trip.progress = 0;
    trip.hold = 0;
    trip.incidentId = incident.id;
  }
}

/** One explicit tutorial event; use a driver at the scene, not a random remote car. */
export function stageTutorialIncident(city:City,point:Point):boolean {
  const h=city.tutorial?.hRoad;
  if(city.tutorial?.status!=='active'||h?.stage!==4||h.incidentId!==undefined||city.incidents.length)return false;
  if(!city.roads.some(p=>at(p,point.x,point.y)))return false;
  const driver=city.trips.find(t=>drivingCivilian(t)&&nearContact(t,point));
  if(!driver)return false;
  createIncident(city,point,[driver],'serious','impaired-driving');
  city.incidents.at(-1)!.tutorialEmsOnly=true;
  h.incidentId=city.incidents.at(-1)!.id;
  return true;
}

function accessTiles(city: City, incident: Incident): Point[] {
  return nearby(incident)
    .filter(p => city.roads.some(r => at(r, p.x, p.y)) && !isBlocked(city, p, true))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function spawnBlocked(city: City, path: Point[]): boolean {
  if (path.length === 0 || isBlocked(city, path[0], true)) return true;
  return startBlocked(city,roadIndex(city),path,true);
}

function bestApproach(city: City, station: ReturnType<typeof stations>[number], incident: Incident, avoid?: Set<string>): Point[] | null {
  const from = entrance(station);
  if (isBlocked(city, from, true)) return null;
  let best: Point[] | null = null;
  let cost=Infinity;
  const snapshot=routingSnapshot(city,roadIndex(city),true);
  const view=avoid?{...snapshot,blocked:new Set([...snapshot.blocked,...avoid])}:snapshot;
  for (const access of accessTiles(city, incident)) {
    const result = weightedRoute(view,from,access,EMERGENCY_TILES_PER_SECOND);
    const path=result?.path;
    if (!path || path.some((p, i) => i > 0 && at(p, incident.x, incident.y))) continue;
    if (spawnBlocked(city, path)) continue;
    if (result!.cost.total < cost) {best = path;cost=result!.cost.total;}
  }
  return best;
}

function stationBusy(city: City, stationId: number): boolean {
  return city.trips.some(t => t.service && t.stationId === stationId);
}


function sendHome(city: City, trip: Trip): void {
  if(trip.sceneParked){
    const station=city.buildings.find(b=>b.id===trip.stationId);
    const from=trip.path[bodyTile(trip)];
    if(!station||!from)return;
    const path=civilianRoute(city,from,entrance(station),trip);
    // Crews wait in their scene parking space until an actual lane can accept the return.
    if(!path||startBlocked(city,roadIndex(city),path,true))return;
    delete trip.resume;delete trip.sceneParked;
    Object.assign(trip,{path,progress:0,phase:'returning',
      target:copy(entrance(station)),speed:TRAVEL_TILES_PER_SECOND,hold:0,workRemaining:0});
    return;
  }
  const from = trip.path[bodyTile(trip)] ?? trip.path[trip.path.length - 1];
  const station = city.buildings.find(b => b.id === trip.stationId);
  trip.workRemaining = 0;
  trip.speed = TRAVEL_TILES_PER_SECOND;
  if (!from || !station) {
    trip.phase = 'waiting';
    trip.resume = 'returning';
    trip.path = from ? [copy(from)] : trip.path;
    trip.progress = 0;
    return;
  }
  trip.phase = 'returning';
  trip.target = copy(entrance(station));
  if (!retarget(city, trip, from)) {
    trip.phase = 'waiting';
    trip.resume = 'returning';
    trip.path = [copy(from)];
    trip.progress = 0;
    trip.target = copy(entrance(station));
  }
}

function stabilize(city: City, trip: Trip, incident: Incident): void {
  if (trip.service !== 'ems' || incident.outcome !== 'pending') return;
  if (incident.rescueDeadline !== null && city.elapsed > incident.rescueDeadline + 1e-9) return;
  incident.outcome = 'rescued';
  city.rescuedCount += 1;
}

function maybeClear(city: City, incident: Incident): void {
  if (incident.status !== 'active') return;
  if (incidentServices(incident).some(s => !incident.completedServices.includes(s))) return;
  incident.status = 'cleared';
  city.trips = city.trips.filter(t => !(phaseOf(t) === 'crashed' && t.incidentId === incident.id));
}

function finishWork(city: City, trip: Trip): void {
  const incident = city.incidents.find(i => i.id === trip.incidentId);
  if (incident && trip.service && !incident.completedServices.includes(trip.service)) {
    incident.completedServices = [...incident.completedServices, trip.service];
  }
  sendHome(city, trip);
  if (incident) maybeClear(city, incident);
}

function dispatch(city: City): void {
  let responseCosts:ReturnType<typeof routingSnapshot>|undefined;
  const cost=(path:Point[])=>routeCost(responseCosts??=routingSnapshot(city,roadIndex(city),true),path,EMERGENCY_TILES_PER_SECOND).total;
  const live = active(city).sort((a, b) => a.createdAt - b.createdAt || a.id - b.id);
  for (const incident of live) {
    for (const kind of SERVICE_ORDER) {
      if (!incidentServices(incident).includes(kind) || incident.completedServices.includes(kind)) continue;
      const assigned=city.trips.find(t=>t.incidentId===incident.id&&t.service===kind&&!t.responseCancelled);
      if(assigned){
        const intent=assigned.phase==='waiting'?assigned.resume:assigned.phase;
        if(intent!=='outbound'||assigned.emergencyPass||assigned.hold<BACKUP_WAIT_SECONDS)continue;
        // Only replace with a real, available vehicle whose route avoids stationary bodies.
        const avoid=new Set(city.trips.filter(t=>t.phase!=='visiting'&&!t.sceneParked&&(t.hold>=BACKUP_WAIT_SECONDS||t.phase==='working'||t.phase==='crashed'))
          .map(t=>key(t.path[bodyTile(t)])));
        const backup=stations(city,kind).filter(s=>!stationBusy(city,s.id))
          .map(station=>({station,path:bestApproach(city,station,incident,avoid)}))
          .filter((option):option is {station:ReturnType<typeof stations>[number];path:Point[]}=>!!option.path)
          .sort((a,b)=>cost(a.path)-cost(b.path)||a.station.id-b.station.id)[0];
        if(!backup)continue;
        const station=city.buildings.find(b=>b.id===assigned.stationId);
        if(!station)continue;
        const candidate:Trip={...assigned,responseCancelled:true,phase:'waiting',resume:'returning',
          target:copy(entrance(station)),workRemaining:0,speed:TRAVEL_TILES_PER_SECOND};
        // Preserve the occupied lane and exact position; traffic replans the return safely.
        const prospective={...city,trips:city.trips.map(t=>t===assigned?candidate:t)};
        if(spawnBlocked(prospective,backup.path)||!commitTripRoute(city,roadIndex(city),assigned,candidate))continue;
        const replacement:Trip={id:city.nextId++,homeId:0,storeId:0,path:backup.path,progress:0,hold:0,wait:0,
          phase:'outbound',service:kind,stationId:backup.station.id,incidentId:incident.id,
          workRemaining:0,speed:EMERGENCY_TILES_PER_SECOND,target:copy(backup.path[backup.path.length-1])};
        city.trips.push(replacement);
        if(replacement.path.length===1)arriveResponse(city,replacement);
        continue;
      }
      // Reassign the real patrol car in place; never spawn a duplicate at its station.
      let reassigned=false;
      if(kind==='police')for(const patrol of city.trips.filter(t=>t.patrol)){
        const from=patrol.path[bodyTile(patrol)];
        if(!from)continue;
        const access=accessTiles(city,incident).find(p=>!!findPath(city,from,p,true));
        if(!access)continue;
        const candidate:Trip={...patrol,patrol:undefined,phase:'outbound',resume:undefined,incidentId:incident.id,target:copy(access),speed:EMERGENCY_TILES_PER_SECOND};
        if(retarget(city,candidate,from)&&candidate.phase==='outbound'&&commitTripRoute(city,roadIndex(city),patrol,candidate)){
          if(patrol.progress>=patrol.path.length-1)arriveResponse(city,patrol);
          reassigned=true;break;
        }
      }
      if(reassigned)continue;
      let chosen: { stationId: number; path: Point[] } | null = null;
      for (const station of stations(city, kind)) {
        if (stationBusy(city, station.id)) continue;
        const path = bestApproach(city, station, incident);
        if (!path) continue;
        if (!chosen || cost(path) < cost(chosen.path) || (cost(path) === cost(chosen.path) && station.id < chosen.stationId)) {
          chosen = { stationId: station.id, path };
        }
      }
      if (!chosen) continue;
      const access = chosen.path[chosen.path.length - 1];
      const trip: Trip = {
        id: city.nextId++, homeId: 0, storeId: 0, progress: 0, wait: 0, hold: 0, path: chosen.path,
        phase: 'outbound', service: kind, stationId: chosen.stationId, incidentId: incident.id,
        workRemaining: 0, speed: EMERGENCY_TILES_PER_SECOND, target: copy(access),
      };
      city.trips.push(trip);
      if (trip.path.length === 1) arriveResponse(city, trip);
    }
  }
}

function expireRisks(city: City, dt: number): void {
  const index = roadIndex(city);
  city.risks = city.risks.filter(risk => {
    if (!index.junctions.has(key(risk)) || governingControl(city, index, risk)?.kind!==risk.control || inIncidentArea(city, risk)) return false;
    if(risk.encounters)risk.encounters=risk.encounters.filter(e=>e.at>city.elapsed-SAFETY.encounterWindowSeconds);
    if(city.elapsed-risk.lastConflictAt>SAFETY.coolingDelaySeconds+1e-9)
      risk.exposure=Math.max(0,round6(risk.exposure-dt*SAFETY.coolingPerSecond));
    if(risk.exposure<SAFETY.warningExposure)delete risk.warnedAt;
    return risk.exposure>1e-9 || !!risk.encounters?.length;
  });
  // Road edits can join previously separate areas; legacy saves also stored risk per tile.
  // Keep the strongest warning, not the sum, and retain distinct encounters only once.
  const areas=new Map<string,JunctionRisk>();
  for(const risk of city.risks){
    const area=index.areas.get(key(risk))!;
    const existing=areas.get(area);
    if(!existing){areas.set(area,risk);continue;}
    existing.exposure=Math.max(existing.exposure,risk.exposure);
    existing.lastConflictAt=Math.max(existing.lastConflictAt,risk.lastConflictAt);
    if(risk.warnedAt!==undefined)existing.warnedAt=Math.min(existing.warnedAt??risk.warnedAt,risk.warnedAt);
    if(existing.encounters||risk.encounters){
      const encounters=new Map<string,NonNullable<JunctionRisk['encounters']>[number]>();
      for(const e of [...(existing.encounters??[]),...(risk.encounters??[])].sort((a,b)=>a.at-b.at))encounters.set(`${e.firstId}:${e.secondId}`,e);
      existing.encounters=[...encounters.values()].sort((a,b)=>a.at-b.at).slice(-Math.ceil(SAFETY.encounterWindowSeconds/TRAFFIC_TICK));
    }
  }
  city.risks=[...areas.values()];
}

function advanceDeadlines(city: City): void {
  for (const incident of active(city)) {
    if (incident.outcome !== 'pending' || incident.rescueDeadline === null) continue;
    if (city.elapsed + 1e-9 < incident.rescueDeadline) continue;
    incident.outcome = 'lost';
    city.fatalities += 1;
  }
}

function pruneCleared(city: City): void {
  const referenced = new Set(city.trips.map(t => t.incidentId).filter((id): id is number => id !== undefined));
  const extras = city.incidents
    .filter(i => i.status === 'cleared' && !referenced.has(i.id))
    .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id)
    .slice(MAX_CLEARED);
  if (extras.length === 0) return;
  const drop = new Set(extras.map(i => i.id));
  city.incidents = city.incidents.filter(i => !drop.has(i.id));
}

export function arriveResponse(city: City, trip: Trip): void {
  if (!trip.service) return;
  if (trip.phase === 'outbound' && !trip.responseCancelled) {
    const incident = city.incidents.find(i => i.id === trip.incidentId && i.status === 'active');
    if (!incident) { sendHome(city, trip); return; }
    trip.phase = 'working';
    trip.sceneParked = true;
    trip.workRemaining = WORK_SECONDS[trip.service];
    trip.progress = Math.max(0, trip.path.length - 1);
    stabilize(city, trip, incident);
    return;
  }
  if (trip.phase === 'returning') {
    const station=city.buildings.find(b=>b.id===trip.stationId);
    if(station?.kind==='policeStation')station.patrolReadyAt=city.elapsed+CITY_RULES.policePatrol.stationRestSeconds;
  }
  if (trip.phase === 'returning') city.trips = city.trips.filter(t => t.id !== trip.id);
}

export function stepIncidents(city: City, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  expireRisks(city, dt);
  const h=city.tutorial?.status==='active'?city.tutorial.hRoad:undefined;
  const trainingIncident=h?city.incidents.find(i=>i.id===h.incidentId):undefined;
  if(trainingIncident?.status==='active'&&trainingIncident.cause==='impaired-driving'){
    trainingIncident.tutorialEmsOnly=true;
    maybeClear(city,trainingIncident);
  }
  if(h&&!h.rescueClockStarted){
    const incident=city.incidents.find(i=>i.id===h.incidentId)??city.incidents.find(i=>i.status==='active');
    const ready=h.stage>=7&&!!incident&&incidentServices(incident).every(k=>stations(city,k).some(b=>city.roads.some(p=>at(p,entrance(b).x,entrance(b).y))));
    if(incident?.outcome==='pending')incident.rescueDeadline=round6(city.elapsed+RESCUE_SECONDS);
    if(ready)h.rescueClockStarted=true;
  }
  advanceDeadlines(city);
  for (const trip of [...city.trips]) {
    if (!trip.service) continue;
    const scene=city.incidents.find(i=>i.id===trip.incidentId);
    const k=bodyTile(trip),atScene=trip.path[k];
    const returning=trip.phase==='returning'||trip.phase==='waiting'&&trip.resume==='returning';
    // Recover old saves with a completed crew stuck turning around at its scene.
    if(returning&&trip.hold>=CITY_RULES.routing.sceneReturnRecoverySeconds&&scene?.completedServices.includes(trip.service)&&atScene&&
      Math.abs(scene.x-atScene.x)+Math.abs(scene.y-atScene.y)===1&&Math.abs(trip.progress-k)<1e-9){
      trip.path=[copy(atScene)];trip.progress=0;trip.phase='working';trip.sceneParked=true;
      trip.workRemaining=0;trip.target=copy(atScene);delete trip.resume;delete trip.responseCancelled;
    }
    // Traffic owns route retries and exact positions for waiting responders.
    if (trip.phase === 'waiting') continue;
    if (trip.phase !== 'working') continue;
    // Existing on-scene saves adopt the same parking behavior without moving the approach.
    trip.sceneParked=true;
    trip.workRemaining = round6(Math.max(0, (trip.workRemaining ?? 0) - dt));
    if ((trip.workRemaining ?? 0) > 1e-9) continue;
    finishWork(city, trip);
  }
  dispatch(city);
  stepPolicePatrols(city);
  pruneCleared(city);
}

function serviceNeed(city: City, incident: Incident, kind: ServiceKind): string {
  const label = SERVICE_LABEL[kind];
  if (incident.completedServices.includes(kind)) return '';
  const trip = city.trips.find(t => t.incidentId === incident.id && t.service === kind && !t.responseCancelled);
  if (trip) {
    const phase = phaseOf(trip);
    if (phase === 'working') return `${label} (on scene)`;
    if (phase === 'outbound') return `${label} (en route)`;
    if (phase === 'waiting') return `${label} (waiting)`;
    if (phase === 'returning') return `${label} (returning)`;
  }
  const list = stations(city, kind);
  if (list.length === 0) return `${label} (no ${STATION_LABEL[kind]})`;
  const idle = list.filter(s => !stationBusy(city, s.id));
  if (idle.length === 0) return `${label} (busy)`;
  if (idle.every(s => !bestApproach(city, s, incident) && !findPath(city, entrance(s), accessTiles(city, incident)[0] ?? entrance(s), true))) {
    // Distinguish occupancy deferral (path exists, entrance busy) from a missing road.
    const reachable = idle.some(s => {
      const from = entrance(s);
      return !isBlocked(city, from, true) && accessTiles(city, incident).some(access => !!findPath(city, from, access, true));
    });
    return reachable ? label : `${label} (unreachable)`;
  }
  if (idle.every(s => !accessTiles(city, incident).some(access => !!findPath(city, entrance(s), access, true)))) {
    return `${label} (unreachable)`;
  }
  return label;
}

function causeLabel(incident: Incident): string {
  const cause = incident.cause==='impaired-driving' ? (incident.tutorialEmsOnly?'Impaired-driver injury crash':'Impaired-driver crash and vehicle fire') : incident.severity === 'minor' ? 'Minor failed-yield crash'
    : incident.severity === 'serious' ? 'Serious collision' : 'Vehicle fire';
  const suffix = incident.outcome === 'lost' ? ' (help arrived too late)'
    : incident.outcome === 'rescued' ? ' (victims stable)' : '';
  return `${cause} at ${incident.x},${incident.y}${suffix}`;
}

export function incidentSummary(city: City): {
  active: number; warning: string; details: { id: number; label: string; needs: string; deadlineSeconds: number | null }[];
} {
  const live = active(city).sort((a, b) => a.id - b.id);
  const risk = city.risks.filter(r=>r.exposure>=SAFETY.warningExposure).sort((a, b) => b.exposure - a.exposure || a.y - b.y || a.x - b.x)[0];
  const warning = risk
    ? `Failed-yield risk at ${risk.x},${risk.y}. ${risk.control==='stop'?'Busy stop: use lights or split the traffic.':risk.control==='signal'?'Conflicting turns: change light timing or separate routes.':'Busy crossing: add controls or a safer route.'}`
    : '';
  return {
    active: live.length,
    warning,
    details: live.map(incident => {
      const parts = incidentServices(incident).map(k => serviceNeed(city, incident, k)).filter(Boolean);
      const held=city.tutorial?.status==='active'&&!!city.tutorial.hRoad&&!city.tutorial.hRoad.rescueClockStarted;
      const remaining = !held && incident.outcome === 'pending' && incident.rescueDeadline !== null
        ? round6(Math.max(0, incident.rescueDeadline - city.elapsed)) : null;
      return {
        id: incident.id,
        label: causeLabel(incident),
        needs: (parts.length ? `Needs ${parts.join(', ')}` : 'All services complete')+(held?' · Training rescue clock held':''),
        deadlineSeconds: remaining,
      };
    }),
  };
}

/** Read-only area measurements for debugging now and a later safety overlay. Not a Flow grade. */
export function intersectionSafetySnapshot(city:City){
  const index=roadIndex(city);
  return [...new Set(index.areas.values())].map(area=>{
    const [x,y]=area.split(',').map(Number);
    const risk=city.risks.find(r=>index.areas.get(key(r))===area);
    const control=governingControl(city,index,{x,y});
    const encounters=(risk?.encounters??[]).filter(e=>e.at>city.elapsed-SAFETY.encounterWindowSeconds);
    const exposure=risk?.exposure??0;
    return {x,y,control:control?.kind??'unsigned',preset:control?.kind==='signal'?control.preset:null,
      windowSeconds:SAFETY.encounterWindowSeconds,conflictEncounters:encounters.length,
      conflictingVehicles:new Set(encounters.flatMap(e=>[e.firstId,e.secondId])).size,
      exposure,warningThreshold:SAFETY.warningExposure,crashThreshold:RISK_THRESHOLD,
      state:inIncidentArea(city,{x,y})?'incident':exposure>=SAFETY.warningExposure?'danger':exposure>0?'watch':'quiet'};
  });
}

function parseServices(raw: unknown, allowed: ServiceKind[]): ServiceKind[] | null {
  if (!Array.isArray(raw) || raw.length > SERVICE_ORDER.length) return null;
  const seen = new Set<ServiceKind>();
  const list: ServiceKind[] = [];
  for (const value of raw) {
    if (!isService(value) || !allowed.includes(value) || seen.has(value)) return null;
    seen.add(value); list.push(value);
  }
  return list;
}

function parseOneIncident(raw: unknown, city: City, seen: Set<number>): Incident | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isId(r.id) || r.id >= city.nextId || seen.has(r.id)) return null;
  if (city.buildings.some(b => b.id === r.id) || city.trips.some(t => t.id === r.id)) return null;
  if (!isInt(r.x) || !isInt(r.y)) return null;
  if (r.severity !== 'minor' && r.severity !== 'serious' && r.severity !== 'fire') return null;
  if (r.status !== 'active' && r.status !== 'cleared') return null;
  if (!isTime(r.createdAt) || r.createdAt > city.elapsed + 1e-6) return null;
  if(r.tutorialEmsOnly!==undefined&&(r.tutorialEmsOnly!==true||r.cause!=='impaired-driving'||r.severity==='minor'))return null;
  const expected = NEEDS[r.severity];
  const required = parseServices(r.required, expected);
  if (!required || required.length !== expected.length) return null;
  const completed = parseServices(r.completedServices, expected);
  if (!completed) return null;
  if (r.severity === 'minor') {
    if (r.rescueDeadline !== null || r.outcome !== 'none') return null;
  } else {
    if (r.rescueDeadline !== null && !isTime(r.rescueDeadline)) return null;
    if (r.rescueDeadline === null || r.rescueDeadline < r.createdAt - 1e-6) return null;
    if (r.outcome === 'none' || !OUTCOMES.includes(r.outcome as Incident['outcome'])) return null;
  }
  if (r.outcome !== 'none' && r.outcome !== 'pending' && r.outcome !== 'rescued' && r.outcome !== 'lost') return null;
  if (r.status === 'cleared' && (r.outcome === 'pending' || (r.tutorialEmsOnly?!completed.includes('ems'):completed.length!==expected.length))) return null;
  if (r.status === 'active' && !city.roads.some(p => at(p, r.x as number, r.y as number))) return null;
  seen.add(r.id);
  return {
    id: r.id, x: r.x, y: r.y, severity: r.severity, status: r.status, createdAt: r.createdAt,
    ...(r.cause==='impaired-driving'?{cause:'impaired-driving' as const}:{}),
    ...(r.tutorialEmsOnly===true?{tutorialEmsOnly:true}:{}),
    required: [...expected], completedServices: completed,
    rescueDeadline: r.rescueDeadline as number | null, outcome: r.outcome as Incident['outcome'],
  };
}

function parseOneRisk(raw: unknown, elapsed: number, seen: Set<string>): JunctionRisk | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isInt(r.x) || !isInt(r.y) || !isId(r.firstId) || !isId(r.secondId) || r.firstId === r.secondId) return null;
  if (!isTime(r.exposure) || r.exposure > RISK_THRESHOLD + TRAFFIC_TICK) return null;
  if (!isTime(r.lastConflictAt) || r.lastConflictAt > elapsed + 1e-6) return null;
  if(r.control!==undefined&&r.control!=='stop'&&r.control!=='signal')return null;
  if(r.warnedAt!==undefined&&(!isTime(r.warnedAt)||r.warnedAt>elapsed+1e-6))return null;
  let encounters:JunctionRisk['encounters'];
  if(r.encounters!==undefined){
    if(!Array.isArray(r.encounters)||r.encounters.length>Math.ceil(SAFETY.encounterWindowSeconds/TRAFFIC_TICK)+1)return null;
    encounters=[];const pairs=new Set<string>();
    for(const value of r.encounters){
      if(!value||typeof value!=='object')return null;
      const e=value as Record<string,unknown>;
      if(!isId(e.firstId)||!isId(e.secondId)||e.firstId>=e.secondId||!isTime(e.at)||e.at>elapsed+1e-6)return null;
      const pair=`${e.firstId}:${e.secondId}`;
      if(pairs.has(pair))return null;pairs.add(pair);
      encounters.push({firstId:e.firstId,secondId:e.secondId,at:e.at});
    }
  }
  const atKey = `${r.x},${r.y}`;
  if (seen.has(atKey)) return null;
  seen.add(atKey);
  return { x: r.x, y: r.y, exposure: r.exposure, lastConflictAt: r.lastConflictAt, firstId: r.firstId, secondId: r.secondId,
    ...(encounters?{encounters}:{}),...(r.control?{control:r.control}:{}),...(r.warnedAt!==undefined?{warnedAt:r.warnedAt}:{}) };
}

function tripRefsOk(city: City, incidents: Incident[]): boolean {
  const stationIds=new Set<number>(), assignments=new Set<string>();
  for (const trip of city.trips) {
    const incident=incidents.find(i=>i.id===trip.incidentId);
    if(trip.incidentId!==undefined && !incident)return false;
    if(trip.service) {
      if(trip.homeId!==0 || trip.storeId!==0 || (!incident&&!trip.patrol))return false;
      const station=city.buildings.find(b=>b.id===trip.stationId);
      if(!station || SERVICE_OF[station.kind]!==trip.service || stationIds.has(station.id))return false;
      stationIds.add(station.id);
      if(trip.patrol){
        const intent=trip.phase==='waiting'?trip.resume:trip.phase,goal=trip.phase==='waiting'?trip.target:trip.path.at(-1),home=entrance(station);
        if(trip.service!=='police'||incident||intent!=='returning'||trip.emergencyPass||trip.purpose||trip.rewarded||trip.workRemaining||!goal||!at(goal,home.x,home.y))return false;
        continue;
      }
      if(!incident)return false;
      if(!incident.required.includes(trip.service))return false;
      const assignment=`${incident.id}:${trip.service}`;
      if(!trip.responseCancelled){if(assignments.has(assignment))return false;assignments.add(assignment);}
      const phase=phaseOf(trip),intent=phase==='waiting'?trip.resume:phase;
      if(trip.responseCancelled&&(intent!=='returning'||trip.emergencyPass||trip.workRemaining||trip.purpose||trip.rewarded))return false;
      if(intent!=='outbound' && intent!=='working' && intent!=='returning')return false;
      const goal=phase==='waiting'?trip.target:trip.path[trip.path.length-1];
      if(!goal)return false;
      if(intent==='returning') {
        const home=entrance(station);
        if(!at(goal,home.x,home.y) || (!trip.responseCancelled&&!incident.completedServices.includes(trip.service)&&!(incident.tutorialEmsOnly&&trip.service!=='ems')))return false;
      } else {
        if(!trip.sceneParked&&((incident.status!=='active'&&!(incident.tutorialEmsOnly&&trip.service!=='ems')) || incident.completedServices.includes(trip.service)))return false;
        if(trip.sceneParked&&incident.completedServices.includes(trip.service)&&trip.workRemaining!==0)return false;
        if(Math.abs(goal.x-incident.x)+Math.abs(goal.y-incident.y)!==1)return false;
        if(intent==='working' && (phase==='waiting' || trip.progress!==trip.path.length-1 || !isTime(trip.workRemaining)))return false;
      }
    } else if(phaseOf(trip)==='crashed') {
      const p=trip.path[0];
      if(!incident || incident.status!=='active' || !p || !at(p,incident.x,incident.y))return false;
    } else if(trip.incidentId!==undefined || trip.stationId!==undefined)return false;
  }
  return true;
}

export function parseIncidentState(raw: Record<string, unknown>, city: City): boolean {
  const missing = raw.incidents === undefined && raw.risks === undefined && raw.accidentCount === undefined
    && raw.rescuedCount === undefined && raw.fatalities === undefined;
  if (missing) {
    city.incidents = []; city.risks = [];
    city.accidentCount = 0; city.rescuedCount = 0; city.fatalities = 0;
    return tripRefsOk(city,[]);
  }
  if (raw.incidents !== undefined && (!Array.isArray(raw.incidents) || raw.incidents.length > MAX_CLEARED+MAX_ACTIVE_INCIDENTS+city.buildings.length)) return false;
  if (raw.risks !== undefined && (!Array.isArray(raw.risks) || raw.risks.length > city.roads.length)) return false;
  const seen = new Set<number>();
  const incidents: Incident[] = [];
  for (const value of (raw.incidents ?? []) as unknown[]) {
    const incident = parseOneIncident(value, city, seen);
    if (!incident) return false;
    incidents.push(incident);
  }
  const riskAt = new Set<string>();
  const risks: JunctionRisk[] = [];
  for (const value of (raw.risks ?? []) as unknown[]) {
    const risk = parseOneRisk(value, city.elapsed, riskAt);
    if (!risk) return false;
    if(risk.firstId>=city.nextId || risk.secondId>=city.nextId || risk.encounters?.some(e=>e.firstId>=city.nextId||e.secondId>=city.nextId))return false;
    if(!roadIndex(city).junctions.has(key(risk)))continue;
    risks.push(risk);
  }
  const accidentCount = raw.accidentCount === undefined ? incidents.length : raw.accidentCount;
  const rescuedCount = raw.rescuedCount === undefined ? 0 : raw.rescuedCount;
  const fatalities = raw.fatalities === undefined ? 0 : raw.fatalities;
  if (!isCount(accidentCount) || !isCount(rescuedCount) || !isCount(fatalities)) return false;
  if (rescuedCount < incidents.filter(i => i.outcome === 'rescued').length) return false;
  if (fatalities < incidents.filter(i => i.outcome === 'lost').length) return false;
  if (accidentCount < incidents.filter(i => i.status === 'active').length) return false;
  if(rescuedCount+fatalities>accidentCount || accidentCount<incidents.length)return false;
  if (!tripRefsOk(city, incidents)) return false;
  city.incidents = incidents;
  city.risks = risks;
  city.accidentCount = accidentCount;
  city.rescuedCount = rescuedCount;
  city.fatalities = fatalities;
  return true;
}
