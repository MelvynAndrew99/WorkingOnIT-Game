/**
 * Catalog prices, new-town grant, actual-payment provenance, and finite tutorial waivers.
 * Independent of artwork. Balance below is provisional, not player-verified.
 */
import type { Building, City, Point, Tool } from './cityModel.ts';
import {STARTER_GRANTS} from './cityStarterTutorial.ts';

export const STARTING_FUNDS = 900;
export const COSTS = {
  busStation:1000, busStop:50, road: 20, wideRoad: 40, stop: 25, signal: 75, home: 200, store: 400, park: 300, hospital: 800, fireStation: 700, policeStation: 600,
} as const;
export type PricedTool = keyof typeof COSTS;
/** Simulation seconds without meaningful current-lesson progress before a grant. Provisional. */
export const STALL_SECONDS = 60;
export const LESSON_ORDER = [
  'first-visit', 'park-visit', 'driver-rules', 'junction-control',
  'accident-response', 'rescue', 'detour',
] as const;
export type GrantLessonId = (typeof LESSON_ORDER)[number];

/** Finite free placements after a stall. Not unlimited free construction. Provisional. */
export const WAIVER_BUDGET: Record<GrantLessonId, Partial<Record<PricedTool, number>>> = {
  'first-visit': { home: 1, store: 1, road: 12 },
  'park-visit': { park: 1, home: 2, road: 8 },
  'driver-rules': {},
  'junction-control': {},
  'accident-response': { home: 2, store: 1, road: 16 },
  'rescue': { hospital: 1, fireStation: 1, policeStation: 1, road: 16 },
  'detour': { road: 16 },
};

export const MAYOR_OFFER: Record<GrantLessonId, string> = {
  'first-visit': 'The home, store, and roads are on the city while you place them. I will take the credit.',
  'park-visit': 'Place a park on the city. I will cut the ribbon.',
  'driver-rules': '',
  'junction-control': '',
  'accident-response': 'Homes, shops, and roads are on the city while you set up a real crossing. I will not crash the cars for you.',
  'rescue': 'Clinic, police, and fire are on the mayor while you pick their lots. A building is not a rescue until crews can drive there.',
  'detour': 'Detour roads are on me. A bypass keeps traffic moving. It does not treat anyone.',
};

export interface EconomyProgress {
  version: 1;
  waived: string[];
  allowance?: Partial<Record<PricedTool, number>>;
  /** Grant owner is independent of the restartable stall timer and tutorial metadata. */
  allowanceLesson?: GrantLessonId;
  stallLesson?: string;
  stallAt?: number;
  stallMark?: number;
}

const PRICED: PricedTool[] = ['wideRoad','busStation','busStop','stop', 'signal', 'road', 'home', 'store', 'park', 'hospital', 'fireStation', 'policeStation'];
const isPriced = (tool: string): tool is PricedTool => Object.hasOwn(COSTS, tool);
const isLesson = (id: string): id is GrantLessonId => (LESSON_ORDER as readonly string[]).includes(id);
const tileKey = (p: Point) => `${p.x},${p.y}`;
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export const createEconomyProgress = (): EconomyProgress => ({ version: 1, waived: [] });

export function currentGrantLesson(completed: string[]): GrantLessonId | undefined {
  return LESSON_ORDER.find(id => !completed.includes(id));
}
function cityGrantLesson(city:City):GrantLessonId|undefined {
 return city.tutorial?.hRoad?STARTER_GRANTS[city.tutorial.hRoad.stage]:currentGrantLesson(city.tutorial?.completed??[]);
}

export function constructionPrice(tool: Tool, allowance?: Partial<Record<PricedTool, number>> | null): number {
  if (!isPriced(tool)) return 0;
  if ((allowance?.[tool] ?? 0) > 0) return 0;
  return COSTS[tool];
}

export function grantAllowance(city: City): Partial<Record<PricedTool, number>> | null {
  const tutorial = city.tutorial;
  if (tutorial?.status !== 'active') return null;
  const lesson = cityGrantLesson(city);
  if (!lesson || city.economy?.allowanceLesson !== lesson || !city.economy.waived.includes(lesson)) return null;
  return city.economy.allowance ?? null;
}

export function constructionPriceForCity(city: City, tool: Tool): number {
  return constructionPrice(tool, grantAllowance(city));
}

export function toolPrices(city: City): Record<PricedTool, number> {
  const allowance = grantAllowance(city);
  const prices = {} as Record<PricedTool, number>;
  for (const tool of PRICED) prices[tool] = constructionPrice(tool, allowance);
  return prices;
}

export function paidForBuilding(building: Building): number {
  return building.paid ?? COSTS[building.kind];
}

export function paidForRoad(city: City, point: Point): number {
  const recorded = city.roadPaid?.[tileKey(point)];
  return recorded === undefined ? COSTS.road : recorded;
}

export function recordBuildingPayment(building: Building, price: number): void {
  building.paid = price;
}

export function recordRoadPayment(city: City, point: Point, price: number): void {
  city.roadPaid ??= {};
  city.roadPaid[tileKey(point)] = price;
}

export function clearRoadPayment(city: City, point: Point): number {
  const amount = paidForRoad(city, point);
  if (city.roadPaid) {
    delete city.roadPaid[tileKey(point)];
    if (Object.keys(city.roadPaid).length === 0) delete city.roadPaid;
  }
  return amount;
}

export function consumeGrant(city: City, tool: Tool): void {
  if (!isPriced(tool)) return;
  const allowance = grantAllowance(city);
  const left = allowance?.[tool];
  if (!allowance || left === undefined || left <= 0) return;
  allowance[tool] = left - 1;
}

export function clearStall(city: City): void {
  if (!city.economy) return;
  delete city.economy.stallLesson;
  delete city.economy.stallAt;
  delete city.economy.stallMark;
}

export function activateGrant(city: City, lessonId: GrantLessonId): void {
  if (city.tutorial?.status !== 'active' || cityGrantLesson(city) !== lessonId) return;
  const economy = city.economy ??= createEconomyProgress();
  if (economy.waived.includes(lessonId)) return;
  if (city.tutorial?.assisted.includes(lessonId)) return;
  const budget = WAIVER_BUDGET[lessonId];
  if (!budget || Object.keys(budget).length === 0) return;
  economy.waived.push(lessonId);
  economy.allowance = { ...budget };
  if(lessonId==='rescue'&&city.tutorial.hRoad){delete economy.allowance.policeStation;delete economy.allowance.fireStation;}
  // Additional households are part of the new H growth lesson only.
  if(lessonId==='park-visit'&&!city.tutorial.hRoad)delete economy.allowance.home;
  economy.allowanceLesson = lessonId;
}

export function constructionChanged(before: City, after: City): boolean {
  return before.funds !== after.funds
    || before.buildings.length !== after.buildings.length
    || before.roads.length !== after.roads.length
    || before.nextId !== after.nextId
    || before.controls.length !== after.controls.length
    || before.closures.length !== after.closures.length
    || JSON.stringify(before.buildings) !== JSON.stringify(after.buildings)
    || JSON.stringify(before.roads) !== JSON.stringify(after.roads)
    || JSON.stringify(before.wideRoads) !== JSON.stringify(after.wideRoads)
    || JSON.stringify(before.wideRoadWorks) !== JSON.stringify(after.wideRoadWorks);
}

export function parseRoadPaid(raw: unknown, roads: Point[], area: number): Record<string, number> | null | undefined {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const existing = new Set(roads.map(tileKey));
  const paid: Record<string, number> = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (++count > area) return null;
    if (!/^-?\d+,-?\d+$/.test(key) || !integer(value) || value > COSTS.road) return null;
    if (!existing.has(key)) continue;
    paid[key] = value;
  }
  return paid;
}

export function parseEconomyProgress(raw: unknown, elapsed: number): EconomyProgress | null {
  if (raw === undefined) return createEconomyProgress();
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as EconomyProgress;
  if (e.version !== 1 || !Array.isArray(e.waived) || e.waived.length > LESSON_ORDER.length
    || !e.waived.every(id => typeof id === 'string' && isLesson(id))
    || new Set(e.waived).size !== e.waived.length) return null;
  const economy: EconomyProgress = { version: 1, waived: [...e.waived] };
  if (e.allowanceLesson !== undefined) {
    if (typeof e.allowanceLesson !== 'string' || !isLesson(e.allowanceLesson) || !e.waived.includes(e.allowanceLesson)) return null;
    economy.allowanceLesson = e.allowanceLesson;
  }
  if (e.allowance !== undefined) {
    if (!e.allowance || typeof e.allowance !== 'object' || Array.isArray(e.allowance)) return null;
    // Migrate the pre-owner development format only against its latest recorded grant.
    const owner = economy.allowanceLesson ?? e.waived.at(-1);
    if (!owner || !isLesson(owner) || Object.keys(WAIVER_BUDGET[owner]).length === 0) return null;
    const budget = WAIVER_BUDGET[owner];
    const allowance: Partial<Record<PricedTool, number>> = {};
    for (const [tool, value] of Object.entries(e.allowance)) {
      if (!isPriced(tool) || !integer(value) || budget[tool] === undefined || value > budget[tool]!) return null;
      allowance[tool] = value;
    }
    economy.allowance = allowance;
    economy.allowanceLesson = owner;
  }
  if (e.stallLesson !== undefined) {
    if (typeof e.stallLesson !== 'string' || !isLesson(e.stallLesson)) return null;
    economy.stallLesson = e.stallLesson;
  }
  if (e.stallAt !== undefined) {
    if (!finite(e.stallAt) || e.stallAt > elapsed + 1e-6) return null;
    economy.stallAt = e.stallAt;
  }
  if (e.stallMark !== undefined) {
    if (!integer(e.stallMark) || e.stallMark > 1_000_000) return null;
    economy.stallMark = e.stallMark;
  }
  return economy;
}
