import {incidentServices} from './cityIncidents.ts';
/** Optional growth goals. Visits earn recognition; completed jobs offer an optional, one-time cash claim. */
import { COSTS, entrance, findPath, constructionPriceForCity, type City, type Trip, type Tool } from './cityModel.ts';
import {expansionSnapshot,expansionTarget,refreshExpansionProgress} from './cityExpansion.ts';

export interface MissionProgress {
  version: 1;
  hidden: boolean;
  completed: string[];
  claimed: string[];
  shoppers: number[];
  parkVisitors: number[];
}
export interface MissionItem {
  landReward?:number;
  id: string; title: string; task: string; manager: string; crew: string;
  tool: Tool; target: number; current: number; done: boolean; reward: number; claimed: boolean;
}
export interface MissionSnapshot {
  hidden: boolean; recognition: number; items: MissionItem[];
  roadsSpent: number; buildingsSpent: number; servicesSpent: number;
  neededServiceCost: number;
}

const JOBS = [
  { id: 'open-for-business', title: 'Open for business', task: 'Help one household finish a shopping visit.',
    manager: 'One home, one store, one affordable road. Every great mayor needs a first customer.',
    crew: 'Homes supply drivers. Connect the entrance arrows with roads, then let a shopping visit finish.', tool: 'store', target: 1, reward: 100, kind: 'store' },
  { id: 'word-on-the-street', title: 'Word on the street', task: 'Get three households shopping.',
    manager: 'More homes, more engines, more people who need me. Use the roads we already paid for.',
    crew: 'Three different households need to finish shopping visits. One car going in circles is still one household.', tool: 'home', target: 3, reward: 200, kind: 'store' },
  { id: 'a-reason-to-drive', title: 'A reason to drive', task: 'Give three households a finished park visit.',
    manager: 'A park! Another reason to drive across town, and a very economical place for my opening speech.',
    crew: 'Connect a park and let three households finish leisure visits. A full shop or park may need more capacity.', tool: 'park', target: 3, reward: 200, kind: 'park' },
  { id: 'a-town-to-notice', title: 'A town to notice', task: 'Get six households shopping.',
    manager: 'Six households on the move. Keep the invoices modest. Buy the badges and sirens when we need them.',
    crew: 'A full store can leave households waiting. Try another destination or a different road. Services and traffic controls are available whenever you want them.', tool: 'home', target: 6, reward: 400, kind: 'store' },
] as const;

export const createMissionProgress = (): MissionProgress => ({ version: 1, hidden: false, completed: [], claimed: [], shoppers: [], parkVisitors: [] });

/** Ancillary job data must never make an otherwise valid saved town unloadable. */
export function parseMissionProgress(raw: unknown, nextId: number): MissionProgress {
  if (!raw || typeof raw !== 'object') return createMissionProgress();
  const p = raw as MissionProgress;
  const ids = (a: unknown): a is number[] => Array.isArray(a) && a.length <= 1024
    && a.every(id => Number.isSafeInteger(id) && id >= 1 && id < nextId) && new Set(a).size === a.length;
  const names = (a: unknown): a is string[] => Array.isArray(a) && a.length <= 128
    && a.every(id => typeof id === 'string' && /^[a-z0-9-]{1,64}$/.test(id)) && new Set(a).size === a.length;
  if (p.version !== 1 || typeof p.hidden !== 'boolean' || !names(p.completed)
    || (p.claimed !== undefined && !names(p.claimed)) || !ids(p.shoppers) || !ids(p.parkVisitors)) return createMissionProgress();
  return { version: 1, hidden: p.hidden, completed: [...p.completed], claimed: [...(p.claimed ?? [])], shoppers: [...p.shoppers], parkVisitors: [...p.parkVisitors] };
}

/** A served household must still exist and retain access; demolition does not raise progress. */
function served(city: City, ids: number[], kind: 'store' | 'park'): number {
  const destinations = city.buildings.filter(b => b.kind === kind);
  const seen = new Set(ids);
  const limit = kind === 'store' ? 6 : 3;
  let count = 0;
  for (const b of city.buildings) if (b.kind === 'home' && seen.has(b.id)
    && destinations.some(d => findPath(city, entrance(b), entrance(d)) !== null)) {
    if (++count === limit) break;
  }
  return count;
}

function items(city: City): MissionItem[] {
  const p = city.missions ?? createMissionProgress();
  const needShopping = JOBS.some(j => j.kind === 'store' && !p.completed.includes(j.id));
  const needLeisure = JOBS.some(j => j.kind === 'park' && !p.completed.includes(j.id));
  const shopping = needShopping ? served(city, p.shoppers, 'store') : 6;
  const leisure = needLeisure ? served(city, p.parkVisitors, 'park') : 3;
  return JOBS.map(job => ({ ...job, current: p.completed.includes(job.id) ? job.target : Math.min(job.target, job.kind === 'store' ? shopping : leisure), done: p.completed.includes(job.id), claimed: (p.claimed ?? []).includes(job.id) }));
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
  for (const job of items(city)) if (!job.done && job.current >= job.target) p.completed.push(job.id);
  refreshExpansionProgress(city);
}

export function missionSnapshot(city: City): MissionSnapshot {
  const p = city.missions ?? createMissionProgress();
  const jobs = items(city);
  const land=expansionSnapshot(city);
  // Unlock the land mission board after the introductory two strips.
  if(land.used>=2)for(let level=0;level<=Math.min(land.level,19);level++){
    const done=level<land.level,target=expansionTarget(level);
    jobs.push({id:`land-growth-${level+1}`,title:`Room to grow · Level ${level+1}`,task:`Get ${target} households to finish shopping visits with connected stores.`,
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
    roadsSpent: city.roads.length * COSTS.road, buildingsSpent, servicesSpent, neededServiceCost };
}

/** Completion and collection are separate so opening/reloading the board never grants money. */
export function claimMissionReward(city: City, id: string): { claimed: boolean; amount: number; message: string } {
  const job = JOBS.find(j => j.id === id);
  const p = city.missions;
  if (!job) return { claimed: false, amount: 0, message: 'That mission is not available.' };
  if (!p?.completed.includes(id)) return { claimed: false, amount: 0, message: 'Finish this mission before claiming its reward.' };
  p.claimed ??= [];
  if (p.claimed.includes(id)) return { claimed: false, amount: 0, message: 'This mission reward has already been claimed.' };
  // Mutate the receipt and wallet together; the caller persists the whole city as usual.
  p.claimed.push(id);
  city.funds += job.reward;
  return { claimed: true, amount: job.reward, message: `${job.title}: $${job.reward} reward claimed.` };
}
