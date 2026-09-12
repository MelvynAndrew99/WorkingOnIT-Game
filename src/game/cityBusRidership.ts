/** Representative passengers: visible transport demand, deliberately separate from household service. */
import {entrance, type City, type Building} from './cityModel.ts';
import {walkingPath, WALK_RANGE} from './cityJourneys.ts';
import {busRoutePreview, type Bus, type BusRoute, type TransitState} from './cityTransit.ts';

export type RiderStage='waiting-out'|'riding-out'|'waiting-visit'|'visiting'|'waiting-back'|'riding-back';
export type BusRider={id:number;homeId:number;destinationId:number;originStopId:number;destinationStopId:number;routeId:number;stage:RiderStage;queuedAt:number;remaining:number;busId?:number};
export type BusRidership={version:1;checkedAt:number;homes:{homeId:number;nextAt:number;requests:number}[];riders:BusRider[];generated:number;completed:number;cancelled:number};
export const MAX_BUS_RIDERS=256;
const stops=(r:BusRoute)=>[r.stationId,...r.stopIds.filter(id=>id!==r.stationId)];
const at=(c:City,id:number)=>c.buildings.find(b=>b.id===id)!;
const demandStatus=new WeakMap<City,number>();
export const unservedBusHomes=(c:City)=>demandStatus.get(c)??0;
const round=(v:number)=>Math.round(v*1e6)/1e6;
export const busRiderCount=(b:Bus)=>b.onboard.length+(b.abstractOnboard?.length??0);
export const abstractService=(c:City)=>Boolean(c.transit?.ridership);
export function waitingBusRiders(c:City):Map<number,number>{
  const counts=new Map<number,number>();
  for(const j of c.transit?.ridership?.riders??[]){const id=j.stage==='waiting-out'?j.originStopId:j.stage==='waiting-back'||j.stage==='waiting-visit'?j.destinationStopId:undefined;if(id!==undefined)counts.set(id,(counts.get(id)??0)+1);}
  return counts;
}
export function abstractRouteBusy(t:TransitState,id:number):boolean{return Boolean(t.ridership?.riders.some(j=>j.routeId===id));}
export function abstractRemovalGuard(c:City,id:number):boolean{return Boolean(c.transit?.ridership?.riders.some(j=>[j.homeId,j.destinationId,j.originStopId,j.destinationStopId].includes(id)));}
/** Stable home ownership prevents overlapping stops/fleets from multiplying demand. */
export function stepBusRidership(c:City,dt:number):void{
  const t=c.transit;if(!t||!t.routes.length&&!t.ridership)return;
  const s=t.ridership??={version:1,checkedAt:c.elapsed,homes:[],riders:[],generated:0,completed:0,cancelled:0};
  for(const j of s.riders)if(j.stage==='visiting'){
    j.remaining=round(Math.max(0,j.remaining-dt));
    if(j.remaining===0&&walkingPath(c,entrance(at(c,j.destinationId)),entrance(at(c,j.destinationStopId)))){j.stage='waiting-back';j.queuedAt=round(c.elapsed);}
  }
  const visiting=new Map<number,number>();
  for(const j of s.riders)if(j.stage==='visiting')visiting.set(j.destinationId,(visiting.get(j.destinationId)??0)+1);
  for(const j of s.riders.filter(j=>j.stage==='waiting-visit').sort((a,b)=>a.queuedAt-b.queuedAt||a.id-b.id)){
    const park=at(c,j.destinationId).kind==='park',used=visiting.get(j.destinationId)??0;
    if(used<(park?8:4)){j.stage='visiting';j.remaining=park?10:5;visiting.set(j.destinationId,used+1);}
  }
  if(c.elapsed+1e-6<s.checkedAt)return;
  s.checkedAt=round(c.elapsed+1);
  for(const r of t.routes){const error=busRoutePreview(c,r.stationId,r.stopIds).error;if(error)r.blocked=error;else delete r.blocked;}
  let unserved=0;
  const routes=t.routes.filter(r=>r.running&&!r.pendingStopIds&&t.fleet.some(b=>b.routeId===r.id)&&!t.journeys.some(j=>j.routeId===r.id)&&!r.blocked);
  const stopIds=[...new Set(routes.flatMap(stops))].sort((a,b)=>a-b);
  // One bounded, bidirectional multi-source flood per demand update; never a path query per home/stop pair.
  const key=(p:{x:number;y:number})=>`${p.x},${p.y}`,roads=new Set(c.roads.map(key));
  const coverage=new Map<string,number>(),queue:{x:number;y:number;distance:number;stopId:number}[]=[];
  for(const id of stopIds){const p=entrance(at(c,id)),k=key(p);if(roads.has(k)&&!coverage.has(k)){coverage.set(k,id);queue.push({...p,distance:0,stopId:id});}}
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(p.distance===WALK_RANGE)continue;
    for(const next of [{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x,y:p.y+1}]){
      const k=key(next);if(roads.has(k)&&!coverage.has(k)){coverage.set(k,p.stopId);queue.push({...next,distance:p.distance+1,stopId:p.stopId});}
    }
  }
  const nearest=(b:Building)=>coverage.get(key(entrance(b)));
  const outstanding=new Map<number,number>(),destinationLoad=new Map<number,number>();
  for(const j of s.riders){outstanding.set(j.homeId,(outstanding.get(j.homeId)??0)+1);destinationLoad.set(j.destinationId,(destinationLoad.get(j.destinationId)??0)+1);}
  const destinations=c.buildings.filter(b=>b.kind==='store'||b.kind==='park').map(b=>({b,stop:nearest(b)}));
  for(const home of c.buildings.filter(b=>b.kind==='home')){
    const origin=nearest(home);if(origin===undefined){unserved++;continue;}
    const choices=destinations.flatMap(d=>d.stop===undefined||d.stop===origin?[]:routes.filter(r=>stops(r).includes(origin)&&stops(r).includes(d.stop!)).map(r=>({destination:d.b,stop:d.stop!,route:r}))).sort((a,b)=>a.destination.id-b.destination.id||a.route.id-b.route.id);
    if(!choices.length){unserved++;continue;}
    let clock=s.homes.find(h=>h.homeId===home.id);
    if(clock&&c.elapsed+1e-6<clock.nextAt)continue;
    if(s.riders.length>=MAX_BUS_RIDERS||(outstanding.get(home.id)??0)>=2){unserved++;continue;}
    if(!clock){clock={homeId:home.id,nextAt:0,requests:0};s.homes.push(clock);}
    const purpose=clock.requests%3===2?'park':'store',preferred=choices.filter(x=>x.destination.kind===purpose);
    const options=preferred.length?preferred:choices;
    options.sort((a,b)=>(destinationLoad.get(a.destination.id)??0)-(destinationLoad.get(b.destination.id)??0)||a.destination.id-b.destination.id||a.route.id-b.route.id);
    const choice=options[0];
    s.riders.push({id:c.nextId++,homeId:home.id,destinationId:choice.destination.id,originStopId:origin,destinationStopId:choice.stop,routeId:choice.route.id,stage:'waiting-out',queuedAt:round(c.elapsed),remaining:0});
    destinationLoad.set(choice.destination.id,(destinationLoad.get(choice.destination.id)??0)+1);
    clock.requests++;clock.nextAt=round(c.elapsed+20);s.generated++;
  }
  demandStatus.set(c,unserved);
}
/** Only called at a physically reached platform; alighting always precedes FIFO boarding. */
export function exchangeBusRiders(c:City,b:Bus,stopId:number):number{
  const t=c.transit!,s=t.ridership,r=t.routes.find(r=>r.id===b.routeId);if(!s||!r)return 0;
  let exchanged=0;b.abstractOnboard??=[];
  for(const id of [...b.abstractOnboard]){
    const j=s.riders.find(j=>j.id===id);if(!j)continue;
    const back=j.stage==='riding-back';if((back?j.originStopId:j.destinationStopId)!==stopId)continue;
    // Broken sidewalks keep riders aboard, just as a broken road keeps a bus waiting.
    if(!walkingPath(c,entrance(at(c,stopId)),entrance(at(c,back?j.homeId:j.destinationId))))continue;
    b.abstractOnboard=b.abstractOnboard.filter(x=>x!==id);delete j.busId;exchanged++;
    if(back){s.riders=s.riders.filter(x=>x.id!==id);s.completed++;}
    else {j.stage='waiting-visit';j.remaining=0;j.queuedAt=round(c.elapsed);}
  }
  // Drain legacy linked journeys before admitting representative passengers to this route.
  if(t.journeys.some(j=>j.routeId===r.id))return exchanged;
  for(const j of [...s.riders].sort((a,b)=>a.queuedAt-b.queuedAt||a.id-b.id)){
    if(busRiderCount(b)>=8)break;
    const back=j.stage==='waiting-back';if(j.stage!=='waiting-out'&&!back)continue;
    if((back?j.destinationStopId:j.originStopId)!==stopId||!stops(r).includes(j.originStopId)||!stops(r).includes(j.destinationStopId))continue;
    if(!walkingPath(c,entrance(at(c,back?j.destinationId:j.homeId)),entrance(at(c,stopId))))continue;
    // A second route can share a queue, but must itself be a usable complete loop.
    if(j.routeId!==r.id&&(!r.running||r.pendingStopIds||busRoutePreview(c,r.stationId,r.stopIds).error))continue;
    j.routeId=r.id;j.stage=back?'riding-back':'riding-out';j.busId=b.id;b.abstractOnboard.push(j.id);exchanged++;
  }
  return exchanged;
}
export function cancelRecoveredBusRiders(c:City,b:Bus):void{
  const s=c.transit?.ridership;if(!s)return;
  const ids=new Set(b.abstractOnboard??[]);s.cancelled+=s.riders.filter(j=>ids.has(j.id)).length;s.riders=s.riders.filter(j=>!ids.has(j.id));b.abstractOnboard=[];
}
/** Reject corrupt reciprocal passenger state instead of inventing or losing riders on load. */
export function parseBusRidership(raw:unknown,c:City,t:TransitState,add:(id:number)=>boolean):BusRidership|undefined|null{
  if(raw===undefined)return t.fleet.some(b=>b.abstractOnboard?.length)?null:undefined;
  if(!raw||typeof raw!=='object')return null;const s=raw as BusRidership;
  const int=(v:number)=>Number.isSafeInteger(v)&&v>=0;
  const time=(v:number,max=c.elapsed)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max+1e-6;
  if(s.version!==1||!time(s.checkedAt,c.elapsed+1)||!Array.isArray(s.homes)||s.homes.length>c.nextId||!Array.isArray(s.riders)||s.riders.length>MAX_BUS_RIDERS||![s.generated,s.completed,s.cancelled].every(int)||s.generated>=c.nextId||!s.riders.every(j=>j&&typeof j==='object')||s.generated!==s.riders.length+s.completed+s.cancelled)return null;
  const homes=new Set<number>();let requests=0;
  for(const h of s.homes){if(!h||!int(h.homeId)||h.homeId===0||h.homeId>=c.nextId||homes.has(h.homeId)||at(c,h.homeId)&&at(c,h.homeId).kind!=='home'||!time(h.nextAt,c.elapsed+20)||!int(h.requests)||h.requests<1)return null;homes.add(h.homeId);requests+=h.requests;}
  if(requests!==s.generated)return null;
  const stages=['waiting-out','riding-out','waiting-visit','visiting','waiting-back','riding-back'];
  for(const j of s.riders){
    if(!j||!add(j.id)||!homes.has(j.homeId)||at(c,j.homeId)?.kind!=='home'||!['store','park'].includes(at(c,j.destinationId)?.kind)||!stages.includes(j.stage)||!time(j.queuedAt)||!time(j.remaining,10)||s.riders.filter(x=>x.homeId===j.homeId).length>2)return null;
    const r=t.routes.find(r=>r.id===j.routeId);if(!r||j.originStopId===j.destinationStopId||!stops(r).includes(j.originStopId)||!stops(r).includes(j.destinationStopId))return null;
    const riding=j.stage==='riding-out'||j.stage==='riding-back',b=t.fleet.find(b=>b.id===j.busId);
    if(riding?(!b||b.routeId!==r.id||b.tripId===undefined||!b.abstractOnboard?.includes(j.id)):j.busId!==undefined)return null;
    if(j.stage==='visiting'&&s.riders.filter(x=>x.destinationId===j.destinationId&&x.stage==='visiting').length>(at(c,j.destinationId).kind==='park'?8:4))return null;
    if(j.stage!=='visiting'&&j.remaining!==0||j.stage==='visiting'&&j.remaining>(at(c,j.destinationId).kind==='park'?10:5))return null;
  }
  for(const b of t.fleet)if((b.abstractOnboard??[]).some(id=>!s.riders.some(j=>j.id===id&&j.busId===b.id&&(j.stage==='riding-out'||j.stage==='riding-back'))))return null;
  return {version:1,checkedAt:s.checkedAt,homes:s.homes.map(h=>({...h})),riders:s.riders.map(j=>({...j})),generated:s.generated,completed:s.completed,cancelled:s.cancelled};
}
