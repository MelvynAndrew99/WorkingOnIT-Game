import { useEffect, useRef, useState } from 'react';
import { store, useStore } from '../state/store.ts';
import { getSave, flushSave } from '../state/save.ts';
import { claimMissionReward, missionSnapshot } from '../game/cityMissions.ts';
import { starterToolAllowed } from '../game/cityStarterTutorial.ts';
import TutorialPanel from './TutorialPanel.tsx';
import './missionBoard.css';

function claim(id: string): void {
  const city = getSave().city, result = claimMissionReward(city, id);
  store.patch({ missions: missionSnapshot(city), funds: city.funds, message: result.message });
  flushSave();
}

/** Desktop rail summary. The current job and its reward already lead in ObjectiveBar. */
export function MissionList({ openAll }: { openAll: () => void }) {
  const s = useStore(), jobs = s.missions;
  if (!jobs) return null;
  return <section className="mission-rail" aria-labelledby="mission-rail-heading">
    <h2 id="mission-rail-heading">Jobs <span>{jobs.recognition}/{jobs.items.length}</span></h2>
    <ol>{jobs.items.map(j => <li key={j.id} data-done={j.done}>
      <div className="mission-rail-row"><strong>{j.title}</strong><span>{j.claimed ? (j.landReward ? 'Land earned' : 'Paid') : j.done ? 'Ready' : `${j.current}/${j.target}`}</span></div>
      <progress aria-label={`${j.title} progress`} value={j.current} max={j.target} />
      {j.done && !j.claimed && <button className="mission-claim" onClick={() => claim(j.id)}>Claim ${j.reward}</button>}
    </li>)}</ol>
    <button className="mission-rail-all" onClick={openAll}>Job details & city link</button>
  </section>;
}

/** The full list, the manager's advice and the outside-city link. Opened on request. */
export default function MissionBoard({ open, close }: { open: boolean; close: () => void }) {
  const s = useStore(), jobs = s.missions;
  const [tab, setTab] = useState<'missions' | 'connection'>('missions');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) { if (store.get().tutorial?.currentId === 'h-connect') setTab('connection'); dialog.current?.showModal(); } else dialog.current?.close(); }, [open]);
  return <dialog className="mission-dialog" ref={dialog} onCancel={close} onClose={close} aria-labelledby="mission-heading">
    <header><h2 id="mission-heading">{tab === 'missions' ? 'Your next big idea' : 'A growing town'}</h2><button onClick={close}>Close</button></header>
    <div className="mission-links"><button aria-pressed={tab === 'missions'} onClick={() => setTab('missions')}>Jobs</button><button aria-pressed={tab === 'connection'} onClick={() => setTab('connection')}>City link & guide</button></div>
    {tab === 'connection' ? <TutorialPanel close={close} /> : <>
      <p className="mission-standing">Recognition {jobs?.recognition ?? 0}/{jobs?.items.length ?? 4} · {s.paused ? 'Town paused' : 'Town running'}</p>
      <p>Bring people to town. Complete a job and claim its reward. {s.tutorial?.status === 'active' && s.tutorial.currentId.startsWith('h-') ? 'Tools unlock as you learn. Follow the current tutorial objective first.' : 'Every tool is available; planning ahead counts.'}</p>
      <ol className="mission-list">{jobs?.items.map(j => <li key={j.id} data-done={j.done}>
        <div className="mission-item-heading"><h3>{j.title}</h3><span>{j.claimed ? (j.landReward ? 'Land earned' : 'Claimed') : j.done ? 'Ready' : `${j.current}/${j.target}`}</span></div>
        <p>{j.task}</p><progress aria-label={`${j.title} progress`} value={j.current} max={j.target} />
        <div className="mission-reward-row"><strong>{j.landReward ? `Reward: ${j.landReward} land expansion + level up` : `Reward $${j.reward}`}</strong>{j.done
          ? j.landReward ? <span>Permit awarded on completion</span> : <button disabled={j.claimed} onClick={() => claim(j.id)}>{j.claimed ? 'Collected' : `Claim $${j.reward}`}</button>
          : <button disabled={!starterToolAllowed(getSave().city, j.tool)} title={!starterToolAllowed(getSave().city, j.tool) ? 'This tool unlocks in a later tutorial lesson' : undefined} onClick={() => { if (!starterToolAllowed(getSave().city, j.tool)) return; store.patch({ tool: j.tool, panning: false, toolSelection: s.toolSelection + 1 }); close(); }}>Choose tool</button>}</div>
        <details><summary>The manager’s advice</summary><p>“{j.manager}”</p><p className="mission-crew"><strong>Crew:</strong> {j.crew}</p></details>
      </li>)}</ol>
      <details className="mission-budget"><summary>Construction spending</summary><dl><div><dt>Roads</dt><dd>${jobs?.roadsSpent.toLocaleString() ?? 0}</dd></div><div><dt>Homes & destinations</dt><dd>${jobs?.buildingsSpent.toLocaleString() ?? 0}</dd></div><div><dt>Public services</dt><dd>${jobs?.servicesSpent.toLocaleString() ?? 0}</dd></div></dl><p>Removing construction refunds what you paid for it. Early services never cost you recognition. Each mission reward can be claimed once.</p></details>
    </>}
  </dialog>;
}
