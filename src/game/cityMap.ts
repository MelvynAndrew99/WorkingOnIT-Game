/** Logical buildable land. Camera and asset sizes never define these bounds. */
export const INITIAL_WIDTH = 16;
export const INITIAL_HEIGHT = 14;
export const MAX_MAP_SIZE = 64;
export const EXPANSION_STEP = 8;
export type MapBounds = { x: number; y: number; width: number; height: number };
export type ExpansionDirection = 'north' | 'east' | 'south' | 'west';
export const initialMap = (): MapBounds => ({ x: 0, y: 0, width: INITIAL_WIDTH, height: INITIAL_HEIGHT });

export function containsTile(map: MapBounds, p: { x: number; y: number }): boolean {
  return Number.isSafeInteger(p.x) && Number.isSafeInteger(p.y)
    && p.x >= map.x && p.y >= map.y && p.x < map.x + map.width && p.y < map.y + map.height;
}

/** Undefined is a legacy city save; malformed new map data must not reset its bounds. */
export function parseMap(raw: unknown): MapBounds | null {
  if (raw === undefined) return initialMap();
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as MapBounds;
  if (![r.x, r.y, r.width, r.height].every(Number.isSafeInteger)
    || r.width < INITIAL_WIDTH || r.width > MAX_MAP_SIZE || r.height < INITIAL_HEIGHT || r.height > MAX_MAP_SIZE
    || r.x > 0 || r.y > 0 || r.x + r.width < INITIAL_WIDTH || r.y + r.height < INITIAL_HEIGHT) return null;
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

/** Returns a larger rectangle without translating any existing world coordinates. */
export function expandedMap(map: MapBounds, direction: ExpansionDirection): MapBounds | null {
  if (!['north', 'east', 'south', 'west'].includes(direction)) return null;
  const horizontal = direction === 'east' || direction === 'west';
  const amount = Math.min(EXPANSION_STEP, MAX_MAP_SIZE - (horizontal ? map.width : map.height));
  if (amount <= 0) return null;
  return {
    x: map.x - (direction === 'west' ? amount : 0),
    y: map.y - (direction === 'north' ? amount : 0),
    width: map.width + (horizontal ? amount : 0),
    height: map.height + (horizontal ? 0 : amount),
  };
}
