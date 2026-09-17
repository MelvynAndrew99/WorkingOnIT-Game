# Road-access warning cache — September 17, 2026

First incremental improvement from the five proposed optimizations. Local only; no publication or active-player-save access. The repository moved from AI-Overlord to `won`; commands below use repository-relative paths.

**Subsequent step:** [Unused routing revision strings and discarded responder control scans are now removed](../routing-snapshot/README.md). The assessment below records the state before that follow-up.

## Assessment of the proposals against current source

1. **Cache access warnings: worthwhile, implemented here with narrower claims.** The September 11 description predates reusable BFS trees and read scopes. Current rendering still calls `homeRoadIssue` for each home, reconstructing paths and repeating store/entrance checks. Cache the resulting reason, including `null`, rather than adding a persisted boolean. Warnings retain their exact existing meanings. Road edits and accidents are not the complete invalidation set: store creation/removal/movement, all residential entrances, directions, wide-road topology, roadworks, Divert and incident clearance matter too. The newer browser evidence does not establish this as the largest FPS bottleneck.
2. **Conditional label styles: already implemented.** `cityScene.label` retains each label and changes text/fill only on changes; font size and stroke update when effective scale changes. There is no unconditional per-frame stroke allocation left. No label edit in this pass; further Pixi/GPU claims need measurement.
3. **Numeric revisions: investigate next, avoid a global counter rollout yet.** Ordinary BFS already validates copied road coordinates without road-string allocation. `routingSnapshot` still eagerly builds sorted revision strings; the current source search finds revision reads in tests, not production consumers. Lazy construction or removal of unused work may be smaller and safer than instrumenting every mutation with a global revision. A topology revision alone also cannot certify dynamic queue costs. No routing edit here.
4. **Destination fields: potentially useful, not a drop-in vehicle routing replacement.** Unweighted `findPath` already reuses source BFS trees (bounded to 64). Actual civilian routing uses Dijkstra with road speed, queue and control costs, and excludes the requesting vehicle from queue observations. Responders have separate semantics. Reverse BFS must respect directed edges and blocked-start escape, and cannot reproduce weighted choices by itself. Consider destination reachability for reports first; preserve route tie-breaking and physical trip paths if eventually changing vehicle routing.
5. **Lane lists: defer the architectural replacement.** A same-lane predecessor can accelerate following queries, but cannot alone represent intersection conflicts, merges, turns, lane changes or reservations. The current sequential movement requires updates after each move. Profile the specific scans and try a synchronously maintained index before replacing occupancy with linked lists. Neither an array nor a linked list makes insertion, lane changes and all conflict checks automatically constant-time.

## Implementation

`cityPathfinding.roadAccessToken` exposes an opaque identity for the already validated ordinary road graph. It never exposes mutable graph internals. `cityVisits.homeRoadIssues` caches all residential warning reasons in a city-keyed WeakMap. The graph token plus exact building IDs, store/residential roles and entrance coordinates validate the result. Comparison uses values, so same-count replacements, in-place edits and reload do not depend on callers remembering to increment a counter.

The activity renderer and HUD acquire the map once, then look up reasons by ID. Apartment activity labels and the HUD inspector pass this same map to `buildingStatus`; its remaining click-time callers can still use the original helper. Label-equivalence assertions cover both forms. Unchanged frames do no warning path searches/reconstruction. The first read after an access change synchronously rebuilds the warnings, preserving immediate feedback; this can still happen during a render call. This is not literally zero graph work in rendering: existing graph validation and a small building/entrance snapshot remain per read. The cache holds one result map per live city; old city entries can be collected. Nothing is serialized. The original `homeRoadIssue` remains the unchanged oracle and inspector API. Map artwork, warning suppression without a store, and apartment marker behavior remain unchanged.

## Measured scope

Node 24.18.0; one warmup and five measured trials, alternating original/cached order, 3,600 reads per trial. No concurrent test/build/browser workload during timing. Baseline is the unchanged per-home `homeRoadIssue` call inside the existing read scope; optimized includes graph/building validation, map acquisition and per-home lookup. Both use the current cached BFS implementation. These are **warm, unchanged-town access-query CPU timings**, not full frames, FPS, GPU time, or edit-frame worst cases.

| Fixture | Roads / homes | Original total | Cached total | Reduction |
|---|---:|---:|---:|---:|
| Small | 32 / 2 | 17.05 ms | 3.26 ms | 80.9% |
| Busy | 200 / 37 | 338.41 ms | 16.14 ms | 95.2% |
| Previously supplied town | 408 / 46 | 504.49 ms | 93.31 ms | 81.5% |

For the 408-road town this saves about **0.114 ms per read**, not a large proven frame-rate increase. Cold rebuilding, graphs larger than these fixtures, frequent edits and physical-device FPS need separate measurement. The earlier software-rendering bottleneck is not addressed by this change.

[Reproducible benchmark](benchmark.mjs), [raw trials and checkpoint counts](results.json). Run `node --experimental-strip-types docs/performance-review/access-cache/benchmark.mjs`.

## Verification

- Four new cache tests plus five existing path-cache tests pass. Cover unchanged-state reuse, road replacement/in-place movement, Divert, crash creation/clearance, direction changes, roadwork, blocked-start escape with blocked return, stores, apartment entrances, building rotation, city isolation and reload. Warning reads leave city JSON unchanged.
- Three historical fixtures evolve for 30 simulated seconds each, with closure creation/movement/removal and reload. Cached reports equal the original helper; all **180 full-state checkpoints** match a simulation without warning reads. A separate new test compares every step of a six-second run.
- Full game suite: **69/71 files pass**. Flow has one failed assertion and IntersectionSafety has three; all reproduce on a temporary copy of the clean starting HEAD. No expectations or traffic behavior changed. [Suite](tests.txt), [baseline Flow](baseline-flow.txt), [final Flow](final-flow.txt), [baseline safety](baseline-safety.txt), [final safety](final-safety.txt).
- TypeScript and production build pass; the existing large-bundle warning remains. [Build](build.txt).
- Isolated Chromium development-build smoke checks at 1440 and 390 pixels pass with no page errors: warm warnings, pause, disconnect the copied town, refresh through normal scene commands, restore roads and compare HUD warnings with the original helper. Direct fixture mutation is test-only; this is not a pointer-construction regression or browser performance measurement. Non-local requests were blocked and new browser contexts used. [Harness](browser.mjs), [results](browser.json). These assert HUD state and scene execution; screenshots of the pause overlay are not treated as visual-marker evidence. Two initial harness attempts needed fixes for Vite's dependency reload and paused-scene reporting; the final retained harness passes.
