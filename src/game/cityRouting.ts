import {allowsRoadStep, directionSignature, type RoadDirections} from './cityDirections.ts';
/** Estimated route costs. Movement remains the authority for admission. */
import {blockedTiles, type City, type Point, type Trip} from './cityModel.ts';
import {bodyTile, roadIndex, governingControl, TRAVEL_TILES_PER_SECOND, EMERGENCY_TILES_PER_SECOND, STOP_DWELL, type RoadIndex} from './cityTraffic.ts';
import {CITY_RULES} from './cityRules.ts';
const key = (p: Point) => `${p.x},${p.y}`;
const edge = (a: Point, b: Point) => `${key(a)}>${key(b)}`;
const neighbours = (p: Point) => [{x:p.x+1,y:p.y},{x:p.x,y:p.y+1},{x:p.x-1,y:p.y},{x:p.x,y:p.y-1}];
export type RoutingSnapshot = {
  roadDirections?: RoadDirections;
  at: number; revision: string; roads: ReadonlySet<string>; blocked: ReadonlySet<string>;
  areas: ReadonlyMap<string,string>; controls: ReadonlyMap<string,number>;
  queues: ReadonlyMap<string,ReadonlyArray<{id:number; seconds:number}>>;
};
/** Snapshot samples sustained current holds, not a forecast or completed-trip history.
 * Directional observations avoid penalizing an independent opposing lane. */
export function routingSnapshot(city: City, index: RoadIndex = roadIndex(city), response = false): RoutingSnapshot {
  const queues = new Map<string,Array<{id:number;seconds:number}>>();
  for (const t of city.trips) {
    if ((!response && t.service) || t.sceneParked || !['outbound','returning','waiting'].includes(t.phase ?? '')
      || t.hold < CITY_RULES.routing.minimumHoldSeconds) continue;
    const k = bodyTile(t), a=t.path[k], b=t.path[k+1];
    if(a && !b && t.phase==='waiting') {
      for(const from of neighbours(a)) {
        const e=edge(from,a), observations=queues.get(e)??[];
        observations.push({id:t.id,seconds:Math.min(CITY_RULES.routing.queueCapSeconds,t.hold)});
        queues.set(e,observations);
      }
    }
    if (!a || !b) continue;
    const e=edge(a,b), observations=queues.get(e) ?? [];
    observations.push({id:t.id,seconds:Math.min(CITY_RULES.routing.queueCapSeconds,t.hold)});
    queues.set(e,observations);
  }
  const controls=new Map<string,number>();
  for (const p of city.roads) {
    const c=governingControl(city,index,p), area=index.areas.get(key(p));
    if(!response&&c&&area) controls.set(area,c.kind==='stop'?STOP_DWELL:CITY_RULES.routing.signalEstimateSeconds);
  }
  const blocked=blockedTiles(city,response);
  return {at:city.elapsed, revision:(response?'response|':'ordinary|')+[...index.roads].sort().join(';')+'|'+[...blocked].sort().join(';')+'|'+JSON.stringify(city.controls)+'|'+directionSignature(city),
    ...(city.roadDirections?{roadDirections:{...city.roadDirections}}:{}),
    roads:new Set(index.roads),blocked,areas:new Map(index.areas),controls,queues};
}
export type RouteCost = {travel:number; queue:number; control:number; total:number};
function edgeCost(s:RoutingSnapshot,a:Point,b:Point,speed:number,excludeId?:number):RouteCost {
  const area=s.areas.get(key(b));
  const control=area!==undefined&&s.areas.get(key(a))!==area ? s.controls.get(area)??0 : 0;
  const measured=Math.max(0,...(s.queues.get(edge(a,b))??[]).filter(o=>o.id!==excludeId).map(o=>o.seconds));
  // A measured hold already includes control waiting. Charge only the excess.
  const queue=Math.max(0,measured-control), travel=1/speed;
  return {travel,queue,control,total:travel+queue+control};
}
export function routeCost(s:RoutingSnapshot,path:Point[],speed=TRAVEL_TILES_PER_SECOND,excludeId?:number):RouteCost {
  const sum:RouteCost={travel:0,queue:0,control:0,total:0};
  for(let i=1;i<path.length;i++) {
    if(!allowsRoadStep(s,path[i-1],path[i],s.roads)||s.blocked.has(key(path[i]))) return {...sum,total:Infinity};
    const c=edgeCost(s,path[i-1],path[i],speed,excludeId);
    sum.travel+=c.travel;sum.queue+=c.queue;sum.control+=c.control;sum.total+=c.total;
  }
  return sum;
}
/** Stable binary-heap Dijkstra; equal costs retain cardinal discovery order. */
export function weightedRoute(s:RoutingSnapshot,start:Point,goal:Point,speed=TRAVEL_TILES_PER_SECOND,excludeId?:number):{path:Point[];cost:RouteCost}|null {
  if(!s.roads.has(key(start))||!s.roads.has(key(goal))||s.blocked.has(key(goal))||!Number.isFinite(speed)||speed<=0)return null;
  type Entry={p:Point;cost:number;order:number};
  const heap:Entry[]=[],dist=new Map([[key(start),0]]),previous=new Map<string,Point>();let order=0;
  const less=(a:Entry,b:Entry)=>a.cost<b.cost || a.cost===b.cost&&a.order<b.order;
  function push(e:Entry){heap.push(e);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(!less(heap[i],heap[p]))break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p;}}
  function pop():Entry{const first=heap[0],last=heap.pop()!;if(heap.length){heap[0]=last;let i=0;for(;;){let c=i*2+1;if(c>=heap.length)break;if(c+1<heap.length&&less(heap[c+1],heap[c]))c++;if(!less(heap[c],heap[i]))break;[heap[i],heap[c]]=[heap[c],heap[i]];i=c;}}return first;}
  push({p:start,cost:0,order:order++});
  while(heap.length){
    const current=pop(),p=current.p;
    if(current.cost!==dist.get(key(p)))continue;
    if(key(p)===key(goal)){
      const path=[{...p}];let cursor=p;
      while(previous.has(key(cursor))){cursor=previous.get(key(cursor))!;path.push({...cursor});}
      path.reverse();return {path,cost:routeCost(s,path,speed,excludeId)};
    }
    for(const n of neighbours(p)){
      if(!s.roads.has(key(n))||!allowsRoadStep(s,p,n)||s.blocked.has(key(n)))continue;
      const cost=current.cost+edgeCost(s,p,n,speed,excludeId).total;
      if(cost>=(dist.get(key(n))??Infinity)-1e-9)continue;
      dist.set(key(n),cost);previous.set(key(n),p);push({p:n,cost,order:order++});
    }
  }
  return null;
}
/** Meaningful savings, compared on the very same snapshot and remaining segment. */
export function worthwhileRoute(oldCost:number,newCost:number):boolean {
  return oldCost-newCost>=Math.max(CITY_RULES.routing.minimumSavingSeconds,oldCost*CITY_RULES.routing.minimumSavingFraction);
}
export function civilianRoute(city:City,start:Point,goal:Point,trip?:Trip):Point[]|null {
  return weightedRoute(routingSnapshot(city),start,goal,trip?.service?TRAVEL_TILES_PER_SECOND:trip?.speed,trip?.id)?.path??null;
}

/** Same graph, with active-response diversion/control exceptions. Occupancy is
 * observed as delay, never permission to enter a lane or pass a queue. */
export function responseRoute(s:RoutingSnapshot,start:Point,scene:Point,excludeId?:number,avoid?:Set<string>) {
  const view=avoid ? {...s,blocked:new Set([...s.blocked,...avoid])} : s;
  let best:ReturnType<typeof weightedRoute>=null;
  for(const goal of neighbours(scene).sort((a,b)=>a.y-b.y||a.x-b.x)) {
    const candidate=weightedRoute(view,start,goal,EMERGENCY_TILES_PER_SECOND,excludeId);
    if(candidate && (!best || candidate.cost.total<best.cost.total-1e-9))best=candidate;
  }
  return best;
}
