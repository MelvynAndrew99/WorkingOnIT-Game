/** Saved, optional teaching goals use ordinary placement, journeys and emergency dispatch. */
import { connectedHomes, findPath, type City, type Point, type Tool } from './cityModel.ts';
import type { ServiceKind } from './cityIncidents.ts';
import {refreshStarter, starterSnapshot, STARTER_GRANTS, type StarterProgress} from './cityStarterTutorial.ts';
import {
  STALL_SECONDS, WAIVER_BUDGET, MAYOR_OFFER,
  toolPrices, grantAllowance, activateGrant, clearStall, createEconomyProgress,
  type GrantLessonId, type PricedTool,
} from './cityEconomy.ts';

export type TutorialStatus = 'available' | 'active' | 'skipped' | 'complete';
export type TutorialAction = 'start' | 'skip' | 'resume' | 'assist' | 'practice' | 'acknowledge-drivers' | 'acknowledge-safety' | 'accept-waiver';
export interface TutorialProgress {
  hRoad?:StarterProgress;
  version: 1; status: TutorialStatus; completed: string[]; assisted: string[];
  starter?: Point; practice?: Point; observedServices: ServiceKind[]; accidentSeen: boolean; noticedIncident: boolean;
}
export interface TutorialWaiver {
  status: 'waiting' | 'active';
  lessonId: string;
  tools: Tool[];
  remaining: Partial<Record<PricedTool, number>>;
  stallSeconds: number;
  stallLimit: number;
  mayor: string;
}
export interface TutorialSnapshot {
  status: TutorialStatus; currentId: string; title: string; body: string; hint: string; tool?: Tool;
  completed: number; total: number; canPractice: boolean; canAssist: boolean; canAcknowledgeSafety: boolean; focus?: Point;
  lessons: {id: string; title: string; body: string; hint: string; done: boolean}[];
  prices: Record<PricedTool, number>;
  waived?: { tool: Tool; tools: Tool[]; reason: string };
  waiver: TutorialWaiver | null;
}
export interface TutorialActionResult { message: string; focus?: Point; pause?: boolean }
const LESSONS: {id:GrantLessonId;title:string;body:string;hint:string;tool?:Tool}[] = [
  {id:'first-visit',title:'Your first customer',body:'Build a home and a store. Join their entrance arrows with roads and watch a shopping visit finish.',hint:'Join the entrance arrows with roads. A finished shopping visit pays for the next building.',tool:'road'},
  {id:'park-visit',title:'Give them somewhere to go',body:'Connect a park and watch a leisure visit finish. Parked visitors free road space, then rejoin traffic when they leave.',hint:'Stores have 4 visitor slots and parks have 8, counting inbound reservations. More destinations help serve unmet demand.',tool:'park'},
  {id:'driver-rules',title:'Meet your drivers',body:'Each household chooses reachable shopping and leisure destinations with room. Cars queue, respect controls, return home, and look for another route around blocked roads.',hint:'Responding police, ambulances and fire engines can cross red lights when clear and pass queues using available opposing lanes. Returning crews follow ordinary road rules.'},
  {id:'junction-control',title:'Give the crossing a rule',body:'Place a stop sign or traffic light at a junction. Watch who gets a turn; tap a light again to change its timing.',hint:'Unsigned crossings favour east-west traffic. Stops and lights prevent failed-yield collisions at their crossing. Stops cost $25; Lights cost $75. Changing light timing is free.',tool:'stop'},
  {id:'accident-response',title:'When drivers fail to yield',body:'An unsigned crossing can accumulate conflict warnings and cause a real crash. Observe an incident in your town, or keep your controlled crossing safe.',hint:'You do not need to cause a crash. If your crossing has a Stop or Light and no incidents are active, acknowledge the safety explanation.'},
  {id:'rescue',title:'Make room for the crews',body:'Watch police clear a crash, an ambulance reach an injured driver, and firefighters handle a vehicle fire. All required crews must finish before a wreck clears.',hint:'Build connected Police, Clinic and Fire stations. Serious crashes have a rescue deadline. You can keep a controlled crossing safe and acknowledge how crews respond without causing an accident.',tool:'hospital'},
  {id:'detour',title:'Keep a way around',body:'Give drivers an alternate road around a blocked crossing. A detour keeps traffic moving, but does not rescue people or clear a wreck.',hint:'Build an alternate road around the blocked crossing. A detour keeps traffic moving, but does not rescue people or clear a wreck.',tool:'road'},
];
export const createTutorialProgress = (active = false): TutorialProgress => ({version:1,status:active?'active':'available',completed:[],assisted:[],observedServices:[],accidentSeen:false,noticedIncident:false});
const validIds=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=128&&v.every(x=>typeof x==='string'&&/^[a-z0-9-]{1,64}$/.test(x))&&new Set(v).size===v.length;
export function parseTutorialProgress(raw:unknown, city:City):TutorialProgress {
  if(!raw||typeof raw!=='object')return createTutorialProgress();
  const p=raw as TutorialProgress;
  const point=(v:Point|undefined)=>v===undefined||(v&&Number.isSafeInteger(v.x)&&Number.isSafeInteger(v.y)&&v.x>=city.map.x&&v.y>=city.map.y&&v.x<city.map.x+city.map.width&&v.y<city.map.y+city.map.height);
  if(p.version!==1||!['available','active','skipped','complete'].includes(p.status)||!validIds(p.completed)||!validIds(p.assisted)||typeof p.accidentSeen!=='boolean'||typeof p.noticedIncident!=='boolean'||!Array.isArray(p.observedServices)||p.observedServices.length>3||!p.observedServices.every(s=>['police','ems','fire'].includes(s))||new Set(p.observedServices).size!==p.observedServices.length||!point(p.starter)||!point(p.practice))return createTutorialProgress();
  const h=p.hRoad;
  const hRoad=h&&Number.isInteger(h.stage)&&h.stage>=0&&h.stage<=(h.expansionLesson===true?10:9)
    ? {stage:h.stage,...(h.expansionLesson===true||p.status==='active'?{expansionLesson:true}:{}),...(Number.isSafeInteger(h.incidentId)&&h.incidentId!>0?{incidentId:h.incidentId}:{}),...(h.rescueClockStarted===true?{rescueClockStarted:true}:{}),...(h.managerBriefed===true?{managerBriefed:true}:{})}:undefined;
  return {version:1,status:p.status,completed:[...p.completed],assisted:[...p.assisted],observedServices:[...p.observedServices],accidentSeen:p.accidentSeen,noticedIncident:p.noticedIncident,...(hRoad?{hRoad}:{}),...(p.starter?{starter:{...p.starter}}:{}),...(p.practice?{practice:{...p.practice}}:{})};
}
const progress=(city:City)=>city.tutorial??=createTutorialProgress();
const current=(p:TutorialProgress)=>LESSONS.find(l=>!p.completed.includes(l.id));
const at=(o:Point,x:number,y:number)=>({x:o.x+x,y:o.y+y});

/** A bypass joins opposite approaches while the relevant crossing itself is unavailable. */
function hasDetour(city:City, p:TutorialProgress):boolean {
  if(!p.accidentSeen&&!p.completed.includes('accident-response'))return false;
  const crossings:Point[]=p.accidentSeen ? [...city.incidents] : [...city.controls];
  if(p.practice)crossings.push(at(p.practice,8,6));
  return crossings.some(i=>{
    const blocked={...city,closures:[...city.closures,{x:i.x,y:i.y}]};
    return !!findPath(blocked,{x:i.x-1,y:i.y},{x:i.x+1,y:i.y})
      || !!findPath(blocked,{x:i.x,y:i.y-1},{x:i.x,y:i.y+1});
  });
}

/** Safety is an explicit learning alternative, never a fabricated rescue. */
function safeCrossing(city:City,p:TutorialProgress):Point|undefined {
  const lesson=current(p)?.id;
  if((lesson!=='accident-response'&&lesson!=='rescue')||city.incidents.some(i=>i.status==='active'))return undefined;
  return city.controls[0];
}

function progressMark(city:City, lessonId:GrantLessonId):number {
  const p=progress(city);
  const homes=city.buildings.filter(b=>b.kind==='home').length;
  const stores=city.buildings.filter(b=>b.kind==='store').length;
  const parks=city.buildings.filter(b=>b.kind==='park').length;
  const stations=city.buildings.filter(b=>b.kind==='hospital'||b.kind==='fireStation'||b.kind==='policeStation').length;
  switch(lessonId){
    case 'first-visit': return homes + stores*3 + connectedHomes(city)*5 + (city.missions?.shoppers.length??0)*10;
    case 'park-visit': return parks*5 + (city.missions?.parkVisitors.length??0)*10;
    case 'driver-rules': return p.completed.includes('driver-rules')?1:0;
    case 'junction-control': return city.controls.length;
    case 'accident-response': return (p.accidentSeen?10:0) + city.incidents.length;
    case 'rescue': return stations*4 + p.observedServices.length*5
      + (city.incidents.some(i=>i.severity==='fire'&&i.status==='cleared'&&i.outcome==='rescued')?20:0);
    case 'detour': return city.roads.length + (hasDetour(city,p)?100:0);
  }
}

function relevantTool(lessonId:GrantLessonId, tool:Tool):boolean {
  if(lessonId==='park-visit'&&tool==='home')return false;
  if(lessonId==='junction-control') return tool==='stop'||tool==='signal';
  return Object.hasOwn(WAIVER_BUDGET[lessonId], tool);
}

function syncStall(city:City, lessonId:GrantLessonId):void {
  const economy=city.economy??=createEconomyProgress();
  const mark=progressMark(city, lessonId);
  if(economy.stallLesson!==lessonId){
    economy.stallLesson=lessonId;
    economy.stallAt=city.elapsed;
    economy.stallMark=mark;
    if(economy.allowanceLesson !== lessonId) {
      delete economy.allowance;
      delete economy.allowanceLesson;
    }
    return;
  }
  if(mark>(economy.stallMark??0)){
    economy.stallMark=mark;
    economy.stallAt=city.elapsed;
  }
}

function maybeActivateGrant(city:City, lessonId:GrantLessonId):void {
  const economy=city.economy??=createEconomyProgress();
  const budget=WAIVER_BUDGET[lessonId];
  if(!budget||Object.keys(budget).length===0) return;
  if(economy.waived.includes(lessonId)||progress(city).assisted.includes(lessonId)) return;
  const waited=city.elapsed-(economy.stallAt??city.elapsed);
  if(waited>=STALL_SECONDS-1e-9) activateGrant(city, lessonId);
}

export function noteTutorialConstruction(city:City, tool:Tool):void {
  const p=city.tutorial;
  if(p?.status!=='active') return;
  if(p.hRoad){refreshStarter(city);const id=STARTER_GRANTS[p.hRoad.stage];syncStall(city,id);if(city.economy)city.economy.stallAt=city.elapsed;return;}
  const lesson=current(p);
  if(!lesson||!relevantTool(lesson.id, tool)) return;
  syncStall(city, lesson.id);
  // A valid connecting road is progress even before it completes a full route.
  if(city.economy) city.economy.stallAt=city.elapsed;
}

function freeTools(city:City):Tool[] {
  const prices=toolPrices(city);
  return (Object.keys(prices) as PricedTool[]).filter(tool=>prices[tool]===0);
}

function waiverSnapshot(city:City, p:TutorialProgress):TutorialWaiver|null {
  if(p.status!=='active') return null;
  const lesson=p.hRoad?LESSONS.find(l=>l.id===STARTER_GRANTS[p.hRoad!.stage]):current(p);
  if(!lesson) return null;
  const budget={...WAIVER_BUDGET[lesson.id]};
  if(lesson.id==='rescue'&&p.hRoad){delete budget.policeStation;delete budget.fireStation;}
  if(lesson.id==='park-visit'&&!p.hRoad)delete budget.home;
  if(!budget||Object.keys(budget).length===0) return null;
  const economy=city.economy??=createEconomyProgress();
  const active=economy.waived.includes(lesson.id)&&economy.allowanceLesson===lesson.id;
  const remaining=active?(grantAllowance(city)??{}):budget;
  const tools=freeTools(city);
  return {
    status: active?'active':'waiting',
    lessonId: lesson.id,
    tools: active?tools:(Object.keys(budget) as Tool[]),
    remaining: {...remaining},
    stallSeconds: Math.max(0, city.elapsed-(economy.stallAt??city.elapsed)),
    stallLimit: STALL_SECONDS,
    mayor: lesson.id==='rescue'&&p.hRoad?'The Clinic and access roads are on the mayor. Choose a connected lot so EMS can reach the injured driver.':MAYOR_OFFER[lesson.id],
  };
}

/** Observations are monotonic; pausing, hiding or skipping never destroys the town. */
export function refreshTutorial(city:City):boolean {
  const p=progress(city);if(p.status!=='active')return false;
  const notify=!p.noticedIncident&&city.incidents.some(i=>i.status==='active');
  if(notify)p.noticedIncident=true;
  if(p.hRoad){
    refreshStarter(city);
    if(p.status==='active'){const id=STARTER_GRANTS[p.hRoad.stage];syncStall(city,id);maybeActivateGrant(city,id);}
    else {clearStall(city);if(city.economy)delete city.economy.allowance;}
    return notify;
  }
  const done=(id:string,condition:boolean)=>{if(condition&&!p.completed.includes(id))p.completed.push(id);};
  if(!p.completed.includes('first-visit'))done('first-visit',!!city.missions?.shoppers.length&&connectedHomes(city)>0);
  done('park-visit',!!city.missions?.parkVisitors.length);
  done('junction-control',city.controls.length>0);
  p.accidentSeen ||= city.incidents.length>0;
  done('accident-response',p.accidentSeen);
  for(const incident of city.incidents)for(const service of incident.completedServices)if(!p.observedServices.includes(service))p.observedServices.push(service);
  done('detour', hasDetour(city,p));
  done('rescue',p.observedServices.length===3&&city.incidents.some(i=>i.severity==='fire'&&i.status==='cleared'&&i.outcome==='rescued'));
  if(!current(p))p.status='complete';
  const lesson=current(p);
  if(lesson){
    syncStall(city, lesson.id);
    maybeActivateGrant(city, lesson.id);
  } else if(city.economy){
    delete city.economy.allowance;
    clearStall(city);
  }
  return notify;
}
export function tutorialSnapshot(city:City):TutorialSnapshot {
  const p=city.tutorial??createTutorialProgress();const lesson=current(p);
  const prices=toolPrices(city);
  const waiver=waiverSnapshot(city,p);
  const currentlyFree=freeTools(city);
  const waived=waiver?.status==='active'&&currentlyFree.length>0?{
    tool:(currentlyFree.includes(lesson?.tool as Tool)?lesson!.tool:currentlyFree[0])??'road',
    tools:currentlyFree,
    reason:waiver.mayor,
  }:undefined;
  const h=starterSnapshot(city);
  if(h)return {status:p.status,currentId:h.id,title:h.title,body:h.body,hint:h.hint,tool:h.tool,focus:h.focus,completed:h.stage-(h.stage>=6?1:0),total:p.hRoad?.expansionLesson?9:8,canPractice:false,canAcknowledgeSafety:false,canAssist:false,lessons:[],prices,waived,waiver};
  return {
    status:p.status,currentId:lesson?.id??'complete',title:lesson?.title??'Ready for a growing town',
    body:lesson?.body??'You have worked through trips, parking, controls, detours and emergency response.',
    hint:lesson?.hint??'Keep experimenting. Your town and every tool stay available.',
    tool:lesson?.tool,completed:LESSONS.filter(l=>p.completed.includes(l.id)).length,total:LESSONS.length,
    canPractice:false,canAcknowledgeSafety:!!safeCrossing(city,p),
    canAssist:false,focus:safeCrossing(city,p)??(p.practice?at(p.practice,8,6):p.starter?at(p.starter,6,4):undefined),
    lessons:LESSONS.map(l=>({id:l.id,title:l.title,body:l.body,hint:l.hint,done:p.completed.includes(l.id)})),
    prices,waived,waiver,
  };
}
export function tutorialAction(city:City,action:TutorialAction):TutorialActionResult {
  // Retain the command for stale clients, but never mutate or stamp their town.
  if(action==='practice')return {message:'Practice placement has been retired. Keep building your own town.'};
  const p=progress(city);
  if(action==='skip'){
    p.status='skipped';
    clearStall(city);
    if(city.economy) delete city.economy.allowance;
    return {message:'Tutorial skipped. Your town is preserved and all tools remain available.'};
  }
  if(action==='start'||action==='resume'){
    const wasActive=p.status==='active';
    p.status='active';
    if(!wasActive) clearStall(city);
    refreshTutorial(city);
    return {message:'Build your own solution. If you stay stuck, the mayor may waive that lesson\'s construction costs.'};
  }
  if(p.status!=='active')return {message:'Start or resume the tutorial first.'};
  if(action==='acknowledge-drivers'){if(!p.completed.includes('driver-rules'))p.completed.push('driver-rules');refreshTutorial(city);return {message:'Drivers make their own route and destination choices. Watch their queues and visits to see the result.'};}
  if(action==='acknowledge-safety'){
    if(!tutorialSnapshot(city).canAcknowledgeSafety)return {message:'At the safety lesson, clear active incidents and protect a crossing with a Stop or Light first.'};
    for(const id of ['accident-response','rescue'])if(!p.completed.includes(id))p.completed.push(id);
    refreshTutorial(city);return {message:'Keep your safe crossing. Police clear wrecks, EMS rescues injured drivers before the deadline, and fire crews handle burning vehicles. Each needs a real route from its station. A detour alone is not rescue.'};
  }
  if(action==='assist'||action==='accept-waiver'){
    refreshTutorial(city);
    const grant=tutorialSnapshot(city).waiver;
    if(grant?.status==='active')return {message:'The mayor already waived those construction costs. Place the buildings yourself.'};
    return {message:'Keep building. The mayor steps in if you stay stuck on this objective.'};
  }
  return {message:'Keep building. The mayor steps in if you stay stuck on this objective.'};
}
