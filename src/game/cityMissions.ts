import {FLOW_MISSION_ID, FLOW_OBJECTIVE_RULES, flowSnapshot, parseFlowProgress, type FlowProgress} from './cityFlow.ts';
import {CITY_RULES} from './cityRules.ts';
import {incidentServices} from './cityIncidents.ts';
/** Optional growth goals. Visits earn recognition; completed jobs offer an optional, one-time cash claim. */
import { COSTS, entrance, findPath, constructionPriceForCity, type City, type Trip, type Tool } from './cityModel.ts';
import {expansionSnapshot,expansionTarget,refreshExpansionProgress} from './cityExpansion.ts';

export interface MissionProgress {
  version: 1;
  flow?: FlowProgress;
  hidden: boolean;
  completed: string[];
  claimed: string[];
  shoppers: number[];
  parkVisitors: number[];
}
export type MissionPattern = 'access' | 'flow' | 'capacity' | 'growth';
export type MissionDiagnosticView = 'access' | 'traffic' | 'capacity' | 'normal';
export interface MissionDefinition {
  id: string; title: string; task: string; manager: string; crew: string;
  tool: Tool; target: number; reward: number; kind: 'store' | 'park';
  pattern: MissionPattern; diagnosticView: MissionDiagnosticView;
  dependencies: readonly string[]; lesson: string;
}
export interface MissionItem {
  pattern: MissionPattern; diagnosticView: MissionDiagnosticView; lesson: string;
  dependencies: readonly string[]; available: boolean; lockedReason: string;
  landReward?:number;
  id: string; title: string; task: string; manager: string; crew: string;
  tool: Tool; target: number; current: number; done: boolean; reward: number; claimed: boolean;
}
export interface MissionSnapshot {
  hidden: boolean; recognition: number; items: MissionItem[];
  roadsSpent: number; buildingsSpent: number; servicesSpent: number;
  neededServiceCost: number;
  /** The existing land-growth level, not a second XP/currency system. */
  level: number; levelCurrent: number; levelTarget: number; nextLevelReward: string;
  currentMissionId: string | null;
}

export const MISSION_DEFINITIONS: readonly MissionDefinition[] = [
  { pattern: 'access', diagnosticView: 'access', dependencies: [], lesson: 'Connect a home to a destination and keep the return route open.', id: 'open-for-business', title: 'Open for business', task: `Help ${CITY_RULES.missions.firstShoppers} household(s) finish shopping with a route there and home.`,
    manager: 'One home, one store, one affordable road. Every great mayor needs a first customer.',
    crew: 'Homes supply drivers. Connect the entrance arrows with roads, then let a shopping visit finish.', tool: 'store', target: CITY_RULES.missions.firstShoppers, reward: CITY_RULES.missions.rewards.first, kind: 'store' },
  { pattern: 'flow', diagnosticView: 'traffic', dependencies: ['open-for-business'], lesson: 'Shared roads must serve every household. A working layout counts without a forced jam.', id: 'word-on-the-street', title: 'Word on the street', task: `Serve ${CITY_RULES.missions.neighbourhoodShoppers} households with shopping access both ways.`,
    manager: 'More homes, more engines, more people who need me. Use the roads we already paid for.',
    crew: 'Three different households need to finish shopping visits. One car going in circles is still one household.', tool: 'home', target: CITY_RULES.missions.neighbourhoodShoppers, reward: CITY_RULES.missions.rewards.neighbourhood, kind: 'store' },
  { pattern: 'access', diagnosticView: 'access', dependencies: ['open-for-business'], lesson: 'A second journey purpose must also have access home. Parks do not replace shopping.', id: 'a-reason-to-drive', title: 'A reason to drive', task: `Give ${CITY_RULES.missions.parkHouseholds} households a finished park visit and a route home.`,
    manager: 'A park! Another reason to drive across town, and a very economical place for my opening speech.',
    crew: 'Connect a park and let three households finish leisure visits. A full shop or park may need more capacity.', tool: 'park', target: CITY_RULES.missions.parkHouseholds, reward: CITY_RULES.missions.rewards.park, kind: 'park' },
  { pattern: 'capacity', diagnosticView: 'capacity', dependencies: ['word-on-the-street'], lesson: 'Check visitor slots before adding roads; use existing spare capacity or place another store.', id: 'a-town-to-notice', title: 'A town to notice', task: `Serve ${CITY_RULES.missions.townShoppers} households with shopping visits and access both ways.`,
    manager: 'Six households on the move. Keep the invoices modest. Buy the badges and sirens when we need them.',
    crew: 'A full store needs visitor space; a queue on usable roads needs traffic attention. Check which is limiting service. Extra roads do not add store slots.', tool: 'home', target: CITY_RULES.missions.townShoppers, reward: CITY_RULES.missions.rewards.town, kind: 'store' },
  { id: 'everyone-connected', title: 'Nobody left behind',
    task: 'Help every current household finish shopping, with a usable route there and home.',
    manager: 'Every household served. I shall need a much wider ribbon for this achievement.',
    crew: 'Serve everyone already living here. Fix access, queues or visitor capacity as needed; any working layout counts. No countdown.',
    tool: 'road', target: CITY_RULES.missions.networkMinimumHomes, reward: 0, kind: 'store', pattern: 'flow',
    diagnosticView: 'access', dependencies: ['word-on-the-street'],
    lesson: 'A busy road is successful only when every household can use it. Keep the whole neighbourhood connected as it grows.' },
  { id: 'neighborhood-flow', title: 'A neighborhood worth visiting',
    task: 'Help the neighborhood shop and get home reliably.',
    manager: 'Repeat customers, returning home. My reputation is really going places.',
    crew: 'Every household needs shopping visits and returns. Improve roads, controls or nearby stores. A working layout already counts.',
    tool: 'road', target: 6, reward: 0, kind: 'store', pattern: 'flow', diagnosticView: 'traffic',
    dependencies: ['word-on-the-street'], lesson: 'Keep useful service going as your own town grows. No countdown.' },
] as const;

export const createMissionProgress = (): MissionProgress => ({ version: 1, hidden: false, completed: [], claimed: [], shoppers: [], parkVisitors: [] });

/** Ancillary job data must never make an otherwise valid saved town unloadable. */
export function parseMissionProgress(raw: unknown, nextId: number, elapsed = Infinity): MissionProgress {
  if (!raw || typeof raw !== 'object') return createMissionProgress();
  const p = raw as MissionProgress;
  const ids = (a: unknown): a is number[] => Array.isArray(a) && a.length <= 1024
    && a.every(id => Number.isSafeInteger(id) && id >= 1 && id < nextId) && new Set(a).size === a.length;
  const names = (a: unknown): a is string[] => Array.isArray(a) && a.length <= 128
    && a.every(id => typeof id === 'string' && /^[a-z0-9-]{1,64}$/.test(id)) && new Set(a).size === a.length;
  if (p.version !== 1 || typeof p.hidden !== 'boolean' || !names(p.completed)
    || (p.claimed !== undefined && !names(p.claimed)) || !ids(p.shoppers) || !ids(p.parkVisitors)) return createMissionProgress();
  return { version: 1, hidden: p.hidden, completed: [...p.completed], claimed: [...(p.claimed ?? [])], shoppers: [...p.shoppers], parkVisitors: [...p.parkVisitors],
    ...(parseFlowProgress(p.flow, elapsed) ? {flow:parseFlowProgress(p.flow, elapsed)} : {}) };
}

/** A served household must still exist and retain access; demolition does not raise progress. */
function served(city: City, ids: number[], kind: 'store' | 'park'): number {
  const destinations = city.buildings.filter(b => b.kind === kind);
  const seen = new Set(ids);
  let count = 0;
  for (const b of city.buildings) if (b.kind === 'home' && seen.has(b.id)
    && destinations.some(d => findPath(city, entrance(b), entrance(d)) !== null
      && findPath(city, entrance(d), entrance(b)) !== null)) {
    count++;
  }
  return count;
}

function items(city: City, includeFlow = true): MissionItem[] {
  const p = city.missions ?? createMissionProgress();
  const needShopping = MISSION_DEFINITIONS.some(j => j.kind === 'store' && !p.completed.includes(j.id));
  const needLeisure = MISSION_DEFINITIONS.some(j => j.kind === 'park' && !p.completed.includes(j.id));
  const shopping = needShopping ? served(city, p.shoppers, 'store') : 0;
  const leisure = needLeisure ? served(city, p.parkVisitors, 'park') : 0;
  return MISSION_DEFINITIONS.filter(job => includeFlow || job.id !== FLOW_MISSION_ID).map(job => {
    const done = p.completed.includes(job.id);
    if (job.id === FLOW_MISSION_ID) {
      const flow = flowSnapshot(city, p.flow?.targetHomes ?? Math.max(job.target, city.buildings.filter(b=>b.kind==='home').length), 'shopping', FLOW_OBJECTIVE_RULES);
      const available = done || (['complete','skipped'].includes(city.tutorial?.status ?? '') && job.dependencies.every(id=>p.completed.includes(id)));
      return {...job, target:flow.requiredHomes, current:done ? flow.requiredHomes : flow.qualifiedHomes, done, claimed:true,
        available, lockedReason:available ? '' : 'Finish or skip the tutorial and serve the first neighborhood.',
        task:`Help all ${flow.requiredHomes} homes shop and get home.`};
    }
    const target = job.id === 'everyone-connected' ? Math.max(job.target, city.buildings.filter(b => b.kind === 'home').length) : job.target;
    const unmet = job.dependencies.filter(id => !p.completed.includes(id));
    return { ...job, target, current: done ? target : Math.min(target, job.kind === 'store' ? shopping : leisure),
      done, claimed: job.reward === 0 || (p.claimed ?? []).includes(job.id), available: done || unmet.length === 0,
      lockedReason: done || unmet.length === 0 ? '' : `Suggested next after ${unmet.map(id => MISSION_DEFINITIONS.find(j => j.id === id)!.title).join(' and ')}. Earlier successful work still counts.` };
  });
}

/** Call only on the exactly-once completed-visit boundary, before setting trip.rewarded. */
export function recordMissionVisit(city: City, trip: Trip): void {
  if (trip.service || trip.rewarded || trip.phase !== 'visiting') return;
  const homes = new Set(city.buildings.filter(b => b.kind === 'home').map(b => b.id));
  if (!homes.has(trip.homeId)) return;
  const p = city.missions ??= createMissionProgress();
  p.shoppers = p.shoppers.filter(id => homes.has(id));
  p.parkVisitors = p.parkVisitors.filter(id => homes.has(id));
  const list = trip.purpose === 'leisure' ? p.parkVisitors : p.shoppers;
  if (!list.includes(trip.homeId)) list.push(trip.homeId);
  refreshMissions(city);
}

/** Credit foresight even when work is done before its suggested place in the list. */
export function refreshMissions(city: City): void {
  const p = city.missions ??= createMissionProgress();
  // FLOW owns its sampled completion in refreshFlowProgress; visit credit never uses its report.
  for (const job of items(city, false)) if (!job.done && job.current >= job.target) p.completed.push(job.id);
  refreshExpansionProgress(city);
}

export function missionSnapshot(city: City): MissionSnapshot {
  const p = city.missions ?? createMissionProgress();
  const jobs = items(city);
  const land=expansionSnapshot(city);
  // Unlock the land mission board after the introductory two strips.
  if(land.used>=2)for(let level=0;level<=Math.min(land.level,19);level++){
    const done=level<land.level,target=expansionTarget(level);
    jobs.push({pattern:'growth',diagnosticView:'normal',dependencies:[],available:true,lockedReason:'',
      lesson:'Carry the same access, flow and capacity checks into a larger neighbourhood.',id:`land-growth-${level+1}`,title:`Room to grow · Level ${level+1}`,task:`Get ${target} households to finish shopping visits with routes to stores and home.`,
      manager:'More neighbours! More land! More roads! The mayor calls this evidence. I call it an audience.',crew:'Serve the households already here and keep their stores reachable. Each growth level earns one land expansion.',
      tool:'home',target,current:done?target:land.current,done,claimed:done,reward:0,landReward:1});
  }
  let buildingsSpent = 0, servicesSpent = 0;
  for (const b of city.buildings) {
    if (b.kind === 'hospital' || b.kind === 'policeStation' || b.kind === 'fireStation') servicesSpent += COSTS[b.kind];
    else buildingsSpent += COSTS[b.kind];
  }
  const services = { police: 'policeStation', ems: 'hospital', fire: 'fireStation' } as const;
  const missing = new Set(city.incidents.filter(i => i.status === 'active').flatMap(i => incidentServices(i)
    .filter(service => !i.completedServices.includes(service) && !city.buildings.some(b => b.kind === services[service]))));
  const neededServiceCost = [...missing].reduce((sum, service) => sum + constructionPriceForCity(city, services[service]), 0);
  return { hidden: p.hidden, recognition: jobs.filter(j => j.done).length, items: jobs,
    roadsSpent: city.roads.length * COSTS.road, buildingsSpent, servicesSpent, neededServiceCost,
    level: land.level, levelCurrent: land.current, levelTarget: land.target,
    nextLevelReward: land.level >= 20 ? 'All growth levels earned' : 'One land expansion',
    currentMissionId: jobs.find(j => !j.done && j.available)?.id ?? null };
}

/** Completion and collection are separate so opening/reloading the board never grants money. */
export function claimMissionReward(city: City, id: string): { claimed: boolean; amount: number; message: string } {
  const job = MISSION_DEFINITIONS.find(j => j.id === id);
  const p = city.missions;
  if (!job || job.reward === 0) return { claimed: false, amount: 0, message: 'That mission is not available.' };
  if (!p?.completed.includes(id)) return { claimed: false, amount: 0, message: 'Finish this mission before claiming its reward.' };
  p.claimed ??= [];
  if (p.claimed.includes(id)) return { claimed: false, amount: 0, message: 'This mission reward has already been claimed.' };
  // Mutate the receipt and wallet together; the caller persists the whole city as usual.
  p.claimed.push(id);
  city.funds += job.reward;
  return { claimed: true, amount: job.reward, message: `${job.title}: $${job.reward} reward claimed.` };
}
