/** Atomic road direction edits. Traffic owns physical reservations; art never defines legality. */
import type { City, Point } from './cityModel.ts';
import { roadEdgeKey, roadDirectionForStep } from './cityDirections.ts';
import { directionReservedTiles } from './cityTraffic.ts';
import { starterToolAllowed } from './cityStarterTutorial.ts';

export type DirectionEditMode = 'forward' | 'reverse' | 'two-way';
export type DirectionEditResult = { ok: boolean; message: string };
const key=(p:Point)=>`${p.x},${p.y}`;

export function applyRoadDirections(city:City,points:Point[],mode:DirectionEditMode):DirectionEditResult {
  const fail=(message:string):DirectionEditResult=>({ok:false,message});
  if(!starterToolAllowed(city,'direction'))return fail('One-way roads unlock with Roads. Follow the tutorial, or Skip tutorial to unlock everything.');
  if(!['forward','reverse','two-way'].includes(mode))return fail('Choose One-way, Reverse, or Two-way.');
  if(!Array.isArray(points)||points.length<2||points.length>city.roads.length+1)return fail('Select at least two connected road tiles.');
  const roads=new Set(city.roads.map(key));
  if(points.some(p=>!p||!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.y)||!roads.has(key(p))))return fail('Select existing road tiles.');
  const proposed=new Map<string,{value:'forward'|'reverse'|undefined;a:Point;b:Point}>();
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i];
    if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)!==1)return fail('Choose neighboring road tiles, one square at a time.');
    const edge=roadEdgeKey(a,b);
    if(proposed.has(edge))return fail('Select each road connection only once. Close a loop by selecting its first tile again.');
    const value=mode==='two-way'?undefined:mode==='forward'?roadDirectionForStep(a,b):roadDirectionForStep(b,a);
    proposed.set(edge,{value,a,b});
  }
  const changes=[...proposed].filter(([edge,{value}])=>city.roadDirections?.[edge]!==value);
  if(!changes.length)return {ok:true,message:'These roads already have that direction.'};
  const reserved=directionReservedTiles(city);
  if(changes.some(([,e])=>reserved.has(key(e.a))||reserved.has(key(e.b))))
    return fail('Traffic must clear before changing direction. Run traffic to let vehicles leave; Divert can hold new arrivals.');
  const updated={...city.roadDirections};
  for(const [edge,{value}] of changes)if(value===undefined)delete updated[edge];else updated[edge]=value;
  if(Object.keys(updated).length)city.roadDirections=updated;else delete city.roadDirections;
  // Uncommitted path suffixes are reconsidered at the next tick, preserving exact current position.
  return {ok:true,message:mode==='two-way'?'Two-way traffic restored.':`One-way set: ${changes.length} connection${changes.length===1?'':'s'}. Keep routes home open.`};
}
