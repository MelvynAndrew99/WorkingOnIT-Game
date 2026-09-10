import VehicleDebugPanel from './VehicleDebug.tsx';
import PauseMenu from './PauseMenu.tsx';
import {DiagnosticLegend} from './DiagnosticViews.tsx';
import CityStats from './CityStats.tsx';
import {cityCommand} from '../game/cityControls.ts';
/** React allocates all persistent chrome; Pixi measures only .city-map-viewport. */
import { useEffect, useRef, useState } from 'react';
import BuildPalette from './BuildPalette.tsx';
import {TutorialGuidanceProvider,TutorialToast} from './TutorialGuidance.tsx';
import CityDialogs from './CityDialogs.tsx';
import MapControls from './MapControls.tsx';
import MissionBoard from './MissionBoard.tsx';
import ObjectiveBar from './ObjectiveBar.tsx';
import { NARROW_FRAME, WIDE_FRAME, useFrameSize } from './useFrameSize.ts';
import { store, useStore } from '../state/store.ts';
import { flushSave } from '../state/save.ts';
import './gameInterface.css';
import './uiTopBar.css';
import './missionCard.css';

export default function Hud() {
  const s = useStore();
  const frame = useFrameSize();
  const wide = frame.width >= WIDE_FRAME || (frame.width >= 760 && frame.height < 550);
  const layout = wide ? 'wide' : frame.width < NARROW_FRAME ? 'narrow' : 'compact';
  const [panel, setPanel] = useState<'report' | null>(null);
  const dashboardButton = useRef<HTMLButtonElement>(null);
  const openDashboard = () => { store.patch({vehicleDebugOpen:false}); setPanel('report'); };
  const closeDashboard = () => { setPanel(null); requestAnimationFrame(()=>dashboardButton.current?.focus()); };
  const openDebug = () => { setPanel(null); store.patch({vehicleDebugOpen:true,panning:false,tool:null}); };
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

  const deadlines = s.incidentInfo.details.filter(i => i.deadlineSeconds !== null).map(i => i.deadlineSeconds!);
  // The objective panel already leads on a crash it is handling; do not repeat its countdown.
  const objectiveHasCrash = s.incidentInfo.details.length > 0 && (notice || s.paused);
  const objective = <ObjectiveBar wide={wide} notice={notice} openJobs={() => setJobsOpen(true)} />;

  return <TutorialGuidanceProvider wide={wide} blocked={jobsOpen||(notice&&!s.tutorial?.currentId.startsWith('h-'))}><div className="city-ui dispatch-ui" data-layout={layout} data-short={frame.height < 550} style={{'--frame-height': `${frame.height}px`} as React.CSSProperties}>
    <header className="city-header city-top-bar" aria-label="City statistics and actions">
      <CityStats funds={s.funds} visitors={s.demand.visits} onRoad={s.activeTrips} fatalities={s.fatalities} elapsedSeconds={s.elapsedSeconds} />
      <nav className="city-global-actions" aria-label="City actions">
        <button aria-pressed={s.diagnosticView==='traffic'} onClick={()=>store.patch({diagnosticView:s.diagnosticView==='traffic'?'normal':'traffic'})}>Heatmap</button>
        <button ref={dashboardButton} aria-expanded={panel==='report'} aria-controls="city-dashboard" onClick={()=>panel?closeDashboard():openDashboard()}>Dashboard</button>
        <button aria-pressed={s.vehicleDebugOpen} onClick={()=>s.vehicleDebugOpen ? store.patch({vehicleDebugOpen:false}) : openDebug()}>Debug</button>
        <button aria-label={s.paused?'Resume the city':'Pause the city'} aria-pressed={s.paused} onClick={()=>store.patch({paused:!s.paused})}>{s.paused?'Resume':'Pause'}</button>
        <button onClick={()=>{flushSave();store.patch({phase:'menu'});}}>Menu</button>
      </nav>
    </header>

    <main className="city-stage" aria-label="Town map area">
      <div className="city-map-toolbar">
        <MapControls wide={wide} />
        <DiagnosticLegend />
      </div>
      <div className="city-map-content">
        <div className="city-map-viewport" aria-label="Playable map" />
        <VehicleDebugPanel />
        <CityDialogs panel={panel} close={closeDashboard} openDebug={openDebug} />
      </div>
      <div className="city-feedback-region" role="status">
        <TutorialToast />
      {s.roadIssues.length>0&&!['h-home','h-store'].includes(s.tutorial?.currentId??'')&&<button className="city-warning" onClick={()=>cityCommand({type:'focus',point:s.roadIssues[0]})}>{s.roadIssues.length} Home{s.roadIssues.length===1?'':'s'} · {s.roadIssues[0].reason} · Show</button>}
      {s.incidentInfo.active > 0 && !objectiveHasCrash
        ? <button className="city-alert" onClick={openDashboard}>
            {s.incidentInfo.active} crash{s.incidentInfo.active > 1 ? 'es' : ''} · {deadlines.length ? `${Math.max(0, Math.ceil(Math.min(...deadlines)))}s to rescue` : 'response needed'}
          </button>
        : !!s.incidentInfo.warning && <p className="city-warning" role="status">Crossing conflict · watch the warning</p>}
        {feedback && <p>{feedback}</p>}
      </div>
    </main>

    <footer className="city-controls" aria-label="Mission and construction dock">
      <section className="city-mission-region" aria-label="Mission area">
        {objective}
      </section>
      <section className="city-build-region" aria-label="Build area">
        <BuildPalette />

      </section>
    </footer>

    <PauseMenu />
    <MissionBoard open={jobsOpen} close={() => setJobsOpen(false)} />
  </div></TutorialGuidanceProvider>;
}
