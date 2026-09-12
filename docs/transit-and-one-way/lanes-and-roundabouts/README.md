# Two usable one-way lanes and roundabout entry yields

Independent model verification passed. No publication or modification of the active player save.

## Delivered behavior

Cars use both physical lanes on directed roads, reserve both lanes during lateral movement, and merge before returning to two-way travel. Blocked turns can recover through a reserved merge and real detour. Parked visits and crews re-enter the lane checked for clearance; lane positions survive reload.

The One-way tool follows travel order: drag and release, or tap consecutive roads and Finish (tapping the last road again also finishes). Returning to the first road closes the loop. Backtracking undoes the last selection; drawing in reverse reverses travel. Restore two-way is a checkbox. Edits remain atomic and cannot reverse occupied commitments.

Simple closed directed loops with external approaches automatically show Yield at entrances. Circulating traffic has priority; entrants need a safe local gap, not an entirely empty circle. Existing Stop/Light data on the loop is retained but dormant; breaking the loop restores ordinary control behavior. Adjacent controlled intersections remain independent. Road branches/chords or roads inside the loop prevent automatic recognition; buildings inside are allowed.

This reuses physical traffic reservations, not a new per-car intersection search. Loop topology is cached by road/direction state, nearby circulation is indexed once per tick, and cities without one-way roads skip that work. Ordinary red-light rules are unchanged; the user's right-on-red analogy informed yield-style entry, not a new global signal rule.

## Independent coverage

`src/game/cityTwoLane.integration.test.ts` checks naturally selected second-lane travel, same-direction vehicles physically sharing a tile, per-tick body separation, merging before a two-way segment, and a real household journey whose lateral position survives reload and which completes a shopping return. This is evidence of usable road space, not a universal doubling of throughput.

`src/game/cityRoundabout.integration.test.ts` checks a closed directed loop, open-loop/chord exclusion, building-block loops, local-gap entry without mandatory dwell, circulating precedence independent of insertion order, dormant old Stop control, closure physics, and real household save/reload and return. Recognition follows the player's ordered closed road selection; a built interior is allowed.

## Reproducible evidence

- `model.mjs /tmp/oneway-dev baseline` captured the prior implementation's model behavior and timing on the immutable supplied 200-road/50-building town. Three measured trials each retain 60 complete-city hashes. The warm-up is omitted.
- `model.mjs <repository-root> after`, then `compare.mjs`, compares all 180 hashes and model percentiles.
- `player-ring.mjs` independently loads the preserved town, waits for natural traffic clearance, removes the center road/control, constructs the eight-tile ring and applies direction. It preserves all buildings and demand. It saves only its isolated copied fixture, then observes actual shopping returns and incidents for 120 simulated seconds.

Browser frame pacing must be measured separately on desktop and narrow layouts; model timings do not establish target-device smoothness.

## Recorded model results

- All 20 focused lane, bend, recovery and roundabout cases pass (`focused-tests.txt`). A subsequent targeted adjacent-signal regression also passes: its red phase still holds approach traffic while the neighboring ring remains uncontrolled by that light.
- All 180 complete-city checkpoints match the frozen prior implementation on the unchanged supplied town. A quiet paired final rerun measured median workload 2389.5ms before versus 2368.0ms after (-0.9%); p99 is 2.677ms versus 2.686ms (+0.3%). These small differences do not indicate a meaningful model regression. An earlier noisy run overlapped the production build, as confirmed by the integration lead; it is retained in `noisy-final-model.json` and is excluded from the comparison.
- The copied supplied-town ring becomes editable after 14 simulated seconds of natural clearance. Over the following 120 seconds it produces 83 completed journeys, shopping returns from 21 of 37 households, and zero new incidents. All building geometry/demand remains preserved. It uses automatic entry yields, with no additional Stop signs.
- This bounded observation does not demonstrate service to every household or universal roundabout safety. Browser pacing and broad regression results are recorded by the integration lead separately.

## Lane recovery and usable capacity follow-up

`cityLaneRecovery.integration.test.ts` adds a saved return journey that recovers from a blocked bend through a real detour, including a save during its lateral merge. Additional cases exercise crashed and working second-lane bodies, actual police clearance/return, and removing the final directional edges while a crew is parked off-road. The latter exposed a parser guard incorrectly counting off-road lane metadata as an active lane commitment; the integration lead corrected the guard and the regression test now passes.

`capacity.mjs` compares identical nine-vehicle demand against the frozen prior source on a 61-tile corridor, with one slower leading vehicle. In 40 simulated seconds, four vehicles pass tile 40 with the prior one-lane implementation; eight pass with two lanes. Four complete the full road with two lanes versus zero before, with four actual overtakes and zero incidents. The geometry, vehicle positions, speeds, IDs and timestep match. This deliberately bounded synthetic fixture establishes usable added capacity; it does not predict a general city throughput multiplier. `capacity.json` records the detailed results.

## Final integration and browser evidence

All **324 model tests** pass, including an adjacent signal retaining its own red phase beside the loop. Production TypeScript/Vite build passes. Desktop (1440×900) and narrow (390×900) pointer checks cover construction, atomic preview/drag release, tap-to-close, reversing by order, restoring two-way, backtracking/cancel, zoom, reload, and corrupt-direction save preservation/download. See `all-tests.txt`, `ui-results.json` and the browser scripts.

Frozen production frame pacing uses the unchanged supplied town and an isolated copied-town roundabout. Chromium uses SwiftShader software rendering; 12-second samples follow 2.5 seconds warmup, with no model benchmarks/builds running simultaneously. Geometry and actual simulation advancement are checked, with no browser or local asset errors.

| Fixture | Desktop FPS / p95 | Narrow FPS / p95 |
| --- | --- | --- |
| Previous one-way implementation | 15.4 / 66.8ms | 59.5 / 16.8ms |
| Two lanes and automatic yields, unchanged town | 15.5 / 83.3ms | 59.0 / 16.8ms |
| New copied-town roundabout | 16.1 / 66.7ms | 59.9 / 16.7ms |

See `browser-pacing.json` and `browser-ring-pacing.json`. Average rates remain close, but the short samples contain frame-tail variation (desktop p95 rises in the unchanged-town sample; narrow p99 is 33.3ms versus 16.8ms). This does not establish a frame-pacing improvement or solve desktop smoothness. Actual hardware playtesting remains necessary. The final UI-only shortening of direction instructions was built and interaction-tested after these production samples; traffic/runtime code is identical.

Local delivery only. No publication or change to the player's active town; buses, signal offsets and user-authored missions remain separate work.
