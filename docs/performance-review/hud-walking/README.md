# HUD walking-query optimization — 2026-09-17

User selected HUD/report work as the next bounded performance improvement. Existing traffic fixes and earlier performance changes are preserved.

## Implementation

`walkingPath` rejects destinations whose Manhattan distance exceeds the existing BFS step limit before allocating a sidewalk map. Fractional limits retain their original rounded-up search behavior. During the synchronous scene report only, `withWalkingPathRead` shares one lazily built sidewalk map and memoizes unblocked walking results by exact start, goal and maximum distance. Cached paths are detached from caller-owned arrays/points. Queries with explicit pedestrian blocks still search against the current blocked set.

The scope is discarded in `finally`, including on exceptions. Nested reads reuse the outer scope; separate cities are isolated. Roads must remain unchanged within the synchronous report. Nothing persists between reports, so road/building edits and reloads need no revision counter. Walking outside reports retains ordinary fresh reads, with the same early distance rejection. Report cadence, rendering and traffic rules remain unchanged.

[Exact incremental source patch](change.patch).

## Results and checks

The supplied 414-road/72-building town was loaded into isolated before/after models, with the before source copied immediately prior to this change. The harness samples the same report calculations as the original diagnosis: mission refresh, flow report, city diagnostics, mission snapshot and connected homes, under the existing road-read scope. This does **not** include every UI subreport, rendering or store update.

After ten warmups, sixty reads per version in alternating order:

| Report calculation CPU | Before | After |
|---|---:|---:|
| Median | 41.44 ms | 3.23 ms |
| p95 | 43.11 ms | 3.93 ms |

Median reduction: 92.2%. This is isolated Node report CPU time, not browser frame time or an FPS claim. No other test/build workloads ran during measurement. [Raw summary](results.json), [reproducible harness](check.mjs). Run with Node type stripping and baseline/candidate repository roots as the two arguments.

- 4,800 exact walking-path comparisons against the prior implementation, including fractional limits.
- Twenty report/full-city equality checkpoints over five simulated seconds, plus comparisons after road-coordinate and building-orientation edits.
- New tests cover caller mutation, range separation, mutable pedestrian blocked sets, city isolation, nested reads, road edits between reports and cleanup after exceptions.
- Production TypeScript/Vite build passes with the existing bundle-size warning.
- Full model/audio suite: 71/73 files pass. Flow/IntersectionSafety retain the four previously established failing assertions; walking, bus, mission and congestion tests pass.

No active-save changes or publication. Repeated failed vehicle routing remains a separate opportunity.
