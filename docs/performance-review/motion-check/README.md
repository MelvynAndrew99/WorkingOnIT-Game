# Reported slight car stepping — September 17, 2026

User reports slight stop-motion movement in the local game, with onset uncertain between the warning cache and routing-snapshot optimizations. This is an unresolved visual-smoothness report, not a claim that model-equivalence checks certify presentation. No runtime fix, interpolation feature, rollback or save edit was made in this investigation.

## User comparison after stashing

User tested the original code with both optimizations stashed and confirmed the hitch is present there too, then requested restoration. All stashed changes were restored without conflicts; the stash remains as a backup. The user notes their actively growing town is larger than the supplied benchmark town. Town size is a plausible factor, not yet measured or confirmed. The report remains an existing periodic hitch to investigate later, not an established regression from these optimizations. No further runtime changes or performance tests were made for this comparison.

## User clarification: periodic hitch

The user subsequently clarifies that movement is smooth for two or three seconds, briefly hangs, then continues. This points toward periodic main-thread work rather than continuous 40Hz stepping; the earlier cadence explanation should not be treated as the diagnosis. Source confirms existing HUD reports every 0.5 simulated seconds, conditional Flow evaluation every 1 second, and autosave every 2 seconds. Autosave synchronously serializes the whole save and writes localStorage on the rendering thread. These schedules and the save implementation are unchanged from HEAD; neither optimization introduces a timer. Warning-cache rebuilding is triggered by changed access data, not elapsed time. The two-second save is a candidate to time alongside HUD/Flow and garbage collection, not a confirmed cause. No save cadence or persistence behavior changed.

## Confirmed source facts

Against the captured pre-optimization source, `cityModel.ts`, `cityTraffic.ts`, `pixiApp.ts`, `GameCanvas.tsx`, and the entire `renderCars` function are byte-identical. Movement still advances in 25ms steps (40Hz). Rendering uses the latest saved trip progress to position cars along their road segment; it does not interpolate between previous/current simulation states using the remaining tick fraction. Whole-pixel rendering also predates this pass. These are possible contributors to stepping, not proof of what changed on the user's display.

A three-second fixed-frame replay at each of 60Hz and 120Hz compares the complete city after every frame against the original version: **540/540 states match**. At 60Hz, 60 of 180 frames have no traffic tick; at 120Hz, 240 of 360 have none. That repeated-position cadence exists in both versions. [Replay results](cadence.json), [harness](cadence.mjs).

## Isolated local browser comparison

Original source from `/tmp/won-access-baseline` versus current integrated source, each copied to a separate temporary Vite development server. Same historical 408-road town, 1440×900 and 390×900 layouts, DPR1, two eight-second samples per layout/version after a three-second warmup, reversed version order on the second trial. Fresh browser contexts; non-local network blocked; no active player storage used. Temporary instrumentation records scene callback duration, intervals, and one tracked car's progress/position; no instrumentation is shipped. These are software-rendered Chromium/SwiftShader results, not the user's browser/device. JavaScript callback duration excludes asynchronous GPU/presentation work.

| Width | Trial | Version | Frame interval median ms | Frame interval p95 ms | Scene callback p95 ms |
|---|---|---|---:|---:|---:|
| 1440 | 1 | before | 167.6 | 180.2 | 50.2 |
| 1440 | 1 | after | 169.5 | 177.2 | 45.0 |
| 390 | 1 | before | 50.7 | 104.7 | 36.2 |
| 390 | 1 | after | 50.5 | 102.2 | 30.6 |
| 1440 | 2 | after | 170.0 | 177.8 | 51.2 |
| 1440 | 2 | before | 167.2 | 180.3 | 50.5 |
| 390 | 2 | after | 51.0 | 100.1 | 29.2 |
| 390 | 2 | before | 50.7 | 101.9 | 32.9 |

There is no clear new frame-pacing regression in these samples, but software graphics is already slow (about 6 FPS desktop / 19 FPS narrow), so this cannot rule out subtle high-refresh stepping on the user's machine. It is also not evidence that the user imagined the change. The earlier optimization benchmarks proved model equality and selected CPU improvements, not motion smoothness.

[Raw frame samples](browser.json), [browser harness](browser.mjs). Temporary source copies live at `/tmp/won-motion-before` and `/tmp/won-motion-after`; both test servers and the test browser were stopped afterward. Harness paths reference that local setup, not an installed persistent diagnostic.

## Next distinction

CPU-heavy local tests and benchmarks can compete with the local game if played concurrently. A fresh reload with those processes stopped also removes development hot-reload state. Whether that resolves the user's symptom still needs user confirmation. If stepping persists, compare the original and current builds on the affected browser/town before deciding whether to revert an optimization or add separately tested render-only interpolation. Do not change traffic tick frequency, vehicle speeds, collision admission or trip paths to mask a rendering issue.
