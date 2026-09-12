/** Travelers own demand and receipts independently of physical road vehicles. */
import { entrance, type Building, type City, type Point, type Trip, type TripPurpose } from './cityModel.ts';
import { LEISURE_BENEFIT_SECONDS, SHOP_INCOME, VISIT_SECONDS, visitorSlots } from './cityVisits.ts';
import { recordMissionVisit } from './cityMissions.ts';
import { containsTile } from './cityMap.ts';

export const WALK_RANGE = 6;
export const WALK_TILES_PER_SECOND = 1;
export const MAX_TRANSIT_JOURNEYS = 256;
export type JourneyState = 'walking-out' | 'waiting-out' | 'riding-out' | 'visiting' | 'walking-back'
  | 'waiting-back' | 'riding-back' | 'complete' | 'stranded' | 'crashed' | 'cancelled';
export type TransitJourney = {
  id:number; homeId:number; destinationId:number; purpose:TripPurpose; mode:'walk'|'bus'; state:JourneyState;
  origin:Point; path:Point[]; progress:number; startedAt:number; wait:number; visitRemaining:number;
  rewarded:boolean; returned:boolean; activityReserved:boolean; visitedAt?:number; external?:{origin:Point};
  busId?:number; routeId?:number; boardStopId?:number; alightStopId?:number;
  returnBoardStopId?:number; returnAlightStopId?:number;
  seat?:{busId:number;runId:number;boardIndex:number;alightIndex:number}; blockedReason?:string;
  walkTarget?:'board-out'|'visit'|'board-back'|'home'; goal?:Point; incidentId?:number;
  incidentOutcome?:'disrupted'|'rescued'|'incident-loss';
};
const key = (p:Point) => `${p.x},${p.y}`;
const same = (a:Point,b:Point) => a.x===b.x && a.y===b.y;
const round6 = (n:number) => Math.round(n*1e6)/1e6;
/** Sidewalks are bidirectional road adjacency. Carriageway closures do not block sidewalks;
 * callers pass explicit pedestrian closures separately. Never bridge empty/diagonal tiles. */
export function walkingPath(city:City, from:Point, to:Point, maximum=WALK_RANGE,
  pedestrianBlocked:ReadonlySet<string>=new Set()):Point[]|null {
  if (!Number.isFinite(maximum) || maximum < 0) return null;
  const roads=new Map(city.roads.map(p=>[key(p),p]));
  const first=key(from),last=key(to);
  if(!roads.has(first)||!roads.has(last)||pedestrianBlocked.has(first)||pedestrianBlocked.has(last))return null;
  const queue=[{point:from,distance:0}], previous=new Map<string,string|null>([[first,null]]);
  for(let i=0;i<queue.length;i++) {
    const {point,distance}=queue[i], here=key(point);
    if(here===last) {
      const path:Point[]=[]; let current:string|null=last;
      while(current!==null) {path.push({...roads.get(current)!});current=previous.get(current)!;}
      return path.reverse();
    }
    if(distance>=maximum)continue;
    for(const next of [{x:point.x,y:point.y-1},{x:point.x+1,y:point.y},{x:point.x,y:point.y+1},{x:point.x-1,y:point.y}]) {
      const id=key(next);
      if(!roads.has(id)||previous.has(id)||pedestrianBlocked.has(id))continue;
      previous.set(id,here);queue.push({point:next,distance:distance+1});
    }
  }
  return null;
}
export function journeyActivitySlots(journeys:readonly TransitJourney[], destinationId:number):{occupied:number;inbound:number} {
  let occupied=0,inbound=0;
  for(const j of journeys)if(j.destinationId===destinationId && j.activityReserved) {
    if(j.state==='visiting')occupied++;else inbound++;
  }
  return {occupied,inbound};
}
/** Adapter is only for attribution/inspection; never insert it into city.trips. */
export function journeyAsTrip(j:TransitJourney):Trip {
  return {id:j.id,homeId:j.homeId,storeId:j.destinationId,purpose:j.purpose,path:j.path.map(p=>({...p})),
    progress:j.progress,startedAt:j.startedAt,visitedAt:j.visitedAt,wait:j.wait,hold:j.blockedReason?j.wait:0,
    phase:j.state==='visiting'?'visiting':j.rewarded?'returning':'outbound',rewarded:j.rewarded,
    visitRemaining:j.visitRemaining,...(j.external?{external:{origin:{...j.external.origin}}}:{})};
}
export function createWalkingJourney(city:City,home:Building,destination:Building,purpose:TripPurpose,id:number):TransitJourney|null {
  if(home.kind!=='home'||destination.kind!==(purpose==='shopping'?'store':'park'))return null;
  const origin=entrance(home),path=walkingPath(city,origin,entrance(destination));
  if(!path||!walkingPath(city,entrance(destination),origin))return null;
  return {id,homeId:home.id,destinationId:destination.id,purpose,mode:'walk',state:'walking-out',origin:{...origin},
    path,walkTarget:'visit',goal:{...path[path.length-1]},progress:0,startedAt:round6(city.elapsed),wait:0,visitRemaining:0,rewarded:false,returned:false,activityReserved:true};
}
/** Explicit infrastructure activation only; untouched saves retain their original mode choices. */
export function tryWalkingJourney(city:City,home:Building,purpose:TripPurpose,carCost:number):boolean {
  if(!city.transit?.walkingEnabled || city.transit.journeys.length>=MAX_TRANSIT_JOURNEYS
    ||city.transit.journeys.some(j=>j.homeId===home.id&&!j.external&&!['complete','cancelled'].includes(j.state))
    ||city.trips.some(t=>!t.service&&t.homeId===home.id))return false;
  let best:TransitJourney|null=null;
  for(const destination of city.buildings) {
    if(destination.kind!==(purpose==='shopping'?'store':'park'))continue;
    const slots=visitorSlots(city,destination);
    if(slots.occupied+slots.inbound>=slots.capacity)continue;
    const candidate=createWalkingJourney(city,home,destination,purpose,city.nextId);
    if(!candidate)continue;
    const cost=2*(candidate.path.length-1)/WALK_TILES_PER_SECOND;
    if(cost>=carCost)continue;
    if(!best||candidate.path.length<best.path.length||(candidate.path.length===best.path.length&&candidate.destinationId<best.destinationId))best=candidate;
  }
  if(!best)return false;
  city.nextId++;city.transit.journeys.push(best);
  const household=city.households.find(h=>h.homeId===home.id);if(household)household.lastDeparturePurpose=purpose;
  return true;
}
/** Complete the real stay once. A missing destination/household cannot earn a reward. */
export function completeJourneyVisit(city:City,j:TransitJourney):boolean {
  if(j.rewarded||j.state!=='visiting'||j.visitRemaining>0)return false;
  const destination=city.buildings.find(b=>b.id===j.destinationId&&b.kind===(j.purpose==='shopping'?'store':'park'));
  const h=j.external?undefined:city.households.find(h=>h.homeId===j.homeId);
  if(!destination||!j.path.length||j.progress<j.path.length-1||!same(j.path[j.path.length-1],entrance(destination))||(!j.external&&(!h||!city.buildings.some(b=>b.id===j.homeId&&b.kind==='home'))))return false;
  if(j.purpose==='shopping') {city.funds+=SHOP_INCOME;if(h)h.shopping=Math.max(0,h.shopping-1);}
  else if(h) {h.leisure=Math.max(0,h.leisure-1);h.leisureUntil=round6(city.elapsed+LEISURE_BENEFIT_SECONDS);}
  if(!j.external)recordMissionVisit(city,journeyAsTrip(j));
  j.rewarded=true;j.visitedAt=round6(city.elapsed);return true;
}
/** Only physical arrival back at the original access node produces a return receipt. */
export function completeJourneyReturn(city:City,j:TransitJourney):boolean {
  if(j.incidentOutcome){
    if(j.state==='walking-back'&&j.path.length&&j.progress>=j.path.length-1&&same(j.path[j.path.length-1],j.origin)) {j.state='cancelled';j.activityReserved=false;delete j.seat;delete j.busId;}
    return false;
  }
  if(j.returned||!j.rewarded||j.state!=='walking-back'||j.progress<j.path.length-1
    ||!j.path.length||!same(j.path[j.path.length-1],j.origin))return false;
  j.returned=true;j.state='complete';j.activityReserved=false;delete j.seat;delete j.busId;
  city.completed++;
  if(j.external&&city.external)city.external.completed++;
  city.history.push({at:round6(city.elapsed),wait:j.wait,...(!j.external&&j.visitedAt!==undefined
    ?{service:{homeId:j.homeId,purpose:j.purpose,visitedAt:j.visitedAt,startedAt:j.startedAt}}:{})});
  return true;
}
/** Direct walkers only. Bus leg transitions belong to the service controller. */
export function stepWalkingJourneys(city:City,journeys:TransitJourney[],dt:number,
  pedestrianBlocked:ReadonlySet<string>=new Set(),onVisitComplete?:(journey:TransitJourney)=>boolean|void):void {
  if(!Number.isFinite(dt)||dt<=0)return;
  const roads=new Set(city.roads.map(key));
  for(const j of journeys) {
    if(j.state==='complete'||j.state==='cancelled'||j.state==='crashed')continue;
    if(j.state==='stranded'&&j.incidentOutcome&&j.busId===undefined&&j.goal&&Number.isInteger(j.progress)) {
      const path=walkingPath(city,j.path[j.progress],j.goal,city.map.width*city.map.height,pedestrianBlocked);
      if(path){j.path=path;j.progress=0;j.state='walking-back';j.walkTarget='home';delete j.blockedReason;}
      else {j.wait=round6(j.wait+dt);continue;}
    }
    if(j.state==='visiting') {
      j.visitRemaining=round6(Math.max(0,j.visitRemaining-dt));
      if(j.visitRemaining>0)continue;
      completeJourneyVisit(city,j);
      if(!j.rewarded){j.blockedReason='Destination or home removed';continue;}
      if(onVisitComplete){const handled=onVisitComplete(j);if(handled||j.state!=='visiting')continue;}
      if(j.mode!=='walk')continue;
      const path=walkingPath(city,j.path[j.path.length-1],j.origin,WALK_RANGE,pedestrianBlocked);
      if(!path){j.wait=round6(j.wait+dt);j.blockedReason='Walking return blocked';continue;}
      j.path=path;j.progress=0;j.state='walking-back';j.walkTarget='home';j.goal={...j.origin};j.activityReserved=false;delete j.blockedReason;
      continue;
    }
    if(j.state!=='walking-out'&&j.state!=='walking-back')continue;
    let pendingGoal=!!j.goal&&!same(j.goal,j.path[j.path.length-1]);
    if(pendingGoal&&Number.isInteger(j.progress)) {
      const replacement=walkingPath(city,j.path[j.progress],j.goal!,j.incidentOutcome?city.map.width*city.map.height:WALK_RANGE,pedestrianBlocked);
      if(!replacement){j.wait=round6(j.wait+dt);j.blockedReason='Walking route to the updated entrance is blocked';continue;}
      j.path=replacement;j.progress=0;pendingGoal=false;delete j.blockedReason;
    }
    const next=Math.min(j.path.length-1,pendingGoal?Math.ceil(j.progress):Infinity,j.progress+dt*WALK_TILES_PER_SECOND);
    let blocked=false;
    for(let i=Math.floor(j.progress);i<=Math.ceil(next);i++)if(!roads.has(key(j.path[i]))||pedestrianBlocked.has(key(j.path[i])))blocked=true;
    if(blocked){
      // Re-route from an actual sidewalk node only. Never snap an interpolated walker to a road.
      if(Number.isInteger(j.progress)) {
        const replacement=walkingPath(city,j.path[j.progress],j.path[j.path.length-1],WALK_RANGE,pedestrianBlocked);
        if(replacement){j.path=replacement;j.progress=0;delete j.blockedReason;continue;}
      }
      j.wait=round6(j.wait+dt);j.blockedReason='Walking path blocked';continue;
    }
    delete j.blockedReason;j.progress=round6(next);
    if(pendingGoal||j.progress<j.path.length-1)continue;
    if(j.walkTarget==='board-out'){j.state='waiting-out';continue;}
    if(j.walkTarget==='board-back'){j.state='waiting-back';continue;}
    if(j.state==='walking-back')completeJourneyReturn(city,j);
    else {j.state='visiting';j.visitRemaining=VISIT_SECONDS[j.purpose==='shopping'?'store':'park'];}
  }
}

const integer=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const point=(v:unknown):v is Point=>!!v&&typeof v==='object'&&Number.isSafeInteger((v as Point).x)&&Number.isSafeInteger((v as Point).y);
const states:JourneyState[]=['walking-out','waiting-out','riding-out','visiting','walking-back','waiting-back','riding-back','complete','stranded','crashed','cancelled'];
/** Structural and ownership validation; the transit parser also checks bus/route references. */
export function parseJourneys(raw:unknown,city:City):TransitJourney[]|null {
  if(!Array.isArray(raw)||raw.length>MAX_TRANSIT_JOURNEYS)return null;
  const ids=new Set<number>(),homes=new Set<number>(),result:TransitJourney[]=[];
  for(const value of raw) {
    if(!value||typeof value!=='object')return null;
    const j=value as TransitJourney;
    if(!integer(j.id)||ids.has(j.id)||city.trips.some(t=>t.id===j.id)||!integer(j.homeId)||!integer(j.destinationId)
      ||!['shopping','leisure'].includes(j.purpose)||!['walk','bus'].includes(j.mode)||!states.includes(j.state)
      ||!point(j.origin)||!containsTile(city.map,j.origin)||!Array.isArray(j.path)||j.path.length<1||j.path.length>4096||!j.path.every(point)||!j.path.every(p=>containsTile(city.map,p))
      ||j.path.some((p,i)=>i>0&&Math.abs(p.x-j.path[i-1].x)+Math.abs(p.y-j.path[i-1].y)!==1)
      ||!finite(j.progress)||j.progress>j.path.length-1||!finite(j.startedAt)||j.startedAt>city.elapsed+1e-6
      ||!finite(j.wait)||!finite(j.visitRemaining)||j.visitRemaining>10||typeof j.rewarded!=='boolean'
      ||typeof j.returned!=='boolean'||typeof j.activityReserved!=='boolean')return null;
    if(j.state==='cancelled'&&j.activityReserved)return null;
    if(['walking-back','waiting-back','riding-back'].includes(j.state)&&!j.rewarded&&!j.incidentOutcome)return null;
    if(['walking-back','waiting-back','riding-back','complete'].includes(j.state)&&j.activityReserved)return null;
    if(j.external!==undefined&&(!j.external||!point(j.external.origin)||!same(j.external.origin,j.origin)
      ||!city.external?.gateway||!same(j.origin,city.external.gateway)))return null;
    if(j.visitedAt!==undefined&&(!finite(j.visitedAt)||j.visitedAt<j.startedAt||j.visitedAt>city.elapsed+1e-6||!j.rewarded))return null;
    if(j.rewarded&&j.visitedAt===undefined)return null;
    if(j.returned!==(j.state==='complete')||(j.returned&&(!j.rewarded||j.activityReserved)))return null;
    if(j.walkTarget!==undefined&&!['board-out','visit','board-back','home'].includes(j.walkTarget))return null;
    if(j.goal!==undefined&&(!point(j.goal)||!containsTile(city.map,j.goal)))return null;
    if(j.incidentId!==undefined&&!integer(j.incidentId))return null;
    if(j.incidentOutcome!==undefined&&!['disrupted','rescued','incident-loss'].includes(j.incidentOutcome))return null;
    if(j.blockedReason!==undefined&&(typeof j.blockedReason!=='string'||j.blockedReason.length>240))return null;
    for(const field of ['busId','routeId','boardStopId','alightStopId','returnBoardStopId','returnAlightStopId'] as const)
      if(j[field]!==undefined&&!integer(j[field]))return null;
    if(j.seat!==undefined&&(!j.seat||!integer(j.seat.busId)||!integer(j.seat.runId)||!integer(j.seat.boardIndex)
      ||!integer(j.seat.alightIndex)||j.seat.boardIndex===j.seat.alightIndex))return null;
    if((j.state==='riding-out'||j.state==='riding-back')&&j.busId===undefined)return null;
    if(j.mode==='walk'&&(j.busId!==undefined||j.seat!==undefined||j.state.startsWith('riding')||j.state.startsWith('waiting')))return null;
    const active=!['complete','cancelled'].includes(j.state);
    if(j.mode==='bus') {
      const transit=city.transit,route=transit?.routes.find(r=>r.id===j.routeId);
      if(!transit||!route)return null;
      const stopIds=[route.stationId,...route.stopIds.filter(id=>id!==route.stationId)],n=stopIds.length;
      for(const field of ['boardStopId','alightStopId','returnBoardStopId','returnAlightStopId'] as const)
        if(j[field]===undefined||!stopIds.includes(j[field]!))return null;
      if(j.boardStopId===j.alightStopId||j.returnBoardStopId===j.returnAlightStopId)return null;
      if(j.busId!==undefined) {
        const bus=transit.fleet.find(b=>b.id===j.busId);
        if(!bus||bus.routeId!==route.id||!bus.onboard.includes(j.id)||bus.tripId===undefined
          ||!['riding-out','riding-back','crashed','stranded'].includes(j.state))return null;
      }
      if(j.seat) {
        const seat=j.seat,bus=transit.fleet.find(b=>b.id===seat.busId);
        if(!bus||bus.routeId!==route.id||seat.boardIndex>=n||seat.alightIndex<=seat.boardIndex
          ||seat.alightIndex>=seat.boardIndex+n||!Number.isSafeInteger(seat.runId*n+seat.alightIndex)
          ||(j.busId!==undefined&&j.busId!==seat.busId)||['complete','cancelled','visiting'].includes(j.state))return null;
        const returning=['walking-back','waiting-back','riding-back'].includes(j.state)
          ||j.state==='crashed'&&j.rewarded;
        if(stopIds[seat.boardIndex]!== (returning?j.returnBoardStopId:j.boardStopId)
          ||stopIds[seat.alightIndex%n]!== (returning?j.returnAlightStopId:j.alightStopId))return null;
      }
      if((j.state==='riding-out'||j.state==='riding-back')&&!j.seat)return null;
    }

    if(active&&!j.external) {
      if(homes.has(j.homeId)||city.trips.some(t=>!t.service&&t.homeId===j.homeId)
        ||!city.buildings.some(b=>b.id===j.homeId&&b.kind==='home'))return null;
      homes.add(j.homeId);
    }
    if(j.activityReserved&&!city.buildings.some(b=>b.id===j.destinationId&&b.kind===(j.purpose==='shopping'?'store':'park')))return null;
    if(active&&!j.external){const home=city.buildings.find(b=>b.id===j.homeId)!;if(!same(j.origin,entrance(home)))return null;}
    const endpoint=j.path[j.path.length-1];
    let expected:Point|undefined;
    if(j.state==='walking-out'||j.state==='waiting-out'||j.state==='riding-out') {
      if(j.walkTarget==='board-out'&&j.mode==='bus') {
        const stop=city.buildings.find(b=>b.id===j.boardStopId);if(!stop)return null;expected=entrance(stop);
      } else if(j.state==='walking-out'&&j.walkTarget==='visit') {
        const destination=city.buildings.find(b=>b.id===j.destinationId);if(!destination)return null;expected=entrance(destination);
      } else return null;
    }
    if(j.state==='walking-back'||j.state==='waiting-back'||j.state==='riding-back') {
      if(j.walkTarget==='board-back'&&j.mode==='bus') {
        const stop=city.buildings.find(b=>b.id===j.returnBoardStopId);if(!stop)return null;expected=entrance(stop);
      } else if(j.state==='walking-back'&&j.walkTarget==='home')expected=j.origin;
      else return null;
    }
    if(expected&&j.goal&&!same(j.goal,expected))return null;
    if(expected&&!same(endpoint,expected)&&!(j.external&&j.state==='walking-back'&&j.walkTarget==='home'&&j.goal&&same(j.goal,expected)))return null;
    if((j.state.startsWith('waiting')||j.state.startsWith('riding'))&&j.progress!==j.path.length-1)return null;
    if(j.state==='complete'&&(!same(endpoint,j.origin)||j.progress!==j.path.length-1))return null;
    if(j.state==='visiting') {
      const destination=city.buildings.find(b=>b.id===j.destinationId);
      if(!destination||!same(j.path[j.path.length-1],entrance(destination))||j.progress!==j.path.length-1||!j.activityReserved)return null;
    }
    ids.add(j.id);result.push(structuredClone(j));
  }
  const transit=city.transit;
  if(transit) {
    const onboard=new Set<number>();
    for(const bus of transit.fleet) {
      for(const id of bus.onboard) {
        const j=result.find(j=>j.id===id);
        if(onboard.has(id)||!j||j.busId!==bus.id||!['riding-out','riding-back','crashed','stranded'].includes(j.state))return null;
        onboard.add(id);
      }
      const reservations=result.filter(j=>j.seat?.busId===bus.id);
      const route=transit.routes.find(r=>r.id===bus.routeId);
      if(!route&&reservations.length)return null;
      const n=route?1+route.stopIds.filter(id=>id!==route.stationId).length:0;
      // Interval overlap counts seats on each run segment, not all future reservations together.
      const events=reservations.flatMap(j=>[
        {at:j.seat!.runId*n+j.seat!.boardIndex,change:1},
        {at:j.seat!.runId*n+j.seat!.alightIndex,change:-1},
      ]).sort((a,b)=>a.at-b.at||a.change-b.change);
      let used=0;for(const event of events){used+=event.change;if(used>8||used<0)return null;}
    }
  }
  return result;
}

