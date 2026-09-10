import {civilianRoute} from './cityRouting.ts';
/** Explicit outside-city arrivals. Gateway geometry is saved independently of map edges/art. */
import { entrance, footprint, type City, type Point, type Trip, type TripPurpose } from './cityModel.ts';
import { containsTile, type MapBounds } from './cityMap.ts';
import { chooseDestinationFrom } from './cityVisits.ts';
import { emergencyReservedTiles, pruneControls, startBlocked, type RoadIndex } from './cityTraffic.ts';
import { recordRoadPayment } from './cityEconomy.ts';
import { tutorialAction } from './cityTutorial.ts';

export interface ExternalConnection {
  version: 1;
  gateway: Point | null;
  arrivalClock: number;
  arrivals: number;
  completed: number;
  /** Explicit tutorial-exit consent. Retained if no safe access corridor exists yet. */
  autoConnectRequested?: boolean;
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

const tileKey = (p:Point) => `${p.x},${p.y}`;
const neighbors = (p:Point):Point[] => [{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x,y:p.y+1}];

/** A minimal access corridor, starting on a destination's network where possible.
 * Never overwrites lots, changes existing roads, or charges the player's wallet. */
function automaticGatewayPath(city:City):Point[]|null {
  if(!city.roads.length)return null;
  const roads=new Map(city.roads.map(p=>[tileKey(p),p]));
  const preferred=[...city.buildings.filter(b=>b.kind==='store'||b.kind==='park'),
    ...city.buildings.filter(b=>b.kind==='home')].map(entrance).find(p=>roads.has(tileKey(p)));
  const seed=preferred??city.roads[0];
  const connected=new Map<string,Point>([[tileKey(seed),seed]]), network=[seed];
  for(let i=0;i<network.length;i++)for(const p of neighbors(network[i])){
    const k=tileKey(p);
    if(roads.has(k)&&!connected.has(k)){connected.set(k,p);network.push(p);}
  }
  const blocked=new Set(city.buildings.flatMap(footprint).map(tileKey));
  // New neighboring asphalt can change a committed passing corridor's geometry.
  for(const k of emergencyReservedTiles(city)){
    const [x,y]=k.split(',').map(Number),p={x,y};
    blocked.add(k);for(const q of neighbors(p))blocked.add(tileKey(q));
  }
  const queue=[...network],previous=new Map<string,Point|null>(queue.map(p=>[tileKey(p),null]));
  const m=city.map;
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(p.x===m.x||p.y===m.y||p.x===m.x+m.width-1||p.y===m.y+m.height-1){
      const path=[p];let parent=previous.get(tileKey(p));
      while(parent){path.push(parent);parent=previous.get(tileKey(parent));}
      return path.reverse();
    }
    for(const q of neighbors(p)){
      const k=tileKey(q);
      if(!containsTile(m,q)||previous.has(k)||blocked.has(k))continue;
      previous.set(k,p);queue.push(q);
    }
  }
  return null;
}

/** Call before building the traffic index. Consent is persisted; ordinary old saves stay disconnected. */
export function retryAutomaticConnection(city:City):boolean {
  if(!city.external?.autoConnectRequested||city.external.gateway||city.tutorial?.status==='active')return false;
  const path=automaticGatewayPath(city);
  if(!path)return false;
  const existing=new Set(city.roads.map(tileKey));
  for(const p of path)if(!existing.has(tileKey(p))){
    city.roads.push({...p});recordRoadPayment(city,p,0);
  }
  pruneControls(city);
  connectExternalCity(city,path.at(-1)!);
  return true;
}

/** User-confirmed transition: preserves completed teaching and unlocks unfinished teaching. */
export function finishTutorialAndConnect(city:City):string {
  if(city.tutorial?.status!=='complete')tutorialAction(city,'skip');
  if(city.external?.gateway)return 'Tutorial finished. Your town is already connected to outside traffic.';
  city.external??=createExternalConnection();
  city.external.autoConnectRequested=true;
  if(retryAutomaticConnection(city))return 'Tutorial finished. Outside traffic is connected; any added access road is free.';
  return 'Tutorial finished. Outside traffic will connect automatically when your roads have a clear route to the map edge.';
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
    if(!choice||choice.path.length<2)continue;
    const path=civilianRoute(city,e.gateway,choice.path.at(-1)!)??choice.path;
    if(startBlocked(city,index,path))continue;
    city.trips.push({id:city.nextId++,homeId:0,storeId:choice.building.id,path,progress:0,wait:0,hold:0,
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
  if(e.autoConnectRequested!==undefined&&typeof e.autoConnectRequested!=='boolean')return null;
  if(e.version!==1||!count(e.arrivals)||!count(e.completed)||e.completed>e.arrivals
    ||typeof e.arrivalClock!=='number'||!Number.isFinite(e.arrivalClock)||e.arrivalClock<0||e.arrivalClock>=12)return null;
  if(e.gateway!==null&&(!point(e.gateway)||!containsTile(map,e.gateway)))return null;
  if(e.gateway===null&&(e.arrivals!==0||e.completed!==0||e.arrivalClock!==0))return null;
  return {version:1,gateway:e.gateway?{...e.gateway}:null,arrivalClock:e.arrivalClock,arrivals:e.arrivals,completed:e.completed,
    ...(e.autoConnectRequested!==undefined?{autoConnectRequested:e.autoConnectRequested}:{})};
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
