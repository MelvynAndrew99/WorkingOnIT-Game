# Performance review and first fixes — September 11, 2026

**September 17 follow-up:** [Current assessment of the five proposals and the first warning-cache improvement](access-cache/README.md). The original opportunities below predate the September 13 fixes; consult the follow-up before treating them as current hotspots.

User requested Codex, installed Grok and installed Claude review today's slowdown and opportunities to simplify crash work. Both installed clients delivered actual source reviews. Codex profiled the model, checked their recommendations and implemented two behavior-preserving optimizations locally. No publication.

**Next incremental change:** [Unused routing-snapshot work removed, with before/after behavior and timing comparisons](routing-snapshot/README.md).

## Implemented

1. `cityTraffic.withRoadIndex` shares topology for the synchronous duration of one `stepCity` call. Nested incident/routing helpers reuse it instead of rebuilding roads/junction areas, sometimes twice per risk per active incident. A `finally` block drops the scope; no cache survives between calls, so road edits, in-place changes and loads need no new revision or save fields. Automatic connection construction still happens before entering the scope. Mutable traffic, controls, blockages and occupancy are not cached.
2. `cityMissions.refreshMissions` excludes the Flow item before constructing reports. It previously calculated an expensive `flowSnapshot` on every completed visit, then explicitly ignored that item. UI reports still include Flow; the existing once-per-simulated-second Flow qualification and saved receipts are unchanged.

Crash exposure, encounter windows, controls, warning grace, severity, rescue timing, trip demand and movement rules remain unchanged. No slowdown was hidden by lowering simulation frequency or deleting vehicles/incidents.

## Measurements

Node 24, current local source, 60 simulated seconds at 60 frame calls/second per trial; one warmup then three measured trials per case. Median totals below are CPU wall time for those 3,600 simulation calls, not elapsed gameplay time or measured browser FPS. Baseline is a temporary isolated source copy of the pre-fix files; all other current local work is retained. Final runs have no concurrent test/build workloads, although host scheduling noise remains. Earlier index-only and sampled-profile runs are retained separately.

| Scenario | Before total ms | After total ms | Reduction | Before → after p99 frame ms |
| --- | ---: | ---: | ---: | ---: |
| busy | 747 | 521 | 30.3% | 1.24 → 0.83 |
| turning | 509 | 439 | 13.7% | 3.92 → 4.08 |
| saved | 5229 | 2581 | 50.6% | 21.68 → 14.47 |

`busy`: 18-home overloaded-stop fixture, including a real crash. `turning`: 24-home signal-turn fixture. `saved`: existing police-junction-jam fixture, 198 roads and 41 trips at the end. This is an existing regression town, not a new capture of the user's current slow session.

Final complete city JSON SHA-256 hashes match before/after in all three scenarios, covering funds, trips, incidents, history and progress, not just completion counts. Source model tests and production TypeScript/Vite build pass. The installed Node reporter summarizes 31 test files rather than individual subtests; no historical test-count claim is substituted. Build retains the existing large-bundle warning. No UI/render code was changed and no browser FPS verification was performed in this pass.

The baseline CPU profile puts `roadIndex` at approximately 25% inclusive sampled time, `findPath` at 37%, and `flowSnapshot` at 28%. These overlap and must not be added. Profiling supports the chosen hotspots; it does not prove which particular earlier change introduced every cost.

## Next opportunities, ordered

1. **Rendering access checks and labels.** Confirmed: `renderActivity` calls `homeRoadIssue` per home per frame, and that helper performs BFS route searches. `label` also assigns a fresh stroke style object each frame. Profile actual desktop/narrow frame work, reuse access results until roads, entrances, closures or incident blockage change, and only update styles when text/scale/color changes. Preserve immediate feedback on construction and incident changes. Pixi rerasterization cost is a hypothesis until a browser trace confirms it.
2. **Flow and HUD reachability.** Share graph data or destination reachability across the many home/store checks, retaining blocked-start escape semantics and both journey directions. The once-per-second Flow path still causes remaining spikes; the turning fixture's p99 did not improve. Keep exact simulation-time qualification and live trip checks.
3. **Routing snapshot allocations.** Review sorted road/blocked revision strings, copied sets and repeated control-area scans. Verify all revision consumers before making the revision lazy or removing it.
4. **Responder and collision scans.** Index trips/approaches and reuse only provably current data. Do not blindly share a pre-movement grid through sequential movement: reservations and positions change as cars move. Retry backoff can delay rescues and is not selected.
5. **Placement preview cloning.** Profile whole-city cloning while hovering/building. A valid cache key must include all construction eligibility inputs, not only road/building counts. Never allow preview to mutate live saves through a shallow copy.

## Lead corrections to specialist suggestions

- Grok's compact excerpt omitted the body of `refreshFlowProgress`: it already samples Flow once per simulated second, **not 40 times per second**. Its main cache recommendation is useful, but that frequency claim is wrong. Completed-visit mission refreshes and HUD reporting add separate calculations.
- Claude's time-dilation example at 40 ms is incorrect: a 40 ms frame advances 40 ms. The explicit dt cap drops excess elapsed time above 100 ms; retain current simulation semantics here.
- A road-index rebuild still costs O(roads) per simulation call. Sharing it removes nested multiplication; it does not make total graph work independent of map size.
- Permanent revision caches require reliable invalidation. This implementation deliberately bounds reuse to a call where topology is stable, avoiding that broader change.
- Treat proposed pre-movement grid caching, broad snapshot hoisting and dispatch timers as correctness-sensitive. Existing movement order, dynamic queues and deadlines must be verified before adoption.

## Evidence

- [Claude source review](claude-source-review.txt), [Grok compact-source review](grok-review.txt). They reviewed code, not the running browser. Full/compact input briefs are retained. Initial Grok attempts exhausted turn limits reading an offloaded large prompt; compact input completed. Claude had a connection-error attempt, then the full-source review completed.
- [Baseline](baseline-unprofiled.jsonl), [final](optimized.jsonl), [index-only](index-only.jsonl), [profile summary](profile-summary.txt), [benchmark](benchmark.mjs).
- [Tests](tests.txt), [build](build.txt).

Reproduce final benchmark: `node --experimental-strip-types docs/performance-review/benchmark.mjs`. Full tests: `npm test`; production build: `npm run build`. The raw sampled CPU profile lives in the temporary local directory; the text summary is retained here.

## HUD walking-query follow-up (2026-09-17)

[Implementation and measured results](hud-walking/README.md): shared sidewalk reads within each report and an early distance bound reduce the supplied-town sampled report median from41.44ms to3.23ms, with exact path/report/state comparisons. No browser FPS claim.
