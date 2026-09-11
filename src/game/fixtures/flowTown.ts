/** Reproducible FLOW town, shared by tests and Challenges; never used for sandbox creation. */
import {createCity, place, stepCity, type City, type Tool} from '../cityModel.ts';
import {flowSnapshot} from '../cityFlow.ts';

export const FLOW_HOMES = 9;
export type FlowSolution = 'baseline' | 'retimed' | 'destinations';
function build(city: City, tool: Tool, x: number, y: number, rotation = 0) {
  const before = city.buildings.length + city.roads.length;
  const message = place(city, tool, x, y, rotation);
  if (city.buildings.length + city.roads.length !== before + 1) throw new Error(`${tool} ${x},${y}: ${message}`);
}
export function applyFlowSolution(city: City, solution: FlowSolution) {
  if (solution === 'retimed') {
    // Existing timing edits are free. Starting at NS, one click selects EW.
    place(city, 'signal', 8, 6);
    if (city.controls.find(c => c.x === 8 && c.y === 6)?.preset !== 'ew') throw new Error('Expected EW timing');
  }
  if (solution === 'destinations') {
    build(city, 'store', 6, 7, 2); // Existing west-side approach, entrance 7,6.
    build(city, 'store', 0, 1); // Western end, entrance 1,3.
    for (const y of [3,4,5]) build(city, 'road', 0, y);
    build(city, 'road', 1, 3);
  }
}
export function flowTown(solution: FlowSolution = 'baseline'): City {
  const city = createCity();
  // Fixture-only construction funding. No tutorial, outside arrivals or live-town injection.
  city.funds = 10000;
  for (let x = 0; x <= 14; x++) build(city, 'road', x, 6);
  for (let y = 0; y <= 5; y++) build(city, 'road', 8, y);
  for (const x of [2,4,6]) build(city, 'home', x, 4);
  for (const x of [0,2,4]) build(city, 'home', x, 7, 2);
  for (const y of [0,2,4]) build(city, 'home', 9, y, 1);
  build(city, 'store', 11, 4);
  build(city, 'store', 13, 7, 2);
  build(city, 'store', 11, 1);
  for (const x of [12,13,14]) build(city, 'road', x, 3);
  for (const y of [4,5]) build(city, 'road', 14, y);
  place(city, 'signal', 8, 6); // balanced
  place(city, 'signal', 8, 6); // NS: too little green for six western households
  applyFlowSolution(city, solution);
  return city;
}
/** Sample each simulated second, but count completions at their actual tick boundaries. */
export function measureFlow(city: City, seconds = 180) {
  const start = city.elapsed;
  const homeIds = city.buildings.filter(b => b.kind === 'home').map(b => b.id);
  const counts = new Map(homeIds.map(id => [id, {visits: 0, returns: 0}]));
  let minimumSpareSlots = Infinity, maximumStoppedSeconds = 0, pendingNeedSeconds = 0;
  let waitingVehicleSeconds = 0, capacityHomeSeconds = 0, accessHomeSeconds = 0, readySamples = 0;
  const windows: ReturnType<typeof flowSnapshot>[] = [];
  for (let second = 1; second <= seconds; second++) {
    const before = city.elapsed;
    stepCity(city, 1);
    const snapshot = flowSnapshot(city, FLOW_HOMES);
    for (const record of city.history) {
      const service = record.service, count = service && counts.get(service.homeId);
      if (count && service?.purpose === 'shopping') {
        if (record.at > before + 1e-6) count.returns++;
        if (service.visitedAt > before + 1e-6) count.visits++;
      }
    }
    for (const trip of city.trips) if (trip.purpose === 'shopping' && trip.rewarded
      && trip.visitedAt !== undefined && trip.visitedAt > before + 1e-6) {
      const count = counts.get(trip.homeId); if (count) count.visits++;
    }
    minimumSpareSlots = Math.min(minimumSpareSlots, snapshot.spareDestinationSlots);
    maximumStoppedSeconds = Math.max(maximumStoppedSeconds, snapshot.longestStop);
    pendingNeedSeconds += snapshot.pendingNeeds;
    waitingVehicleSeconds += snapshot.waitingVehicles;
    capacityHomeSeconds += snapshot.capacityLimitedHomes;
    accessHomeSeconds += snapshot.accessLimitedHomes;
    readySamples += Number(snapshot.ready);
    if (second % 60 === 0) windows.push(snapshot);
  }
  return {start, seconds, visits: [...counts.values()].reduce((s,c) => s+c.visits, 0),
    returns: [...counts.values()].reduce((s,c) => s+c.returns, 0),
    perHome: [...counts].map(([homeId, count]) => ({homeId, ...count})),
    minimumSpareSlots, maximumStoppedSeconds, pendingNeedSeconds, waitingVehicleSeconds,
    capacityHomeSeconds, accessHomeSeconds, readySamples, windows};
}
