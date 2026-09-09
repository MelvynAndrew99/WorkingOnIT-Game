// Run with nix develop -c node --experimental-strip-types docs/interface-missions/balance-check.mjs.
// Deterministic capacity/economy evidence, not player enjoyment or final tuning.
import { createCity, place, stepCity, TRAFFIC_TICK } from '../../src/game/cityModel.ts';
import { missionSnapshot } from '../../src/game/cityMissions.ts';
for (const shops of [1, 2]) {
  const c = createCity();
  for (let x = 0; x <= 14; x++) place(c, 'road', x, 6);
  for (let i = 0; i < 6; i++) place(c, 'home', i * 2, 4);
  place(c, 'store', 12, 4);
  place(c, 'park', 5, 7, 2);
  if (shops === 2) place(c, 'store', 9, 7, 2);
  const initialFunds = c.funds, milestones = {};
  for (let i = 0; i < 240 / TRAFFIC_TICK; i++) {
    stepCity(c, TRAFFIC_TICK);
    for (const id of c.missions.completed) milestones[id] ??= Number(c.elapsed.toFixed(3));
  }
  console.log(JSON.stringify({ shops, initialFunds, fundsAfter240Seconds:c.funds,
    milestones, shoppers:c.missions.shoppers.length, parkVisitors:c.missions.parkVisitors.length,
    accidents:c.accidentCount, completedRoundTrips:c.completed, recognition:missionSnapshot(c).recognition }));
}
