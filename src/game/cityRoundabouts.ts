/** Recognize simple one-way traffic islands. Derived topology, never saved vehicle state. */
import { type City, type Point, type Trip } from './cityModel.ts';
import { allowsRoadStep, directionSignature, roadEdgePoints } from './cityDirections.ts';

export type Roundabout = { id:string; points:Point[]; entries:{from:Point;to:Point}[] };
export type RoundaboutIndex = { rings:Roundabout[]; byTile:Map<string,Roundabout> };
const key=(p:Point)=>`${p.x},${p.y}`;
const neighbours=(p:Point)=>[{x:p.x+1,y:p.y},{x:p.x,y:p.y+1},{x:p.x-1,y:p.y},{x:p.x,y:p.y-1}];
const empty:RoundaboutIndex={rings:[],byTile:new Map()};
const cache=new WeakMap<City,{signature:string;index:RoundaboutIndex}>();
const scopes=new WeakMap<City,RoundaboutIndex>();

/** Call only while roads/directions/buildings cannot mutate, e.g. one simulation/read scope. */
export function withRoundaboutIndex<T>(city:City,action:()=>T):T {
  const previous=scopes.get(city),index=previous??roundaboutIndex(city);scopes.set(city,index);
  try{return action();}finally{if(previous)scopes.set(city,previous);else scopes.delete(city);}
}

function inside(point:Point,polygon:Point[]):boolean {
  let contained=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)contained=!contained;
  }
  return contained;
}

export function roundaboutIndex(city:City):RoundaboutIndex {
  if(!city.roadDirections)return empty;
  const scoped=scopes.get(city);if(scoped)return scoped;
  const signature=city.roads.map(key).join(';')+'|'+directionSignature(city);
  const old=cache.get(city);if(old?.signature===signature)return old.index;
  const roads=new Map(city.roads.map(p=>[key(p),p])),out=new Map<string,string[]>(),incoming=new Map<string,string[]>();
  for(const [edge,direction]of Object.entries(city.roadDirections)) {
    const ends=roadEdgePoints(edge);if(!ends||ends.some(p=>!roads.has(key(p))))continue;
    const [a,b]=direction==='forward'?ends:[ends[1],ends[0]],from=key(a),to=key(b);
    out.set(from,[...(out.get(from)??[]),to]);out.set(to,out.get(to)??[]);
    incoming.set(to,[...(incoming.get(to)??[]),from]);incoming.set(from,incoming.get(from)??[]);
  }
  // Iterative Kosaraju avoids recursive graph walks on the maximum map.
  const seen=new Set<string>(),finished:string[]=[];
  for(const start of out.keys()) {
    if(seen.has(start))continue;
    seen.add(start);const stack:{node:string;next:number}[]=[{node:start,next:0}];
    while(stack.length) {
      const top=stack[stack.length-1],adjacent=out.get(top.node)!;
      if(top.next<adjacent.length){const n=adjacent[top.next++];if(!seen.has(n)){seen.add(n);stack.push({node:n,next:0});}}
      else{finished.push(top.node);stack.pop();}
    }
  }
  seen.clear();const index:RoundaboutIndex={rings:[],byTile:new Map()};
  for(const start of finished.reverse()) {
    if(seen.has(start))continue;
    const members=new Set<string>(),stack=[start];seen.add(start);
    while(stack.length){const p=stack.pop()!;members.add(p);for(const n of incoming.get(p)??[])if(!seen.has(n)){seen.add(n);stack.push(n);}}
    // The drawn road loop closes on itself. Internal branches/chords are ambiguous.
    if(members.size<4)continue;
    const next=new Map<string,string>();let simple=true;
    for(const p of members){const targets=(out.get(p)??[]).filter(n=>members.has(n));
      if(targets.length!==1||(incoming.get(p)??[]).filter(n=>members.has(n)).length!==1){simple=false;break;}next.set(p,targets[0]);}
    if(!simple)continue;
    const points:Point[]=[];let current=start;
    do{points.push({...roads.get(current)!});current=next.get(current)!;}while(current!==start&&points.length<=members.size);
    if(current!==start||points.length!==members.size)continue;
    let clear=true;
    // Interior roads are shortcuts/spokes, not part of a simple circulating perimeter.
    if([...roads.values()].some(p=>!members.has(key(p))&&inside(p,points)))continue;
    // A physical chord, even an undirected one, invalidates the isolated circulating route.
    for(const p of points)if(neighbours(p).some(n=>members.has(key(n))&&next.get(key(p))!==key(n)&&next.get(key(n))!==key(p))){clear=false;break;}
    if(!clear)continue;
    const entries:{from:Point;to:Point}[]=[],entryTiles=new Set<string>();let exits=0;
    for(const p of points)for(const n of neighbours(p))if(roads.has(key(n))&&!members.has(key(n))) {
      if(allowsRoadStep(city,n,p)){entries.push({from:{...n},to:{...p}});entryTiles.add(key(p));}
      if(allowsRoadStep(city,p,n))exits++;
    }
    if(entryTiles.size<2||!exits)continue;
    const ring={id:[...members].sort()[0],points,entries};index.rings.push(ring);for(const p of members)index.byTile.set(p,ring);
  }
  cache.set(city,{signature,index});return index;
}

export function roundaboutMovement(city:City,from:Point,to:Point):'enter'|'circulate'|null {
  const index=roundaboutIndex(city),ring=index.byTile.get(key(to));
  if(!ring)return null;
  return index.byTile.get(key(from))===ring?'circulate':'enter';
}

/** A safe local approach gap, not an empty-ring requirement. Physical reservations still govern admission. */
export function roundaboutEntryBlocked(city:City,trip:Trip,k:number,prepared?:RoundaboutIndex,gaps?:Map<string,Set<number>>):boolean {
  const target=trip.path[k+1];if(!target)return false;
  const index=prepared??roundaboutIndex(city),ring=index.byTile.get(key(target));
  if(!ring||index.byTile.get(key(trip.path[k]))===ring)return false;
  if(gaps){for(const id of gaps.get(key(target))??[])if(id!==trip.id)return true;return false;}
  for(const other of city.trips) {
    if(other.id===trip.id||other.sceneParked||['visiting','crashed','working'].includes(other.phase??''))continue;
    const body=Math.min(other.path.length-1,Math.max(0,Math.ceil(other.progress-.5-1e-9)));
    if(index.byTile.get(key(other.path[body]))!==ring)continue;
    for(let i=body;i<other.path.length;i++) {
      const point=other.path[i];if(index.byTile.get(key(point))!==ring)break;
      const distance=i-.5-other.progress;if(distance>2)break;
      if(key(point)===key(target))return true;
    }
  }
  return false;
}

/** Build the short circulation lookahead once per tick, not once per entering car. */
export function addRoundaboutGaps(index:RoundaboutIndex,trip:Trip,gaps:Map<string,Set<number>>):void {
  if(trip.sceneParked||['visiting','crashed','working'].includes(trip.phase??''))return;
  const body=Math.min(trip.path.length-1,Math.max(0,Math.ceil(trip.progress-.5-1e-9)));
  const ring=index.byTile.get(key(trip.path[body]));if(!ring)return;
  for(let i=body;i<trip.path.length&&i-.5-trip.progress<=2;i++) {
    const p=trip.path[i],at=key(p);if(index.byTile.get(at)!==ring)break;
    const owners=gaps.get(at)??new Set<number>();owners.add(trip.id);gaps.set(at,owners);
  }
}
export function roundaboutTrafficGaps(city:City,index:RoundaboutIndex):Map<string,Set<number>> {
  const gaps=new Map<string,Set<number>>();for(const trip of city.trips)addRoundaboutGaps(index,trip,gaps);return gaps;
}
