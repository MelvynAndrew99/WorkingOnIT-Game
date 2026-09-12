import {type BusRidership, unservedBusHomes, busRiderCount, waitingBusRiders, stepBusRidership, exchangeBusRiders, cancelRecoveredBusRiders, abstractRouteBusy, abstractRemovalGuard, parseBusRidership} from './cityBusRidership.ts';
/** Bounded local transit. Vehicles use the ordinary traffic grid; journeys own service credit. */
import {entrance, findPath, type Building, type City, type Point, type Trip, type TripPurpose} from './cityModel.ts';
import {allowsRoadStep} from './cityDirections.ts';
import {startBlocked, commitTripRoute, type RoadIndex, TRAVEL_TILES_PER_SECOND} from './cityTraffic.ts';
import {walkingPath, stepWalkingJourneys, parseJourneys, type TransitJourney} from './cityJourneys.ts';
import {visitorSlots} from './cityVisits.ts';

export const BUS_CAPACITY=8, BUS_PRICE=400, BUS_HEADWAY=12;
export const MAX_BUSES=32, MAX_ROUTES=16, MAX_JOURNEYS=256;
export type Bus={id:number;stationId:number;paid:number;tripId?:number;routeId?:number;stopIndex:number;run:number;dwell:number;readyAt:number;onboard:number[];abstractOnboard?:number[]};
export type BusRoute={id:number;stationId:number;stopIds:number[];running:boolean;blocked?:string;pendingStopIds?:number[]};
export type TransitState={version:1;walkingEnabled:boolean;fleet:Bus[];routes:BusRoute[];journeys:TransitJourney[];ridership?:BusRidership};
const key=(p:Point)=>`${p.x},${p.y}`;
const same=(a:Point,b:Point)=>a.x===b.x&&a.y===b.y;
const round=(n:number)=>Math.round(n*1e6)/1e6;
const neighbors=(p:Point)=>[{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x,y:p.y+1}];
const nodes=(r:BusRoute)=>[r.stationId,...r.stopIds.filter(id=>id!==r.stationId)];
const building=(city:City,id:number)=>city.buildings.find(b=>b.id===id);
export function initTransit(city:City):TransitState{return city.transit??=( {version:1,walkingEnabled:true,fleet:[],routes:[],journeys:[]} );}
export function busStopIssue(city:City,b:Building):string|null {
  if(b.kind!=='busStop')return null;
  const p=entrance(b),roads=new Set(city.roads.map(key)),d=tangent(b);
  if(!roads.has(key(p)))return 'Rotate the bus stop so its curb faces an existing road.';
  const before={x:p.x-d.x,y:p.y-d.y},after={x:p.x+d.x,y:p.y+d.y};
  if(!roads.has(key(before))||!roads.has(key(after)))return 'Bus stops need a straight road along their curb.';
  if([p,before,after].some(q=>neighbors(q).filter(n=>roads.has(key(n))).length!==2))return 'Place the stop farther from the junction or road end.';
  if(!allowsRoadStep(city,before,p)||!allowsRoadStep(city,p,after))return 'This curb faces against the road direction. Use the opposite curb.';
  return null;
}
function tangent(b:Building):Point{return [{x:-1,y:0},{x:0,y:-1},{x:1,y:0},{x:0,y:1}][b.rotation];}
function leg(city:City,from:Building,to:Building):Point[]|null {
  const a=entrance(from),z=entrance(to),ad=tangent(from),zd=tangent(to);
  const start=from.kind==='busStop'?{x:a.x+ad.x,y:a.y+ad.y}:a;
  const end=to.kind==='busStop'?{x:z.x-zd.x,y:z.y-zd.y}:z;
  if(from.kind==='busStop'&&!allowsRoadStep(city,a,start)||to.kind==='busStop'&&!allowsRoadStep(city,end,z))return null;
  const avoid=new Set<string>();if(from.kind==='busStop')avoid.add(key(a));if(to.kind==='busStop')avoid.add(key(z));
  const middle=findPath(city,start,end,false,avoid);if(!middle)return null;
  const result=[...(from.kind==='busStop'?[a]:[]),...middle,...(to.kind==='busStop'?[z]:[])];
  // A forced curb approach must not immediately reverse or pass through its destination first.
  if(result.some((p,i)=>i>1&&same(p,result[i-2])))return null;
  return result;
}
const routeCache=new WeakMap<City,{signature:string;paths:Map<string,{paths:Point[][];error:string|null}>}>();
function topology(city:City):string{return city.roads.map(key).join(';')+'|'+JSON.stringify(city.roadDirections)+'|'+JSON.stringify(city.wideRoads)+'|'+JSON.stringify(city.wideRoadWorks?.map(w=>w.section))+'|'+city.closures.map(key).join(';')+'|'+city.incidents.filter(i=>i.status==='active').map(i=>`${i.x},${i.y}`).join(';')+'|'+city.buildings.filter(b=>b.kind==='busStop'||b.kind==='busStation').map(b=>`${b.id}:${b.x},${b.y},${b.rotation}`).join(';');}
export function busRoutePreview(city:City,stationId:number,stopIds:number[]):{paths:Point[][];error:string|null}{
  const signature=topology(city);let cache=routeCache.get(city);if(!cache||cache.signature!==signature){cache={signature,paths:new Map()};routeCache.set(city,cache);}
  const id=stationId+':'+stopIds.join(',');const cached=cache.paths.get(id);if(cached)return cached;
  const result=validateRoute(city,stationId,stopIds);if(cache.paths.size<64)cache.paths.set(id,result);return result;
}
function validateRoute(city:City,stationId:number,stopIds:number[]):{paths:Point[][];error:string|null}{
  const station=building(city,stationId),ids=[stationId,...stopIds.filter(id=>id!==stationId)];
  const fail=(error:string)=>({paths:[],error});
  if(station?.kind!=='busStation')return fail('Select a bus station first.');
  if(stopIds.length<2||stopIds.length>16||new Set(stopIds).size!==stopIds.length||ids.length<2)return fail('Select at least two distinct stops, in travel order.');
  const stops=ids.map(id=>building(city,id));
  for(const b of stops){if(!b||!['busStation','busStop'].includes(b.kind)||b.kind==='busStation'&&b.id!==stationId)return fail('A stop is missing or belongs to another station.');const issue=busStopIssue(city,b);if(issue)return fail(`Stop ${b.id}: ${issue}`);}
  const paths:Point[][]=[];
  for(let i=0;i<stops.length;i++){const path=leg(city,stops[i]!,stops[(i+1)%stops.length]!);if(!path)return fail(`No legal road route from ${ids[i]} to ${ids[(i+1)%ids.length]}, including the return to the station.`);paths.push(path);}
  return {paths,error:null};
}
export function buyBus(city:City,stationId:number):string{
  if(building(city,stationId)?.kind!=='busStation')return 'Select a bus station.';
  const t=initTransit(city);if(t.fleet.length>=MAX_BUSES||t.fleet.filter(b=>b.stationId===stationId).length>=2)return 'Both station bays are assigned.';
  if(city.funds<BUS_PRICE)return `A minibus costs $${BUS_PRICE}.`;
  city.funds-=BUS_PRICE;const route=t.routes.find(r=>r.stationId===stationId);
  t.fleet.push({id:city.nextId++,stationId,paid:BUS_PRICE,...(route?{routeId:route.id}:{}),stopIndex:0,run:0,dwell:0,readyAt:round(city.elapsed),onboard:[]});
  return 'Minibus purchased: eight seats, one assigned bay.';
}
export function sellBus(city:City,id:number):string{
  const t=city.transit,b=t?.fleet.find(b=>b.id===id);if(!t||!b)return 'Select a bus.';
  if(b.tripId!==undefined||busRiderCount(b)||t.journeys.some(j=>j.seat?.busId===id))return 'Stop the route and wait for this bus and its riders to return.';
  city.funds+=b.paid;t.fleet=t.fleet.filter(x=>x.id!==id);return `Minibus sold. $${b.paid} refunded.`;
}
export function applyBusRoute(city:City,stationId:number,stopIds:number[]):string{
  const preview=busRoutePreview(city,stationId,stopIds);if(preview.error)return preview.error;
  const t=initTransit(city);let r=t.routes.find(r=>r.stationId===stationId);
  if(!r){if(t.routes.length>=MAX_ROUTES)return 'The town has reached its 16-route limit.';r={id:city.nextId++,stationId,stopIds:[...stopIds],running:false};t.routes.push(r);}
  else if(abstractRouteBusy(t,r.id)||t.journeys.some(j=>j.routeId===r!.id)||t.fleet.some(b=>b.routeId===r!.id&&b.tripId!==undefined)){r.pendingStopIds=[...stopIds];return 'Route edit queued. Existing riders finish their journeys before it changes.';}
  else {r.stopIds=[...stopIds];delete r.blocked;}
  for(const b of t.fleet)if(b.stationId===stationId)b.routeId=r.id;
  return 'Route ready. Buy a bus, then Start.';
}
export function setBusRouteRunning(city:City,stationId:number,running:boolean):string{
  const r=city.transit?.routes.find(r=>r.stationId===stationId);if(!r)return 'Select stops and finish the route first.';
  if(running){const issue=busRoutePreview(city,stationId,r.stopIds).error;if(issue)return issue;if(!city.transit!.fleet.some(b=>b.stationId===stationId))return 'Buy a minibus first.';}
  r.running=running;return running?'Bus service started.':'Finishing existing rider journeys, then returning buses to their bays.';
}
export function transitRemovalGuard(city:City,b:Building):string|null{
  const t=city.transit;if(!t)return null;
  if(abstractRemovalGuard(city,b.id))return 'A traveler still depends on this building or stop. Stop service and wait for returns.';
  if(t.journeys.some(j=>j.homeId===b.id||j.destinationId===b.id))return 'A traveler still depends on this building. Wait for their real return.';
  if(b.kind==='busStation'&&t.fleet.some(f=>f.stationId===b.id))return 'Stop service, return the fleet and sell its buses before removing the station.';
  if(t.routes.some(r=>r.stopIds.includes(b.id)||r.pendingStopIds?.includes(b.id))){
    if(t.journeys.some(j=>[j.boardStopId,j.alightStopId,j.returnBoardStopId,j.returnAlightStopId].includes(b.id))||t.fleet.some(f=>f.tripId!==undefined&&t.routes.some(r=>r.id===f.routeId&&(r.stationId===b.id||r.stopIds.includes(b.id)))))return 'This stop has active riders or a bus approaching. Stop service and wait for returns.';
    t.routes=t.routes.filter(r=>!r.stopIds.includes(b.id));
  }
  if(b.kind==='busStation')t.routes=t.routes.filter(r=>r.stationId!==b.id);
  for(const f of t.fleet)if(f.routeId!==undefined&&!t.routes.some(r=>r.id===f.routeId))delete f.routeId;
  return null;
}
export function transitSummary(city:City):string{
  const t=city.transit;if(!t)return 'Place a station and roadside stops to start bus service.';
  return `${t.fleet.length} buses · ${t.journeys.filter(j=>j.state.startsWith('waiting')).length+[...waitingBusRiders(city).values()].reduce((a,b)=>a+b,0)} waiting · ${t.fleet.reduce((n,b)=>n+busRiderCount(b),0)} aboard · ${t.journeys.filter(j=>j.blockedReason).length+(t.ridership?.riders.filter(j=>t.routes.find(r=>r.id===j.routeId)?.blocked).length??0)} blocked · ${unservedBusHomes(city)} unserved homes`;
}
/** Arrival hook runs instead of car visit/completion logic. Roadside dwell remains on-road. */
export function arriveBus(city:City,trip:Trip):void{
  const t=city.transit,b=t?.fleet.find(b=>b.id===trip.busId);if(!t||!b)return;
  if(trip.phase==='returning'){
    for(const id of [...b.onboard]){
      const j=t.journeys.find(j=>j.id===id);if(!j)continue;
      const here=trip.path.at(-1)!,path=walkingPath(city,here,j.origin,city.map.width*city.map.height);
      j.activityReserved=false;delete j.busId;delete j.seat;j.path=path??[{...here}];j.progress=0;j.walkTarget='home';j.goal={...j.origin};
      j.state=path?'walking-back':'stranded';j.blockedReason=path?undefined:'Incident disrupted this journey; walking access home is blocked.';
    }
    cancelRecoveredBusRiders(city,b);b.onboard=[];b.dwell=0;city.trips=city.trips.filter(x=>x.id!==trip.id);delete b.tripId;b.stopIndex=0;b.readyAt=round(city.elapsed+BUS_HEADWAY);return;
  }
  const r=t.routes.find(r=>r.id===b.routeId);if(!r)return;
  const ids=nodes(r),stopId=ids[b.stopIndex],stop=building(city,stopId);
  if(!stop||!same(trip.path.at(-1)!,entrance(stop))){r.blocked='Bus is waiting for its selected stop approach.';trip.phase='waiting';trip.resume='outbound';return;}
  if(b.stopIndex===0){b.run++;b.readyAt=round(city.elapsed+BUS_HEADWAY);}let exchanged=0;
  for(const id of [...b.onboard]){
    const j=t.journeys.find(j=>j.id===id);if(!j)continue;
    const back=j.state==='riding-back',alight=back?j.returnAlightStopId:j.alightStopId;if(alight!==stopId)continue;
    const target=back?j.origin:entrance(building(city,j.destinationId)!);
    const path=walkingPath(city,entrance(building(city,stopId)!),target);
    if(!path){j.blockedReason='Walking access from this stop is blocked.';continue;}
    b.onboard=b.onboard.filter(id=>id!==j.id);delete j.busId;delete j.seat;
    j.state=back?'walking-back':'walking-out';j.walkTarget=back?'home':'visit';j.path=path;j.progress=0;delete j.blockedReason;exchanged++;
  }
  const waiting=t.journeys.filter(j=>j.state==='waiting-out'||j.state==='waiting-back').sort((a,b)=>a.startedAt-b.startedAt||a.id-b.id);
  for(const j of waiting){
    if(busRiderCount(b)>=BUS_CAPACITY)break;
    const stop=j.state==='waiting-back'?j.returnBoardStopId:j.boardStopId;
    if(stop!==stopId||j.seat?.busId!==b.id||j.seat.runId!==b.run)continue;
    j.state=j.state==='waiting-back'?'riding-back':'riding-out';j.busId=b.id;b.onboard.push(j.id);delete j.blockedReason;exchanged++;
  }
  exchanged+=exchangeBusRiders(city,b,stopId);
  b.dwell=Math.min(4,1+exchanged*.25);trip.phase=stopId===r.stationId?'visiting':'bus-dwell';trip.hold=0;
}
function hasRiders(t:TransitState,r:BusRoute):boolean{return abstractRouteBusy(t,r.id)||t.journeys.some(j=>j.routeId===r.id);}
function dispatch(city:City,index:RoadIndex,b:Bus,r:BusRoute):void{
  const ids=nodes(r),preview=busRoutePreview(city,r.stationId,r.stopIds);
  if(preview.error){r.blocked=preview.error;return;}delete r.blocked;
  const old=b.tripId===undefined?undefined:city.trips.find(tr=>tr.id===b.tripId);
  const from=old?b.stopIndex:0,next=(from+1)%ids.length,path=preview.paths[from];
  if(!path)return;
  if(old&&old.phase!=='visiting'){
    // Keep the approach behind the bus for lane geometry until it enters the next tile.
    const previous=old.path.at(-2);const joined=previous?[{...previous},...path.map(p=>({...p}))]:path.map(p=>({...p}));
    const candidate:Trip={...old,path:joined,progress:previous?1:0,phase:'outbound',target:{...path.at(-1)!},hold:0};
    if(commitTripRoute(city,index,old,candidate))b.stopIndex=next;return;
  }
  if(startBlocked(city,index,path))return;
  if(old)city.trips=city.trips.filter(tr=>tr.id!==old.id);
  const trip:Trip={id:city.nextId++,busId:b.id,stationId:b.stationId,homeId:0,storeId:0,path:path.map(p=>({...p})),progress:0,wait:0,hold:0,phase:'outbound',target:{...path.at(-1)!}};
  city.trips.push(trip);b.tripId=trip.id;b.stopIndex=next;
  // Fleet departure spacing is an actual shared station gate, preserved in readyAt.
  spaceDepotDepartures(city,b);
}
function spaceDepotDepartures(city:City,b:Bus):void{
  for(const other of city.transit!.fleet){
    const trip=city.trips.find(tr=>tr.id===other.tripId);
    if(other.stationId===b.stationId&&other.id!==b.id&&(other.tripId===undefined||other.stopIndex===0&&trip?.phase==='visiting'))other.readyAt=Math.max(other.readyAt,round(city.elapsed+BUS_HEADWAY));
  }
}
function reserve(city:City,r:BusRoute,board:number,alight:number,walkSeconds:number,journeyId?:number):TransitJourney['seat']|undefined{
  const t=city.transit!,ids=nodes(r),bi=ids.indexOf(board),ai=ids.indexOf(alight),n=ids.length;
  if(bi<0||ai<0||bi===ai)return;
  for(const b of t.fleet.filter(b=>b.routeId===r.id).sort((a,b)=>a.id-b.id)){
    const trip=city.trips.find(t=>t.id===b.tripId);if(trip?.phase==='crashed')continue;
    const ahead=trip ? b.stopIndex>bi||b.stopIndex===bi&&trip.phase!=='outbound' : false;
    // Reserve the next complete run when access takes time; never invent an instantaneous pickup.
    const runId=b.run+(ahead||walkSeconds>0?1:0),end=ai<=bi?ai+n:ai;
    let full=false;
    for(let segment=bi;segment<end;segment++){
      const absolute=runId*n+segment;
      const used=t.journeys.filter(j=>j.id!==journeyId&&j.seat?.busId===b.id&&absolute>=j.seat.runId*n+j.seat.boardIndex&&absolute<j.seat.runId*n+j.seat.alightIndex).length;
      if(used>=BUS_CAPACITY){full=true;break;}
    }
    if(!full)return {busId:b.id,runId,boardIndex:bi,alightIndex:end};
  }
}
export function tryTransitJourney(city:City,origin:Point,homeId:number,purpose:TripPurpose,carCost=Infinity,external=false):boolean{
  const t=city.transit;if(!t||t.journeys.length>=MAX_JOURNEYS)return false;
  if(!external&&(t.journeys.some(j=>!j.external&&j.homeId===homeId&&!['complete','cancelled'].includes(j.state))||city.trips.some(tr=>!tr.service&&tr.busId===undefined&&tr.homeId===homeId)))return false;
  let best:{r:BusRoute;destination:Building;a:number;z:number;walk:Point[];backA:number;backZ:number;cost:number;seat:NonNullable<TransitJourney['seat']>}|undefined;
  for(const r of t.routes){if(!r.running||r.pendingStopIds)continue;const preview=busRoutePreview(city,r.stationId,r.stopIds);if(preview.error)continue;
    const ids=nodes(r),stops=ids.map(id=>building(city,id)!);
    for(const destination of city.buildings){if(destination.kind!==(purpose==='shopping'?'store':'park'))continue;const slots=visitorSlots(city,destination);if(slots.occupied+slots.inbound>=slots.capacity)continue;
      for(const a of stops){const walk=walkingPath(city,origin,entrance(a));if(!walk)continue;
        for(const z of stops){if(a.id===z.id)continue;const end=walkingPath(city,entrance(z),entrance(destination));if(!end)continue;
          // Walking is bidirectional; the same two curbs serve the return on the next loop.
          const seat=reserve(city,r,a.id,z.id,walk.length-1);if(!seat)continue;
          const distance=preview.paths.reduce((sum,path)=>sum+path.length-1,0);
          const cost=(walk.length+end.length-2)*2+distance/TRAVEL_TILES_PER_SECOND+BUS_HEADWAY+2;
          if(cost>=carCost||best&&cost>=best.cost)continue;
          best={r,destination,a:a.id,z:z.id,walk,backA:z.id,backZ:a.id,cost,seat};
        }
      }
    }
  }
  if(!best)return false;
  const j:TransitJourney={id:city.nextId++,homeId,destinationId:best.destination.id,purpose,mode:'bus',state:'walking-out',origin:{...origin},path:best.walk,progress:0,startedAt:round(city.elapsed),wait:0,visitRemaining:0,rewarded:false,returned:false,activityReserved:true,routeId:best.r.id,boardStopId:best.a,alightStopId:best.z,returnBoardStopId:best.backA,returnAlightStopId:best.backZ,seat:best.seat,walkTarget:'board-out',...(external?{external:{origin:{...origin}}}:{})};
  t.journeys.push(j);return true;
}
export function stepTransit(city:City,index:RoadIndex,dt:number):void{
  const t=city.transit;if(!t)return;
  stepBusRidership(city,dt);
  stepWalkingJourneys(city,t.journeys,dt,undefined,j=>{
    if(j.mode!=='bus')return false;
    const r=t.routes.find(r=>r.id===j.routeId),stop=building(city,j.returnBoardStopId!);if(!r||!stop){j.blockedReason='Return service is unavailable.';return true;}
    const path=walkingPath(city,entrance(building(city,j.destinationId)!),entrance(stop));const seat=reserve(city,r,stop.id,j.returnAlightStopId!,path?path.length-1:0,j.id);
    if(!path||!seat){j.blockedReason='Waiting for return walking access or a bus seat.';return true;}
    j.seat=seat;j.activityReserved=false;j.path=path;j.progress=0;j.state='walking-back';j.walkTarget='board-back';delete j.blockedReason;return true;
  });
  for(const j of t.journeys){
    if(j.state!=='waiting-out'&&j.state!=='waiting-back')continue;
    j.wait=round(j.wait+dt);const r=t.routes.find(r=>r.id===j.routeId);if(!r)continue;
    const bus=t.fleet.find(b=>b.id===j.seat?.busId),back=j.state==='waiting-back';
    if(!bus||!j.seat||bus.run>j.seat.runId||bus.run===j.seat.runId&&bus.stopIndex>j.seat.boardIndex){
      const seat=reserve(city,r,back?j.returnBoardStopId!:j.boardStopId!,back?j.returnAlightStopId!:j.alightStopId!,0,j.id);if(seat)j.seat=seat;else delete j.seat;
    }
    j.blockedReason=r.blocked??(!j.seat?'Waiting for a free bus seat.':undefined);
  }
  t.journeys=t.journeys.filter(j=>j.state!=='complete'&&j.state!=='cancelled');
  for(const r of t.routes){
    if(r.pendingStopIds&&!hasRiders(t,r)&&!t.fleet.some(b=>b.routeId===r.id&&b.tripId!==undefined)){r.stopIds=r.pendingStopIds;delete r.pendingStopIds;}
    for(const b of t.fleet.filter(b=>b.routeId===r.id)){
      const trip=city.trips.find(tr=>tr.id===b.tripId);
      if(trip?.phase==='crashed'||trip?.phase==='waiting'||trip?.phase==='returning')continue;
      if(trip&&trip.phase!=='visiting'&&trip.phase!=='bus-dwell')continue;
      if(b.dwell>0){b.dwell=round(Math.max(0,b.dwell-dt));continue;}
      const required=hasRiders(t,r);
      if(trip&&b.stopIndex===0&&!busRiderCount(b)&&(!r.running||r.pendingStopIds)&&!required){city.trips=city.trips.filter(tr=>tr.id!==trip.id);delete b.tripId;}
      if(b.stopIndex===0&&city.elapsed<b.readyAt)continue;
      if((!r.running||r.pendingStopIds)&&!required&&b.tripId===undefined)continue;
      if(b.tripId===undefined&&city.elapsed<b.readyAt)continue;
      if(b.tripId===undefined&&(t.ridership?.riders.some(j=>(j.stage==='waiting-out'&&j.originStopId===r.stationId||j.stage==='waiting-back'&&j.destinationStopId===r.stationId)&&j.routeId===r.id))){
        const p=entrance(building(city,r.stationId)!);
        const platform:Trip={id:city.nextId++,busId:b.id,stationId:b.stationId,homeId:0,storeId:0,path:[p],progress:0,wait:0,hold:0,phase:'visiting',target:{...p}};
        city.trips.push(platform);b.tripId=platform.id;b.stopIndex=0;
        b.dwell=Math.min(4,1+exchangeBusRiders(city,b,r.stationId)*.25);spaceDepotDepartures(city,b);continue;
      }
      dispatch(city,index,b,r);
    }
  }
}
export function parseTransit(raw:unknown,city:City):TransitState|undefined|null{
  if(raw===undefined)return city.trips.some(t=>t.busId!==undefined)||city.buildings.some(b=>b.kind==='busStation'||b.kind==='busStop')?null:undefined;
  if(!raw||typeof raw!=='object')return null;const t=raw as TransitState;
  if(t.version!==1||typeof t.walkingEnabled!=='boolean'||!Array.isArray(t.fleet)||t.fleet.length>MAX_BUSES||!Array.isArray(t.routes)||t.routes.length>MAX_ROUTES||!Array.isArray(t.journeys)||t.journeys.length>MAX_JOURNEYS)return null;
  const int=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
  const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const ids=new Set([...city.buildings,...city.trips].map(x=>x.id));
  const add=(id:number)=>int(id)&&id>0&&id<city.nextId&&!ids.has(id)&&(ids.add(id),true);
  const routes:BusRoute[]=[],fleet:Bus[]=[];
  for(const r of t.routes){
    if(!r||!add(r.id)||building(city,r.stationId)?.kind!=='busStation'||routes.some(x=>x.stationId===r.stationId)||typeof r.running!=='boolean')return null;
    const validStops=(stops:unknown):stops is number[]=>Array.isArray(stops)&&stops.length>=2&&stops.length<=16&&new Set(stops).size===stops.length&&stops.every(id=>int(id)&&(id===r.stationId||building(city,id)?.kind==='busStop'));
    if(!validStops(r.stopIds)||r.pendingStopIds!==undefined&&!validStops(r.pendingStopIds)||r.blocked!==undefined&&(typeof r.blocked!=='string'||r.blocked.length>400))return null;
    routes.push({id:r.id,stationId:r.stationId,stopIds:[...r.stopIds],running:r.running,...(r.pendingStopIds?{pendingStopIds:[...r.pendingStopIds]}:{}),...(r.blocked!==undefined?{blocked:r.blocked}:{})});
  }
  for(const b of t.fleet){
    if(!b||!add(b.id)||building(city,b.stationId)?.kind!=='busStation'||!int(b.paid)||b.paid>BUS_PRICE||!int(b.stopIndex)||!int(b.run)||b.run>Math.floor(city.elapsed)+1||!Number.isSafeInteger(b.run*17+17)||!finite(b.dwell)||b.dwell>4||!finite(b.readyAt)||b.readyAt>city.elapsed+BUS_HEADWAY+1e-6||!Array.isArray(b.onboard)||b.onboard.length>BUS_CAPACITY||new Set(b.onboard).size!==b.onboard.length||!b.onboard.every(int))return null;
    if(b.abstractOnboard!==undefined&&(!Array.isArray(b.abstractOnboard)||!b.abstractOnboard.every(int)||new Set(b.abstractOnboard).size!==b.abstractOnboard.length)||busRiderCount(b)>BUS_CAPACITY)return null;
    const r=routes.find(r=>r.id===b.routeId);if(b.routeId!==undefined&&(!r||r.stationId!==b.stationId||b.stopIndex>=nodes(r).length))return null;
    if(b.tripId!==undefined&&(!int(b.tripId)||!r))return null;
    if(b.tripId!==undefined&&!city.trips.some(tr=>tr.id===b.tripId&&tr.busId===b.id&&tr.stationId===b.stationId))return null;
    const trip=city.trips.find(tr=>tr.id===b.tripId);
    if(trip){
      const recovering=trip.phase==='returning'||trip.phase==='waiting'&&trip.resume==='returning';
      const expected=building(city,recovering?b.stationId:nodes(r!)[b.stopIndex]);
      if(!expected||!trip.target||!same(trip.target,entrance(expected)))return null;
      if((trip.phase==='outbound'||trip.phase==='returning')&&!same(trip.path.at(-1)!,trip.target))return null;
      if(trip.phase==='waiting'&&trip.resume!=='outbound'&&trip.resume!=='returning')return null;
      if(trip.phase==='visiting'||trip.phase==='bus-dwell'){
        const stop=building(city,nodes(r!)[b.stopIndex]);
        if(!stop||!same(trip.path.at(-1)!,entrance(stop))||trip.progress!==trip.path.length-1||!trip.target||!same(trip.target,entrance(stop))
          ||(trip.phase==='visiting')!==(stop.kind==='busStation'))return null;
        if(stop.kind==='busStop'){const prev=trip.path.at(-2),d=tangent(stop),at=entrance(stop);if(!prev||prev.x+d.x!==at.x||prev.y+d.y!==at.y)return null;}
      }
      if(trip.phase!=='bus-dwell'&&trip.phase!=='visiting'&&trip.phase!=='crashed'&&b.dwell>0)return null;
    }
    if(b.tripId===undefined&&(busRiderCount(b)||b.dwell||b.stopIndex))return null;
    if(fleet.filter(x=>x.stationId===b.stationId).length>=2)return null;
    fleet.push({...b,onboard:[...b.onboard],...(b.abstractOnboard?{abstractOnboard:[...b.abstractOnboard]}:{})});
  }
  if(city.trips.some(tr=>tr.busId!==undefined&&!fleet.some(b=>b.id===tr.busId&&b.tripId===tr.id)))return null;
  const candidate:TransitState={version:1,walkingEnabled:t.walkingEnabled,routes,fleet,journeys:[]};const previous=city.transit;city.transit=candidate;
  const journeys=parseJourneys(t.journeys,city);if(previous)city.transit=previous;else delete city.transit;if(!journeys)return null;
  for(const j of journeys){if(!add(j.id))return null;}
  candidate.journeys=journeys;
  const ridership=parseBusRidership(t.ridership,city,candidate,add);if(ridership===null)return null;if(ridership)candidate.ridership=ridership;
  return candidate;
}

/** Admission/access query shares the real sidewalks and complete running route contract. */
export function hasJourneyAccess(city:City,from:Point,to:Point):boolean {
  if(findPath(city,from,to)&&findPath(city,to,from))return true;
  const t=city.transit;if(!t)return false;
  if(t.walkingEnabled&&walkingPath(city,from,to))return true;
  if(t.ridership)return false;
  for(const r of t.routes){
    if(!r.running||r.pendingStopIds||!t.fleet.some(b=>b.routeId===r.id)||busRoutePreview(city,r.stationId,r.stopIds).error)continue;
    const stops=nodes(r).map(id=>building(city,id)!);
    if(stops.some(a=>walkingPath(city,from,entrance(a))&&stops.some(z=>a.id!==z.id&&walkingPath(city,entrance(z),to))))return true;
  }
  return false;
}
/** Replans keep the required curb approach; a shorter wrong-side arrival is not a bus stop. */
export function busPathToTarget(city:City,trip:Trip,from:Point):Point[]|null {
  const b=city.transit?.fleet.find(b=>b.id===trip.busId),r=city.transit?.routes.find(r=>r.id===b?.routeId);
  if(trip.phase==='returning'||trip.resume==='returning')return trip.target?findPath(city,from,trip.target):null;
  if(!b||!r)return null;const target=building(city,nodes(r)[b.stopIndex]);if(!target)return null;
  if(target.kind==='busStation')return findPath(city,from,entrance(target));
  if(busStopIssue(city,target))return null;
  const p=entrance(target),d=tangent(target),before={x:p.x-d.x,y:p.y-d.y};
  if(same(from,p))return null;
  const path=findPath(city,from,before,false,new Set([key(p)]));return path?[...path,p]:null;
}
