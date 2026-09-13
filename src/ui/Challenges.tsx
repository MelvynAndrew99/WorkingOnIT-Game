import ApartmentComplexPanel from './ApartmentComplexPanel.tsx';
import {useEffect, useMemo, useRef, useState} from 'react';
import {store, useStore, selectConstructionTool} from '../state/store.ts';
import {flushChallenges, getChallengeRun, hasChallengeRun, challengeUnlocked, retryChallenge, selectChallenge} from '../state/challenges.ts';
import {challengePlace, challengeStages, challengeDirections, challengeAvailable, challengeHasIncome, jamRewardEarned, nextChallenge, challengeSnapshot, challengeProgress, CHALLENGES, challengeDefinition, challengeTools, type ChallengeId, stepChallenge} from '../game/cityChallenges.ts';
import {cityCommand} from '../game/cityControls.ts';
import GameCanvas from '../game/GameCanvas.tsx';
import IntersectionWarning from './IntersectionWarning.tsx';
import type {CitySceneSession} from '../game/cityScene.ts';
import type {Tool} from '../game/cityModel.ts';
import {constructionPriceForCity} from '../game/cityEconomy.ts';
import './challenges.css';
import './buildPalette.css';
import ChallengeRoute from './ChallengeRoute.tsx';
import TransitPanel from './TransitPanel.tsx';
import {AwardRibbon} from './ChallengeAwards.tsx';
import {ToolIcon} from './BuildPalette.tsx';
import { IconInspect, IconPlay, IconPause, IconRotate, IconTown } from './hudIcons.tsx';
import './mapControls.css';
const moneyRules=(id:ChallengeId)=>challengeHasIncome(id)?'Shopping visits earn $100. Waiting alone pays nothing. Refunds for your own construction.':'No income. Refunds for your own construction.';

function enter(id:ChallengeId) {
  if(!challengeAvailable(id)||!challengeUnlocked(id))return;
  selectChallenge(id);
  store.patch({phase:'challenge',paused:true,tool:null,panning:false,rotation:0,directionRestore:false,directionSelection:0,transitDraft:null,transitPanel:null,busStopPanel:null,movingBusStop:null,diagnosticView:id==='shopping-flow'?'traffic':'normal',vehicleDebugOpen:false,tutorialNotice:false,message:'Pause to plan, then run traffic to see your changes.'});
}
export function ChallengeMenu() {
  const [selected,setSelected]=useState<ChallengeId|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(selected)dialog.current?.showModal();},[selected]);
  const definition=selected?challengeDefinition(selected):null;
  const unlocked=!!definition&&challengeUnlocked(definition.id);
  const previousNumber=definition?CHALLENGES.findIndex(d=>d.id===definition.id):0;
  return <>
    <ChallengeRoute select={setSelected}/>
    <dialog ref={dialog} className="level-brief journey-brief" onCancel={()=>setSelected(null)} onClose={()=>setSelected(null)} aria-labelledby="level-brief-title">
      {definition&&<><button className="brief-close" aria-label="Close level briefing" onClick={()=>dialog.current?.close()}>×</button><p className="route-eyebrow">LEVEL {CHALLENGES.findIndex(d=>d.id===selected)+1}</p><h2 id="level-brief-title">{definition.title}</h2><p>{definition.goal}</p><p>{definition.rules}</p><p><strong>{challengeAvailable(definition.id)?`Budget $${definition.budget.toLocaleString()}`:"Coming with the building update"}</strong> · {moneyRules(definition.id)}</p><p role="status">{!unlocked?`Locked — complete Level ${previousNumber} first.`:""}</p><button disabled={!challengeAvailable(definition.id)||!unlocked} className="commute-button" onClick={()=>enter(definition.id)}>{!unlocked?'Locked':!challengeAvailable(definition.id)?'In preparation':hasChallengeRun(definition.id)?'Continue level':'Play level'} <span aria-hidden="true">→</span></button></>}
    </dialog>
  </>;
}

function ChallengeResult({run,next,retry,leave}:{run:ReturnType<typeof getChallengeRun>;next:(id:ChallengeId)=>void;retry:()=>void;leave:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),definition=challengeDefinition(run.id);
  const index=CHALLENGES.findIndex(d=>d.id===run.id),progress=challengeProgress(run),following=nextChallenge(run.id);
  useEffect(()=>{dialog.current?.showModal();store.patch({paused:true});flushChallenges();},[]);
  return <dialog ref={dialog} className="level-result" aria-labelledby="result-title" onCancel={e=>{e.preventDefault();leave();}}>
    <button className="brief-close" aria-label="Back to level map" onClick={leave}>×</button>
    <p className="route-eyebrow">LEVEL {index+1} · {definition.title}</p>
    {run.earned?<AwardRibbon className="result-award"/>:<div className="result-emblem result-miss" aria-hidden="true">↻</div>}
    <h2 id="result-title">{run.earned?'Nice work!':run.failed==='accident'?'A crossing needs care':'Try a quicker route'}</h2>
    <p>{run.earned?'Completion award earned and saved.':run.failed==='accident'?'A real collision ended this attempt. Rebuild the connection and manage the crossing before running traffic.':'The 45-second test ended before every household got home. Plan your roads while paused, then try again.'}</p>
    {jamRewardEarned(run)&&<p><strong>Jam campaign complete!</strong> What A Jam is yours free. Tune in on City Radio from the main menu to hear the whole song.</p>}
    <div className="result-score"><strong>{run.startedAt===undefined?'Saved completion':`${progress.seconds.toFixed(1)}s`}</strong><span>{run.emergency?'Emergency recovery complete':run.id==='another-front-door'&&run.revision===3?'Shopping returns from both apartment blocks':run.id==='first-road'?'Car reached the store':`${progress.served}/${progress.total} households home`}</span><span>${run.city.funds.toLocaleString()} budget left</span></div>
    <div className="result-actions"><button onClick={retry}>Retry</button>{run.earned&&following&&<button className="commute-button" onClick={()=>next(following.id)}>Next{following&&following!==CHALLENGES[index+1]?` · Level ${CHALLENGES.indexOf(following)+1}`:""} <span aria-hidden="true">→</span></button>}</div>
    <button className="result-map" onClick={leave}>Level map</button>
  </dialog>;
}
const names:Record<Tool,string>={office:'Office: work visits and chosen entrances.',communityRoad:'Slower roads connecting apartment blocks.',apartment:'Apartment',wideRoad:'4-lane road',busStation:'Bus depot',busStop:'Bus stop',direction:'One-way',road:'Road',stop:'Stops',signal:'Lights',store:'Store',closure:'Divert',bulldoze:'Clear',policeStation:'Police',hospital:'Clinic',fireStation:'Fire',home:'Home',park:'Park'};
function ChallengeReset({reset,cancel}:{reset:()=>void;cancel:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog ref={dialog} className="level-result" aria-labelledby="reset-title" onCancel={e=>{e.preventDefault();cancel();}}>
    <h2 id="reset-title">Reset this level?</h2>
    <p>Start again with the original map and budget. Your earned awards and sandbox town are kept.</p>
    <div className="result-actions"><button autoFocus onClick={cancel}>Keep playing</button><button onClick={reset}>Reset level</button></div>
  </dialog>;
}
export function ChallengeGame() {
  const [attempt,setAttempt]=useState(0),[details,setDetails]=useState(false);
  const [resetOpen,setResetOpen]=useState(false),resetWasPaused=useRef(true);
  const [speed,setSpeed]=useState<1|2>(1),speedRef=useRef<1|2>(1);
  const changeSpeed=(value:1|2)=>{speedRef.current=value;setSpeed(value);};
  const s=useStore();
  const session=useMemo<CitySceneSession>(()=>{
    const run=getChallengeRun();
    return {city:run.city,allowedTools:challengeTools(run.id),fitTown:!['first-road','neighborhood-roads','safe-crossing','shopping-flow'].includes(run.id),reservedTiles:run.id==='around-the-island'?[{x:8,y:6}]:[],directions:(city,points,mode)=>challengeDirections(city,points,mode,run.id),save:flushChallenges,step:dt=>{stepChallenge(run,dt*speedRef.current);if(run.earned||run.failed){flushChallenges();store.patch({paused:true});}},place:(city,tool,x,y,rotation)=>challengePlace(city,tool,x,y,rotation,run.id)};
  },[attempt]);
  const run=getChallengeRun(), flow=challengeSnapshot(run), progress=challengeProgress(run), definition=challengeDefinition(run.id),stages=challengeStages(run);
  const leave=(phase:'challenges'|'menu')=>{flushChallenges();store.patch({phase,paused:false,tool:null});};
  const reset=()=>{retryChallenge();setResetOpen(false);changeSpeed(1);store.patch({paused:true,tool:null,panning:false,rotation:0,directionRestore:false,directionSelection:0,transitDraft:null,transitPanel:null,busStopPanel:null,movingBusStop:null,toolSelection:s.toolSelection+1,message:'Fresh attempt. Plan, then run traffic.'});setAttempt(n=>n+1);};
  const confirmReset=()=>{resetWasPaused.current=store.get().paused;store.patch({paused:true});setResetOpen(true);};
  const cancelReset=()=>{setResetOpen(false);store.patch({paused:resetWasPaused.current});};
  const next=(id:ChallengeId)=>{enter(id);changeSpeed(1);setDetails(false);setAttempt(n=>n+1);};
  return <div className="absolute inset-0">
    <GameCanvas key={attempt} session={session}/>
    <div className="challenge-ui">
      <header className="city-header"><strong>{definition.title}</strong>
        <button className="hud-icon-btn" onClick={()=>leave('challenges')}>Levels</button>
        <button className="hud-icon-btn" onClick={()=>leave('menu')}>Main menu</button>
      </header>
      <main className="city-stage">
        <nav className="map-rail" aria-label="Challenge map controls">
          <button aria-pressed={s.tool===null&&!s.panning&&s.movingBusStop===null&&s.transitDraft===null} onClick={()=>selectConstructionTool(null)}><IconInspect /><span>Inspect</span></button>
          <button title="Centre on your town" onClick={()=>cityCommand({type:'home'})}><IconTown /><span>Town</span></button>
          <button aria-pressed={s.diagnosticView==='traffic'} onClick={()=>store.patch({diagnosticView:s.diagnosticView==='traffic'?'capacity':'traffic'})}>{s.diagnosticView==='traffic'?'Visitors':'Traffic'}</button>
          <button onClick={()=>store.patch({rotation:(s.rotation+1)%4})}><IconRotate /><span>Rotate</span></button>
        </nav>
        <p className="challenge-map-note">{run.id==='safe-crossing'?'Missing junction roads. Manage the crossing before running traffic.':run.id!=='shopping-flow'?definition.lesson:s.flow?.selectedRoad?`Approach ${s.flow.selectedRoad.x},${s.flow.selectedRoad.y}: ${s.flow.selectedRoad.waiting} waiting · longest stop ${s.flow.selectedRoad.longestStop.toFixed(1)}s`:'Amber marks stopped cars. Shop labels show parked + arriving / capacity.'}</p>
        <IntersectionWarning />
        <div className="city-map-viewport" aria-label="Playable challenge map">
          <div className="challenge-gameplay" role="group" aria-label="Challenge gameplay">
          <button className="challenge-reset" onClick={confirmReset}><IconRotate /> Reset</button>
          <button className="challenge-play" aria-label={s.paused?'Run traffic':'Pause traffic'} disabled={!!run.earned||!!run.failed} onClick={()=>store.patch({paused:!s.paused})}>
            {s.paused?<IconPlay />:<IconPause />} {s.paused?'Play':'Pause'}
          </button>
          <button className="challenge-speed" aria-label="Fast forward at 2× speed" aria-pressed={speed===2} title="Toggle 1× / 2×. Timers and results use in-game seconds." disabled={!!run.earned||!!run.failed} onClick={()=>changeSpeed(speed===1?2:1)}>
            <span aria-hidden="true">»</span> {speed}×
          </button>
          </div>
        </div>
      </main>
      <footer className={`city-controls${run.emergency?' emergency-controls':''}`}>
        <section className="challenge-objective" aria-label="Challenge objective">
          {!stages.length&&<p><strong>{run.id==='first-road'?'Goal: reach the store':run.id==='shopping-flow'?`${flow.qualifiedHomes}/9 homes served twice`:`${progress.served}/${progress.total} households home`}</strong></p>}
          {stages.some(stage=>!stage.done)&&<p className="challenge-current"><strong>Next: {stages.find(stage=>!stage.done)!.label}</strong></p>}
          <p>{definition.goal}</p>
          {run.emergency&&<div className="challenge-actions"><button onClick={()=>cityCommand({type:'focus',point:run.emergency!.scenes.find(scene=>!scene.cleared)??run.emergency!.scenes[0]})}>Show scene</button>{(run.id==='temporary-two-way'||run.id==='past-the-wreck'&&run.revision===4)&&<button onClick={()=>cityCommand({type:'focus',point:run.id==='temporary-two-way'?{x:14,y:8}:{x:8,y:10}})}>Show Divert approach</button>}</div>}
          <ol className="challenge-stages">{stages.map((stage,i)=><li key={stage.label} aria-current={!stage.done&&stages.findIndex(s=>!s.done)===i?'step':undefined}>{stage.done?'✓':`${i+1}.`} {stage.label}</li>)}</ol>
          <p className="challenge-counts">{run.id==='neighborhood-roads'?`${Math.max(0,45-progress.seconds).toFixed(1)}s left (game time)`:`${progress.seconds.toFixed(1)}s game time`} {run.id==='another-front-door'?'':` · ${flow.visits} visits · ${flow.returns} returns · ${flow.waitingVehicles} waiting`}</p>
          <div className="challenge-actions"><button aria-expanded={details} onClick={()=>setDetails(!details)}>{details?'Less':'Rules & details'}</button></div>
          {details&&<div className="challenge-details"><p>{definition.rules}</p>{run.id==='shopping-flow'&&<p>Latest 60 simulated seconds: every household needs two shopping returns, usable routes, no stop over 20 seconds and no unfinished trip over 60 seconds. Keep that service steady for 15 simulated seconds to earn one permanent star. This observation window is not a deadline.</p>}<p>{moneyRules(run.id)} You can retry with the starting budget.</p>{run.id!=='another-front-door'&&<><p>{flow.pendingNeeds} open needs · {flow.homesWithoutReturn} homes without a return · {flow.accessLimitedHomes} missing routes · {flow.capacityLimitedHomes} waiting for destination space · {flow.spareDestinationSlots} unused visitor slots across shops.</p><p>Longest current stop: {Math.ceil(flow.longestStop)}s. Longest unfinished journey: {Math.ceil(Math.max(0,...flow.homes.map(h=>h.journeySeconds??0)))}s. Road tool selects an existing approach; other tools edit it. Lights cycle timing presets when tapped again.</p></>}</div>}
        </section>
        <section className="challenge-construction" aria-label="Challenge construction">
          <div className="challenge-budget" aria-label="Remaining construction budget"><span>Budget</span><strong>${Math.floor(s.funds).toLocaleString()}</strong></div>
          <div className="challenge-tools">
          {challengeTools(run.id).map(tool=><button key={tool} className="build-tool" data-tool={tool} aria-pressed={s.tool===tool&&!s.panning} onClick={()=>selectConstructionTool(tool,`${names[tool]} selected. Click it again to inspect.`)}><span className="build-tool-detail"><ToolIcon tool={tool} locked={false} /><strong>{names[tool]}</strong></span><small className="build-cost">{tool==='bulldoze'?'Refund':tool==='closure'||tool==='direction'?'Free':`$${constructionPriceForCity(session.city,tool)}`}</small></button>)}
          </div>
        </section>
        {s.tool==='direction'&&<div className="challenge-editor" role="group" aria-label="Road direction editor"><p>Drag in travel order, or tap roads then Finish. Tap the first road to close a loop.</p><div className="direction-actions"><label><input type="checkbox" checked={s.directionRestore} onChange={e=>store.patch({directionRestore:e.target.checked})}/> Restore two-way</label><button disabled={s.directionSelection<2} onClick={()=>cityCommand({type:'road-direction',mode:s.directionRestore?'two-way':'forward'})}>Finish</button><button onClick={()=>cityCommand({type:'road-direction',mode:'undo'})}>Undo</button><button onClick={()=>cityCommand({type:'road-direction',mode:'cancel'})}>Cancel</button></div></div>}
        {challengeTools(run.id).includes('busStop')&&<div className="challenge-editor"><TransitPanel/></div>}
        {challengeTools(run.id).includes('apartment')&&<div className="challenge-editor"><ApartmentComplexPanel/></div>}
        <p className="challenge-message" role="status">{s.message}</p>
      </footer>
    </div>
    {resetOpen&&<ChallengeReset reset={reset} cancel={cancelReset}/>}
    {(run.earned||run.failed)&&<ChallengeResult key={`${run.id}-${attempt}`} run={run} next={next} retry={reset} leave={()=>leave('challenges')}/>}
  </div>;
}
