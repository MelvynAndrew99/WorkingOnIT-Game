# Supplied current town — September 13, 2026

Supplement to the [integrated performance review](../README.md), using the user's subsequently supplied current town. No additional runtime changes are made for this supplement.

## Input and isolation

The [original attachment](original.json) is byte-preserved, SHA-256 `6b8ea6ad200b156f80998b42c67c3c3f83e7b36c11e3f774333e188013c3feb1`. The [benchmark save](save.json) is validated through `parseCity`; the gateway migration helper reports no relocation. The attachment and active player storage are never modified. Fresh browser contexts seed only isolated local storage and block external requests.

The town starts with **408 road tiles, 71 buildings and 68 active trips**, elapsed simulation time 25,557.8439 seconds. Buildings include 46 homes, four stores, five parks, two hospitals, one police station, three fire stations, two bus stations, four bus stops, three apartments and one office. Its saved map spans 64×48 tiles at (-24,-16). Traffic demand, active journeys, topology and building configuration are retained.

## Deterministic simulation

[Harness](model.mjs), [before](model-before.json), [after](model-after.json). One warm-up and three measured trials per version, each 3,600 steps at 1/60 second, parsed save/reload at 30 seconds, complete-city SHA-256 every simulated second. Timings are medians of three trials on this host, including checkpoint serialization in total time.

| Metric | Before | After |
|---|---:|---:|
| 60-second workload | 5,644 ms | 5,006 ms |
| Step p50 | 1.072 ms | 1.044 ms |
| Step p95 | 3.268 ms | 3.177 ms |
| Step p99 | 7.164 ms | 6.082 ms |

Total workload improves **11.3%**. All 60 complete-state checkpoints match across all six measured runs, including reload. This checks exact simulation preservation, rather than merely similar traffic counts.

## Browser method

The baseline is the preserved integrated production snapshot before the four performance fixes. The after build includes all four fixes, including texture-pool cleanup. Both contain identical timing hooks. Chromium 151, SwiftShader software graphics, DPR 1; desktop 1440×900 and touch-enabled mobile layout 390×844. No CPU throttling or real phone hardware. Two fresh contexts per version/layout, run sequentially without concurrent model timing.

[Harness](browser.mjs) collects at least six seconds per phase: live traffic; repeated mouse or touch pan/zoom; apartment, office, depot and stop inspection plus Tracker; then actual menu radio playback, seeking and tuning. Radio runs at the title/menu where the game implements it; simulation is stopped there. No construction or joining is applied to this supplied layout: those mutation workflows remain covered by the original small/busy matrix. The supplement checks the user's actual network without changing its topology. Roads and apartment membership are asserted unchanged and survive reload; page errors fail the run.

Frame statistics use requestAnimationFrame intervals. Input is handler-entry to second-rAF latency, a presentation proxy, not hardware input-to-photon time. Phase epochs prevent pending callbacks leaking into later samples. Hook timings are synchronous CPU costs; nested totals overlap and exclude asynchronous GPU execution. Live CPU profiles are captured on the first trial per layout. Heap uses CDP, with GC at initial gameplay and final menu; gameplay end is uncollected and includes transient allocations. These points do not establish a leak rate or total GPU/media/process memory.

## Planning interpretation

The user reports that the game currently feels responsive and frames this work as understanding future engine limits. These measurements are capacity evidence, not evidence of a current player-facing responsiveness defect. Three town fixtures cannot establish a maximum safe population or map size: topology, congestion, transit access searches, visible area and hardware all matter. Do not extrapolate a linear cars-per-second limit from one 60-second replay.

Useful next planning measurements are a controlled size/topology sweep on target desktop and phone hardware, including congested transit-heavy networks, plus a longer memory soak. Keep demand and physical traffic rules constant; distinguish model-step CPU budget, rendering/presentation time and retained memory. A worker or larger cache architecture should follow those measurements rather than this software-rendered FPS alone.

## Profile evidence and remaining costs

The first desktop live CPU sample spans approximately 6.23 seconds. V8 idle accounts for 4.41 seconds before and 4.51 seconds after (71% → 72%); the HUD report drops from approximately 397 → 208 ms inclusive. After optimization, `stepCity` still accounts for about 926 ms inclusive, including 435 ms in civilian routing and 360 ms in weighted routing; these nested values must not be added. Actual frame-dt traffic evolves differently in each capture, so these totals are attribution evidence, not a controlled per-step speed comparison. The deterministic replay above provides that comparison.

[Before desktop profile](profile-before-desktop.txt), [after desktop profile](profile-after-desktop.txt), [before mobile profile](profile-before-mobile.txt), [after mobile profile](profile-after-mobile.txt). The earlier compositor trace supports a software-presentation limitation on this host; it was not repeated on this supplied map. Idle CPU samples alone do not identify hardware GPU cost.

Routing/access searches are a measured candidate for future scaling work. Any broader caching must preserve invalidation on road direction, closures, occupied/reserved space and building/transit access changes. This supplement does not justify suppressing demand, skipping traffic checks, reducing visual features or changing simulation cadence.

## Browser results

[Full phase comparison](browser-results.md), [raw before](browser-before.json), [raw after](browser-after.json). Medians of two capture-level p95 statistics:

| Metric | Desktop before → after | Mobile layout before → after |
|---|---:|---:|
| Live frame p95 | 183 → 192 ms | 100 → 67 ms |
| Live HUD-report p95 | 64 → 32 ms | 70 → 37 ms |
| Pan/zoom frame p95 | 325 → 200 ms | 183 → 92 ms |
| Pan/zoom input proxy p95 | 632 → 424 ms | 305 → 150 ms |
| Inspector frame p95 | 333 → 317 ms | 175 → 92 ms |

Pan/zoom terrain preparation totals fall 44.8 → 3.3 ms desktop and 38.5 → 1.1 ms mobile. Desktop steady FPS remains approximately 5.8 → 5.9, mobile 18.6 → 19.5, under software rendering. Desktop live simulation advances approximately 0.6 seconds per wall second because of the existing dt cap. This is not the user's reported responsive hardware experience and is not a real-device capacity ceiling.

There are mixed results: desktop live simulation hook p95 rises 38.8 → 47.5 ms despite the faster exact-state model replay, desktop radio input p95 rises 60.9 → 101.1 ms, and mobile pan/zoom HUD-report p95 rises 19.2 → 28.3 ms. Live traffic state and tick dt differ with frame pacing. Two short captures, baseline first, do not establish stable regressions or control thermal/order effects. Radio has no consistent overall speedup.

GC-normalized menu JS heap is essentially unchanged (desktop 11.7 MiB, mobile 12.1 → 11.9 MiB), while returned menu DOM/listener counts are lower after teardown. Uncollected end-gameplay heap is mixed: desktop 44.8 → 31.5 MiB, mobile 42.6 → 47.4 MiB. Do not interpret the latter as a leak or the former as a proven memory reduction; transient allocation/GC timing and retained terrain vary. The prior repeated lifecycle investigation remains the evidence for the texture-pool fix.

All **eight** version/layout/trial contexts complete live traffic, pan/zoom, building/transit inspection, Tracker, actual radio playback and geometry/membership reload assertions, with no page errors. The supplied bytes retain their original SHA-256. No additional runtime changes, demand reductions or rule changes were needed. The isolated final instrumented production build/typecheck and bundled build pass; the existing bundle-size warning remains. The original review records the full functional suite and its four baseline failures; it was not redundantly rerun for this fixture/documentation-only supplement.

[Final desktop view](after-desktop.png), [final mobile view](after-mobile.png), [browser source manifests](browser-source-sha256.json). Compressed raw CPU profiles are retained alongside the summaries. Reproduction uses the original review's isolated instrumented snapshots, with final `GameCanvas.tsx` copied into the after snapshot and a standalone sourcemapped build (`RUNDOT_GAME_DISABLE_EMBEDDED_LIBS=true vite build --sourcemap`). Neither measurement hooks nor standalone-build configuration were added to production source. The first attempted after capture used an uninstrumented snapshot and failed before measurement; no partial result from it enters the comparison.

No publication or active-save access. Local preview servers are stopped after capture.
