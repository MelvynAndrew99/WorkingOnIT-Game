import {hasSecondEntrance,type ChallengeRun} from './cityChallenges.ts';
import {entrance,findPath,SERVICE_OF,type City} from './cityModel.ts';
import {directionReservedTiles} from './cityTraffic.ts';
import {roadEdgeKey,roadDirectionForStep} from './cityDirections.ts';
import {emergencyDefinition,requiredPlacements,needsRecovery,recoveryStreet} from './fixtures/emergencyTown.ts';
import type {ServiceKind} from './cityIncidents.ts';
const attempts=new WeakMap<City,ChallengeRun>();
export function bindEmergency(run:ChallengeRun){if(run.emergency)attempts.set(run.city,run);return run;}
export function observeEmergencyEdit(city:City){const run=attempts.get(city);if(run)observeEmergency(run);}
export interface EmergencyEvidence {
 scenes:{id:number;x:number;y:number;required:ServiceKind[];dispatched:ServiceKind[];arrived:ServiceKind[];completed:ServiceKind[];cleared:boolean}[];
 placed:number[];
 original:Record<string,'forward'|'reverse'>;
 diverted?:number; converted?:number; restored?:number; reopened?:number; clearedAt?:number; clearedWithConversion?:number;
 detourReturns:number[]; recovered:number[];
 neighborhoodDiverted?:number;neighborhoodCleared?:number;neighborhoodReopened?:number;
}
export function initialEmergency(city:City):EmergencyEvidence {
 return {scenes:city.incidents.map(i=>({id:i.id,x:i.x,y:i.y,required:[...i.required],dispatched:[],arrived:[],completed:[],cleared:false})),placed:[],original:{...city.roadDirections},detourReturns:[],recovered:[]};
}
const streetEdges=()=>recoveryStreet.slice(1).map((p,i)=>roadEdgeKey(recoveryStreet[i],p));
const diverted=(c:City)=>c.closures.some(p=>p.x===14&&p.y===8);
const originalFlow=(c:City,e:EmergencyEvidence)=>streetEdges().every(k=>c.roadDirections?.[k]===e.original[k])&&recoveryStreet.every(p=>c.roads.some(q=>q.x===p.x&&q.y===p.y));
const twoWay=(c:City)=>streetEdges().every(k=>!c.roadDirections?.[k])&&recoveryStreet.every(p=>c.roads.some(q=>q.x===p.x&&q.y===p.y));
const safe=(c:City)=>{const reserved=directionReservedTiles(c);return recoveryStreet.every(p=>!reserved.has(`${p.x},${p.y}`));};
/** Sample actual dispatch, physical work and clearance before history can age out. */
export function observeEmergency(run:ChallengeRun){
 const e=run.emergency;if(!e)return;const c=run.city,now=c.elapsed;
 for(const b of c.buildings)if((b.paid??0)>0&&requiredPlacements(run.id).includes(b.kind)&&!e.placed.includes(b.id))e.placed.push(b.id);
 const temporary=run.id==='temporary-two-way';
 const neighborhood=run.id==='past-the-wreck'&&run.revision===4;
 const neighborhoodClosed=c.closures.some(p=>p.x===8&&p.y===10);
 if(neighborhood&&e.clearedAt===undefined&&e.scenes.some(s=>c.incidents.some(i=>i.id===s.id&&i.status==='active'))){
  if(neighborhoodClosed&&hasSecondEntrance(c))e.neighborhoodDiverted??=now;
  else delete e.neighborhoodDiverted;
 }
 if(temporary){
  if(e.diverted===undefined&&diverted(c)&&originalFlow(c,e))e.diverted=now;
  if(e.diverted!==undefined&&e.converted===undefined&&diverted(c)&&twoWay(c)&&safe(c))e.converted=now;
  // Removing the diversion before restoration invalidates this teaching sequence, but is recoverable.
  if(e.diverted!==undefined&&e.restored===undefined&&!diverted(c)){delete e.diverted;delete e.converted;delete e.clearedWithConversion;}
 }
 for(const scene of e.scenes){
  const incident=c.incidents.find(i=>i.id===scene.id);if(!incident)continue;
  for(const s of scene.required){
   const trips=c.trips.filter(t=>t.incidentId===scene.id&&t.service===s&&!t.responseCancelled);
   if(trips.length&&!scene.dispatched.includes(s))scene.dispatched.push(s);
   if(trips.some(t=>t.phase==='working'||t.sceneParked)&&!scene.arrived.includes(s))scene.arrived.push(s);
   if(incident.completedServices.includes(s)&&scene.arrived.includes(s)&&!scene.completed.includes(s))scene.completed.push(s);
  }
  if(incident.status==='cleared'&&scene.required.every(s=>scene.dispatched.includes(s)&&scene.arrived.includes(s)&&scene.completed.includes(s)))scene.cleared=true;
 }
 if(e.clearedAt===undefined&&e.scenes.every(s=>s.cleared)){
  e.clearedAt=now;
  if(temporary&&e.converted!==undefined&&diverted(c)&&twoWay(c))e.clearedWithConversion=now;
  if(neighborhood&&e.neighborhoodDiverted!==undefined&&neighborhoodClosed&&hasSecondEntrance(c))e.neighborhoodCleared=now;
 }
 if(neighborhood&&e.neighborhoodCleared!==undefined&&!neighborhoodClosed&&hasSecondEntrance(c))e.neighborhoodReopened??=now;
 if(temporary&&e.converted!==undefined&&e.clearedWithConversion!==undefined&&diverted(c)&&originalFlow(c,e)&&safe(c))e.restored??=now;
 if(temporary&&e.restored!==undefined&&!diverted(c)&&originalFlow(c,e))e.reopened??=now;
 for(const h of c.history){const s=h.service;if(s?.purpose!=='shopping')continue;
  if(e.clearedAt===undefined&&!e.detourReturns.includes(s.homeId))e.detourReturns.push(s.homeId);
  const after=neighborhood?e.neighborhoodReopened:temporary?e.reopened:e.clearedAt;
  if(after!==undefined&&(s.startedAt??-1)>=after&&!e.recovered.includes(s.homeId))e.recovered.push(s.homeId);
 }
}
function sceneAccess(c:City,from:{x:number;y:number},scene:{x:number;y:number}){return [{x:scene.x-1,y:scene.y},{x:scene.x+1,y:scene.y},{x:scene.x,y:scene.y-1},{x:scene.x,y:scene.y+1}].some(p=>findPath(c,from,p,true));}
function access(c:City,e:EmergencyEvidence){return e.scenes.every(scene=>scene.required.every(s=>c.buildings.some(b=>SERVICE_OF[b.kind]===s&&sceneAccess(c,entrance(b),scene))));}
export function emergencyStages(run:ChallengeRun){
 const e=run.emergency;if(!e)return [];
 const stages:{label:string;done:boolean}[]=[];
 const names={policeStation:'Police',hospital:'Clinic',fireStation:'Fire'};
 for(const kind of requiredPlacements(run.id))stages.push({label:`Place ${names[kind as keyof typeof names]} with connected access`,done:run.city.buildings.some(b=>b.kind===kind&&e.placed.includes(b.id)&&e.scenes.some(scene=>sceneAccess(run.city,entrance(b),scene)))});
 const neighborhood=run.id==='past-the-wreck'&&run.revision===4;
 if(run.id==='past-the-wreck'&&!neighborhood)stages.push({label:'Shopping return via detour while crash is active',done:e.detourReturns.length>0});
 if(neighborhood)stages.push({label:'Build a usable second entrance; keep the original road',done:hasSecondEntrance(run.city)},{label:'Select Divert → tap the old approach (8,10); let cars clear',done:e.neighborhoodDiverted!==undefined});
 if(run.id==='temporary-two-way')stages.push({label:'Divert (14,8); run traffic to clear occupied space',done:e.diverted!==undefined},{label:'Safely convert (14,8) → (18,8) to two-way with Divert on',done:e.converted!==undefined});
 for(const scene of e.scenes){const total=scene.required.length;stages.push(
  {label:`Scene (${scene.x},${scene.y}): crews dispatched ${scene.dispatched.length}/${total}`,done:scene.dispatched.length===total},
  {label:`Scene (${scene.x},${scene.y}): crews arrived ${scene.arrived.length}/${total}`,done:scene.arrived.length===total},
  {label:`Scene (${scene.x},${scene.y}): finish clearance${run.id==='temporary-two-way'?` with Divert on and two-way access${scene.cleared&&e.clearedWithConversion===undefined?' — Reset: cleared out of sequence':''}`:''}`,done:scene.cleared&&(run.id!=='temporary-two-way'||e.clearedWithConversion!==undefined)});}
 if(run.id==='temporary-two-way')stages.push({label:'After clearance, safely restore original eastbound arrows',done:e.restored!==undefined&&originalFlow(run.city,e)},{label:'Remove Divert after restoring arrows',done:e.reopened!==undefined&&!diverted(run.city)});
 if(neighborhood)stages.push({label:e.clearedAt!==undefined&&e.neighborhoodCleared===undefined?'Reset: rescue finished before the second entrance and Divert were ready':'Clear the crash with Divert on and the second entrance usable',done:e.neighborhoodCleared!==undefined},{label:'After clearance, tap Divert at (8,10) again to reopen',done:e.neighborhoodReopened!==undefined&&!run.city.closures.some(p=>p.x===8&&p.y===10)});
 if(needsRecovery(run.id)||neighborhood)stages.push({label:`New shopping returns after recovery: ${e.recovered.length}/4`,done:e.recovered.length===4},{label:'Keep legal service access available',done:access(run.city,e)});
 return stages;
}
/** Reject malformed receipts; never reinterpret an old bus attempt as a rescue attempt. */
export function parseEmergency(raw:unknown,city:City,id:string,revision=3):EmergencyEvidence|null {
 if(!emergencyDefinition(id)||!raw||typeof raw!=='object')return null;
 const e=raw as EmergencyEvidence;
 const neighborhood=id==='past-the-wreck'&&revision===4;
 const ids=(a:unknown)=>Array.isArray(a)&&a.length<=100&&new Set(a).size===a.length&&a.every(n=>Number.isSafeInteger(n)&&n>0&&n<city.nextId);
 const services=(a:unknown,required:ServiceKind[])=>Array.isArray(a)&&a.length<=3&&new Set(a).size===a.length&&a.every(s=>required.includes(s));
 if(!Array.isArray(e.scenes)||e.scenes.length!==(['district-recovery','what-a-jam'].includes(id)?2:1)||!ids(e.placed)||!ids(e.detourReturns)||!ids(e.recovered))return null;
 const homes=city.buildings.filter(b=>b.kind==='home').map(b=>b.id);
 if([...e.detourReturns,...e.recovered].some(n=>!homes.includes(n)))return null;
 for(const [index,s] of e.scenes.entries()){
  if(!s||typeof s!=='object')return null;
  const incident=city.incidents.find(i=>i.id===s.id);
  if(!incident||s.x!==(index?22:13)||s.y!==(neighborhood?5:index?11:8)||incident.x!==s.x||incident.y!==s.y||JSON.stringify(s.required)!==JSON.stringify(incident.required)||!services(s.dispatched,s.required)||!services(s.arrived,s.dispatched)||!services(s.completed,s.arrived)||s.completed.some(k=>!incident.completedServices.includes(k))||typeof s.cleared!=='boolean'||s.cleared&&(incident.status!=='cleared'||s.completed.length!==s.required.length))return null;
 }
 if(!e.original||typeof e.original!=='object')return null;
 const expected=['temporary-two-way','another-approach','what-a-jam'].includes(id)?Object.fromEntries(recoveryStreet.slice(1).map((p,i)=>[roadEdgeKey(recoveryStreet[i],p),roadDirectionForStep(recoveryStreet[i],p)])):{};
 if(JSON.stringify(Object.entries(e.original).sort())!==JSON.stringify(Object.entries(expected).sort()))return null;
 for(const k of ['diverted','converted','restored','reopened','clearedAt','clearedWithConversion'] as const)if(e[k]!==undefined&&(!Number.isFinite(e[k])||e[k]!<0||e[k]!>city.elapsed))return null;
 for(const k of ['neighborhoodDiverted','neighborhoodCleared','neighborhoodReopened'] as const)if(e[k]!==undefined&&(!neighborhood||!Number.isFinite(e[k])||e[k]!<0||e[k]!>city.elapsed))return null;
 if(e.neighborhoodCleared!==undefined&&(e.neighborhoodDiverted===undefined||e.neighborhoodCleared!==e.clearedAt||e.neighborhoodCleared<e.neighborhoodDiverted)||e.neighborhoodReopened!==undefined&&(e.neighborhoodCleared===undefined||e.neighborhoodReopened<e.neighborhoodCleared)||neighborhood&&e.recovered.length&&e.neighborhoodReopened===undefined)return null;
 if(e.clearedWithConversion!==undefined&&(e.converted===undefined||e.clearedWithConversion!==e.clearedAt||e.clearedWithConversion<e.converted))return null;
 if(e.restored!==undefined&&e.clearedWithConversion===undefined)return null;
 if(e.converted!==undefined&&(e.diverted===undefined||e.converted<e.diverted)||e.restored!==undefined&&(e.converted===undefined||e.clearedAt===undefined||e.restored<Math.max(e.converted,e.clearedAt))||e.reopened!==undefined&&(e.restored===undefined||e.reopened<e.restored)||e.clearedAt!==undefined&&!e.scenes.every(s=>s.cleared)||e.recovered.length&&(e.clearedAt===undefined||id==='temporary-two-way'&&e.reopened===undefined))return null;
 return structuredClone(e);
}
