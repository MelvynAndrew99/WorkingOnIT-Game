import {incidentServices} from '../game/cityIncidents.ts';
/**
 * One objective at a time, always on the game screen.
 *
 * The tutorial, an emergency and the manager's paid jobs used to be separate stacked
 * panels competing for the same "what should I do next" attention. They are one
 * surface here: a crash outranks everything, then a claimable reward, then the active
 * lesson, then the current job. Explanations live behind More on a phone and are
 * always open in the desktop rail, so routine teaching never needs a modal.
 */
import { type ReactNode, useEffect, useState } from 'react';
import { cityCommand } from '../game/cityControls.ts';
import { claimMissionReward, missionSnapshot, type MissionItem } from '../game/cityMissions.ts';
import { flushSave, getSave } from '../state/save.ts';
import { store, useStore, type AppState } from '../state/store.ts';
import { TOOL_NAMES, tutorialObjective } from './TutorialCoach.tsx';
import './objectiveBar.css';
import ManagerPopup from './ManagerPopup.tsx';
import { starterManagerReady } from '../game/cityStarterTutorial.ts';

export interface Objective {
    key: string;
    eyebrow: string;
    title?: string;
    instruction: string;
    /** A short highlighted line under the instruction, e.g. the mayor's cost waiver. */
    note?: string;
    urgent?: boolean;
    primary?: { label: string; run: () => void; pressed?: boolean };
    secondary?: { label: string; run: () => void };
    optional?: { label: string; run: () => void };
    detail?: ReactNode;
}

const SERVICE_BUILDINGS = { police: 'policeStation', ems: 'hospital', fire: 'fireStation' } as const;

/** `notice` (an unacknowledged crash) is owned by Hud, which needs the same value to
 *  avoid repeating the rescue countdown in its header alert. */
export default function ObjectiveBar({ wide, notice, openJobs }: { wide: boolean; notice: boolean; openJobs: () => void }) {
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
    const objective = pickObjective(s, { notice, openJobs });
    useEffect(() => { setOpen(false); }, [objective?.key]);
    if (!objective) return null;
    const showDetail = !!objective.detail && (wide || open);
    return <><section className="objective-bar" data-starter={s.tutorial?.currentId.startsWith('h-') ? 'true' : 'false'} data-urgent={objective.urgent ? 'true' : 'false'} data-wide={wide ? 'true' : 'false'} aria-label="Current objective">
        <div className="objective-row">
            <div className="objective-text">
                <p className="objective-eyebrow">{objective.eyebrow}</p>
                {wide && objective.title && <h2 className="objective-title">{objective.title}</h2>}
                <p className="objective-instruction" aria-live="polite">{objective.instruction}</p>
                {objective.note && <p className="objective-note">{objective.note}</p>}
            </div>
            <div className="objective-buttons">
                {objective.primary && <button type="button" className="objective-primary"
                    aria-pressed={objective.primary.pressed} onClick={objective.primary.run}>{objective.primary.label}</button>}
                {objective.secondary && <button type="button" className="objective-more" onClick={objective.secondary.run}>{objective.secondary.label}</button>}
                {objective.optional && <button type="button" className="objective-more" onClick={objective.optional.run}>{objective.optional.label}</button>}
                {objective.detail && !wide && <button type="button" className="objective-more"
                    aria-expanded={open} aria-controls="objective-detail"
                    onClick={() => setOpen(!open)}>{open ? 'Less' : 'More'}</button>}
            </div>
        </div>
        {s.tutorial?.status === 'active' && s.paused && <div className="objective-pause-status" role="status">
            <span><strong>Paused</strong> · help timer stopped</span>
            {objective.primary?.label !== 'Run traffic' && <button type="button" className="objective-primary" onClick={() => store.patch({ paused: false })}>Run traffic</button>}
        </div>}
        {canBrief && <div className="objective-extras"><button type="button" className="objective-more" onClick={openManager}>Manager's plan</button></div>}
        {showDetail && <div id="objective-detail" className="objective-detail">{objective.detail}</div>}
    </section><ManagerPopup open={managerOpen} paused={s.paused} example={s.incidentInfo.active === 0} onClose={() => setManagerOpen(false)} onBuildRoad={planRoad} /></>;
}

/** A crash outranks a reward; a reward outranks the lesson; the lesson outranks the jobs. */
function pickObjective(s: AppState, ctx: { notice: boolean; openJobs: () => void }): Objective | null {
    if (s.tutorial?.currentId.startsWith('h-') && (s.tutorial.status === 'active' || (s.tutorial.status === 'complete' && !getSave().city.external?.gateway))) return tutorialObjective(s, ctx);
    const emergency = (ctx.notice || s.paused) && s.incidentInfo.active > 0 ? emergencyObjective(s, ctx.openJobs) : null;
    if (emergency) return emergency;
    const ready = s.missions?.items.find(j => j.done && !j.claimed);
    if (ready) return claimObjective(ready, ctx.openJobs);
    return tutorialObjective(s, ctx) ?? jobObjective(s, ctx.openJobs);
}

/** Shown to every player, guided or not: a wreck is the most important thing on the map. */
function emergencyObjective(s: AppState, openJobs: () => void): Objective | null {
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
                <button onClick={openJobs}>Jobs</button>
            </div>
        </>,
    };
}

function claimObjective(job: MissionItem, openJobs: () => void): Objective {
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
        instruction: `${job.title} is done. Collect $${job.reward}.`,
        primary: { label: `Claim $${job.reward}`, run: collect },
        detail: <>
            <h3>{job.title}</h3>
            <p>“{job.manager}”</p>
            <p className="objective-hint"><strong>Crew:</strong> {job.crew}</p>
            <div className="objective-extras"><button onClick={openJobs}>All jobs</button></div>
        </>,
    };
}

function jobObjective(s: AppState, openJobs: () => void): Objective | null {
    const jobs = s.missions;
    if (!jobs) return null;
    const index = jobs.items.findIndex(j => !j.done);
    const job = index < 0 ? undefined : jobs.items[index];
    if (!job) return {
        key: 'jobs-done',
        eyebrow: 'Every job rewarded',
        title: 'Your town',
        instruction: 'Keep the traffic moving. Build wherever you like.',
        detail: <>
            <p>No job is waiting on you. Watch where drivers queue, and give the busy crossings a rule.</p>
            <div className="objective-extras"><button onClick={openJobs}>All jobs</button></div>
        </>,
    };
    return {
        key: `job-${job.id}`,
        eyebrow: `Job ${index + 1} of ${jobs.items.length} · ${job.current}/${job.target} · ${job.landReward ? '1 land expansion' : `$${job.reward}`}`,
        title: job.title,
        instruction: job.task,
        primary: {
            label: TOOL_NAMES[job.tool],
            run: () => store.patch({ tool: job.tool, panning: false, toolSelection: s.toolSelection + 1 }),
            pressed: s.tool === job.tool && !s.panning,
        },
        detail: <>
            <h3>{job.title}</h3>
            <p>“{job.manager}”</p>
            <p className="objective-hint"><strong>Crew:</strong> {job.crew}</p>
            <p>{job.landReward ? 'Earn one expansion permit and a land level when this mission is complete.' : `Reward $${job.reward}, paid once you collect it.`}</p>
            <div className="objective-extras"><button onClick={openJobs}>All jobs</button></div>
        </>,
    };
}
