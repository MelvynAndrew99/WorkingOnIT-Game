# Supplied town: periodic hitch and stuck-traffic work — September 17, 2026

User supplied the current exported sandbox town to investigate a brief hang every 2–3 seconds, then specifically requested checking work caused by stuck traffic and suggested updating game logic for the jam. This pass diagnoses the supplied copy; **no shipped runtime changes, active-save edits or publication**. Existing performance changes remain installed. All temporary browser/server processes were stopped after collection.

## Town and measured findings

The export contains 414 roads, 72 buildings (46 homes, three apartments, four stores, five parks), 70 trips, 62 wide-road sections, 15 controls and three active incidents. Fifty trips have hold times above five seconds. Twelve trips (ten cars and two buses) are waiting without an open route. The earlier fixture was 408 roads/71 buildings/68 trips: this is a modest size increase, while its congestion and blockage state matters.

### Periodic main-thread work

A production Vite build of the current source was instrumented only in `/tmp/won-hitch-town`. Headless Chromium/SwiftShader, fresh isolated contexts, desktop 1440×900 and narrow 390×900, DPR1, three-second warmup and 24-second measured capture per layout. Non-local requests were blocked. This measures callback CPU spans, not hardware GPU execution or the user's display. Nested spans overlap and must not be added together.

| Work | Desktop observed maximum | Narrow observed maximum | Cadence |
|---|---:|---:|---|
| Autosave, including serialization and localStorage | 1.6 ms | 1.9 ms | Every 2 simulated seconds |
| HUD/report refresh | 136.3 ms | 97.1 ms | Every 0.5 simulated seconds |
| Whole scene callback | 169.8 ms | 132.0 ms | Every rendered frame |
| Individual traffic tick | 16.1 ms | 15.7 ms | Every 25 ms of simulation |

Autosave is **not the main observed spike** in this test, correcting the earlier timing-only suspicion. HUD reports are the strongest measured periodic spike: mission/access/Flow diagnostics repeatedly check reachability. A separate instrumented Node read repeats the main report calculations ten times without changing city JSON: **12,210 `hasJourneyAccess` calls and 10,860 `walkingPath` calls** (about 1,086 walking queries per sampled report). Walking fallback currently builds a 414-entry road map before discovering whether a bounded six-tile walk is possible. These calls multiply when vehicle access is blocked. The read includes refreshMissions, flowReport, cityDiagnostics, missionSnapshot and connectedHomes, not every UI subreport.

Software presentation already limits this browser environment, and report cadence is 0.5 simulated seconds rather than the user's approximate 2–3 wall seconds. Thus the capture identifies substantial stall-capable work; it does not prove the exact cadence/cause of the user's observed hitch. Allocation/GC and work coinciding on a frame remain additional contributors to check on the affected browser. [Browser spans and long tasks](browser.json), [summary](browser-summary.jsonl).

### Stuck vehicles repeatedly do work without progress

Twenty simulated seconds at 60 calls/second, with an instrumented copy compared to the uninstrumented current model:

- **800 traffic ticks**; all 20 per-second full-city checkpoints match, validating the instrumentation.
- All **12 original no-route vehicles retry 800 times each**, i.e. once per tick / 40 times per simulated second, and remain blocked. Two additional returning responders repeatedly generate failed candidates while retaining their current assignments.
- **12,815 retarget calls** overall; **11,200** produce a waiting candidate. These are calls, not distinct vehicles or completed route changes.
- **14,631 occupancy-grid constructions**, roughly 18 per traffic tick, across planning, candidate admission and other checks. These grids cannot simply be reused across vehicle movement: occupancy must remain current.
- Replanning accounts for about **80% of measured trafficTick CPU** in this instrumented replay (nested inside trafficTick, not additional to it). An independent sampled model profile shows `wideRoadSignature` and path-graph validation among its largest CPU consumers. Cached BFS trees do not eliminate repeated validation/signature work.

The `phase === 'waiting'` branch of `replan` calls `tryRetarget` before the optional-query budget and eight-second cooldown branch. Consequently the existing optional-reroute cooldown does not limit these waiting-state attempts. Failed candidates also pass through route-commit validation where applicable, rebuilding occupancy despite often yielding the same waiting state. Do not solve this by delaying necessary rescue responses or allowing illegal movement. Reuse unchanged topology/results and avoid no-op work, with correct invalidation for edits, closures, crashes, goals and bus-route changes. Occupancy admission still needs live checks.

[Call counts and per-vehicle results](work-counts.json), [CPU profile summary](profile-summary.txt), [compressed sampled profile](model.cpuprofile.gz), [30-second traffic inspection](traffic-state.json). The 30-second replay completes 12 journeys elsewhere, while the same 12 no-route vehicles remain stuck: the whole town is not frozen.

### Separate traffic-logic defects/concerns

Police **34374** at **(5,10)** is in lane 1 trying to merge before its scene approach. `changeLane` returns true when a required merge is obstructed, so `trafficTick` skips the normal hold/wait accounting. In a 60-second original replay its position stays unchanged, `hold` remains **0** and total wait remains **1.6 seconds**. This is an accounting defect, not a claim the merge is physically free. It can hide a stalled responder from diagnostics and recovery conditions.

A temporary candidate in `/tmp/won-merge-probe` increments hold/wait in that blocked mandatory-merge branch. It correctly records 60 seconds of waiting but **does not clear the jam or its three incidents** in the same 60-second replay. It is not installed and is not presented as a complete rescue fix. Any merge/recovery change needs a dedicated physical-occupancy regression based on this town. [Original/candidate comparison](merge-probe.json), [temporary source](temporary-merge-probe.ts.txt).

Police **34934** near **(14,18)** also repeatedly backs up from progress 5.5 toward 5 and returns toward 5.5 without net progress, while its route contains another active wreck farther ahead. The two-second per-tick capture records that motion; the exact recovery rule needs a focused follow-up, not an arbitrary wrong-way or collision bypass. [Per-tick sample](police-motion.json).

## Recommended bounded follow-ups

1. For the visual hitch, reduce repeated reachability/walking work within one read-only HUD report. A cheap distance bound before sidewalk graph allocation and safe shared report data are candidates; preserve all displayed outcomes and mission qualification.
2. For congestion-related CPU load, share graph validation during a topology-stable planning pass and avoid repeating equivalent failed-route work. Keep immediate response to relevant road/incident changes and live lane reservations. A broad retry timer is not the selected fix.
3. Treat responder merge waiting and back-up/creep recovery as separate gameplay correctness fixes, with real arrival/clearance and no-overlap tests. Correct wait accounting alone is insufficient in this export.

The user has not selected one of these specific implementations; this delivery records evidence and concrete targets, not a shipped behavior change.

## Reproduction and artifacts

[Original export](original.json) is preserved; [normalized copy](save.json) is used for tests. Temporary source instrumentation uses the TypeScript AST to add timing wrappers: [main instrumentation](instrument.mjs), [additional call instrumentation](instrument-stuck.mjs). [Browser harness](browser.mjs), [model profiler](profile.mjs), [call-count/differential harness](count-work.mjs), [police motion capture](police-motion.mjs), [temporary wait-accounting experiment](merge-probe.mjs). Harness paths reference the temporary copies and installed Node/Chromium used in this environment. Browser timings are from the first instrumentation stage; deeper per-vehicle counts are a separate Node replay, avoiding extra instrumentation overhead in the original browser capture. Instrumentation and experimental runtime changes exist only under `/tmp`, not `src`.

## Follow-up traffic correction

[Local traffic fixes and validation](traffic-fix/README.md) correct blocked-merge wait accounting and the police reverse/creep loop. Physical congestion remains; red-light bypass for active responses is verified. Repeated routing and HUD work remain separate.
