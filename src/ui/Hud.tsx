import {cityCommand} from '../game/cityControls.ts';
/**
 * Gameplay chrome. Two measured bands only — a thin status header and the build
 * dock — so the map keeps the rest of the screen. Camera controls, the transient
 * toast and (on wide frames) the objective/jobs rail float on the stage layer
 * between them; see docs/claude-ui-handoff/contract.md for the renderer contract.
 */
import { useEffect, useRef, useState } from 'react';
import BuildPalette from './BuildPalette.tsx';
import {TutorialGuidanceProvider,TutorialToast} from './TutorialGuidance.tsx';
import CityDialogs from './CityDialogs.tsx';
import MapControls from './MapControls.tsx';
import MissionBoard, { MissionList } from './MissionBoard.tsx';
import ObjectiveBar from './ObjectiveBar.tsx';
import { NARROW_FRAME, WIDE_FRAME, useFrameWidth } from './useFrameSize.ts';
import { store, useStore } from '../state/store.ts';
import { flushSave } from '../state/save.ts';
import './gameInterface.css';

export default function Hud() {
  const s = useStore();
  const frame = useFrameWidth();
  const wide = frame >= WIDE_FRAME;
  const layout = wide ? 'wide' : frame < NARROW_FRAME ? 'narrow' : 'compact';
  const [panel, setPanel] = useState<'report' | null>(null);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [notice, setNotice] = useState(false);
  const lastMessage = useRef(s.message);
  useEffect(() => {
    if (s.tutorialNotice) { setNotice(true); store.patch({ tutorialNotice: false }); }
  }, [s.tutorialNotice]);
  useEffect(() => { if (!s.incidentInfo.active) setNotice(false); }, [s.incidentInfo.active]);
  useEffect(() => {
    if (s.message === lastMessage.current) return;
    lastMessage.current = s.message;
    if (s.tutorialNotice) { setFeedback(''); return; }
    setFeedback(s.message);
    const timer = setTimeout(() => setFeedback(''), 6000);
    return () => clearTimeout(timer);
  }, [s.message]);

  const compactFunds = s.funds >= 1000000 ? `${(s.funds / 1000000).toFixed(1)}m` : s.funds >= 100000 ? `${Math.floor(s.funds / 1000)}k` : s.funds.toLocaleString();
  const deadlines = s.incidentInfo.details.filter(i => i.deadlineSeconds !== null).map(i => i.deadlineSeconds!);
  // The objective panel already leads on a crash it is handling; do not repeat its countdown.
  const objectiveHasCrash = s.incidentInfo.details.length > 0 && (notice || s.paused);
  const objective = <><TutorialToast /><ObjectiveBar wide={wide} notice={notice} openJobs={() => setJobsOpen(true)} /></>;

  return <TutorialGuidanceProvider wide={wide} blocked={panel!==null||jobsOpen||(notice&&!s.tutorial?.currentId.startsWith('h-'))}><div className="city-ui dispatch-ui" data-layout={layout}>
    <header className="city-header">
      <div className="city-bar">
        <strong className="city-funds" title={`Funds $${s.funds.toLocaleString()}`}>${compactFunds}</strong>
        <div className="city-quick">
          <button aria-label={s.paused ? 'Resume the city' : 'Pause the city'} aria-pressed={s.paused} onClick={() => store.patch({ paused: !s.paused })}>{s.paused ? 'Play' : 'Pause'}</button>
          <button onClick={() => setPanel('report')}>Report</button>
          <button onClick={() => { flushSave(); store.patch({ phase: 'menu' }); }}>Menu</button>
        </div>
      </div>
      <p className="city-live">
        <span><b>{s.activeTrips}</b> on road</span>
        <span><b>{s.demand.visits}</b> parked</span>
        <span><b>{s.waiting}</b> waiting</span>
      </p>
      {s.roadIssues.length>0&&!['h-home','h-store'].includes(s.tutorial?.currentId??'')&&<button className="city-warning" onClick={()=>cityCommand({type:'focus',point:s.roadIssues[0]})}>{s.roadIssues.length} Home{s.roadIssues.length===1?'':'s'} · {s.roadIssues[0].reason} · Show</button>}
      {s.incidentInfo.active > 0 && !objectiveHasCrash
        ? <button className="city-alert" onClick={() => setPanel('report')}>
            {s.incidentInfo.active} crash{s.incidentInfo.active > 1 ? 'es' : ''} · {deadlines.length ? `${Math.max(0, Math.ceil(Math.min(...deadlines)))}s to rescue` : 'response needed'}
          </button>
        : !!s.incidentInfo.warning && <p className="city-warning" role="status">Crossing conflict · watch the warning</p>}
    </header>

    <div className="city-stage">
      {wide && <aside className="city-rail city-rail-left">
        {objective}
        <MissionList openAll={() => setJobsOpen(true)} />
      </aside>}
      <aside className="city-rail city-rail-right">
        <MapControls wide={wide} />
        {wide && <>
          <dl className="city-readout">
            <div><dt>Trips / 60s</dt><dd>{s.throughput}</dd></div>
            <div><dt>Mean wait</dt><dd>{s.throughput ? `${s.averageWait.toFixed(1)}s` : '—'}</dd></div>
            <div><dt>Longest stop</dt><dd>{s.longestStop.toFixed(1)}s</dd></div>
            <div><dt>Homes linked</dt><dd>{s.connected}/{s.homes}</dd></div>
          </dl>
          <button className="city-readout-more" onClick={() => setPanel('report')}>City report</button>
        </>}
      </aside>
      {feedback && <div className="city-toast" role="status">{feedback}</div>}
    </div>

    <footer className="city-controls">
      {!wide && objective}
      <BuildPalette />
    </footer>

    <MissionBoard open={jobsOpen} close={() => setJobsOpen(false)} />
    <CityDialogs panel={panel} close={() => setPanel(null)} />
  </div></TutorialGuidanceProvider>;
}
