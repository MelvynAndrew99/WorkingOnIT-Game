/**
 * HUD-facing commute and issue snapshot. Presentation-only: the model owns every
 * number, and this file never grades a layout or invents a prescribed fix.
 *
 * Junction warnings stay listed after exposure cools so a player can still find
 * the crossing. They leave when the control changes, the junction is gone, or
 * STICKY_SECONDS of simulation time pass without another warning-level encounter.
 */
import { CITY_RULES } from './cityRules.ts';
import { isResidential, type City, type Trip, type TripPurpose } from './cityModel.ts';
import { governingControl, METRICS_WINDOW, roadIndex, trafficMetrics } from './cityTraffic.ts';
import { busRiderCount, waitingBusRiders } from './cityBusRidership.ts';
import { riskAdvice, type JunctionRisk } from './cityIncidents.ts';

export const STICKY_SECONDS = 90;
const SAFETY = CITY_RULES.intersectionSafety;

export type PulseSeverity = 'danger' | 'watch';
export type PulseIssueKind = 'risk' | 'crash' | 'home' | 'bus-stop';
export type PulseIssue = {
  id: string;
  kind: PulseIssueKind;
  x: number;
  y: number;
  title: string;
  detail: string;
  severity: PulseSeverity;
  sticky?: boolean;
};
export type PurposePulse = { recent: number; driving: number; parked: number; needed: number };
export type CityPulse = {
  trips: number;
  recent: number;
  averageWait: number;
  waiting: number;
  shopping: PurposePulse;
  leisure: PurposePulse;
  work: PurposePulse;
  bus: { completed: number; waiting: number; aboard: number; running: number };
  issues: PulseIssue[];
};

type StickyRisk = { x: number; y: number; control: JunctionRisk['control']; lastDangerAt: number };
const remembered = new WeakMap<City, Map<string, StickyRisk>>();

const tileKey = (x: number, y: number) => `${x},${y}`;
const emptyPurpose = (): PurposePulse => ({ recent: 0, driving: 0, parked: 0, needed: 0 });
const civilian = (trip: Trip) => trip.busId === undefined && !trip.service;
const drivingPhase = (trip: Trip) => {
  const phase = trip.phase ?? 'legacy';
  return phase === 'legacy' || phase === 'outbound' || phase === 'returning' || phase === 'waiting';
};

export const emptyPulse = (): CityPulse => ({
  trips: 0, recent: 0, averageWait: 0, waiting: 0,
  shopping: emptyPurpose(), leisure: emptyPurpose(), work: emptyPurpose(),
  bus: { completed: 0, waiting: 0, aboard: 0, running: 0 },
  issues: [],
});

function purposeOf(trip: Trip): TripPurpose {
  return trip.purpose === 'leisure' || trip.purpose === 'work' ? trip.purpose : 'shopping';
}

function junctionControl(city: City, x: number, y: number): JunctionRisk['control'] | 'gone' {
  const index = roadIndex(city);
  if (!index.junctions.has(tileKey(x, y))) return 'gone';
  return governingControl(city, index, { x, y })?.kind;
}

function riskTitle(risk: Pick<JunctionRisk, 'x' | 'y' | 'control'>): string {
  return `Failed-yield at ${risk.x},${risk.y}`;
}

function liveRiskIssue(risk: JunctionRisk, severity: PulseSeverity): PulseIssue {
  return {
    id: `risk:${risk.x},${risk.y}`,
    kind: 'risk',
    x: risk.x,
    y: risk.y,
    title: riskTitle(risk),
    detail: riskAdvice(risk.control),
    severity,
  };
}

function rememberRisks(city: City, live: PulseIssue[]): PulseIssue[] {
  const stickies = remembered.get(city) ?? new Map<string, StickyRisk>();
  remembered.set(city, stickies);
  for (const issue of live) {
    if (issue.kind !== 'risk' || issue.severity !== 'danger') continue;
    const control = city.risks.find(r => r.x === issue.x && r.y === issue.y)?.control;
    stickies.set(tileKey(issue.x, issue.y), { x: issue.x, y: issue.y, control, lastDangerAt: city.elapsed });
  }
  const listed = new Set(live.filter(issue => issue.kind === 'risk').map(issue => tileKey(issue.x, issue.y)));
  const extra: PulseIssue[] = [];
  for (const [key, sticky] of [...stickies]) {
    const control = junctionControl(city, sticky.x, sticky.y);
    if (control === 'gone' || control !== sticky.control) {
      stickies.delete(key);
      continue;
    }
    if (listed.has(key)) continue;
    if (city.elapsed - sticky.lastDangerAt > STICKY_SECONDS + 1e-9) {
      stickies.delete(key);
      continue;
    }
    extra.push({
      id: `risk:${sticky.x},${sticky.y}`,
      kind: 'risk',
      x: sticky.x,
      y: sticky.y,
      title: riskTitle(sticky),
      detail: riskAdvice(sticky.control),
      severity: 'watch',
      sticky: true,
    });
  }
  return extra;
}

/** Open homes/stops are supplied by the scene so this snapshot does not rerun pathfinding. */
export function mergePulseIssues(
  pulse: CityPulse,
  extras: {
    homes?: { homeId: number; x: number; y: number; reason: string }[];
    busStops?: { id: number; x: number; y: number; reason: string; waiting: number }[];
  } = {},
): PulseIssue[] {
  const issues = [...pulse.issues];
  for (const home of extras.homes ?? []) {
    issues.push({
      id: `home:${home.homeId}`,
      kind: 'home',
      x: home.x,
      y: home.y,
      title: `Home needs a road`,
      detail: home.reason,
      severity: 'watch',
    });
  }
  for (const stop of extras.busStops ?? []) {
    issues.push({
      id: `bus-stop:${stop.id}`,
      kind: 'bus-stop',
      x: stop.x,
      y: stop.y,
      title: stop.waiting ? `Bus stop cannot be served` : `Bus stop needs a usable curb`,
      detail: stop.reason,
      severity: stop.waiting ? 'danger' : 'watch',
    });
  }
  const rank = (issue: PulseIssue) => (issue.severity === 'danger' ? 0 : 1)
    + (issue.kind === 'crash' ? 0 : issue.kind === 'risk' ? 2 : issue.kind === 'bus-stop' ? 4 : 6);
  return issues.sort((a, b) => rank(a) - rank(b) || a.y - b.y || a.x - b.x);
}

export function cityPulse(city: City): CityPulse {
  const metrics = trafficMetrics(city);
  const recentHistory = (city.history ?? []).filter(h => h.at > city.elapsed - METRICS_WINDOW);
  const shopping = emptyPurpose();
  const leisure = emptyPurpose();
  const work = emptyPurpose();
  const byPurpose = { shopping, leisure, work };
  for (const record of recentHistory) {
    const purpose = record.service?.purpose ?? 'shopping';
    byPurpose[purpose].recent++;
  }
  for (const trip of city.trips) {
    if (!civilian(trip)) continue;
    const bucket = byPurpose[purposeOf(trip)];
    if (trip.phase === 'visiting') bucket.parked++;
    else if (drivingPhase(trip)) bucket.driving++;
  }
  for (const household of city.households) {
    if (!city.buildings.some(b => b.id === household.homeId && isResidential(b))) continue;
    shopping.needed += household.shopping;
    leisure.needed += household.leisure;
    work.needed += household.work ?? 0;
  }

  const waitingRiders = [...waitingBusRiders(city).values()].reduce((n, count) => n + count, 0);
  const journeyWaiting = city.transit?.journeys.filter(j => j.state.startsWith('waiting')).length ?? 0;
  const bus = {
    completed: city.transit?.ridership?.completed ?? 0,
    waiting: waitingRiders + journeyWaiting,
    aboard: (city.transit?.fleet ?? []).reduce((n, bus) => n + busRiderCount(bus), 0),
    running: (city.transit?.fleet ?? []).filter(bus => bus.tripId !== undefined).length,
  };

  const issues: PulseIssue[] = [];
  for (const risk of city.risks) {
    if (risk.exposure >= SAFETY.warningExposure) issues.push(liveRiskIssue(risk, 'danger'));
    else if (risk.exposure > 1e-9) issues.push(liveRiskIssue(risk, 'watch'));
  }
  for (const incident of city.incidents.filter(i => i.status === 'active').sort((a, b) => a.id - b.id)) {
    issues.push({
      id: `crash:${incident.id}`,
      kind: 'crash',
      x: incident.x,
      y: incident.y,
      title: incident.severity === 'fire' ? `Fire at ${incident.x},${incident.y}`
        : incident.severity === 'serious' ? `Collision at ${incident.x},${incident.y}`
        : `Crash at ${incident.x},${incident.y}`,
      detail: incident.outcome === 'pending' && incident.rescueDeadline !== null
        ? `Response needed · ${Math.max(0, Math.ceil(incident.rescueDeadline - city.elapsed))}s to rescue`
        : 'Response needed',
      severity: 'danger',
    });
  }
  issues.push(...rememberRisks(city, issues));

  return {
    trips: city.completed,
    recent: metrics.throughput,
    averageWait: metrics.averageWait,
    waiting: metrics.waiting,
    shopping,
    leisure,
    work,
    bus,
    issues,
  };
}

export function pulseWarningLine(pulse: CityPulse): string {
  const danger = pulse.issues.find(issue => issue.kind === 'risk' && issue.severity === 'danger');
  return danger ? `${danger.title}. ${danger.detail}` : '';
}
