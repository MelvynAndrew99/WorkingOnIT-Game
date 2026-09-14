/** Apartment-owned pavement. Routing and vehicle occupancy still use real road tiles. */
import {entrances, footprint, place, type City, type Point} from './cityModel.ts';
import {tileOwned} from './cityLand.ts';
import {directionReservedTiles} from './cityTraffic.ts';
import {wideRoadFootprint} from './cityWideRoads.ts';

const key = (p: Point) => `${p.x},${p.y}`;
const neighbours = (p: Point): Point[] => [{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x,y:p.y+1}];
export const PRIVATE_LANE_MESSAGE = 'The apartment community manages this lane. Edit the public roads outside the complex.';
export function privateLaneKeys(city: Pick<City,'apartmentComplexes'>): Set<string> {
  return new Set(city.apartmentComplexes?.flatMap(g=>g.privateLanes??[]).map(key));
}
export type PrivateLanePlan = {ok:boolean; message:string; buildingIds:number[]; lanes:Point[]; added:Point[]; cost:number};

/** Small deterministic network, limited to a two-tile margin around the selected blocks.
 * Public pavement is allowed only at building access points, never as a through path.
 * Planning runs only during an explicit join/preview, not on simulation ticks. */
export function planPrivateLanes(city: City, firstId: number, secondId: number): PrivateLanePlan {
  const fail=(message:string):PrivateLanePlan=>({ok:false,message,buildingIds:[],lanes:[],added:[],cost:0});
  const first=city.apartmentComplexes?.find(g=>g.buildingIds.includes(firstId));
  const second=city.apartmentComplexes?.find(g=>g.buildingIds.includes(secondId));
  if(firstId===secondId)return fail('Choose a different apartment block.');
  const buildingIds=[...new Set([...(first?.buildingIds??[firstId]),...(second?.buildingIds??[secondId])])].sort((a,b)=>a-b);
  const blocks=buildingIds.map(id=>city.buildings.find(b=>b.id===id&&b.kind==='apartment'));
  if(blocks.some(b=>!b))return fail('Choose two apartment blocks.');
  const cells=blocks.flatMap(b=>footprint(b!));
  const occupied=new Set(city.buildings.flatMap(footprint).map(key));
  const roads=new Set(city.roads.map(key)), community=new Set(city.communityRoads?.map(key));
  const otherPrivate=new Set(city.apartmentComplexes?.filter(g=>g!==first&&g!==second).flatMap(g=>g.privateLanes??[]).map(key));
  const wide=new Set(city.wideRoads?.flatMap(wideRoadFootprint).map(key));
  const access=blocks.map(b=>entrances(b!));
  const terminals=new Set(access.flat().map(key));
  const reserved=directionReservedTiles(city);
  const incidents=new Set(city.incidents.filter(i=>i.status==='active').map(key));
  const works=new Set(city.wideRoadWorks?.flatMap(w=>wideRoadFootprint(w.section)).map(key));
  const minX=Math.min(...cells.map(p=>p.x))-2,maxX=Math.max(...cells.map(p=>p.x))+2;
  const minY=Math.min(...cells.map(p=>p.y))-2,maxY=Math.max(...cells.map(p=>p.y))+2;
  const usable=(p:Point)=>p.x>=minX&&p.x<=maxX&&p.y>=minY&&p.y<=maxY && tileOwned(city.land,city.map,p)
    && !occupied.has(key(p)) && !wide.has(key(p)) && !otherPrivate.has(key(p)) && !works.has(key(p))
    && (!roads.has(key(p))||community.has(key(p))||terminals.has(key(p)))
    && (roads.has(key(p))||![p,...neighbours(p)].some(n=>reserved.has(key(n))||works.has(key(n))||incidents.has(key(n))));
  const network=new Map<string,Point>();
  for(const p of [...(first?.privateLanes??[]),...(second?.privateLanes??[])])network.set(key(p),p);
  // Start with the first block's enabled entrances; each additional block must
  // connect to the first network rather than merely to its own group fragment.
  const tree=new Map(access[0].filter(usable).map(p=>[key(p),p]));
  if(!tree.size)return fail('Leave clear space beside an apartment entrance for its private lane.');
  for(let i=1;i<access.length;i++) {
    const targets=new Set(access[i].filter(usable).map(key));
    const queue=[...tree.values()], previous=new Map<string,Point|null>(queue.map(p=>[key(p),null]));
    let end:Point|undefined;
    for(let cursor=0;cursor<queue.length;cursor++) {
      const p=queue[cursor];
      if(targets.has(key(p))){end=p;break;}
      for(const q of neighbours(p)) {
        if(previous.has(key(q))||!usable(q))continue;
        // A public entrance can terminate a lane but cannot join public streets
        // into a disguised private shortcut.
        if(roads.has(key(q))&&!community.has(key(q))&&!targets.has(key(q)))continue;
        previous.set(key(q),p);queue.push(q);
      }
    }
    if(!end)return fail('No clear private-lane route. Place blocks closer together, leave space around their entrances, or let nearby traffic clear.');
    const path:Point[]=[];
    for(let p:Point|null=end;p;p=previous.get(key(p))??null)path.push(p);
    if(path.length>25)return fail('These blocks are too far apart. Keep each private-lane connection within 24 tiles.');
    // Only the selected first entrance belongs to the connected tree.
    if(i===1)tree.clear();
    for(const p of path){tree.set(key(p),p);if(!roads.has(key(p))||community.has(key(p)))network.set(key(p),p);}
  }
  const lanes=[...network.values()],added=lanes.filter(p=>!roads.has(key(p)));
  const candidate=structuredClone(city);
  for(const p of added) {
    const message=place(candidate,'communityRoad',p.x,p.y);
    if(!candidate.communityRoads?.some(q=>key(q)===key(p)))return fail(message);
  }
  const cost=city.funds-candidate.funds;
  return {ok:true,message:`Join ${buildingIds.length} blocks · private lanes $${cost}. Connect a lane to your public road for shared entry and exit.`,buildingIds,lanes,added,cost};
}

/** Replan at Apply so stale previews cannot bypass traffic, land or affordability guards. */
export function buildPrivateComplex(city:City,firstId:number,secondId:number, expected?:PrivateLanePlan):string {
  const plan=planPrivateLanes(city,firstId,secondId);
  if(!plan.ok)return plan.message;
  if(expected && (plan.cost!==expected.cost || JSON.stringify(plan.lanes)!==JSON.stringify(expected.lanes)))return 'The lane route or price changed. Select the other block again to review it.';
  const candidate=structuredClone(city);
  for(const p of plan.added) {
    const message=place(candidate,'communityRoad',p.x,p.y);
    if(!candidate.communityRoads?.some(q=>key(q)===key(p)))return message;
  }
  candidate.apartmentComplexes=[...(candidate.apartmentComplexes??[]).filter(g=>!g.buildingIds.some(id=>plan.buildingIds.includes(id))),
    {id:plan.buildingIds[0],buildingIds:plan.buildingIds,privateLanes:plan.lanes}].sort((a,b)=>a.id-b.id);
  Object.assign(city,candidate);
  return `Complex joined: ${plan.buildingIds.length} apartment blocks. Private lanes are managed automatically.`;
}
