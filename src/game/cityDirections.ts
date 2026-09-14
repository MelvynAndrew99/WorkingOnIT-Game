/** Sparse directions on physical road connections. Missing metadata means two-way. */
import type {City, Point} from './cityModel.ts';
import { allowsWideRoadStep, wideRoadSignature, type WideRoadCity } from './cityWideRoads.ts';
export type RoadDirection = 'forward' | 'reverse';
export type RoadDirections = Record<string, RoadDirection>;
const key = (p: Point) => `${p.x},${p.y}`;
const first = (a: Point,b: Point) => a.x < b.x || a.x === b.x && a.y < b.y;
export const roadEdgeKey = (a: Point,b: Point): string => first(a,b) ? `${key(a)}>${key(b)}` : `${key(b)}>${key(a)}`;
export const roadDirectionForStep = (a: Point,b: Point): RoadDirection => first(a,b) ? 'forward' : 'reverse';
/** Callers with a road index can validate existence here. Otherwise callers validate roads themselves.
 * No road scans: this predicate also runs at physical movement frequency. */
export function allowsRoadStep(city: Pick<City,'roadDirections'> & WideRoadCity,a: Point,b: Point,roads?: ReadonlySet<string>): boolean {
  if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)!==1)return false;
  if(roads&&(!roads.has(key(a))||!roads.has(key(b))))return false;
  if(!allowsWideRoadStep(city,a,b))return false;
  if(!city.roadDirections)return true;
  const direction=city.roadDirections[roadEdgeKey(a,b)];
  return direction===undefined||direction===roadDirectionForStep(a,b);
}
export function directionSignature(city: Pick<City,'roadDirections'> & WideRoadCity): string {
  const wide=city.wideRoads?.length?wideRoadSignature(city):'';
  const directions=city.roadDirections?Object.keys(city.roadDirections).sort().map(k=>`${k}:${city.roadDirections![k]}`).join(';'):'';
  return wide?`${directions}|wide:${wide}`:directions;
}
export function roadEdgePoints(edge: string): [Point,Point] | null {
  const match=/^(-?\d+),(-?\d+)>(-?\d+),(-?\d+)$/.exec(edge);
  if(!match)return null;
  const [x,y,bx,by]=match.slice(1).map(Number);
  if(![x,y,bx,by].every(Number.isSafeInteger))return null;
  const a={x,y},b={x:bx,y:by};
  if(Math.abs(x-bx)+Math.abs(y-by)!==1||roadEdgeKey(a,b)!==edge)return null;
  return [a,b];
}
/** Reject the entire malformed metadata rather than silently reopening/reversing a network. */
export function parseRoadDirections(raw: unknown,roads: ReadonlySet<string>): RoadDirections | undefined | null {
  if(raw===undefined)return undefined;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const entries=Object.entries(raw);
  if(entries.length>roads.size*2)return null;
  const result:RoadDirections={};
  for(const [edge,direction] of entries){
    const points=roadEdgePoints(edge);
    if(!points||!points.every(p=>roads.has(key(p)))||(direction!=='forward'&&direction!=='reverse'))return null;
    result[edge]=direction;
  }
  return entries.length?result:undefined;
}
/** Demolition only drops disappeared edges; rebuilding never resurrects direction metadata. */
export function pruneRoadDirections(city: City): void {
  if(!city.roadDirections)return;
  const roads=new Set(city.roads.map(key));
  for(const edge of Object.keys(city.roadDirections)){
    const points=roadEdgePoints(edge);
    if(!points||!points.every(p=>roads.has(key(p))))delete city.roadDirections[edge];
  }
  if(!Object.keys(city.roadDirections).length)delete city.roadDirections;
}
