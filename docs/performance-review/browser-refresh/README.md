# Same-town browser comparison — 2026-09-17

User requested a fresh browser profile using the same exported town for before/after results. This is measurement only: no new runtime changes, publication or active-save access.

## Compared versions and workload

Before is the source immediately before the HUD walking optimization, including the traffic-logic corrections. After includes the HUD, failed-route and occupancy-read optimizations. [Exact runtime difference](runtime-comparison.patch), [input hash and settings](inputs.json). Both load the identical supplied 414-road/72-building/70-trip export into fresh isolated browser contexts.

Production standalone builds use `RUNDOT_GAME_DISABLE_EMBEDDED_LIBS=true`, the same installed dependencies/assets and the same temporary timing wrappers. The initial externalized build could not start with remote requests blocked; it produced no measurements and was replaced for both versions.

Chromium 151, headless ANGLE SwiftShader, DPR1, 1440×900 and 390×900. Two repeats per version/layout, reversing version order on the second repeat. Each run has three seconds warmup, twelve seconds steady traffic and eight seconds of paired pan/zoom inputs every half-second. Non-local requests are blocked. No builds, model tests or other browser workloads ran during these timing captures. All eight contexts completed without page errors and retained 414 roads. Browsers and both temporary servers were stopped afterward.

[Browser harness](browser.mjs), [instrumentation](instrument.mjs), [raw data](browser.json), [per-run summaries](summary.json), [pooled summaries](aggregate.json). Analysis scripts: [per-run](summarize.mjs), [pooled](aggregate.mjs).

## Results

Times are milliseconds. HUD/tick figures are mean per call; frame and scene figures are p95 across both repeats. A frame interval is wall time between animation callbacks. The scene callback measures game update and scene preparation, not all Pixi rendering or GPU work.

| Layout/workload | Mean HUD before → after | Mean traffic tick before → after | Scene callback p95 before → after | Frame interval p95 before → after | Approx. FPS before → after |
|---|---:|---:|---:|---:|---:|
| Desktop steady | 78.9 → 9.7 | 10.9 → 4.9 | 142.9 → 40.8 | 183.4 → 183.4 | 5.9 → 5.9 |
| Desktop pan/zoom | 76.2 → 9.4 | 9.7 → 4.0 | 127.0 → 33.9 | 183.4 → 200.0 | 5.7 → 5.7 |
| Narrow steady | 79.1 → 9.2 | 10.2 → 4.7 | 112.6 → 24.9 | 133.3 → 66.7 | 15.8 → 16.4 |
| Narrow pan/zoom | 81.0 → 8.1 | 9.7 → 4.3 | 108.8 → 24.0 | 133.3 → 66.7 | 16.0 → 16.5 |

Across the two steady runs, recorded long tasks fall from98→10 on desktop and70→0 on narrow. Pan/zoom long tasks fall59→4 and42→0 respectively. These counts describe only the measured intervals.

The game-loop CPU reduction carries through to the browser. The desktop presentation rate remains limited elsewhere in this software-rendered environment: lower scene CPU did not improve FPS, and its pan/zoom p95 frame interval worsened slightly. Do not report a universal FPS gain. Narrow frame-time tails improve markedly.

Both versions start at the same saved simulation time. Because simulation advancement is driven by rendered frames and existing delta caps, equal wall-time captures do not end at precisely equal simulation times. Compare per-call CPU and the controlled workload, not total callback counts as equivalent simulated work. Prior fixed-step differential tests separately established equal game behavior.

## Allocation and GC diagnostic

A separate eight-second desktop steady capture per version used CPU sampling, V8 tracing and sampled allocations including collected objects. It ran after the timing experiments, so profiler overhead is excluded from the table above. [Harness](gc-profile.mjs), [summary](gc-summary.json), compressed [before CPU](before.cpuprofile.gz)/[after CPU](after.cpuprofile.gz), [before allocations](before-heap.json.gz)/[after allocations](after-heap.json.gz), [before GC trace](before-gc-trace.json.gz)/[after GC trace](after-gc-trace.json.gz).

Estimated sampled allocation volume falls1.99GB→0.66GB over these wall-time samples. This is cumulative allocation churn, not retained heap or a leak measurement. Main-thread MinorGC events fall55→21 (total69.4→42.0ms); MajorGC events fall2→1 (total8.1→6.2ms). The longest observed major pause increases4.2→6.2ms: fewer collections does not guarantee every pause improves. V8 subevents overlap their parent GC events and must not be added together. Ordinary heap snapshots vary with collection timing; no retention/leak conclusion is drawn.

## Remaining opportunities

Traffic remains the largest instrumented game CPU cost. In the current desktop steady samples, traffic ticks account for about2.81s of3.30s inside `stepCity`; these are nested spans, not additive costs. Scene preparation is smaller: `renderActivity` averages~1.0ms and `renderCars`~0.4ms per call. These numbers exclude the full renderer submission/GPU path.

The separate current CPU profile's largest named game self-time entries were matched by their minified function bodies: `allowsRoadStep`~131ms, `heldSlots`~104ms, `slotAt`~78ms, `wideRoadTopology`~78ms over the diagnostic capture. Further road-legality/reservation work is a candidate for investigation, not authorization for another rewrite. For the remaining desktop frame limit, profile the normal hardware-accelerated browser before choosing renderer changes; this environment cannot establish the user's GPU bottleneck.
