/** New-town teaching scenario. Geometry and saved progression are independent of artwork. */
import {entrance, footprint, findPath, type City, type Tool, type Point} from './cityModel.ts';
import type {GrantLessonId} from './cityEconomy.ts';
import {stageTutorialIncident, incidentServices} from './cityIncidents.ts';

export interface StarterProgress { stage:number; incidentId?:number; rescueClockStarted?:boolean; managerBriefed?:boolean; expansionLesson?:boolean; }
export const STARTER_GRANTS:GrantLessonId[]=['first-visit','first-visit','first-visit','park-visit','accident-response','detour','detour','rescue','junction-control','driver-rules','driver-rules'];
export function initializeStarter(city:City):void {
 city.map={x:0,y:0,width:24,height:20};
 city.tutorial!.hRoad={stage:0,expansionLesson:true};
 for(let x=2;x<=20;x++)for(const y of [4,10])city.roads.push({x,y});
 for(let y=5;y<10;y++)city.roads.push({x:10,y});
 city.roadPaid=Object.fromEntries(city.roads.map(p=>[`${p.x},${p.y}`,0]));
}
export function starterToolAllowed(city:City,tool:Tool):boolean {
 const h=city.tutorial?.hRoad;
 if(!h||city.tutorial?.status!=='active'||h.stage>=9)return true;
 if(tool==='bulldoze')return h.stage>=2;
 if(tool==='road')return h.stage>=5;
 if(tool==='closure')return h.stage>=5;
 if(tool==='stop'||tool==='signal')return h.stage>=8;
 if(['hospital','policeStation','fireStation'].includes(tool))return h.stage>=5;
 if(tool==='home')return h.stage===0||h.stage>=2;
 if(tool==='store')return h.stage>=1;
 return tool==='park'&&h.stage>=2;
}
/** Constrain the teaching regions, not artwork or a single prescribed tile. */
export function starterPlacementError(city:City,tool:Tool,x:number,y:number,rotation:number):string|undefined {
 const h=city.tutorial?.hRoad;if(!h||city.tutorial?.status!=='active')return;
 if(!starterToolAllowed(city,tool))return 'That tool unlocks in a later tutorial step. Follow the current objective, or Skip tutorial to unlock everything.';
 if(tool==='bulldoze'&&h.stage<5&&!city.buildings.some(b=>footprint(b).some(p=>p.x===x&&p.y===y)))return 'Keep the starter roads until the bypass lesson. You can remove and reposition buildings.';
 if(h.stage>=2||!['home','store','park'].includes(tool))return;
 const e=entrance({id:0,kind:tool as 'home'|'store'|'park',x,y,rotation});
 const homes=city.buildings.filter(b=>b.kind==='home').length;
 const valid=tool==='home'?e.y===(homes===0?4:10)&&e.x>=2&&e.x<=8
  :tool==='store'?e.y===10&&e.x>=12&&e.x<=20:e.y===4&&e.x>=12&&e.x<=20;
 if(!valid)return tool==='home'?(homes===0?'Place the Home beside the upper-left road, with its entrance on the road.':'Place the extra Homes beside the lower-left road, with entrances on the road.')
  :tool==='store'?'Place the Store beside the lower-right road, with its entrance on the road.':'Place the Park beside the upper-right road, with its entrance on the road.';
}
export function refreshStarter(city:City):void {
 const h=city.tutorial?.hRoad;if(!h||city.tutorial?.status!=='active')return;
 const count=(kind:string)=>city.buildings.filter(b=>b.kind===kind).length;
 if(h.stage===0&&count('home'))h.stage=1;
 if(h.stage===1&&count('store'))h.stage=2;
 if(h.stage===2&&city.missions?.shoppers.length)h.stage=3;
 if(h.stage===3&&count('home')>=3&&count('park')&&city.missions?.parkVisitors.length)h.stage=4;
 // User-approved scripted impaired-driver incident; ordinary driving rules stay unchanged.
 if(h.stage===4)stageTutorialIncident(city,{x:10,y:10});
 const incident=city.incidents.find(i=>i.id===h.incidentId)??city.incidents.find(i=>i.status==='active');
 if(h.stage===4&&incident){h.incidentId=incident.id;h.stage=5;}
 if(h.stage===5&&incident){
  const homes=city.buildings.filter(b=>b.kind==='home'),shop=city.buildings.find(b=>b.kind==='store');
  if(shop&&homes.length&&homes.every(home=>findPath(city,entrance(home),entrance(shop))&&findPath(city,entrance(shop),entrance(home))))h.stage=6;
 }
 // Stage 6 remains a save-compatible alias; diversion is optional.
 if(h.stage===6)h.stage=7;
 if(h.stage===7&&incident?.status==='cleared'&&incidentServices(incident).every(k=>incident.completedServices.includes(k)))h.stage=8;
 if(h.stage===8&&city.controls.some(c=>c.x===10&&c.y===10))h.stage=9;
 if(h.expansionLesson&&h.stage===9&&(city.expansion?.used??0)>=2)h.stage=10;
 if(h.stage===(h.expansionLesson?10:9)){city.tutorial!.status='complete';}
}
export function starterSnapshot(city:City):null|{stage:number;id:string;title:string;body:string;hint:string;tool?:Tool;focus?:Point} {
 const h=city.tutorial?.hRoad;if(!h)return null;
 const homes=city.buildings.filter(b=>b.kind==='home').length;
 const park=city.buildings.some(b=>b.kind==='park');
 const missing:Tool|undefined=city.buildings.some(b=>b.kind==='hospital')?undefined:'hospital';
 const steps:{id:string;title:string;body:string;hint:string;tool?:Tool;focus?:Point}[]=[
  {id:'h-home',title:'Use what we have',body:'Place a Home on the upper-left road. The H roads are already built.',hint:'The yellow outline suggests a lot. Keep the entrance on the road. Roads unlock after the traffic problem.',tool:'home',focus:{x:3,y:2}},
  {id:'h-store',title:'Open for business',body:'Place a Store on the lower-right road. Let our existing roads do the work.',hint:'Place beside the road, with the entrance arrow touching it.',tool:'store',focus:{x:13,y:8}},
  {id:'h-trip',title:'Our first customer',body:'Run traffic and watch a driver reach the Store. Completed shopping earns money.',hint:'Road construction is still locked. Watch the customer use the middle connection.'},
  {id:'h-growth',title:'More neighbours. More visitors!',body:homes<3?`Add ${3-homes} more Home${homes===2?'':'s'} wherever you want. Keep their entrances connected.`:!park?'Choose a place for a Park. More reasons to visit!':'Run traffic. Watch a park visit finish and more drivers share the crossing.',hint:'Choose your own layout. Use the existing roads for access until road building unlocks. Remove refunds what you paid if you want to reposition a building.',tool:homes<3?'home':!park?'park':undefined},
  {id:'h-crash',title:'Watch the busy crossing',body:'Run traffic. An impaired-driver crash will introduce the emergency lesson on this road.',hint:'This is a scripted tutorial event, not a failure of your road design. The wreck and emergency response use the real simulation.',focus:{x:10,y:10}},
  {id:'h-bypass',title:'We need more roads!',body:'Crash! Join both ends of the H into two loops. Reconnect every Home to the Store and back.',hint:'Yellow tiles suggest left and right bypasses. Other routes work too: reconnect every Home. Show Divert highlights an optional closure before the crash.',tool:'road',focus:{x:11,y:7}},
  {id:'h-diversion',title:'Send them the other way',body:'Divert is optional. Continue with emergency services.',hint:'Try the centre road just before the wreck. Closures divert ordinary traffic; responding crews can pass them.',tool:'closure',focus:{x:10,y:9}},
  {id:'h-services',title:'Now get the crews in',body:missing?'Services unlocked! Build a Clinic with its entrance connected to the road.':'Run traffic and watch EMS reach the injured driver and clear the scene.',hint:h.rescueClockStarted?'The rescue clock is running. Keep an approach open for EMS.':'The training rescue clock is held until the Clinic has a road entrance. You place it; EMS must reach the crash to clear it.',tool:missing},
  {id:'h-control',title:'Make the improvement last',body:'Stops and Lights unlocked! Protect the central junction against ordinary crossing conflicts.',hint:'Keep the bypass if it helps. Controls prevent ordinary crossing conflicts; the scripted impaired-driver incident was a separate cause.',tool:'stop',focus:{x:10,y:10}},
  {id:'h-connect',title:'Ready for a bigger town',body:'Tutorial complete. Keep your town and choose an outside-city connection when you are ready.',hint:'Choose Finish tutorial on your current task when you are ready for outside visitors. Confirming adds a free access road if needed.'},
 ];
 if(h.expansionLesson)steps.splice(9,0,{id:'h-expand',title:'More land. More roads!',body:`Open Add land and expand twice. ${Math.min(2,city.expansion?.used??0)}/2 free expansions used.`,hint:'“More land means more roads—and it is free! I should make announcements more often.” Choose any map edge. Your town stays exactly where you built it.'});
 return {stage:h.stage,...steps[h.stage]};
}

/** Advice waits for unresolved trouble and stops interrupting active construction. */
export function starterManagerReady(city:City):boolean {
 const h=city.tutorial?.hRoad;
 const incident=city.incidents.find(i=>i.id===h?.incidentId&&i.status==='active');
 return city.tutorial?.status==='active'&&h?.stage===5&&!h.managerBriefed&&!!incident
  &&city.elapsed-Math.max(incident.createdAt,city.economy?.stallAt??incident.createdAt)>=30;
}
/** A suggestion, never a prescribed route or automatic construction. */
export function starterBypassTiles(city:City):Point[] {
 const h=city.tutorial?.hRoad;
 if(city.tutorial?.status!=='active'||!h||h.stage<5||h.stage>7||!city.incidents.some(i=>i.id===h.incidentId&&i.status==='active'))return [];
 const result:Point[]=[];
 for(const [end,candidates] of [[2,[2,1,0]],[20,[20,21,22,23]]] as const){
  for(const x of candidates){
   const strip:Point[]=Array.from({length:7},(_,i)=>({x,y:i+4}));
   for(let bridge=Math.min(x,end);bridge<=Math.max(x,end);bridge++)for(const y of [4,10])strip.push({x:bridge,y});
   if(strip.some(p=>p.x<city.map.x||p.x>=city.map.x+city.map.width||p.y<city.map.y||p.y>=city.map.y+city.map.height||city.buildings.some(b=>footprint(b).some(q=>q.x===p.x&&q.y===p.y))))continue;
   result.push(...strip.filter(p=>!city.roads.some(q=>q.x===p.x&&q.y===p.y)));break;
  }
 }
 return result.filter((p,i)=>result.findIndex(q=>q.x===p.x&&q.y===p.y)===i);
}
/** Optional closure on the approach, never on the wreck or a building entrance. */
export function starterDiversionPoint(city:City):Point|null {
 const h=city.tutorial?.hRoad;
 if(city.tutorial?.status!=='active'||!h||h.stage<5||h.stage>7||!city.incidents.some(i=>i.id===h.incidentId&&i.status==='active'))return null;
 const p={x:10,y:9};
 return city.roads.some(q=>q.x===p.x&&q.y===p.y)?p:null;
}
