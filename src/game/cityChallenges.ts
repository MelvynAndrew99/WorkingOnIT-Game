/** Focused lessons use the sandbox model; they never own or mutate its saved town. */
import {createCity, entrance, footprint, parseCity, place, stepCity, type City, type Tool} from './cityModel.ts';
import {flowSnapshot} from './cityFlow.ts';
import {flowTown} from './fixtures/flowTown.ts';

export const FLOW_CHALLENGE = {
  id: 'shopping-flow', title: 'Room to move',
  goal: 'Help all 9 households shop and get home twice in the latest minute of traffic. Keep that service steady for 15 seconds.',
  lesson: 'Learn to spot a busy approach and improve how a neighborhood is served.',
  rules: 'Keep all 9 homes. Change roads, junction controls or shops. No outside traffic or land expansion. Pause to plan; there is no failure countdown.',
};
export const CHALLENGE_TOOLS: Tool[] = ['road','stop','signal','store','closure','bulldoze','policeStation','hospital','fireStation'];
export const CHALLENGES = [
  {id:'first-road',title:'The first road',goal:'Build the missing road. Get the car to the store.',lesson:'Join the entrance arrows with a continuous road.',rules:'Build between the entrance arrows, then Run traffic. Win as soon as the car arrives at the store.',homes:1,budget:140},
  {id:'neighborhood-roads',title:'Roads for the neighborhood',goal:'Get all 3 households to the store and home within 45 seconds.',lesson:'Build a shared road that serves every entrance.',rules:'Connect the scattered homes. The 45-second trip test starts when you Run traffic; pause stops the clock. All three must return home.',homes:3,budget:600},
  {id:'safe-crossing',title:'Share the crossing',goal:'Reconnect the junction. Get every household to the shops and home without an accident.',lesson:'Manage the meeting point of two busy approaches.',rules:'Repair the missing roads and manage the junction with Stops or Lights, or find a safe alternative. Every household must return; any accident ends this attempt.',homes:10,budget:180},
  {...FLOW_CHALLENGE,homes:9,budget:1200},
] as const;
export type ChallengeId = typeof CHALLENGES[number]['id'];
export const challengeDefinition=(id:ChallengeId)=>CHALLENGES.find(c=>c.id===id)!;
export const challengeTools=(id:ChallengeId):Tool[]=>id==='shopping-flow'?CHALLENGE_TOOLS:id==='safe-crossing'?['road','stop','signal','bulldoze']:['road','bulldoze'];
export interface ChallengeRun {id:ChallengeId;revision?:number;startedAt?:number;finishedAt?:number;failed?:'time'|'accident';served?:number[];city: City; earned: boolean; readySince?: number; accumulator: number; checkedAt: number;}
export function createChallenge(id:ChallengeId='shopping-flow'): ChallengeRun {
  const definition=challengeDefinition(id);
  const city=id==='shopping-flow'?flowTown():createCity();
  if(id==='shopping-flow')stepCity(city,120);
  else {
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
  city.funds = definition.budget;
  if(city.tutorial)city.tutorial.status = 'complete';
  return {id,revision:2,city, earned:false, accumulator:0, checkedAt:city.elapsed};
}
export function challengeSnapshot(run: ChallengeRun) {return flowSnapshot(run.city,challengeDefinition(run.id).homes,'shopping', {returnsPerHome:run.id==='shopping-flow'?2:1,maximumStoppedSeconds:20,maximumJourneySeconds:60});}
export function challengePlace(city: City, tool: Tool, x: number, y: number, rotation = 0, id:ChallengeId='shopping-flow'): string {
  if (!challengeTools(id).includes(tool)) return 'Use the construction tools supplied for this lesson.';
  if (tool==='bulldoze' && city.buildings.some(b=>(b.kind==='home'||id!=='shopping-flow') && footprint(b).some(p=>p.x===x&&p.y===y)))
    return 'Keep the existing homes and store: every household needs service.';
  const message=place(city,tool,x,y,rotation);
  return message.startsWith('Wait for the next income')?'Not enough budget. Clear roads you built for a refund, or retry.':message;
}
/** Display and objective evaluation share actual events, including unfinished journeys. */
export function challengeProgress(run:ChallengeRun) {
  const homes=run.city.buildings.filter(b=>b.kind==='home');
  const ids=new Set(run.served??[]);
  if(run.id==='first-road') for(const t of run.city.trips)
    if(!t.service&&!t.external&&t.purpose==='shopping'&&t.phase==='visiting')ids.add(t.homeId);
  for(const h of run.city.history)if(h.service?.purpose==='shopping')ids.add(h.service.homeId);
  return {served:homes.filter(h=>ids.has(h.id)).length,total:homes.length,
    seconds:Math.max(0,(run.finishedAt??run.city.elapsed)-(run.startedAt??run.city.elapsed)),
    ids:[...ids].filter(id=>homes.some(h=>h.id===id))};
}
/** Fixed simulation ticks make browser frame timing irrelevant to the lesson. */
export function stepChallenge(run: ChallengeRun, seconds: number) {
  if (!Number.isFinite(seconds) || seconds<=0 || run.failed || (run.earned&&run.id!=='shopping-flow')) return;
  run.startedAt??=run.city.elapsed;
  run.accumulator += seconds;
  while (run.accumulator + 1e-9 >= .025) {
    const budget=run.city.funds;
    stepCity(run.city,.025);
    run.city.funds=budget; run.accumulator=Math.max(0,run.accumulator-.025);
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
  if(!CHALLENGES.some(c=>c.id===id))return null;
  if (!city || city.buildings.filter(b=>b.kind==='home').length!==challengeDefinition(id).homes || city.external?.gateway) return null;
  const validTime=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=city.elapsed;
  return {id,revision:r.revision===2?2:1,city,earned:r.earned===true,
    ...(validTime(r.startedAt)?{startedAt:r.startedAt}:{}),
    ...(validTime(r.finishedAt)?{finishedAt:r.finishedAt}:{}),
    ...(['time','accident'].includes(r.failed??'')?{failed:r.failed}:{}),
    served:Array.isArray(r.served)?[...new Set(r.served)].filter(id=>city.buildings.some(b=>b.kind==='home'&&b.id===id)):[],
    accumulator:typeof r.accumulator==='number'&&Number.isFinite(r.accumulator)&&r.accumulator>=0&&r.accumulator<.025?r.accumulator:0,
    checkedAt:validTime(r.checkedAt)?r.checkedAt:city.elapsed,
    ...(validTime(r.readySince)&&validTime(r.checkedAt)&&r.readySince<=r.checkedAt?{readySince:r.readySince}:{})};
}
