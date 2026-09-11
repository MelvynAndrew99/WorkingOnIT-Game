/** Saved land permits: two introductory strips, then completed growth missions. */
import {entrance,findPath,type City} from './cityModel.ts';
import type {ExpansionDirection} from './cityMap.ts';

/** Keep one outside-facing edge fixed, including corner connections. Legacy
 * interior gateways retain their geometry until an explicit repair is chosen. */
export function connectedExpansionEdge(city:City):ExpansionDirection|null {
 const g=city.external?.gateway,m=city.map;
 if(!g)return null;
 if(g.x===m.x)return 'west';
 if(g.x===m.x+m.width-1)return 'east';
 if(g.y===m.y)return 'north';
 if(g.y===m.y+m.height-1)return 'south';
 return null;
}
export const connectedEdgeReason=(edge:ExpansionDirection)=>`The outside city connects on the ${edge} edge. Expand in another direction to keep that connection at the edge.`;

export interface ExpansionProgress {version:1;used:number;levels:number;briefingSeen:boolean;}
export const createExpansionProgress=():ExpansionProgress=>({version:1,used:0,levels:0,briefingSeen:false});
export const expansionTarget=(level:number)=>6+3*level;
export function expansionHouseholds(city:City):number {
 const visited=new Set(city.missions?.shoppers??[]),shops=city.buildings.filter(b=>b.kind==='store');
 return city.buildings.filter(b=>b.kind==='home'&&visited.has(b.id)&&shops.some(s=>!!findPath(city,entrance(b),entrance(s))&&!!findPath(city,entrance(s),entrance(b)))).length;
}
export function refreshExpansionProgress(city:City):void {
 const e=city.expansion??=createExpansionProgress(),served=expansionHouseholds(city);
 // Permanent receipts: losing a road later never takes an earned permit away.
 while(e.levels<20&&served>=expansionTarget(e.levels))e.levels++;
}
export function expansionSnapshot(city:City) {
 const e=city.expansion??createExpansionProgress();
 const freeRemaining=Math.max(0,2-e.used),permits=Math.max(0,e.levels-Math.max(0,e.used-2));
 const h=city.tutorial?.hRoad;
 const tutorialLocked=city.tutorial?.status==='active'&&!!h&&h.stage<9;
 const target=expansionTarget(e.levels),current=Math.min(target,expansionHouseholds(city));
 const lockedReason=tutorialLocked?'Land expansion unlocks after the junction-control lesson.'
  :freeRemaining+permits===0?`Mayor funding needed: get ${target} households shopping (${current}/${target}). Finish that mission to level up and earn one expansion.`:'';
 return {freeRemaining,permits,level:e.levels,target,current,used:e.used,briefingSeen:e.briefingSeen,canExpand:!lockedReason,lockedReason,connectedEdge:connectedExpansionEdge(city)};
}
export function markExpansionBriefingSeen(city:City):void {(city.expansion??=createExpansionProgress()).briefingSeen=true;}
export function parseExpansionProgress(raw:unknown):ExpansionProgress {
 if(raw===undefined)return createExpansionProgress();
 const e=raw as ExpansionProgress;
 if(!e||e.version!==1||!Number.isInteger(e.used)||e.used<0||e.used>128||!Number.isInteger(e.levels)||e.levels<0||e.levels>20||e.used>e.levels+2||typeof e.briefingSeen!=='boolean')
  return {version:1,used:2,levels:0,briefingSeen:false}; // Keep the town; never refill malformed free permits.
 return {version:1,used:e.used,levels:e.levels,briefingSeen:e.briefingSeen};
}
