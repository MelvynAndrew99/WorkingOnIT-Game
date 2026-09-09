/** Explicit outside-city arrivals. Gateway geometry is saved independently of map edges/art. */
import { entrance, type City, type Point, type Trip, type TripPurpose } from './cityModel.ts';
import { containsTile, type MapBounds } from './cityMap.ts';
import { chooseDestinationFrom } from './cityVisits.ts';
import { startBlocked, type RoadIndex } from './cityTraffic.ts';

export interface ExternalConnection {
  version: 1;
  gateway: Point | null;
  arrivalClock: number;
  arrivals: number;
  completed: number;
}
export const createExternalConnection = (): ExternalConnection => ({ version:1, gateway:null, arrivalClock:0, arrivals:0, completed:0 });
const same = (a:Point,b:Point) => a.x===b.x && a.y===b.y;
const point = (p:unknown): p is Point => !!p && typeof p==='object'
  && Number.isSafeInteger((p as Point).x) && Number.isSafeInteger((p as Point).y);
const count = (v:unknown): v is number => typeof v==='number' && Number.isSafeInteger(v) && v>=0;

/** Boundary candidates are existing roads, never newly-created or invisible construction. */
export function boundaryGatewayCandidates(city:City): Point[] {
  const m=city.map;
  return city.roads.filter(p=>p.x===m.x || p.y===m.y || p.x===m.x+m.width-1 || p.y===m.y+m.height-1).map(p=>({...p}));
}
export function connectExternalCity(city:City,gateway:Point):string {
  if(city.external?.gateway)return 'The outside city is already connected. Extend roads from its gateway.';
  if(!point(gateway)||!boundaryGatewayCandidates(city).some(p=>same(p,gateway)))
    return 'Build a road to a map edge, then choose that road as the outside connection.';
  city.external={...createExternalConnection(),gateway:{...gateway}};
  return 'Outside city connected. Visitors enter through this gateway when a destination has room.';
}
/** Growth changes demand, never measured skill, accidents, or mission completion. Provisional. */
export function externalDemand(city:City):{interval:number;limit:number} {
  const homes=city.buildings.filter(b=>b.kind==='home').length;
  const destinations=city.buildings.filter(b=>b.kind==='store'||b.kind==='park').length;
  return {interval:Math.max(4,12-homes),limit:Math.min(16,2+homes+destinations)};
}
export function stepExternal(city:City,index:RoadIndex,dt:number):void {
  const e=city.external;
  if(!e?.gateway||!Number.isFinite(dt)||dt<=0)return;
  const {interval,limit}=externalDemand(city);
  e.arrivalClock=Math.round((e.arrivalClock+dt)*1e6)/1e6;
  if(e.arrivalClock<interval)return;
  // A blocked/full gateway misses this arrival. No hidden backlog or reopening burst.
  e.arrivalClock=0;
  if(city.trips.filter(t=>t.external).length>=limit)return;
  const first:TripPurpose=e.arrivals%2===0?'shopping':'leisure';
  const order:TripPurpose[]=first==='shopping'?['shopping','leisure']:['leisure','shopping'];
  for(const purpose of order){
    const choice=chooseDestinationFrom(city,e.gateway,purpose);
    if(!choice||choice.path.length<2||startBlocked(city,index,choice.path))continue;
    city.trips.push({id:city.nextId++,homeId:0,storeId:choice.building.id,path:choice.path,progress:0,wait:0,hold:0,
      phase:'outbound',purpose,visitRemaining:0,rewarded:false,target:{...choice.path.at(-1)!},external:{origin:{...e.gateway}}});
    e.arrivals++;
    break;
  }
}
/** Missing state means disconnected. Invalid connected state cannot discard active visitors. */
export function parseExternalConnection(raw:unknown,map:MapBounds):ExternalConnection|null {
  if(raw===undefined)return createExternalConnection();
  if(!raw||typeof raw!=='object')return null;
  const e=raw as ExternalConnection;
  if(e.version!==1||!count(e.arrivals)||!count(e.completed)||e.completed>e.arrivals
    ||typeof e.arrivalClock!=='number'||!Number.isFinite(e.arrivalClock)||e.arrivalClock<0||e.arrivalClock>=12)return null;
  if(e.gateway!==null&&(!point(e.gateway)||!containsTile(map,e.gateway)))return null;
  if(e.gateway===null&&(e.arrivals!==0||e.completed!==0||e.arrivalClock!==0))return null;
  return {version:1,gateway:e.gateway?{...e.gateway}:null,arrivalClock:e.arrivalClock,arrivals:e.arrivals,completed:e.completed};
}
/** Called after ordinary trip fields are parsed, before model endpoint/occupancy validation. */
export function validExternalTrip(city:City,trip:Trip):boolean {
  const origin=trip.external?.origin,gateway=city.external?.gateway;
  if(!origin||!point(origin)||!gateway||!same(origin,gateway)||trip.homeId!==0||trip.service
    ||trip.stationId!==undefined||trip.workRemaining!==undefined||trip.emergencyPass
    ||(trip.purpose!=='shopping'&&trip.purpose!=='leisure')||typeof trip.rewarded!=='boolean')return false;
  if(!['outbound','visiting','returning','waiting','crashed'].includes(trip.phase??''))return false;
  if(trip.phase==='waiting'&&trip.resume!=='outbound'&&trip.resume!=='returning')return false;
  const returning=trip.phase==='returning'||(trip.phase==='waiting'&&trip.resume==='returning');
  const outbound=trip.phase==='outbound'||(trip.phase==='waiting'&&trip.resume==='outbound');
  if(returning&&!trip.rewarded)return false;
  if(outbound&&trip.rewarded)return false;
  const destination=city.buildings.find(b=>b.id===trip.storeId&&(b.kind==='store'||b.kind==='park'));
  if(!returning&&trip.phase!=='crashed'&&!destination)return false;
  if(destination&&destination.kind!==(trip.purpose==='shopping'?'store':'park'))return false;
  if(trip.phase==='waiting'){
    const goal=returning?origin:destination?entrance(destination):null;
    if(!goal||!trip.target||!same(trip.target,goal))return false;
  }
  return true;
}
