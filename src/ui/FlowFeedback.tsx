/**
 * FLOW-02 presentation only: how well the neighborhood is being served right now.
 *
 * The model owns every number and both sentences (`label`, `reason`); this file never
 * derives a verdict of its own. It appears twice, in the current objective (one compact
 * line, plus the same detail inside Details) and near the top of the Dashboard, so a
 * player reading either surface sees the same service, worded the same way.
 *
 * Deliberately absent: a countdown, a prescribed fix, and any live region. The counts are
 * polled from the simulation, so announcing them would talk over the player.
 */
import { type ReactNode } from 'react';
import type { AppState } from '../state/store.ts';
import './flowFeedback.css';

/** The one job that carries flow feedback; other jobs keep their existing card. */
export const FLOW_MISSION_ID = 'neighborhood-flow';

/** Recent counts cover this many simulated seconds, not wall-clock seconds. */
const WINDOW_SECONDS = 60;

type FlowSnapshot = NonNullable<AppState['flow']>;
export function readFlow(s: AppState): FlowSnapshot | null { return s.flow; }

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The compact line, shown in the objective's note area. One line of current service. */
export function FlowSummaryLine({ flow }: { flow: FlowSnapshot }): ReactNode {
    return <span className="flow-note">
        Flow: {flow.label} · {flow.qualifiedHomes}/{flow.targetHomes} homes served
    </span>;
}

/**
 * The shared detail. `objective` sits inside the job's Details; `dashboard` sits near the
 * top of the report and keeps reporting current service after the job has been earned.
 */
export default function FlowFeedback({ flow, place }: { flow: FlowSnapshot | null; place: 'objective' | 'dashboard' }) {
    if (!flow) return null;
    const road = flow.selectedRoad;
    return <section className="flow-feedback" data-place={place} aria-label="Neighborhood shopping service">
        <h3 className="flow-heading">Neighborhood Flow</h3>
        {place === 'dashboard' && flow.earned && <p className="flow-earned">
            Recognition earned. It stays yours as your town changes.
        </p>}
        <p className="flow-state"><strong>{flow.label}</strong></p>
        <p className="flow-reason">{flow.reason}</p>
        <dl className="flow-stats">
            <div><dt>Homes served</dt><dd>{flow.qualifiedHomes}/{flow.targetHomes}</dd></div>
            <div><dt>Visits ({WINDOW_SECONDS}s)</dt><dd>{flow.visits}</dd></div>
            <div><dt>Returns ({WINDOW_SECONDS}s)</dt><dd>{flow.returns}</dd></div>
            <div><dt>Open shopping needs</dt><dd>{flow.pendingNeeds}</dd></div>
            <div><dt>Waiting cars</dt><dd>{flow.waitingVehicles}</dd></div>
            <div><dt>Routes missing</dt><dd>{flow.accessLimitedHomes}</dd></div>
            <div><dt>Homes awaiting space</dt><dd>{flow.capacityLimitedHomes}</dd></div>
            <div><dt>Homes without returns</dt><dd>{flow.homesWithoutReturn}</dd></div>
        </dl>
        <div className="flow-road">
            <h4>Selected road approach</h4>
            {road ? <>
                <p>{road.label} · tile {road.x}, {road.y}</p>
                <p>{plural(road.vehicles, 'vehicle')} nearby · {road.waiting} waiting · longest stop {road.longestStop.toFixed(1)}s</p>
            </> : <p className="flow-hint">Use Road and tap a road. This reads the approach within two road tiles.</p>}
        </div>
        <p className="flow-hint">Shopping visits and returns cover {WINDOW_SECONDS}s. Needs include trips underway; waiting includes shop exits.</p>
        <p className="flow-hint">Try routes, controls or nearby stores. No countdown.</p>
    </section>;
}
