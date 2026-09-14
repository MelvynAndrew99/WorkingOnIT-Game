import {buildPrivateComplex} from './cityPrivateLanes.ts';
import {entrances, type City, type Point} from './cityModel.ts';
import {allowsRoadStep} from './cityDirections.ts';
import {residentialCarCapacity} from './cityVisits.ts';

export type ApartmentComplex = {id: number; buildingIds: number[]; privateLanes?: Point[]};
const key = (p: Point) => `${p.x},${p.y}`;
const neighbours = (p: Point): Point[] => [
  {x:p.x-1,y:p.y}, {x:p.x+1,y:p.y}, {x:p.x,y:p.y-1}, {x:p.x,y:p.y+1},
];

/** Physical community-road continuity; closures and queues do not change membership.
 * This measures infrastructure only. All actual journeys still obey directed routing. */
function communityComponents(city: City, extra: Point[] = []): Map<string, number> {
  const roads = new Set(city.roads.map(key));
  const community = new Map([...(city.communityRoads ?? []), ...extra].filter(p => roads.has(key(p))).map(p => [key(p), p]));
  const components = new Map<string, number>();
  let next = 0;
  for (const [startKey, start] of community) {
    if (components.has(startKey)) continue;
    const component = next++, queue = [start];
    components.set(startKey, component);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const point = queue[cursor];
      for (const neighbour of neighbours(point)) {
        const k = key(neighbour);
        if (!community.has(k) || components.has(k)) continue;
        if (!allowsRoadStep(city, point, neighbour) && !allowsRoadStep(city, neighbour, point)) continue;
        components.set(k, component); queue.push(neighbour);
      }
    }
  }
  return components;
}

function connected(city: City, buildingIds: number[], privateAccess = false): boolean {
  if (buildingIds.length < 2) return true;
  const components = communityComponents(city, privateAccess ? city.buildings.filter(b=>buildingIds.includes(b.id)).flatMap(entrances) : []);
  let shared: Set<number> | undefined;
  for (const id of buildingIds) {
    const building = city.buildings.find(b => b.id === id && b.kind === 'apartment');
    if (!building) return false;
    const access = new Set(entrances(building).map(p => components.get(key(p))).filter((id): id is number => id !== undefined));
    shared = shared === undefined ? access : new Set([...shared].filter(id => access.has(id)));
    if (!shared.size) return false;
  }
  return !!shared?.size;
}

export function apartmentComplexSummary(city: City, buildingId: number): {id:number; blocks:number; residents:number; connected:boolean} | null {
  const building = city.buildings.find(b => b.id === buildingId && b.kind === 'apartment');
  if (!building) return null;
  const complex = city.apartmentComplexes?.find(group => group.buildingIds.includes(buildingId));
  const buildingIds = complex?.buildingIds ?? [buildingId];
  return {
    id: buildingId,
    blocks: buildingIds.length,
    residents: buildingIds.reduce((sum, id) => sum + residentialCarCapacity(city.buildings.find(b => b.id === id)!), 0),
    connected: connected(city, buildingIds, complex?.privateLanes !== undefined),
  };
}

/** Legacy prebuilt-road joining. Managed communities always use the automatic planner. */
export function joinApartmentComplex(city: City, firstId: number, secondId: number): string {
  if (firstId === secondId) return 'Choose a different apartment block to join.';
  if (![firstId, secondId].every(id => city.buildings.some(b => b.id === id && b.kind === 'apartment')))
    return 'Choose two apartment blocks.';
  const first = city.apartmentComplexes?.find(group => group.buildingIds.includes(firstId));
  const second = city.apartmentComplexes?.find(group => group.buildingIds.includes(secondId));
  if (first && first === second) return 'These blocks already belong to the same complex.';
  if(first?.privateLanes || second?.privateLanes)return buildPrivateComplex(city,firstId,secondId);
  const buildingIds = [...new Set([...(first?.buildingIds ?? [firstId]), ...(second?.buildingIds ?? [secondId])])].sort((a,b) => a-b);
  if (!connected(city, buildingIds)) return 'Connect an enabled entrance of every block with continuous community roads first.';
  const complex: ApartmentComplex = {id: buildingIds[0], buildingIds};
  city.apartmentComplexes = [...(city.apartmentComplexes ?? []).filter(group => group !== first && group !== second), complex].sort((a,b) => a.id-b.id);
  return `Complex joined: ${buildingIds.length} apartment blocks.`;
}

/** Strict optional saved membership; disconnected complexes remain valid saves. */
export function parseApartmentComplexes(raw: unknown, city: City): ApartmentComplex[] | undefined | null {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > Math.floor(city.buildings.length / 2)) return null;
  const apartmentIds = new Set(city.buildings.filter(b => b.kind === 'apartment').map(b => b.id));
  const members = new Set<number>();
  const ownedLanes = new Set<string>();
  const community = new Set(city.communityRoads?.map(key));
  const result: ApartmentComplex[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const group = value as Record<string, unknown>;
    if (!Number.isSafeInteger(group.id) || !Array.isArray(group.buildingIds) || group.buildingIds.length < 2
      || group.buildingIds.length > apartmentIds.size) return null;
    const ids: number[] = [];
    for (const id of group.buildingIds) {
      if (typeof id !== 'number' || !Number.isSafeInteger(id) || !apartmentIds.has(id) || members.has(id)) return null;
      ids.push(id); members.add(id);
    }
    ids.sort((a,b) => a-b);
    if (group.id !== ids[0]) return null;
    let privateLanes: Point[] | undefined;
    if(group.privateLanes !== undefined) {
      if(!Array.isArray(group.privateLanes)||group.privateLanes.length>community.size)return null;
      privateLanes=[];
      for(const p of group.privateLanes) {
        if(!p||!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.y)||!community.has(key(p))||ownedLanes.has(key(p)))return null;
        ownedLanes.add(key(p));privateLanes.push({x:p.x,y:p.y});
      }
    }
    result.push({id:ids[0], buildingIds:ids, ...(privateLanes===undefined?{}:{privateLanes})});
  }
  return result.length ? result.sort((a,b) => a.id-b.id) : undefined;
}

/** Call after legitimate building removal; severing roads does not call this. */
export function pruneApartmentComplexes(city: City): void {
  if (!city.apartmentComplexes) return;
  const apartments = new Set(city.buildings.filter(b => b.kind === 'apartment').map(b => b.id));
  const groups = city.apartmentComplexes.map(group => {
    const buildingIds = group.buildingIds.filter(id => apartments.has(id)).sort((a,b) => a-b);
    return {...group, id:buildingIds[0], buildingIds};
  }).filter(group => group.buildingIds.length >= 2).sort((a,b) => a.id-b.id);
  if (groups.length) city.apartmentComplexes = groups;
  else delete city.apartmentComplexes;
}
