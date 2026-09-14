import { useEffect, useRef, type RefObject } from 'react';
import { cityCommand } from '../game/cityControls.ts';
import { mergePulseIssues, type CityPulse, type PulseIssue } from '../game/cityPulse.ts';
import { useStore } from '../state/store.ts';
import { IconAlert, IconBus, IconHome, IconSiren, IconTarget, IconTracker } from './hudIcons.tsx';
import './cityPulse.css';

const TRIPS_TITLE = 'Civilian journeys that reached home. Watch this rise as traffic keeps moving.';
const RECENT_TITLE = 'Completed trips in the last 60 seconds of city time. This is the live optimization pulse.';
const WAIT_TITLE = 'Average wait of those recent completed trips. Lower means smoother commutes.';
const SHOP_TITLE = 'Shopping round trips in the last 60s. Title includes people driving, parked at shops, and unmet needs.';
const PARK_TITLE = 'Park visits in the last 60s. Title includes people driving, parked at parks, and unmet needs.';
const WORK_TITLE = 'Work commutes in the last 60s. Title includes people driving, at the office, and unmet needs.';
const BUS_TITLE = 'Completed bus rides. Title includes riders waiting and already aboard.';

function count(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('en-US');
}

function purposeTitle(label: string, pulse: CityPulse['shopping']): string {
  return `${label}. ${count(pulse.driving)} on the road, ${count(pulse.parked)} parked, ${count(pulse.needed)} still needed.`;
}

export function pulseIssuesFromStore(s: {
  pulse: CityPulse;
  roadIssues: { homeId: number; x: number; y: number; reason: string }[];
  busStopNotices: { id: number; x: number; y: number; reason: string; waiting: number }[];
}): PulseIssue[] {
  return mergePulseIssues(s.pulse, { homes: s.roadIssues, busStops: s.busStopNotices });
}

function showIssue(issue: PulseIssue) {
  cityCommand({ type: 'focus', point: { x: issue.x, y: issue.y } });
}

function waitText(pulse: CityPulse): string {
  return pulse.recent ? `${pulse.averageWait.toFixed(1)}s` : '–';
}

/**
 * Always-on commute strip. Recent flow (what your roads are doing now) is grouped apart
 * from lifetime totals, and the recent purposes show as one proportion bar.
 * Counters stay quiet (no aria-live).
 */
export function CityPulseBar({ pulse }: { pulse: CityPulse }) {
  const shopTitle = purposeTitle(SHOP_TITLE, pulse.shopping);
  const parkTitle = purposeTitle(PARK_TITLE, pulse.leisure);
  const workTitle = purposeTitle(WORK_TITLE, pulse.work);
  const busTitle = `${BUS_TITLE} ${count(pulse.bus.waiting)} waiting, ${count(pulse.bus.aboard)} aboard, ${count(pulse.bus.running)} buses running.`;
  const mix = [
    { key: 'shop', label: 'Shop', title: shopTitle, value: pulse.shopping.recent },
    { key: 'work', label: 'Work', title: workTitle, value: pulse.work.recent },
    { key: 'park', label: 'Park', title: parkTitle, value: pulse.leisure.recent },
  ];
  const mixTotal = mix.reduce((n, part) => n + Math.max(0, part.value), 0);
  return (
    <div className="city-pulse-bar" role="group" aria-label="How people are moving">
      <div className="pulse-group is-recent">
        <span className="pulse-group-label" title={RECENT_TITLE}>Last 60s</span>
        <dl className="pulse-stats">
          <div className="city-stat is-lead">
            <dt title={RECENT_TITLE}>Trips</dt>
            <dd title={RECENT_TITLE}>{count(pulse.recent)}</dd>
          </div>
          <div className="city-stat">
            <dt title={WAIT_TITLE}>Avg wait</dt>
            <dd title={WAIT_TITLE}>{waitText(pulse)}</dd>
          </div>
        </dl>
        <div className="pulse-mix">
          <dl className="pulse-stats">
            {mix.map(part => (
              <div key={part.key} className={`city-stat is-${part.key}`}>
                <dt title={part.title}>{part.label}</dt>
                <dd title={part.title}>{count(part.value)}</dd>
              </div>
            ))}
          </dl>
          <div className={`pulse-mix-bar${mixTotal ? '' : ' is-empty'}`} aria-hidden="true">
            {mixTotal > 0 && mix.map(part => part.value > 0 && (
              <span key={part.key} className={`is-${part.key}`} style={{ flexGrow: part.value }} />
            ))}
          </div>
        </div>
      </div>
      <div className="pulse-group is-total">
        <span className="pulse-group-label">All time</span>
        <dl className="pulse-stats">
          <div className="city-stat">
            <dt title={TRIPS_TITLE}>Trips</dt>
            <dd title={TRIPS_TITLE}>{count(pulse.trips)}</dd>
          </div>
          <div className="city-stat">
            <dt title={busTitle}>Bus rides</dt>
            <dd title={busTitle}>{count(pulse.bus.completed)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function TrackerToggle({
  open,
  count,
  buttonRef,
  onToggle,
}: {
  open: boolean;
  count: number;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  const label = count > 0
    ? `Tracker, ${count} open ${count === 1 ? 'issue' : 'issues'}`
    : 'Tracker';
  return (
    <button
      ref={buttonRef}
      className="hud-icon-btn tracker-toggle"
      aria-label={label}
      aria-expanded={open}
      aria-controls="city-tracker"
      onClick={onToggle}
    >
      <IconTracker />
      <span>Tracker</span>
      {count > 0 && <b className="tracker-badge" aria-hidden="true">{count > 9 ? '9+' : count}</b>}
    </button>
  );
}

const ISSUE_KIND: Record<PulseIssue['kind'], string> = {
  crash: 'Emergency',
  risk: 'Crash risk',
  home: 'Stranded home',
  'bus-stop': 'Bus stop',
};

function IssueIcon({ kind }: { kind: PulseIssue['kind'] }) {
  return kind === 'crash' ? <IconSiren /> : kind === 'home' ? <IconHome /> : kind === 'bus-stop' ? <IconBus /> : <IconAlert />;
}

/** Kind first so a player knows what sort of problem it is before reading coordinates. */
function IssueKicker({ issue }: { issue: PulseIssue }) {
  return (
    <span className="issue-kicker">
      {ISSUE_KIND[issue.kind]}
      {issue.sticky && <span className="issue-tag">Cooling down</span>}
    </span>
  );
}

/** Persistent chip while the tracker is closed. Does not auto-hide. */
export function TrackerChip({ issues, onOpen }: { issues: PulseIssue[]; onOpen: (issue: PulseIssue) => void }) {
  const first = issues[0];
  if (!first) return null;
  const more = issues.length - 1;
  return (
    <button
      className={`tracker-chip is-${first.severity} is-${first.kind}`}
      aria-label={`${issues.length === 1 ? '' : `${issues.length} to watch. `}${ISSUE_KIND[first.kind]}: ${first.title}. ${first.detail} Show on map.`}
      onClick={() => onOpen(first)}
    >
      <span className="tracker-chip-icon"><IssueIcon kind={first.kind} /></span>
      <span className="tracker-chip-text">
        <IssueKicker issue={first} />
        <span className="tracker-chip-line">
          <strong>{first.title}</strong>
          <span className="tracker-chip-detail">{first.detail}</span>
        </span>
      </span>
      {more > 0 && <span className="tracker-chip-more">+{more} more</span>}
      <span className="tracker-chip-show"><IconTarget />Show</span>
    </button>
  );
}

function IssueRow({ issue }: { issue: PulseIssue }) {
  return (
    <button className={`pulse-issue is-${issue.severity} is-${issue.kind}`} onClick={() => showIssue(issue)}>
      <span className="pulse-issue-icon"><IssueIcon kind={issue.kind} /></span>
      <span className="pulse-issue-text">
        <IssueKicker issue={issue} />
        <strong>{issue.title}</strong>
        <span>{issue.detail}</span>
      </span>
    </button>
  );
}

export default function CityPulsePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const s = useStore();
  const issues = pulseIssuesFromStore(s);
  useEffect(() => { if (open) heading.current?.focus(); }, [open]);
  if (!open) return null;
  const pulse = s.pulse;
  const driving = pulse.shopping.driving + pulse.leisure.driving + pulse.work.driving;
  const parked = pulse.shopping.parked + pulse.leisure.parked + pulse.work.parked;
  return (
    <section
      className="city-pulse-panel"
      id="city-tracker"
      aria-labelledby="city-tracker-title"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <div className="dashboard-heading">
        <h2 ref={heading} tabIndex={-1} id="city-tracker-title">City tracker</h2>
        <button onClick={onClose} aria-label="Close Tracker"><span aria-hidden="true">×</span></button>
      </div>

      <section className="pulse-issues" aria-label="Open issues">
        <h3>Until it is fixed</h3>
        {issues.length === 0
          ? <p className="pulse-empty">No open warnings. Failed-yield risks stay listed after they cool, until you add a control or the crossing stays quiet.</p>
          : issues.map(issue => <IssueRow key={issue.id} issue={issue} />)}
      </section>

      <section aria-label="Daily commutes">
        <h3>Daily commutes</h3>
        <p>{count(pulse.trips)} journeys home · {count(pulse.recent)} in the last 60s · {waitText(pulse)} mean wait</p>
        <p>{count(driving)} driving now · {count(pulse.waiting)} waiting in traffic · {count(parked)} parked at destinations</p>
        <dl className="pulse-commute">
          <div><dt>Shopping</dt><dd>{count(pulse.shopping.recent)} recent · {count(pulse.shopping.driving)} out · {count(pulse.shopping.parked)} in store · {count(pulse.shopping.needed)} needed</dd></div>
          <div><dt>Work</dt><dd>{count(pulse.work.recent)} recent · {count(pulse.work.driving)} out · {count(pulse.work.parked)} at office · {count(pulse.work.needed)} needed</dd></div>
          <div><dt>Parks</dt><dd>{count(pulse.leisure.recent)} recent · {count(pulse.leisure.driving)} out · {count(pulse.leisure.parked)} visiting · {count(pulse.leisure.needed)} needed</dd></div>
          <div><dt>Buses</dt><dd>{count(pulse.bus.completed)} rides · {count(pulse.bus.waiting)} waiting · {count(pulse.bus.aboard)} aboard · {count(pulse.bus.running)} running</dd></div>
        </dl>
        <p className="pulse-hint">Tap an issue to centre the map. Last 60s and Wait move when your roads actually serve people. Pause freezes the clock.</p>
      </section>
    </section>
  );
}
