# Failed-route reuse — 2026-09-17

User selected reducing repeated failed searches while retaining immediate reaction to newly available routes and live occupancy checks. Earlier HUD and traffic corrections are preserved.

## Implementation

The replanning pass shares validated road graphs through `withRoadPathRead`. This scope contains trip planning/mutation only; crash detection, incident completion and road changes occur outside it. Occupancy grids are not shared across changing trips.

Civilian and bus trips already waiting without a route can reuse that result only after the waiting candidate has passed route-commit validation. If a usable route exists but its lane reservation fails, no failure is cached: admission continues to check live traffic every tick. Service vehicles and patrols are excluded because their planning can depend on congestion/restrictions.

A weak per-city cache validates the existing exact road-access token and conservative building, bus route/stop-index and active-incident metadata. Per-trip keys include the actual path/position, goal, resume intent, home/destination, purpose, external origin, bus identity and lane. Same-length/in-place edits are detected. Only one entry per live trip is retained; nothing is serialized. No retry timer or delayed rescue policy was added.

This intentionally retains a small metadata serialization per affected replanning pass rather than introducing a mutation counter that every editing/save path must maintain. It avoids the repeated graph validation, failed planning and no-op occupancy-grid construction that dominated this workload.

[Incremental runtime patch](change.patch).

## Evidence

Immediate pre-change baseline copied into `/tmp/won-retry-before`. Both versions load the same supplied 414-road town. [Functional/timing harness](check.mjs), [timing summary](results.json), [isolated instrumentation harness](count.mjs), [call counts](counts.json). Harnesses accept baseline and candidate repository roots and run with Node's TypeScript stripping.

- Sixty full-city equality checkpoints over 60 simulated seconds.
- Seventy additional per-tick equality checks across seven edits: closure removal, same-count road coordinate mutation/restoration, incident clearance, stop rotation, bus route order and trip goal.
- Six new regression tests: immediate response to road construction, coordinate/goal changes, closure removal, occupied-lane safety, incident/direction changes, and supplied-town save/reload continuation with a fresh cache.
- Separate 20-second instrumented replay ends with identical full city state.

| Work over 20 simulated seconds | Before | After |
|---|---:|---:|
| Searches per original stranded vehicle (12 vehicles) | 800 | 1 |
| Total retarget calls | 12,832 | 3,244 |
| Occupancy-grid constructions | 51,125 | 41,537 |

These counts use the current traffic-corrected baseline, not the older pre-correction diagnosis. Both versions are instrumented identically in temporary copies; production sources contain no counters.

Seven timed samples after one warmup, alternating order, each replaying five simulated seconds: median total model time **1,420.45 ms → 918.73 ms**, a **35.3% reduction**. Measurement ran separately from builds/tests. This is isolated Node model CPU time, not browser FPS or a general guarantee for other towns.

Production TypeScript/Vite build passes with the existing bundle-size warning. Full suite: **72/74 files pass**. The four established assertions in Flow/IntersectionSafety reproduce with identical assertion details on the immediate baseline. The final added reload regression also passes independently.

No active player-save edits, publication, save-format, visual, simulation-cadence or traffic-rule changes. Dynamic service planning and other remaining occupancy work continue normally.
