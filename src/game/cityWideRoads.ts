/** Paired carriageways. Logical connections, never artwork, define legal travel. */
import type { Point } from './cityModel.ts';
export type WideRoadSection = Point & { axis: 'horizontal' | 'vertical' };
export type WideRoadCity = { roads?: Point[] | ReadonlySet<string>; roadPoints?: Point[]; wideRoads?: WideRoadSection[] };
export type WideRoadHeading = 'N' | 'S' | 'E' | 'W';
export type WideRoadTile = { point: Point; direction?: WideRoadHeading; junction: boolean };
export type WideRoadTopology = { tiles: Map<string, WideRoadTile>; junctions: Point[][] };
const key = (p: Point) => `${p.x},${p.y}`;
const neighbors = (p:Point):Point[] => [{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x,y:p.y+1}];
export const wideRoadFootprint = (s: WideRoadSection): Point[] => [{x:s.x,y:s.y},s.axis==='horizontal'?{x:s.x,y:s.y+1}:{x:s.x+1,y:s.y}];
export const wideRoadSignature = (city: WideRoadCity): string => (city.wideRoads??[]).map(s=>`${s.x},${s.y},${s.axis}`).sort().join(';');
const cache = new WeakMap<object,{roads?:Point[] | ReadonlySet<string>;length:number;sections?:WideRoadSection[];count:number;topology:WideRoadTopology}>();
/** Placement/removal replaces section metadata. Roads use append/splice or array replacement.
 * Explicit invalidation also supports callers editing existing point coordinates in place. */
export function invalidateWideRoadTopology(city: WideRoadCity):void { cache.delete(city); }
export function wideRoadTopology(city: WideRoadCity): WideRoadTopology {
  const roadSource=city.roadPoints??city.roads;
  const roadLength=Array.isArray(roadSource)?roadSource.length:roadSource?.size??0;
  const old=cache.get(city);
  if(old&&old.roads===roadSource&&old.length===roadLength&&old.sections===city.wideRoads&&old.count===(city.wideRoads?.length??0))return old.topology;
  const tiles=new Map<string,WideRoadTile>();
  const sections=city.wideRoads??[];
  const sectionKeys=new Set(sections.map(s=>`${key(s)},${s.axis}`));
  const roads:ReadonlySet<string>=Array.isArray(roadSource)?new Set(roadSource.map(key)):roadSource??new Set();
  for(const s of sections)for(const [i,p] of wideRoadFootprint(s).entries()) {
    const direction:WideRoadHeading=s.axis==='horizontal'?(i===0?'W':'E'):(i===0?'S':'N');
    const existing=tiles.get(key(p));
    if(existing){if(existing.direction!==direction){existing.direction=undefined;existing.junction=true;}}
    else tiles.set(key(p),{point:p,direction,junction:false});
  }
  for(const s of sections){
    const pair=wideRoadFootprint(s);
    const prev=s.axis==='horizontal'?{x:s.x-1,y:s.y}:{x:s.x,y:s.y-1};
    const next=s.axis==='horizontal'?{x:s.x+1,y:s.y}:{x:s.x,y:s.y+1};
    const end=!sectionKeys.has(`${key(prev)},${s.axis}`)||!sectionKeys.has(`${key(next)},${s.axis}`);
    const sideStreet=pair.some(p=>neighbors(p).some(n=>roads.has(key(n))&&!tiles.has(key(n))&&(s.axis==='horizontal'?n.y!==p.y:n.x!==p.x)));
    if(end||sideStreet||pair.some(p=>tiles.get(key(p))!.junction))for(const p of pair)tiles.get(key(p))!.junction=true;
  }
  // A perpendicular overlap's entire pair participates, including pairs visited earlier.
  let changed=true;
  while(changed){changed=false;for(const s of sections){const pair=wideRoadFootprint(s);if(pair.some(p=>tiles.get(key(p))!.junction))for(const p of pair){const tile=tiles.get(key(p))!;if(!tile.junction){tile.junction=true;changed=true;}}}}
  const remaining=new Set([...tiles].filter(([,t])=>t.junction).map(([k])=>k));
  const junctions:Point[][]=[];
  while(remaining.size){const first=remaining.values().next().value!;remaining.delete(first);const group=[tiles.get(first)!.point];for(let i=0;i<group.length;i++)for(const n of neighbors(group[i]))if(remaining.delete(key(n)))group.push(tiles.get(key(n))!.point);junctions.push(group);}
  const topology={tiles,junctions};cache.set(city,{roads:roadSource,length:roadLength,sections:city.wideRoads,count:sections.length,topology});return topology;
}
export const wideRoadDirectionAt=(city:WideRoadCity,p:Point):WideRoadHeading|undefined=>wideRoadTopology(city).tiles.get(key(p))?.direction;
export const wideRoadJunctions=(city:WideRoadCity):Point[][]=>wideRoadTopology(city).junctions;
export function allowsWideRoadStep(city:WideRoadCity,a:Point,b:Point):boolean {
  if(!city.wideRoads?.length)return true;
  const topology=wideRoadTopology(city),from=topology.tiles.get(key(a)),to=topology.tiles.get(key(b));
  if(!from&&!to)return true;
  if(from?.junction&&to?.junction)return true;
  const direction:WideRoadHeading=b.x>a.x?'E':b.x<a.x?'W':b.y>a.y?'S':'N';
  // The unbroken carriageway determines longitudinal travel; junctions allow crossing.
  for(const tile of [from,to])if(tile&&!tile.junction&&tile.direction!==direction)return false;
  return true;
}
/** Read-only footprint validation shared by preview and mutation. Busy traffic/cost are model guards. */
export function wideRoadPlacementGeometry(city:WideRoadCity,section:WideRoadSection):{ok:boolean;message:string;footprint:Point[]} {
  const footprint=wideRoadFootprint(section);
  if(!Number.isSafeInteger(section.x)||!Number.isSafeInteger(section.y)||!['horizontal','vertical'].includes(section.axis))return {ok:false,message:'Choose a horizontal or vertical four-lane road.',footprint};
  for(const s of city.wideRoads??[])if(s.axis===section.axis&&!(s.x===section.x&&s.y===section.y)&&wideRoadFootprint(s).some(p=>footprint.some(q=>key(p)===key(q))))return {ok:false,message:'Align the new road with both existing carriageways, or rotate it for an intersection.',footprint};
  return {ok:true,message:'',footprint};
}
export function parseWideRoads(raw:unknown,roads:ReadonlySet<string>):WideRoadSection[]|undefined|null {
  if(raw===undefined)return undefined;
  if(!Array.isArray(raw)||raw.length>roads.size)return null;
  const result:WideRoadSection[]=[];const seen=new Set<string>();
  for(const item of raw){
    if(!item||typeof item!=='object'||!Number.isSafeInteger(item.x)||!Number.isSafeInteger(item.y)||!['horizontal','vertical'].includes(item.axis))return null;
    const s:WideRoadSection={x:item.x,y:item.y,axis:item.axis};const id=`${key(s)},${s.axis}`;
    if(seen.has(id)||!wideRoadFootprint(s).every(p=>roads.has(key(p)))||!wideRoadPlacementGeometry({wideRoads:result},s).ok)return null;
    seen.add(id);result.push(s);
  }
  return result.length?result:undefined;
}
