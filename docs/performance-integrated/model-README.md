# Integrated model profiling (2026-09-13)

Baseline is the current integrated working tree captured before performance edits, including uncommitted work, not Git HEAD. `/tmp/integrated-model-pristine/src` retains those files; `/tmp/integrated-perf-before` is the initial browser copy. No player save was read or written.

`model-fixtures.mjs` creates detached fixture saves. Small has 32 roads, 7 buildings (two homes, shop, park, office and two apartments); apartments start unjoined for interaction measurement. Busy derives from the unchanged historical supplied town, parsed through current validation with the existing sandbox gateway relocation: 200 roads, 50 buildings, 39 initial trips. Small initial live traffic measures connected home/office/shop/park journeys; apartment demand becomes active only after the interaction joins/connects those blocks. Neither fixture represents every possible town.

`model-benchmark.mjs ROOT TAG` runs 60 simulated seconds at 1/60 dt, one warmup plus three measured repetitions, fresh parsed copies each repetition, SHA-256 of full city state each simulated second, and save/reload halfway through. Timing summaries exclude the warmup. Per-step quantiles time `stepCity` only; total also includes hashing and one parse/reload. Node v24.19.0, local workstation, no CPU throttling. These are model timings, not browser frame timings or physical-phone measurements.

| Median of measured trials | Before | After |
|---|---:|---:|
| Busy total ms / 60 sim seconds | 2491.50 | 2295.12 |
| Busy step p50 ms | 0.662 | 0.580 |
| Busy step p95 ms | 1.736 | 1.622 |
| Busy step p99 ms | 2.608 | 2.574 |
| Small total ms / 60 sim seconds | 57.48 | 65.58 |
| Small step p99 ms | 0.137 | 0.206 |

Busy total declined 7.9%, p50 12.3%, p95 6.6%; p99 was essentially unchanged. Small absolute costs are low and these short measurements show no improvement there; do not claim a universal speedup. Raw trials are `model-before.json` and `model-after.json`.

A separate CPU sampling run identified `graphFor` as the largest self-time function (~1723 ms), followed by `routingSnapshot` (~1440 ms). Those sample totals span both fixtures and all four trials, including warmup. The targeted patch avoids constructing 200 coordinate strings and joining them on every cached path query. Every ordered coordinate is still compared against a private copied graph; blockers, incident status, roadworks and direction signatures are still evaluated each query. Rebuilds, BFS tie order, path copies, bounded trees, traffic demand and movement remain unchanged. No broad mutable routing-snapshot caching was introduced.

All three after repetitions match all 60 full-state hashes for each fixture. `model-preservation.mjs BASELINE_ROOT` additionally compares baseline and current source at 120 full-state checkpoints across both towns, with a closure at 20 seconds, in-place closure movement at 25, reload at 30 and closure removal at 40. All match; evidence in `model-preservation.json`.

Focused existing path/direction/wide-road regressions pass, including a new warm-cache test that changes directions and roadwork coordinates without advancing simulation time. The existing independent BFS tests cover road replacement, in-place coordinates, closures, incident clearance, caller mutation, per-city separation and eviction.

Reproduction:

```sh
node --experimental-strip-types docs/performance-integrated/model-benchmark.mjs /tmp/integrated-model-pristine before
node --experimental-strip-types docs/performance-integrated/model-benchmark.mjs "$PWD" after
node --experimental-strip-types docs/performance-integrated/model-preservation.mjs /tmp/integrated-model-pristine
node --experimental-strip-types --test src/game/*.test.ts src/audio/*.test.ts
```

Do not run CPU-heavy builds/tests alongside timed browser captures. The pristine baseline is temporary and will need recapturing or preservation for a later session. No publication performed.

Full regression outcome: 68 of 70 model/audio test files pass (`model-full-tests.txt`). `cityFlow.test.ts` and `cityIntersectionSafety.test.ts` fail on both the pristine integrated baseline and final source. Repeating those files without process isolation exposes four identical assertion failures: FLOW-01 road bottleneck, Level 2 quiet service, long shared green, and saved warning/frame chunking. The latter compares inconsistent land fixture state after parsing (`freeUnlocks`/origin/owned plots). Baseline and current failure details match exactly after normalizing only source-root paths and durations (`model-baseline-failure-detail.txt`, `model-current-failure-detail.txt`). Older documentation mentions three failures; this integrated baseline has four. No unrelated traffic or test expectations were changed to hide them.

The production browser profile also identified repeated road-index construction inside the read-only intersection safety report. The final patch wraps its existing output calculation in the existing synchronous `withRoadIndex` scope; per-area incident lookups share that index, and the existing `finally` restores/deletes the scope on return or error. No report fields, exposure calculations or incident rules changed.

`model-hud-benchmark.mjs` compares pristine and final `intersectionSafetySnapshot` on the exact same parsed busy fixture: 100-call warmup and three measured 100-call trials. Median per-report cost falls from 4.828 ms to 0.135 ms (97.2% lower). Every trial preserves the entire city hash and produces the same report hash across both builds (`model-hud-final.json`). This isolates report calculation and does not imply a 97% overall frame improvement. Final focused checks pass all 19 assertions (`model-focused-final.txt`), including nested scope reuse, exception cleanup, immutable report results and fresh observations after incident/control/road edits.

Final integrated rerun after the HUD scope patch: 69 of 71 model/audio test files pass; only the same baseline-failing Flow and IntersectionSafety files remain (`model-full-final.txt`). The added snapshot test file passes. Final differential preservation again matches all 120 checkpoints (`model-preservation-final.json`); earlier evidence is retained separately.

## Final HUD follow-up

The source-mapped production busy-town profile exposed repeated road-index rebuilding inside the read-only `intersectionSafetySnapshot` report. It now shares a `withRoadIndex` scope across nested incident-area lookups; the scope restores the previous index in `finally`. It does not span simulation or tool mutation.

`model-hud-benchmark.mjs` compares identical parsed busy cities, 100 warmup calls and three measured sets of 100 reports. Median per report: **4.828 → 0.135 ms** (97.2% less synchronous work). Exact report hashes and pre/post city hashes match. This is a fixed-state microbenchmark, not a browser FPS result. Raw evidence: [model-hud-final.json](model-hud-final.json).

Final validation after both model/report changes: **69/71 test files pass**, with only the same two baseline-failing files; 19 focused assertions pass, including snapshot purity, returned-value independence, nested scopes, later in-place edits and cleanup on a throwing read. All 120 deterministic differential checkpoints still match. [Full final run](model-full-final.txt), [focused checks](model-focused-final.txt), [final preservation](model-preservation-final.json).
