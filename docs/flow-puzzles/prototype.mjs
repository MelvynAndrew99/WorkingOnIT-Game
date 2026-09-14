// Run: nix develop -c node --experimental-strip-types docs/flow-puzzles/prototype.mjs
import {writeFileSync} from 'node:fs';
import {flowTown, applyFlowSolution, measureFlow} from '../../src/game/fixtures/flowTown.ts';
import {parseCity, stepCity} from '../../src/game/cityModel.ts';
const original = flowTown();
stepCity(original, 120);
const report = {};
for (const solution of ['baseline', 'retimed', 'destinations']) {
  const city = parseCity(JSON.parse(JSON.stringify(original)));
  if (!city) throw new Error('Queued fixture did not reload');
  applyFlowSolution(city, solution);
  stepCity(city, 60); // Let existing committed journeys finish; no teleports/retargets.
  report[solution] = measureFlow(city);
  if (city.incidents.length) throw new Error('Flow comparison contains an incident');
}
for (const solution of ['retimed', 'destinations']) {
  const city = flowTown(solution);
  stepCity(city, 180);
  report[`preplanned-${solution}`] = measureFlow(city);
}
writeFileSync(new URL('./prototype-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
for (const [name, result] of Object.entries(report)) {
  console.log(name, JSON.stringify({...result, windows: result.windows.map(w => ({at: w.observedAt,
    ready: w.ready, qualified: w.qualifiedHomes, returns: w.returns, visits: w.visits})), perHome: result.perHome}));
}
