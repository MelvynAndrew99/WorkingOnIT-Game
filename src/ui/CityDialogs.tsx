import { useEffect, useRef } from 'react';
import DiagnosticViews from './DiagnosticViews.tsx';
import FlowFeedback, { readFlow } from './FlowFeedback.tsx';
import { useStore } from '../state/store.ts';
import './cityDialogs.css';

/** Existing report content, now a reserved nonmodal Dashboard. */
export default function CityDialogs({ panel, close, openDebug }: { panel: 'report' | null; close: () => void; openDebug: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null), s = useStore();
  useEffect(() => { if (panel) heading.current?.focus(); }, [panel]);
  if (!panel) return null;
  return <section className="city-dashboard" id="city-dashboard" aria-labelledby="city-dashboard-title" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
    <div className="dashboard-heading"><h2 ref={heading} tabIndex={-1} id="city-dashboard-title">Dashboard</h2><button onClick={close} aria-label="Close Dashboard"><span aria-hidden="true">×</span></button></div>
    {/* Current service leads the report, whether or not the job has been earned. */}
    <FlowFeedback flow={readFlow(s)} place="dashboard" />
    <section aria-label="Map views"><h3>Map views</h3><DiagnosticViews onDebug={openDebug} /></section>
    <section className="dashboard-definitions" aria-label="Statistics definitions">
      <h3>What the numbers mean</h3>
      <p>Visitors: people currently parked for shopping or leisure, excluding reserved arriving spaces.</p>
      <p>On Road: active civilian journeys, including waiting drivers. Excludes parked visits, crashed vehicles and emergency crews.</p>
      <p>Time: saved simulation elapsed time. Pause freezes it. Weather is not simulated.</p>
      <p>Fatalities: total lives lost in this city.</p>
    </section>
    <div className="city-report-grid">
      <section><h3>Visits and income</h3>
        <p>${s.funds.toLocaleString()} available · ${s.income} recurring income / 10s</p>
        <p>{s.connected}/{s.homes} homes connected · {s.completed} journeys completed</p>
        <p>{s.demand.shopping} shopping needs · {s.demand.leisure} recreation needs</p>
        <p>{s.demand.visits} visits in progress</p>
        <p>Shopping pays when the visit completes. Recent park visits support household income. A full destination reserves its spaces for visitors already there or on their way.</p>
      </section>
      {s.inspected && <section><h3>{s.inspected.name}</h3><p>{s.inspected.label}</p>{s.inspected.capacity > 0 && <p>{s.inspected.occupied}/{s.inspected.capacity} spaces occupied · {s.inspected.inbound} arriving</p>}</section>}
      <section><h3>Traffic and emergency response</h3>
        {s.incidentInfo.active > 0 && <p><strong>Manager:</strong> “Loop a road around that mess. Keep them driving while we get the crews in. A very visible recovery, thanks to my leadership.”</p>}
        <p>{s.waiting} waiting now · {s.throughput} trips / last 60s</p>
        <p>Mean completed-trip wait: {s.throughput ? `${s.averageWait.toFixed(1)}s` : '—'} · Longest current stop: {s.longestStop.toFixed(1)}s</p>
        <p>{s.tripSeconds === null ? 'Connect homes to stores to start trips.' : `Free-flow driving route: ${s.tripSeconds.toFixed(1)}s, excluding queues and visits.`}</p>
        <p>{s.incidentInfo.warning || 'No current junction warnings.'}</p>
        <p>{s.incidentInfo.active} active accidents · {s.rescued} rescues · {s.fatalities} lives lost</p>
        {s.incidentInfo.details.map(i => <article className="incident-detail" key={i.id}><strong>{i.label}</strong><p>{i.needs}</p>{i.deadlineSeconds !== null && <p>Rescue deadline: {Math.max(0, Math.ceil(i.deadlineSeconds))}s</p>}</article>)}
      </section>
      <section><h3>How crossings and crews behave</h3>
        <p>Repeated conflicting arrivals make an unsigned crossing dangerous. Stops suit moderate traffic; busy stops can need lights or another route. Signals separate crossing traffic, but heavy opposing turns sharing green can need different timing or separate routes. Watch the junction warning. Emergency crews travel from their actual stations and need a usable route to the scene.</p>
        <p>Responding crews can cross red lights when the junction is clear. Traffic yields, and crews can pass queues in a clear opposing lane on straight roads with space to merge back. Blocked lanes still delay a rescue. Returning crews follow normal traffic rules.</p>
      </section>
    </div>
    <p>{s.paused ? 'Paused: visit and rescue timers are frozen.' : 'The city continues running while this report is open. Use Pause before planning a longer repair.'}</p>
  </section>;
}
