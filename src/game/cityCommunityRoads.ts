/** Narrow-looking community lanes retain ordinary logical road tiles and physical admission. */
import type { Point } from './cityModel.ts';
import {wideRoadFootprint, type WideRoadSection} from './cityWideRoads.ts';

/** Half the ordinary 2 tile/s speed; active responders obey this limit too. */
export const COMMUNITY_ROAD_SPEED = 1;
const key = (p: Point) => `${p.x},${p.y}`;
export function communityRoadKeys(city: {communityRoads?: readonly Point[]}): Set<string> {
  return new Set((city.communityRoads ?? []).map(key));
}
/** Slow before entering the street and until the vehicle has left its final tile. */
export function communityEdgeSpeed(roads: ReadonlySet<string> | undefined, a: Point, b: Point, speed: number): number {
  return roads?.size && (roads.has(key(a)) || roads.has(key(b))) ? Math.min(speed, COMMUNITY_ROAD_SPEED) : speed;
}
/** Missing legacy metadata is empty; malformed metadata never fabricates pavement. */
export function parseCommunityRoads(raw: unknown, roads: readonly Point[], wideRoads: readonly WideRoadSection[] = []): Point[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > roads.length) return null;
  const pavement = new Set(roads.map(key));
  const wide = new Set(wideRoads.flatMap(wideRoadFootprint).map(key));
  const seen = new Set<string>(), result: Point[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object' || !Number.isSafeInteger(value.x) || !Number.isSafeInteger(value.y)) return null;
    const p = {x:value.x, y:value.y}, at = key(p);
    if (seen.has(at) || !pavement.has(at) || wide.has(at)) return null;
    seen.add(at); result.push(p);
  }
  return result;
}
