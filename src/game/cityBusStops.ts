import {entrance, footprint, type City, type Building} from './cityModel.ts';
import {containsTile} from './cityMap.ts';
import {busStopIssue, busLeg} from './cityTransit.ts';
import {walkingPath} from './cityJourneys.ts';
import {waitingBusRiders} from './cityBusRidership.ts';

/** Sample with the HUD, not per frame. Existing timestamps advance with simulation time. */
export function busPassengerTimes(city:City) {
  const stops=new Map<number,number>(),buses=new Map<number,number>();
  for(const j of city.transit?.ridership?.riders??[]){
    const seconds=Math.max(0,Math.floor(city.elapsed-j.queuedAt));
    const stop=j.stage==='waiting-out'?j.originStopId:j.stage==='waiting-back'?j.destinationStopId:undefined;
    if(stop!==undefined)stops.set(stop,Math.max(stops.get(stop)??0,seconds));
    if(j.busId!==undefined&&(j.stage==='riding-out'||j.stage==='riding-back'))buses.set(j.busId,Math.max(buses.get(j.busId)??0,seconds));
  }
  for(const j of city.transit?.journeys??[]){
    const stop=j.state==='waiting-out'?j.boardStopId:j.state==='waiting-back'?j.returnBoardStopId:undefined;
    if(stop!==undefined)stops.set(stop,Math.max(stops.get(stop)??0,Math.floor(j.wait)));
  }
  return {stops,buses};
}

export function busStopNotices(city:City) {
  const waiting=waitingBusRiders(city);
  for(const j of city.transit?.journeys??[]){
    const id=j.state==='waiting-out'?j.boardStopId:j.state==='waiting-back'?j.returnBoardStopId:undefined;
    if(id!==undefined)waiting.set(id,(waiting.get(id)??0)+1);
  }
  return city.buildings.filter(b=>b.kind==='busStop').flatMap(b=>{
    let reason=busStopIssue(city,b);
    const routes=city.transit?.routes.filter(r=>r.stopIds.includes(b.id))??[];
    if(!reason&&routes.length&&!routes.some(r=>{
      const depot=city.buildings.find(d=>d.id===r.stationId)!;
      return busLeg(city,depot,b)&&busLeg(city,b,depot);
    }))reason='No usable road route to this stop and back to its depot.';
    if(!reason)return [];
    const times=(city.transit?.ridership?.riders??[]).filter(j=>j.stage==='waiting-out'&&j.originStopId===b.id||j.stage==='waiting-back'&&j.destinationStopId===b.id).map(j=>city.elapsed-j.queuedAt);
    for(const j of city.transit?.journeys??[])if(j.state==='waiting-out'&&j.boardStopId===b.id||j.state==='waiting-back'&&j.returnBoardStopId===b.id)times.push(j.wait);
    return [{id:b.id,x:b.x,y:b.y,reason,waiting:waiting.get(b.id)??0,waitSeconds:Math.floor(Math.max(0,...times))}];
  });
}

/** Validate before mutation. Existing rider identities, payments and route indices survive. */
export function busStopMoveIssue(city:City,id:number,x:number,y:number,rotation:number):string|null {
  const old=city.buildings.find(b=>b.id===id&&b.kind==='busStop');
  if(!old)return 'Select a bus stop.';
  if(![x,y,rotation].every(Number.isSafeInteger)||rotation<0||rotation>3)return 'Choose a valid stop position and direction.';
  const proposed:Building={...old,x,y,rotation};
  if(!containsTile(city.map,proposed))return 'Keep the stop inside the city.';
  if(city.roads.some(p=>p.x===x&&p.y===y)||city.buildings.some(b=>b.id!==id&&footprint(b).some(p=>p.x===x&&p.y===y)))return 'Choose an empty square beside the road.';
  const issue=busStopIssue(city,proposed);if(issue)return issue;
  const target=entrance(proposed);
  if(!walkingPath(city,entrance(old),target))return 'Move within six connected road tiles of the old stop so its waiting riders can follow.';
  const candidate={...city,buildings:city.buildings.map(b=>b.id===id?proposed:b)};
  for(const r of city.transit?.routes??[])if(r.stopIds.includes(id)){
    const depot=city.buildings.find(b=>b.id===r.stationId)!;
    if(!busLeg(candidate,depot,proposed)||!busLeg(candidate,proposed,depot))return 'The new stop needs a road route to and from its depot.';
  }
  for(const b of city.transit?.fleet??[]){
    const r=city.transit?.routes.find(r=>r.id===b.routeId);
    if(b.tripId!==undefined&&r&&[r.stationId,...r.stopIds.filter(s=>s!==r.stationId)][b.stopIndex]===id)return 'Wait for the bus approaching or using this stop to clear it.';
  }
  const reachable=(buildingId:number)=>{const b=city.buildings.find(b=>b.id===buildingId);return !!b&&!!walkingPath(city,entrance(b),target,12);};
  for(const j of city.transit?.ridership?.riders??[]){
    if(j.originStopId===id&&!reachable(j.homeId)||j.destinationStopId===id&&!reachable(j.destinationId))return 'Keep the new stop within walking reach of its existing riders’ homes and destinations.';
  }
  for(const j of city.transit?.journeys??[]){
    if((j.boardStopId===id||j.returnAlightStopId===id)&&!walkingPath(city,j.origin,target,12)
      ||(j.alightStopId===id||j.returnBoardStopId===id)&&!reachable(j.destinationId))return 'Keep the new stop within walking reach of its existing riders’ homes and destinations.';
    const movingTo=j.walkTarget==='board-out'?j.boardStopId:j.walkTarget==='board-back'?j.returnBoardStopId:undefined;
    if(movingTo===id&&['walking-out','walking-back','waiting-out','waiting-back'].includes(j.state)
      &&!walkingPath(city,j.path[Math.ceil(j.progress)],target,12))return 'Waiting and walking riders need a connected sidewalk to the new stop.';
  }
  return null;
}
export function moveBusStop(city:City,id:number,x:number,y:number,rotation:number):{ok:boolean;message:string} {
  const issue=busStopMoveIssue(city,id,x,y,rotation);if(issue)return {ok:false,message:issue};
  const stop=city.buildings.find(b=>b.id===id)!;
  Object.assign(stop,{x,y,rotation});
  const target=entrance(stop);
  for(const j of city.transit?.ridership?.riders??[])if(j.originStopId===id||j.destinationStopId===id)j.walkRange=12;
  for(const j of city.transit?.journeys??[]){
    if([j.boardStopId,j.alightStopId,j.returnBoardStopId,j.returnAlightStopId].includes(id))j.walkRange=12;
    if(j.state.startsWith('riding')&&(j.boardStopId===id||j.returnBoardStopId===id))delete j.goal;
    const movingTo=j.walkTarget==='board-out'?j.boardStopId:j.walkTarget==='board-back'?j.returnBoardStopId:undefined;
    if(movingTo!==id||!['walking-out','walking-back','waiting-out','waiting-back'].includes(j.state))continue;
    // Finish the current walking segment before following the new sidewalk route.
    const k=Math.ceil(j.progress),tail=walkingPath(city,j.path[k],target,12)!;
    j.path=[...j.path.slice(0,k),...tail];j.goal={...target};
    if(j.state==='waiting-out')j.state='walking-out';
    if(j.state==='waiting-back')j.state='walking-back';
  }
  return {ok:true,message:`Bus stop ${id} moved. Route order and waiting riders kept. No charge.`};
}
