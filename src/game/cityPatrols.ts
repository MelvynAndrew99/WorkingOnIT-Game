import {allowsRoadStep} from './cityDirections.ts';
/** Local road patrols: no artwork, money, or incident creation. */
import {entrance,isBlocked,findPath,type City,type Building,type Point,type Trip} from './cityModel.ts';
import {roadIndex,startBlocked,TRAVEL_TILES_PER_SECOND} from './cityTraffic.ts';
import {CITY_RULES} from './cityRules.ts';
const key=(p:Point)=>`${p.x},${p.y}`;
export function insidePatrol(station:Building,p:Point):boolean {
 const c=entrance(station);return (p.x-c.x)**2+(p.y-c.y)**2<=CITY_RULES.policePatrol.radiusTiles**2;
}
export function patrolAvoid(city:City,trip:Trip):Set<string> {
 const station=city.buildings.find(b=>b.id===trip.stationId);
 return new Set(city.roads.filter(p=>!station||!insidePatrol(station,p)).map(key));
}
/** All route tiles, not just the destination, stay within the circle. */
export function patrolRoute(city:City,station:Building):Point[]|null {
 const start=entrance(station),roads=new Set(city.roads.filter(p=>insidePatrol(station,p)&&!isBlocked(city,p)).map(key));
 if(!roads.has(key(start)))return null;
 const queue=[start],previous=new Map<string,Point|null>([[key(start),null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];
  for(const q of [{x:p.x+1,y:p.y},{x:p.x,y:p.y+1},{x:p.x-1,y:p.y},{x:p.x,y:p.y-1}]){
   if(!roads.has(key(q))||!allowsRoadStep(city,p,q)||previous.has(key(q)))continue;
   previous.set(key(q),p);queue.push(q);
  }
 }
 if(queue.length<2)return null;
 // Pick among the furthest reachable roads, alternating branches between outings.
 const distance=(p:Point)=>(p.x-start.x)**2+(p.y-start.y)**2;
 const avoid=(city.roadDirections||city.wideRoads) ? new Set(city.roads.filter(p=>!roads.has(key(p))).map(key)) : undefined;
 const returns=new Map<string,Point[]>();
 const eligible=(city.roadDirections||city.wideRoads) ? queue.slice(1).filter(p=>{
  const back=findPath(city,p,start,false,avoid);if(!back)return false;returns.set(key(p),back);return true;
 }) : queue.slice(1);
 if(!eligible.length)return null;
 const far=eligible.sort((a,b)=>distance(b)-distance(a));
 const choices=far.filter(p=>distance(p)>=distance(far[0])*.65);
 const end=choices[(city.nextId+station.id)%choices.length];
 const path=[end];let parent=previous.get(key(end));while(parent){path.push(parent);parent=previous.get(key(parent));}
 path.reverse();return [...path,...(returns.get(key(end))?.slice(1)??path.slice(0,-1).reverse())].map(p=>({...p}));
}
export function stepPolicePatrols(city:City):void {
 for(const station of city.buildings.filter(b=>b.kind==='policeStation')){
  if((station.patrolReadyAt??0)>city.elapsed||city.trips.some(t=>t.service&&t.stationId===station.id))continue;
  // Dispatch has first refusal. Do not send idle police away from an unresolved call.
  if(city.incidents.some(i=>i.status==='active'&&!i.tutorialEmsOnly&&i.required.includes('police')&&!i.completedServices.includes('police')))continue;
  const path=patrolRoute(city,station);
  if(!path||startBlocked(city,roadIndex(city),path))continue;
  city.trips.push({id:city.nextId++,homeId:0,storeId:0,path,progress:0,wait:0,hold:0,phase:'returning',
   service:'police',stationId:station.id,patrol:true,target:{...path.at(-1)!},speed:TRAVEL_TILES_PER_SECOND,workRemaining:0});
 }
}
