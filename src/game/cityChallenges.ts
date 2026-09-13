import {initialEmergency,observeEmergency,bindEmergency,observeEmergencyEdit,emergencyStages,parseEmergency,type EmergencyEvidence} from './cityEmergencyChallenges.ts';
import {emergencyDefinition} from './fixtures/emergencyTown.ts';
import {CAMPAIGN_LEVELS, campaignDefinition, campaignTown, type CampaignId} from './fixtures/campaignTown.ts';
import {applyRoadDirections, type DirectionEditMode} from './cityDirectionEdits.ts';
import {roadEdgeKey,roadDirectionForStep} from './cityDirections.ts';
import {roundaboutIndex} from './cityRoundabouts.ts';
import {wideRoadFootprint} from './cityWideRoads.ts';
import {originalEntrance} from './fixtures/neighborhoodTown.ts';
import type {Point} from './cityModel.ts';
/** Focused lessons use the sandbox model; they never own or mutate its saved town. */
import {createCity, entrance, findPath, footprint, parseCity, place, stepCity, type City, type Tool} from './cityModel.ts';
import {flowSnapshot} from './cityFlow.ts';
import {flowTown} from './fixtures/flowTown.ts';

export const FLOW_CHALLENGE = {
  id: 'shopping-flow', title: 'Room to move',
  goal: 'Help all 9 households shop and get home twice in the latest minute of traffic. Keep that service steady for 15 seconds.',
  lesson: 'Learn to spot a busy approach and improve how a neighborhood is served.',
  rules: 'Keep all 9 homes. Change roads, junction controls or shops. No outside traffic or land expansion. Pause to plan; there is no failure countdown.',
};
export const CHALLENGE_TOOLS: Tool[] = ['road','stop','signal','store','closure','bulldoze','policeStation','hospital','fireStation'];
const CHALLENGE_DEFINITIONS = [
  {id:'first-road',title:'The first road',goal:'Build the missing road. Get the car to the store.',lesson:'Join the entrance arrows with a continuous road.',rules:'Build between the entrance arrows, then Run traffic. Win as soon as the car arrives at the store.',homes:1,budget:140},
  {id:'neighborhood-roads',title:'Roads for the neighborhood',goal:'Get all 3 households to the store and home within 45 seconds.',lesson:'Build a shared road that serves every entrance.',rules:'Connect the scattered homes. The 45-second trip test starts when you Run traffic; pause stops the clock. All three must return home.',homes:3,budget:600},
  {id:'safe-crossing',title:'Share the crossing',goal:'Reconnect the junction. Get every household to the shops and home without an accident.',lesson:'Manage the meeting point of two busy approaches.',rules:'Repair the missing roads and manage the junction with Stops or Lights, or find a safe alternative. Every household must return; any accident ends this attempt.',homes:10,budget:180},
  {...FLOW_CHALLENGE,homes:9,budget:1200},
  ...CAMPAIGN_LEVELS,
] as const;
// Numbers are presentation order; save/award identity stays attached to each stable ID.
export const CHALLENGE_ORDER = ['first-road','neighborhood-roads','shared-streets','stop-and-share','safe-crossing','green-for-the-queue','shopping-flow','one-way-home','around-the-island','apartment-avenue','keep-another-way','shops-and-strolls','first-bus-service','another-front-door','a-town-that-works','call-the-police','clinic-access','fire-access','past-the-wreck','another-approach','temporary-two-way','paired-response','fire-and-flow','district-recovery','what-a-jam'] as const;
export const CHALLENGES=CHALLENGE_ORDER.map(id=>CHALLENGE_DEFINITIONS.find(d=>d.id===id)!);
export type ChallengeId = typeof CHALLENGES[number]['id'];
export const challengeDefinition=(id:ChallengeId)=>CHALLENGES.find(c=>c.id===id)!;
export const challengePrerequisite=(id:ChallengeId)=>CHALLENGES[CHALLENGES.findIndex(d=>d.id===id)-1];
export function challengeUnlockedBy(id:ChallengeId,hasAward:(id:ChallengeId)=>boolean){
 const index=CHALLENGES.findIndex(d=>d.id===id);
 return index===0||index>0&&hasAward(CHALLENGES[index-1].id);
}
export const challengeAvailable=(id:ChallengeId)=>!('staged' in challengeDefinition(id));
export const nextChallenge=(id:ChallengeId)=>CHALLENGES.slice(CHALLENGES.findIndex(d=>d.id===id)+1).find(d=>challengeAvailable(d.id));
export const challengeTools=(id:ChallengeId):Tool[]=>campaignDefinition(id)?[...campaignDefinition(id)!.tools]:id==='shopping-flow'?CHALLENGE_TOOLS:id==='safe-crossing'?['road','stop','signal','bulldoze']:['road','bulldoze'];
export interface ChallengeRun {id:ChallengeId;revision?:number;emergency?:EmergencyEvidence;routeServed?:number[];shoppingIncome?:number;startedAt?:number;serviceSince?:number;finishedAt?:number;failed?:'time'|'accident';served?:number[];leisureServed?:number[];busServed?:number[];city: City; earned: boolean; readySince?: number; accumulator: number; checkedAt: number;}
export const challengeHasIncome=(id:ChallengeId)=>id==='keep-another-way';
export const jamRewardEarned=(run:ChallengeRun)=>run.id==='what-a-jam'&&run.earned;
export function createChallenge(id:ChallengeId='shopping-flow'): ChallengeRun {
  const definition=challengeDefinition(id);
  if(!challengeAvailable(id))throw Error("This level is waiting for the building update.");
  const campaign=campaignDefinition(id);
  const city=campaign?campaignTown(id as CampaignId):id==='shopping-flow'?flowTown():createCity();
  if(id==='shopping-flow')stepCity(city,120);
  else if(!campaign) {
    city.funds=10000;
    if(id==='safe-crossing') {
      for(let x=0;x<=14;x++)if(![7,8,9].includes(x))place(city,'road',x,6);
      for(let y=0;y<=4;y++)place(city,'road',8,y);
      for(const x of [0,2,4,6])place(city,'home',x,4);
      for(const x of [0,2,4])place(city,'home',x,7,2);
      for(const y of [0,2,4])place(city,'home',9,y,1);
      place(city,'store',11,4);place(city,'store',13,7,2);
    } else {
      if(id==='first-road')place(city,'home',3,4);
      else for(const y of [1,5,9])place(city,'home',2,y);
      place(city,'store',id==='first-road'?9:11,id==='first-road'?4:5);
      for(const b of city.buildings){const e=entrance(b);place(city,'road',e.x,e.y);}
    }
  }
  // Inherited infrastructure cannot be sold to mint a larger construction allowance.
  for(const b of city.buildings)b.paid=0;
  for(const key of Object.keys(city.roadPaid??{}))city.roadPaid![key]=0;
  if(campaign)for(const control of city.controls)control.paid=0;
  city.funds = definition.budget;
  if(city.tutorial)city.tutorial.status = 'complete';
  return bindEmergency({id,revision:id==='past-the-wreck'?4:emergencyDefinition(id)?3:2,...(emergencyDefinition(id)?{emergency:initialEmergency(city)}:{}),city, earned:false, accumulator:0, checkedAt:city.elapsed});
}
export function challengeSnapshot(run: ChallengeRun) {return flowSnapshot(run.city,challengeDefinition(run.id).homes,'shopping', {returnsPerHome:run.id==='shopping-flow'?2:1,maximumStoppedSeconds:20,maximumJourneySeconds:60});}
export function challengePlace(city: City, tool: Tool, x: number, y: number, rotation = 0, id:ChallengeId='shopping-flow'): string {
  if (!challengeTools(id).includes(tool)) return 'Use the construction tools supplied for this lesson.';
  if(id==='around-the-island'&&x===8&&y===6)return 'Keep the center island clear. Build around it.';
  if(id==='one-way-home'&&tool==='bulldoze'&&y===6&&x>=2&&x<=13)return 'Keep the inherited eastbound street. Add a way home.';
  if(['another-front-door','past-the-wreck'].includes(id)&&tool==='bulldoze'&&x===8&&y>=5&&y<=12)return 'Keep the original entrance. Build another connection.';
  if (tool==='bulldoze' && city.buildings.some(b=>(b.kind==='home'||(id!=='shopping-flow'&&!campaignDefinition(id))||(!!campaignDefinition(id)&&b.paid===0)) && footprint(b).some(p=>p.x===x&&p.y===y)))
    return 'Keep the existing buildings: every household needs service.';
  observeEmergencyEdit(city);
  const message=place(city,tool,x,y,rotation);
  observeEmergencyEdit(city);
  return message.startsWith('Wait for the next income')?'Not enough budget. Clear roads you built for a refund, or retry.':message;
}
/** Display and objective evaluation share actual events, including unfinished journeys. */
export function challengeProgress(run:ChallengeRun) {
  const homes=run.city.buildings.filter(b=>b.kind==='home');
  const ids=new Set(run.served??[]);
  if(run.id==='first-road') for(const t of run.city.trips)
    if(!t.service&&!t.external&&t.purpose==='shopping'&&t.phase==='visiting')ids.add(t.homeId);
  for(const h of run.city.history)if(h.service?.purpose==='shopping'&&(!requiresTaughtAction(run.id)||run.serviceSince!==undefined&&(h.service.startedAt??-1)>=run.serviceSince-1e-6))ids.add(h.service.homeId);
  return {served:homes.filter(h=>ids.has(h.id)).length,total:homes.length,
    seconds:Math.max(0,(run.finishedAt??run.city.elapsed)-(run.startedAt??run.city.elapsed)),
    leisureServed:(run.leisureServed??[]).length,busServed:(run.busServed??[]).length,
    ids:[...ids].filter(id=>homes.some(h=>h.id===id))};
}
/** Fixed simulation ticks make browser frame timing irrelevant to the lesson. */
export function stepChallenge(run: ChallengeRun, seconds: number) {
  if (!Number.isFinite(seconds) || seconds<=0 || run.failed || (run.earned&&run.id!=='shopping-flow')) return;
  run.startedAt??=run.city.elapsed;
  run.accumulator += seconds;
  while (run.accumulator + 1e-9 >= .025) {
    if(requiresTaughtAction(run.id)){
      if(challengeStages(run)[0].done)run.serviceSince??=run.city.elapsed;
      else {run.serviceSince=undefined;run.served=[];}
    }
    observeEmergency(run);
    const budget=run.city.funds;
    const unpaid=challengeHasIncome(run.id)?new Set(run.city.trips.filter(t=>!t.rewarded&&!t.service&&!t.external&&t.purpose==='shopping').map(t=>t.id)):new Set<number>();
    const routeLesson=['apartment-avenue','another-front-door'].includes(run.id);
    const returningByNewRoute=routeLesson?run.city.trips.filter(t=>t.phase==='returning'&&!t.service&&!t.external&&t.purpose==='shopping'&&usesLessonRoute(run,t.path)).map(t=>t.homeId):[];
    const before=run.city.elapsed;
    const busBefore=run.city.transit?.ridership;
    const returning=busBefore?.riders.filter(j=>j.stage==='riding-back').map(j=>({id:j.id,homeId:j.homeId}))??[];
    const completed=busBefore?.completed??0,cancelled=busBefore?.cancelled??0;
    const scenes=run.emergency?run.city.incidents.filter(i=>run.emergency!.scenes.some(s=>s.id===i.id)):[];
    stepCity(run.city,.025);
    for(const scene of scenes)if(!run.city.incidents.some(i=>i.id===scene.id))run.city.incidents.push(scene);
    const income=challengeHasIncome(run.id)?100*run.city.trips.filter(t=>unpaid.has(t.id)&&t.rewarded).length:0;
    if(income)run.shoppingIncome=(run.shoppingIncome??0)+income;
    run.city.funds=budget+income; run.accumulator=Math.max(0,run.accumulator-.025);
    if(routeLesson)run.routeServed=[...new Set([...(run.routeServed??[]),...run.city.history.filter(h=>h.at>before&&h.service?.purpose==='shopping'&&returningByNewRoute.includes(h.service.homeId)).map(h=>h.service!.homeId)])];
    observeEmergency(run);
    if(campaignDefinition(run.id)){
      const after=run.city.transit?.ridership;
      const returned=returning.filter(j=>!after?.riders.some(r=>r.id===j.id));
      if(after&&after.cancelled===cancelled&&after.completed-completed===returned.length)
        run.busServed=[...new Set([...(run.busServed??[]),...returned.map(j=>j.homeId)])];
      run.served=challengeProgress(run).ids;
      run.leisureServed=[...new Set([...(run.leisureServed??[]),...run.city.history.filter(h=>h.service?.purpose==='leisure').map(h=>h.service!.homeId)])];
      const objective=campaignDefinition(run.id)!.objective;
      if(['stop','roundabout','signal'].includes(objective)&&run.city.accidentCount>0)run.failed='accident';
      if(challengeStages(run).every(stage=>stage.done))run.earned=true;
      if(run.failed)run.earned=false;
      if(run.earned||run.failed){run.finishedAt=run.city.elapsed;run.accumulator=0;break;}
      continue;
    }
    if(run.id!=='shopping-flow') {
      const progress=challengeProgress(run);run.served=progress.ids;
      if(run.id==='safe-crossing'&&run.city.accidentCount>0)run.failed='accident';
      else if(run.id==='neighborhood-roads'&&progress.seconds>45+1e-6)run.failed='time';
      else if(progress.served===progress.total)run.earned=true;
      else if(run.id==='neighborhood-roads'&&progress.seconds>=45-1e-6)run.failed='time';
      if(run.earned||run.failed){run.finishedAt=run.city.elapsed;run.accumulator=0;break;}
      continue;
    }
    if (run.city.elapsed-run.checkedAt < 1-1e-6) continue;
    run.checkedAt=run.city.elapsed;
    if (challengeSnapshot(run).ready) {
      run.readySince ??= run.city.elapsed;
      if (run.city.elapsed-run.readySince >= 15-1e-6) {run.earned=true;run.finishedAt??=run.city.elapsed;}
    } else run.readySince=undefined;
  }
}
export function parseChallenge(raw: unknown): ChallengeRun | null {
  if (!raw || typeof raw!=='object') return null;
  const r=raw as ChallengeRun, city=parseCity(r.city);
  const id=r.id??'shopping-flow'; // Preserve the original single-level save.
  if(!CHALLENGES.some(c=>c.id===id)||!challengeAvailable(id))return null;
  if (!city || city.buildings.filter(b=>b.kind==='home').length!==challengeDefinition(id).homes || city.external?.gateway) return null;
  if(r.routeServed!==undefined&&(!['apartment-avenue','another-front-door'].includes(id)||!Array.isArray(r.routeServed)||new Set(r.routeServed).size!==r.routeServed.length||r.routeServed.some(n=>!city.buildings.some(b=>b.kind==='home'&&b.id===n))))return null;
  if(r.shoppingIncome!==undefined&&(!challengeHasIncome(id)||!Number.isSafeInteger(r.shoppingIncome)||r.shoppingIncome<0||r.shoppingIncome%100!==0))return null;
  const validTime=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=city.elapsed;
  const emergency=emergencyDefinition(id)&&(r.revision===3||r.revision===4)?parseEmergency(r.emergency,city,id,r.revision):undefined;
  if(emergencyDefinition(id)&&(r.revision===3||r.revision===4)&&!emergency)return null;
  if(r.revision===4&&id!=='past-the-wreck')return null;
  if(emergencyDefinition(id)&&id!=='a-town-that-works'&&r.revision!==3&&r.revision!==4)return null;
  const parsed:ChallengeRun={id,revision:r.revision===4?4:r.revision===3?3:r.revision===2?2:1,...(emergency?{emergency}:{}),city,earned:r.earned===true,
    ...(r.routeServed!==undefined?{routeServed:Array.isArray(r.routeServed)?[...new Set(r.routeServed)].filter(n=>city.buildings.some(b=>b.kind==='home'&&b.id===n)):[]}:{}),
    ...(r.shoppingIncome!==undefined?{shoppingIncome:Number.isSafeInteger(r.shoppingIncome)&&r.shoppingIncome>=0&&r.shoppingIncome%100===0?r.shoppingIncome:0}:{}),
    ...(validTime(r.startedAt)?{startedAt:r.startedAt}:{}),
    ...(validTime(r.serviceSince)?{serviceSince:r.serviceSince}:{}),
    ...(validTime(r.finishedAt)?{finishedAt:r.finishedAt}:{}),
    ...(['time','accident'].includes(r.failed??'')?{failed:r.failed}:{}),
    served:Array.isArray(r.served)?[...new Set(r.served)].filter(id=>city.buildings.some(b=>b.kind==='home'&&b.id===id)):[],
    leisureServed:Array.isArray(r.leisureServed)?[...new Set(r.leisureServed)].filter(id=>city.buildings.some(b=>b.kind==='home'&&b.id===id)):[],
    busServed:Array.isArray(r.busServed)?[...new Set(r.busServed)].filter(id=>city.buildings.some(b=>b.kind==='home'&&b.id===id)):[],
    accumulator:typeof r.accumulator==='number'&&Number.isFinite(r.accumulator)&&r.accumulator>=0&&r.accumulator<.025?r.accumulator:0,
    checkedAt:validTime(r.checkedAt)?r.checkedAt:city.elapsed,
    ...(validTime(r.readySince)&&validTime(r.checkedAt)&&r.readySince<=r.checkedAt?{readySince:r.readySince}:{})};
  if(emergency&&parsed.earned&&!emergencyStages(parsed).every(s=>s.done))return null;
  if(['apartment-avenue','another-front-door','keep-another-way'].includes(id)&&parsed.earned&&!challengeStages(parsed).every(s=>s.done))return null;
  return bindEmergency(parsed);
}

function requiresTaughtAction(id:ChallengeId){return ['stop','signal','direction','roundabout'].includes(campaignDefinition(id)?.objective??'');}

/** These are taught actions plus observed service, never a road-count score. Foresight counts. */
export function challengeStages(run:ChallengeRun):{label:string;done:boolean}[]{
 if(run.emergency)return emergencyStages(run);
 const d=campaignDefinition(run.id);if(!d)return [];
 const p=challengeProgress(run),shopping=p.served===d.homes,leisure=p.leisureServed===d.homes,bus=p.busServed===d.homes;
 const shop={label:`Shopping round trips: ${p.served}/${d.homes}`,done:shopping};
 const park={label:`Park round trips: ${p.leisureServed}/${d.homes}`,done:leisure};
 const busStage={label:`Bus outings returned: ${p.busServed}/${d.homes}`,done:bus};
 if(d.objective==='wide')return [{label:'Join the avenue with a usable four-lane connection',done:run.city.buildings.filter(b=>b.kind==='home').every(h=>run.city.buildings.some(s=>s.kind==='store'&&!!findPath(run.city,entrance(h),entrance(s))&&!!findPath(run.city,entrance(s),entrance(h))))},{label:`Shopping returns using your new four-lane road: ${run.routeServed?.length??0}/${d.homes}`,done:run.routeServed?.length===d.homes}];
 if(d.objective==='entrance')return [{label:'Keep the original entrance and build another usable connection',done:hasSecondEntrance(run.city)},{label:`Shopping returns through the new entrance: ${run.routeServed?.length??0}/${d.homes}`,done:run.routeServed?.length===d.homes},{label:'Reopen the original entrance: toggle Divert off',done:!run.city.closures.length}];
 if(d.objective==='income')return [{label:`Earn shopping income: $${run.shoppingIncome??0} / $300`,done:(run.shoppingIncome??0)>=300},shop,park];
 if(d.objective==='signal')return [{label:'Place Lights at the crossing',done:run.city.controls.some(c=>c.kind==='signal')},shop];
 if(d.objective==='stop')return [{label:'Place Stops at the crossing',done:run.city.controls.some(c=>c.kind==='stop')},shop];
 if(d.objective==='direction')return [{label:'Direct the new return street',done:hasDirectedReturn(run.city)},shop];
 if(d.objective==='roundabout')return [{label:'Close a one-way loop around the island',done:roundaboutIndex(run.city).rings.length>0},shop];
 if(d.objective==='mixed')return [shop,park];
 if(d.objective==='bus')return [
   {label:'Buy a bus · $400 at the depot',done:!!run.city.transit?.fleet.length},
   {label:'Choose both stops at the depot',done:!!run.city.transit?.routes.some(r=>r.stopIds.length>=2)},
   {label:'Start service, then press Play',done:run.startedAt!==undefined&&!!run.city.transit?.routes.some(r=>r.running&&run.city.transit?.fleet.some(b=>b.routeId===r.id))},
   busStage,shop,
 ];


 return [shop];
}
function usesLessonRoute(run:ChallengeRun,path:Point[]){
 if(run.id==='apartment-avenue')return (run.city.wideRoads??[]).filter(s=>wideRoadFootprint(s).some(p=>(run.city.roadPaid?.[`${p.x},${p.y}`]??0)>0)&&wideRoadFootprint(s).some(p=>path.some(q=>q.x===p.x&&q.y===p.y))).length>=4;
 if(run.id==='another-front-door')return path.some(p=>p.y>=12)&&!path.some(p=>p.x===originalEntrance.x&&p.y===originalEntrance.y);
 return false;
}
export function hasSecondEntrance(city:City){
 if(!Array.from({length:8},(_,i)=>i+5).every(y=>city.roads.some(p=>p.x===8&&p.y===y)))return false;
 const avoid=new Set([`${originalEntrance.x},${originalEntrance.y}`]);
 return city.buildings.filter(b=>b.kind==='home').every(h=>city.buildings.some(s=>s.kind==='store'&&findPath(city,entrance(h),entrance(s),false,avoid)&&findPath(city,entrance(s),entrance(h),false,avoid)));
}
function hasDirectedReturn(city:City){
 const shop=city.buildings.find(b=>b.kind==='store');if(!shop)return false;
 const inherited=inheritedOneWayEdges();
 return city.buildings.filter(b=>b.kind==='home').every(home=>{
   const path=findPath(city,entrance(shop),entrance(home));if(!path)return false;
   const edges=path.slice(1).map((p,i)=>({key:roadEdgeKey(path[i],p),direction:roadDirectionForStep(path[i],p)})).filter(e=>!inherited.has(e.key));
   return edges.length>=2&&edges.every(e=>city.roadDirections?.[e.key]===e.direction);
 });
}
function inheritedOneWayEdges(){return new Set(Array.from({length:11},(_,i)=>`${i+2},6>${i+3},6`));}
export function challengeDirections(city:City,points:Point[],mode:DirectionEditMode,id:ChallengeId){
 if(!challengeTools(id).includes('direction'))return {ok:false,message:'One-way editing is not supplied for this lesson.'};
 if(id==='one-way-home'){
   const copy={...city,roadDirections:{...city.roadDirections}};
   const result=applyRoadDirections(copy,points,mode);if(!result.ok)return result;
   const original=Object.fromEntries([...inheritedOneWayEdges()].map(k=>[k,'forward']));
   if(Object.entries(original).some(([k,v])=>copy.roadDirections?.[k]!==v))return {ok:false,message:'Keep the main street eastbound. Direct a new return street.'};
 }
 observeEmergencyEdit(city);
 const result=applyRoadDirections(city,points,mode);
 observeEmergencyEdit(city);
 return result;
}
