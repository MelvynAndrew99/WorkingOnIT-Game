# Supplied-town performance benchmark — September 11, 2026

The user reports that rendering was smooth last night and that today's slowdown makes road optimization hard to play. Smooth frame pacing is the number-one constraint for further gameplay work. The supplied town is now the regression benchmark, alongside desktop and narrow browser measurements. Removing unnecessary work is preferred; do not protect an expensive mechanic at the expense of playable animation.

## Preserved input

- [Original pasted bytes](original-pasted.txt), SHA-256 `b75cd57632cda0ef934c4fb2d50a4bcfe3dd8b76c9c7daac5722e9444272018d`.
- [Decoded save](save.json): valid `parseCity` input, 200 roads, 50 buildings, 39 trips, 12 incident records, 4 risk records, map 64×44. Incident records include cleared history; these are not 12 simultaneously active crashes.
- Baseline is the current local source **after the previous optimization pass**, before this turn's changes. This is not a reconstruction of last night's build.
- Browser tests use separate temporary contexts, block non-local network requests and never access the player's existing browser storage. The model benchmark applies the already-existing sandbox gateway relocation just as normal load does. The raw supplied save remains untouched. No new sharing with external specialists, reset, publication or migration was performed.

## Confirmed cause and implemented changes

The initial browser profile shows `findPath` taking about 4.25 seconds of a 12-second desktop sample. Reports consumed 2.68 seconds and map activity rendering 1.56 seconds; inclusive times overlap. Home/store access warnings, Flow, HUD route metrics and the outside-city warning repeatedly searched unchanged roads. Crash checks were not the dominant measured cost here.

1. `cityPathfinding.ts` retains bounded breadth-first search trees for unchanged topology. Exact coordinate/blockage signatures detect in-place edits, same-count replacements, closure changes and incident creation/clearance. Ordinary, emergency and plan-through-blockage views remain separate. Each view retains at most 64 trees using compact integer parent arrays and LRU eviction. Cache entries are weakly keyed by city and never saved.
2. The original E/S/W/N search order, blocked-start escape, blocked-destination rejection and caller-owned result points are preserved. Queries with custom avoid sets retain the original search. Weighted traffic-aware route choices and physical lane/occupancy rules are unchanged.
3. Read-only report, Flow and drawing scopes share the topology check across their many path queries. These scopes never span simulation mutation and always release in `finally`. `plannedRoadPath` reuses the original city's separate topology-only view instead of creating a new city identity on every query.
4. Map labels update text/color/size/stroke only when their value changes, preventing unnecessary style invalidation.
5. Static ground and world layers use Pixi's texture cache. Ground invalidates on visible terrain changes, map/view changes and late art loading; roads/buildings invalidate through the existing world rebuild after edits/layout. Cars, signals, warnings, shadows and responders remain dynamic. Cache resolution is 1, with current maximum 64-tile dimensions staying below 4096 pixels per axis; no lower-resolution gameplay mode was introduced.

No crash rules, encounter frequency, severity, deadlines, route-query budgets, simulation tick rate, trip demand, awards or save schema changed. No cars or incidents were removed to make the benchmark easier.

## Model comparison

60 simulated seconds, 3,600 calls at 1/60 second each, one warmup plus three measured trials. Medians:

| Measurement | Before | After |
| --- | ---: | ---: |
| Total simulation wall time | 4,065 ms | 2,207 ms |
| p99 simulation call | 13.61 ms | 2.40 ms |
| Maximum call, median across trials | 23.79 ms | 3.91 ms |

This is approximately 46% less total simulation time and 82% lower p99, compared with the already-optimized starting point of this turn. It is not a browser FPS measurement.

Every full-city JSON hash at all 60 one-second checkpoints matches before/after in all three measured trials. A separate 60-second differential run adds a closure at 20s, moves it in place at 25s, reloads at 30s and removes the closure at 40s. All 60 complete-state checks still match; roads/buildings remain intact. [Before model](before-model.json), [after model](after-model.json), [mutation/reload check](preservation.json).

## Actual browser measurements

Headless Chromium with **SwiftShader software rendering**, device scale 1, Vite development build; 12-second CPU-profiled windows following warmup. These are actual requestAnimationFrame intervals, including GPU/compositor scheduling, not a claim about the user's device or the published build. Only desktop 1440×900 and narrow 390×900 were tested. Values are single measured captures and host scheduling remains a limitation.

| Layout | Before FPS | After FPS | Before p95 frame | After p95 frame | Tasks over 50ms, before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | 11.9 | 15.3 | 199.9 ms | 66.8 ms | 20 → 4 |
| Narrow | 31.1 | 58.5 | 150.0 ms | 16.8 ms | 21 → 0 |

Narrow p99 improved from 166.7 to 33.4ms. Both final simulations advance approximately 12 seconds in their 12-second samples; the initial captures lost noticeable simulation time to very slow frames and the existing 100ms cap. This pass does not change that cap.

Desktop remains below 60 FPS in this software-rendering environment. **Do not call desktop smoothness solved.** The profile shows much lower game JavaScript work: desktop `cityScene.tick` inclusive samples fall from 5.42s to 1.17s, and `report` from 2.68s to 0.33s despite more frames and simulated time. A hardware-accelerated capture on the user's target device is still needed to establish its final frame rate. Device/browser and local-versus-RUN context were requested during the work, but were not supplied at delivery.

An isolated antialiasing-off experiment produced roughly 18.6 FPS desktop and 58.7 narrow. It did not establish smooth desktop rendering, so the runtime antialiasing setting is unchanged. [Experiment](noaa-experiment.json).

## Interaction and correctness checks

- Existing model suite passes (Node reporter summarizes 32 test files). Four focused path-cache regressions cover path equality, ties, custom avoid sets, emergency/ordinary/planned separation, blocked starts, in-place topology edits, incident clearance, eviction, caller mutation and scope cleanup on errors. [Suite](tests.txt), [focused run](path-tests.txt).
- TypeScript and production Vite build pass; existing large-bundle warning remains. [Build](build.txt).
- Desktop/narrow real clicks verify pause/resume, adding a real road, changed road pixels, zoom and construction preservation after reload, with no page errors. The existing pause modal intentionally blocks building; the harness resumes through its button before testing construction. [Interaction results](interaction-results.json).
- Final screenshots were visually inspected. [Desktop](final-1440.png), [narrow](final-390.png), [desktop construction/zoom](interaction-built-zoomed-1440.png), [narrow construction/zoom](interaction-built-zoomed-390.png).
- An intermediate capture hit Vite hot-reload duplication and then evidence-file reloads. Those captures are excluded. The final harness writes to `/tmp`, runs against a fresh server ignoring generated documentation, and asserts that the same observed city actually advances.

## Reuse and next acceptance

- `node --experimental-strip-types docs/performance-review/player-town/model.mjs "$PWD" after` reruns the model benchmark. Baseline source was isolated in `/tmp/player-perf-before`; the script accepts another source root for future before/after runs.
- `node --experimental-strip-types docs/performance-review/player-town/preservation.mjs /tmp/player-perf-before` runs the differential reload/edit check against the retained temporary baseline source.
- `PERF_URL=http://localhost:5201 node docs/performance-review/player-town/browser.mjs final` runs the browser benchmark against a **fresh** Vite server. Browser/Chromium paths reflect this environment. Output goes to `/tmp/player-perf-browser-final` to avoid reloads.
- `node docs/performance-review/player-town/interactions.mjs` checks current local port 5201 through actual UI controls.
- Use this supplied town for future performance-impacting simulation/rendering changes. Track p95/p99 and long stalls in addition to average FPS, on desktop and narrow. A CPU-only improvement does not satisfy the smoothness requirement.

The user's intersection-pathfinding suggestion is valid as a future route-query scheduling strategy: retain a chosen journey and reconsider at appropriate decision points or meaningful changes. Current cars already keep paths and use cooldowns/query budgets for optional replanning. Do not skip nearby motion/yield/occupancy checks between junctions, and do not delay immediate recovery after a relevant obstruction change. This pass removes repeated searches without changing when drivers reconsider their routes.

Everything is local. The published RUN version and the player's active town are unchanged.
