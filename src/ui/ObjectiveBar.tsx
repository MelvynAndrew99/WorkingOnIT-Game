import {incidentServices} from '../game/cityIncidents.ts';
/**
 * One objective at a time, always on the game screen.
 *
 * The tutorial, an emergency and the manager's paid jobs used to be separate stacked
 * panels competing for the same "what should I do next" attention. They are one
 * surface here: a crash outranks everything, then a claimable reward, then the active
 * lesson, then the current job. The current task remains visible on both layouts; Details expands
 * secondary guidance without requiring a modal to build.
 */
import { type ReactNode, useEffect, useState } from 'react';
import { cityCommand } from '../game/cityControls.ts';
import { claimMissionReward, missionSnapshot, type MissionItem } from '../game/cityMissions.ts';
import { flushSave, getSave } from '../state/save.ts';
import { store, useStore, type AppState } from '../state/store.ts';
import { TOOL_NAMES, tutorialObjective } from './TutorialCoach.tsx';
import FlowFeedback, { FLOW_MISSION_ID, FlowSummaryLine, readFlow } from './FlowFeedback.tsx';
import './objectiveBar.css';
import ManagerPopup from './ManagerPopup.tsx';
import { starterManagerReady } from '../game/cityStarterTutorial.ts';
import { externalNeedsRoad } from '../game/cityExternal.ts';

export interface Objective {
    key: string;
    eyebrow: string;
    title?: string;
    progress?: { current: number; target: number; label: string };
    reward?: string;
    instruction: string;
    /** A short highlighted line under the instruction, e.g. the mayor's cost waiver.
     *  The flow job passes an element so its reading stays one line in the same slot. */
    note?: ReactNode;
    urgent?: boolean;
    primary?: { label: string; run: () => void; pressed?: boolean };
    secondary?: { label: string; run: () => void };
    optional?: { label: string; run: () => void };
    detail?: ReactNode;
}

const SERVICE_BUILDINGS = { police: 'policeStation', ems: 'hospital', fire: 'fireStation' } as const;

/** `notice` (an unacknowledged crash) is owned by Hud, which needs the same value to
 *  avoid repeating the rescue countdown in its header alert. */
export default function ObjectiveBar({ wide, notice }: { wide: boolean; notice: boolean }) {
    const s = useStore();
    const [open, setOpen] = useState(false);
    const [managerOpen, setManagerOpen] = useState(false);
    const isStarter = s.tutorial?.status === 'active' && s.tutorial.currentId.startsWith('h-');
    const canBrief = isStarter ? getSave().city.tutorial?.hRoad?.stage === 5 : s.incidentInfo.active > 0 || (s.tutorial?.status === 'active' && s.tutorial.currentId === 'detour');
    const openManager = () => {
        const starter = getSave().city.tutorial?.hRoad;
        if (isStarter && starter && !starter.managerBriefed) {
            starter.managerBriefed = true;
            flushSave();
        }
        setManagerOpen(true);
    };
    const planRoad = () => {
        setManagerOpen(false);
        const current = store.get();
        store.patch({ tool: 'road', panning: false, toolSelection: current.toolSelection + 1 });
    };
    useEffect(() => {
        const city = getSave().city;
        const starter = city.tutorial?.hRoad;
        if (starter && starterManagerReady(city) && !managerOpen && !document.querySelector('dialog[open]')) {
            starter.managerBriefed = true;
            flushSave();
            setManagerOpen(true);
        }
    }, [s, managerOpen]);
    const reconnect = s.phase==='playing' && externalNeedsRoad(getSave().city);
    const showConnection = () => {planRoad();cityCommand({type:'focus',point:getSave().city.external!.gateway!});};
    const currentObjective = pickObjective(s, { notice });
    const objective:Objective|null = reconnect && !currentObjective?.urgent ? {
        key:'reconnect-city',eyebrow:'Outside city connection',title:'Reconnect your town',
        instruction:'Build a road to the CITY marker at the edge.',
        primary:{label:'Show city connection',run:showConnection},
    } : currentObjective;
    useEffect(() => { setOpen(false); }, [objective?.key]);
    if (!objective) return null;
    const showDetail = !!objective.detail && open;
    return <><section className="objective-bar mission-card" data-starter={s.tutorial?.currentId.startsWith('h-') ? 'true' : 'false'} data-urgent={objective.urgent ? 'true' : 'false'} data-wide={wide ? 'true' : 'false'} aria-label="Current objective">
        <div className="objective-row">
            <div className="objective-text">
                <p className="objective-eyebrow">{objective.eyebrow}</p>
                {objective.title && <h2 className="objective-title">{objective.title}</h2>}
                <div className="objective-copy" tabIndex={0} aria-label="Task instructions">
                    <p className="objective-instruction">{objective.instruction}</p>
                    {objective.note && <p className="objective-note">{objective.note}</p>}
                </div>
            </div>
            <div className="mission-progress">
                {objective.progress && <><progress aria-label={objective.progress.label} value={objective.progress.current} max={objective.progress.target} /><span>{objective.progress.current}/{objective.progress.target}</span></>}
                {objective.reward && <span className="mission-reward">{objective.reward}</span>}
            </div>
            <div className="objective-buttons">
                {objective.primary && !(objective.key.startsWith('lesson-') && objective.primary.pressed !== undefined) && <button type="button" className="objective-primary"
                    aria-pressed={objective.primary.pressed} onClick={objective.primary.run}>{objective.primary.label}</button>}
                {reconnect && objective.urgent && <button title="Build roads to the CITY marker at the edge" onClick={showConnection}>Show city connection</button>}
                {objective.detail && <button type="button" className="objective-more"
                    aria-expanded={open} aria-controls="objective-detail"
                    onClick={() => setOpen(!open)}>{open ? 'Less' : 'Details'}</button>}
            </div>
        </div>
        {showDetail && <div id="objective-detail" className="objective-detail" tabIndex={0} aria-label="Objective details">
            <div className="objective-extras">
                {objective.key.startsWith('lesson-') && objective.primary && objective.primary.pressed !== undefined && <button onClick={objective.primary.run} aria-pressed={objective.primary.pressed}>{objective.primary.label}</button>}
                {objective.secondary && <button onClick={objective.secondary.run}>{objective.secondary.label}</button>}
                {objective.optional && <button onClick={objective.optional.run}>{objective.optional.label}</button>}
                {canBrief && <button type="button" className="objective-more" onClick={openManager}>Manager's plan</button>}
            </div>{objective.detail}</div>}
    </section><ManagerPopup open={managerOpen} paused={s.paused} example={s.incidentInfo.active === 0} onClose={() => setManagerOpen(false)} onBuildRoad={planRoad} /></>;
}

/** A crash outranks a reward; a reward outranks the lesson; the lesson outranks the jobs. */
function pickObjective(s: AppState, ctx: { notice: boolean }): Objective | null {
    if (s.tutorial?.currentId.startsWith('h-') && s.tutorial.status === 'active') return tutorialObjective(s);
    const emergency = (ctx.notice || s.paused) && s.incidentInfo.active > 0 ? emergencyObjective(s) : null;
    if (emergency) return emergency;
    const ready = s.missions?.items.find(j => j.done && !j.claimed);
    if (ready) return claimObjective(ready);
    return tutorialObjective(s) ?? jobObjective(s);
}

/** Shown to every player, guided or not: a wreck is the most important thing on the map. */
function emergencyObjective(s: AppState): Objective | null {
    const incident = s.incidentInfo.details.at(0);
    if (!incident) return null;
    const city = getSave().city;
    const model = city.incidents.find(i => i.id === incident.id);
    const outstanding = model ? incidentServices(model).filter(k => !model.completedServices.includes(k)) : [];
    const needed = outstanding.map(k => k === 'ems' ? 'EMS' : k === 'police' ? 'Police' : 'Fire').join(' + ');
    const missing = outstanding.find(k => !city.buildings.some(b => b.kind === SERVICE_BUILDINGS[k]));
    const tool = missing ? SERVICE_BUILDINGS[missing] : undefined;
    return {
        key: `crash-${incident.id}`,
        urgent: true,
        eyebrow: s.paused ? 'Crash · traffic paused' : 'Crash · traffic running',
        title: incident.label,
        instruction: `${needed ? `${needed} needed` : 'Crews finishing'}${incident.deadlineSeconds !== null ? ` · ${Math.max(0, Math.ceil(incident.deadlineSeconds))}s to rescue` : ''}`,
        // A rescue grant matters most during a live wreck, and this objective outranks
        // the lesson that would otherwise have carried the mayor's line.
        note: s.tutorial?.waived?.reason,
        primary: tool
            ? { label: TOOL_NAMES[tool], run: () => store.patch({ tool, panning: false, toolSelection: s.toolSelection + 1 }), pressed: s.tool === tool && !s.panning }
            : model ? { label: 'Show crash', run: () => cityCommand({ type: 'focus', point: { x: model.x, y: model.y } }) } : undefined,
        detail: <>
            <div className="objective-emergency">
                <p><strong>Route objective:</strong> Connect a road around the blockage so journeys can continue. Use a diversion if needed, and keep a route open for the required crews. The wreck remains until their work is done.</p>
                <p><strong>{s.paused ? 'Time is paused while you plan.' : 'Time is running. Pause to plan.'}</strong> Police secure wrecks, EMS treats injuries before the deadline, and fire crews extinguish burning vehicles. Every required crew needs access from its station. A bypass is not rescue.</p>
                {s.incidentInfo.details.map(i => <p key={i.id}><strong>{i.label}</strong><br />{i.needs}{i.deadlineSeconds !== null && <><br />Rescue deadline: {Math.max(0, Math.ceil(i.deadlineSeconds))} seconds</>}</p>)}
            </div>
            <div className="objective-extras">
                <button onClick={() => store.patch({ paused: !s.paused })}>{s.paused ? 'Run traffic' : 'Pause traffic'}</button>
                {model && <button onClick={() => cityCommand({ type: 'focus', point: { x: model.x, y: model.y } })}>Show crash</button>}
            </div>
        </>,
    };
}

function claimObjective(job: MissionItem): Objective {
    const collect = () => {
        const city = getSave().city;
        const result = claimMissionReward(city, job.id);
        store.patch({ missions: missionSnapshot(city), funds: city.funds, message: result.message });
        flushSave();
    };
    return {
        key: `claim-${job.id}`,
        eyebrow: 'Reward ready',
        title: job.title,
        instruction: job.task,
        progress: {current:job.target,target:job.target,label:`${job.title} progress`},
        reward: `Reward $${job.reward}`,
        primary: { label: `Claim $${job.reward}`, run: collect },
        detail: <>
            <button onClick={()=>store.patch({diagnosticView:job.diagnosticView})}>Show {job.diagnosticView==='capacity'?'visitor':job.diagnosticView} view</button>
            <p>“{job.manager}”</p>
            <p className="objective-hint"><strong>Crew:</strong> {job.crew}</p>

        </>,
    };
}

function jobObjective(s: AppState): Objective | null {
    const jobs = s.missions;
    if (!jobs) return null;
    const index = jobs.items.findIndex(j => j.id === jobs.currentMissionId);
    const job = index < 0 ? undefined : jobs.items[index];
    if (!job) return {
        key: 'jobs-done',
        eyebrow: 'Every job rewarded',
        title: 'Your town',
        instruction: 'Keep the traffic moving. Build wherever you like.',
        detail: <>
            <p>No job is waiting on you. Watch where drivers queue, and give the busy crossings a rule.</p>

        </>,
    };
    // The flow job is judged on how the neighborhood is served, so it reads the traffic
    // instead of prescribing the next building. Every other job keeps its tool action,
    // its note slot empty and therefore its current height.
    const flow = job.id === FLOW_MISSION_ID ? readFlow(s) : null;
    return {
        key: `job-${job.id}`,
        eyebrow: `Job ${index + 1} of ${jobs.items.length}`,
        progress: {current:job.current,target:job.target,label:`${job.title} progress`},
        reward: job.id === FLOW_MISSION_ID ? 'Recognition' : job.landReward ? `Reward: ${job.landReward} land expansion` : job.reward ? `Reward $${job.reward}` : 'Pattern learned',
        title: job.title,
        instruction: job.task,
        note: flow ? <FlowSummaryLine flow={flow} /> : undefined,
        primary: flow ? {
            label: 'Inspect traffic',
            run: () => store.patch({ diagnosticView: 'traffic', tool: 'road', panning: false, toolSelection: s.toolSelection + 1 }),
            pressed: s.diagnosticView === 'traffic' && s.tool === 'road' && !s.panning,
        } : {
            label: TOOL_NAMES[job.tool],
            run: () => store.patch({ tool: job.tool, panning: false, toolSelection: s.toolSelection + 1 }),
            pressed: s.tool === job.tool && !s.panning,
        },
        detail: <>
            {flow
                ? <FlowFeedback flow={flow} place="objective" />
                : <button onClick={()=>store.patch({diagnosticView:job.diagnosticView})}>Show {job.diagnosticView==='capacity'?'visitor':job.diagnosticView} view</button>}
            <p>“{job.manager}”</p>
            <p className="objective-hint"><strong>Crew:</strong> {job.crew}</p>
            <p>{job.landReward ? 'Earn one expansion permit and a land level when this mission is complete.' : job.reward ? `Reward $${job.reward}, paid once you collect it.` : 'A learned pattern to carry into your next neighborhood.'}</p>

        </>,
    };
}
