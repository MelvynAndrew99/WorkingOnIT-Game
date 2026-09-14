# Independent one-way model verification

September 11, 2026. Local verification; no player storage or publication changes.

`src/game/cityOneWay.integration.test.ts` uses actual road placement and the atomic direction-edit API to create a 3×3 ring with its center missing and four two-way external arms. Nine cases pass:

- Each of four home approaches separately travels to a store on the opposite arm and completes the actual shopping return. Observed physical boundary movements traverse all eight directed ring connections across outbound and return trips; every adopted route obeys direction.
- A closure during travel, reload with exact trip/direction preservation, and reopening restore actual shopping returns without changing roads or buildings.
- Three simultaneous entering arms share a destination for ten simulated minutes: every household completes shopping returns, more than 30 trips finish, and no accident occurs. This is a bounded fixture, not blanket ring safety or circulating-priority behavior.
- Police, EMS and fire each dispatch to a real incident across the ring, complete their required scene service, preserve the exact moving trip on reload, and physically return to their station via legal directions. Each service is tested separately; this does not claim a simultaneous three-crew scene test.

Run with `node --experimental-strip-types --test src/game/cityOneWay.integration.test.ts`. Node is the Nix-provided v24 executable; its default reporter summarizes one test file, containing the nine named cases.

## Preserved town benchmark

`model.mjs` reads the immutable supplied 200-road/50-building save from the existing performance evidence, applies the same connector migration as the original benchmark and steps 3,600 frames at 1/60s. One warmup precedes three measured trials. `compare.mjs` checks every once-per-simulated-second full-city hash against recorded `docs/performance-review/player-town/after-model.json`; all 60 checkpoints match in all three trials.

Historical baseline median total model time: 2,207ms; current: 2,115ms. Median trial p99 step: 2.395ms → 2.362ms. See `comparison.json` and `one-way-model.json` for exact evidence. This is a historical comparison, not a simultaneous frozen-source A/B. The frozen 1.7.10 production artifact exists in `/tmp/working-on-it-release-20260911/site`, but a corresponding clean source snapshot does not. Model timing is not frame pacing or evidence of target-device smoothness; lead browser verification must supply desktop/narrow results separately.

Reproduce from repository root:

```sh
node --experimental-strip-types docs/transit-and-one-way/verification/model.mjs "$PWD" one-way
node docs/transit-and-one-way/verification/compare.mjs
```

## Actual supplied-town ring variant

`player-ring.mjs` uses an isolated copy of the supplied town. The actual intersection at (10,4) has four empty corner lots. After 14 simulated seconds of ordinary traffic, its complete nine-square footprint becomes physically unreserved. The script removes its existing signal and center road, builds the four missing corners, and applies clockwise direction to all eight connections through the normal mutation API. No cars, buildings or household demand are removed; no closure is needed to obtain the empty window. `player-ring-save.json` is the resulting starting fixture for browser measurements.

A 120-second run of the unsigned ring completes 65 trips but produces one minor crash at its southern entry (10,5). Thus the ring is not automatically a safe roundabout: existing entry controls still matter.

`player-ring-controls.mjs` compares unchanged-center and ring variants over matching elapsed-time windows, retaining all original demand. All four stop controls are placed successfully with actual funds, costing $100: 82 completions, zero new accidents, and 22 distinct households with real shopping returns during the observation. Four balanced signals cost $300: 71 completions, zero new accidents, 20 returning households. The unchanged original signal intersection has 85 completions, zero new accidents, 22 returning households. These are bounded outcomes in an already troubled saved city; neither every household nor superior ring throughput is claimed. Counts exclude historical returns before the observation window. The ring uses existing all-way stop/signal rules, not special circulating-traffic priority.

Exact events, fund checks and counts are recorded in `player-ring-results.json` and `player-ring-controls.json`. The player's active save and the immutable original file remain untouched.

## Browser and production verification

`browser.mjs` runs real pointer edits against a frozen source snapshot served at port 5219, with isolated storage. It removes the center and adds all corners, clicks the visible One-way tool, selects a closed loop, applies/reverses/restores, cancels/undoes, zooms and reloads at 1440×900 and 390×900. `browser/results.json` and screenshots record the pass. A malformed direction save boots the recovery screen; explicit flush/new-city attempts cannot overwrite its original bytes, and the download works. The initial source-server rerun was disturbed during concurrent work; the final frozen-source run passed.

`pacing.mjs` uses separate frozen production directories, original release on port 5218 and the current build on 5217, both under `/game/`. It uses the same immutable original save, 2.5-second warmup and 12-second requestAnimationFrame sampling, Chromium 151 with ANGLE/SwiftShader, 1440×900 and 390×900. Both runs advance real simulation and preserve road/building geometry with no page errors or failed local assets. Exact samples: `pacing-results.json`.

| Layout | Original release FPS / p95 / p99 | One-way build, unchanged town FPS / p95 / p99 |
| --- | --- | --- |
| Desktop | 15.66 / 66.8ms / 83.3ms | 15.16 / 83.2ms / 83.4ms |
| Narrow | 59.17 / 16.8ms / 33.3ms | 58.72 / 16.8ms / 33.3ms |

These short software-rendered samples show similar throughput, not target-device smoothness. The desktop p95 sample is one display interval worse and the desktop remains slow; no improved-device-FPS claim is made. Concurrent model verification may have affected the final narrow unchanged-town sample, so differences this small are not attributed causally to one-way code. The separate active-ring samples were taken after model and interaction checks stopped.

Scripts currently record the local Nix Chromium/Playwright paths and temporary serving directories; recreate those directories from a frozen source/production build to reproduce. Run npm tests/build inside `nix develop`; do not reuse the player's browser profile. `build.txt` and `tests.txt` record the successful build and 303-test suite.

Active one-way ring in the actual supplied-town copy (`ring-pacing-results.json`): desktop **15.86 FPS, p95 66.7ms, p99 66.8ms**; narrow **59.45 FPS, p95/p99 16.8ms**. This altered geometry/workload is reported separately from unchanged-town preservation. Source snapshot used for final interactions matches current `src/` bytes.
