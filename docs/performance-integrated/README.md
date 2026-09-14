# Integrated performance review — September 13, 2026

Four targeted changes are implemented locally: exact path-cache coordinate validation without repeated road-string allocation; one shared road index for the read-only safety report; a four-tile retained terrain margin to avoid rebuilding terrain textures during small camera movements; and disposal of returned render textures before renderer teardown to release old canvases. Demand, tick cadence, traffic/responder rules, saved state and artwork remain unchanged.

The later supplied 408-road current town is also covered in the [supplemental benchmark](current-town/README.md), with its original attachment preserved and exact simulation comparisons.

## Measured outcome

Production pan/zoom results, medians of two capture-level p95 measurements:

| Town / layout | Frame p95 before → after | Input proxy p95 before → after |
|---|---:|---:|
| Small desktop | 233 → 117 ms | 393 → 230 ms |
| Small mobile layout | 150 → 42 ms | 282 → 80 ms |
| Busy desktop | 292 → 175 ms | 534 → 341 ms |
| Busy mobile layout | 167 → 58 ms | 187 → 90 ms |

The terrain preparation work during the pan workload drops from approximately 42–44 ms to under 1 ms total on desktop, and from 20–28 ms to 1–8 ms on mobile. The actual GPU texture work is asynchronous and is not included in those JavaScript totals. The retained margin also improves inspector frame pacing in all four combinations. Its visible output is unchanged in all 24 paused-map comparisons, including height resizing, distant edges, zoom extremes, delayed atlas load and plot unlocking: decoded RGBA pixels match exactly.

Busy fixed-step model work improves 7.9% (2,491 → 2,295 ms per 60 simulated seconds); small-model timings show no improvement. The isolated safety report drops 97.2% (4.828 → 0.135 ms), with identical reports and unchanged city hashes. In the actual browser, busy live-HUD report p95 falls from 23.4 → 6.8 ms desktop and 24.3 → 8.0 ms mobile. See [model results](model-README.md).

**Steady frame pacing is not solved.** Live FPS remains approximately 10 small desktop, 6.8 busy desktop, 40 small mobile and 26 busy mobile in SwiftShader. Busy desktop advances only about 0.68 simulated seconds per wall second because frames exceed the existing 100ms dt cap. The fixes do not change that cap or fast-forward/remove traffic to hide it. CPU profiles put 85–88% of the busy desktop sample in V8 idle; that is evidence that game JavaScript alone does not explain the frame interval, not a measurement of GPU duration.

A separate six-second compositor trace of the **final** build corroborates the remaining presentation bottleneck: `CrGpuMain / SkiaOutputSurfaceImplOnGpu::SwapBuffers` accounts for 5.61 s across 38 swaps before and 5.80 s across 40 swaps after (about 148 → 145 ms per swap). Meanwhile renderer-main animation-frame work falls from 545 → 423 ms total. These are thread wall-time spans, including waits, not hardware-GPU execution timings; nested trace totals overlap. They localize the remaining delay to this software graphics/presentation path without claiming the same cost on a real device. [Before trace summary](evidence/trace-before-summary.json), [final trace summary](evidence/trace-after-summary.json); compressed traces and `trace.mjs` are retained.

There are mixed tail results: busy-desktop construction p95 is 292 → 308 ms (p99 308 → 400 ms), small-desktop joining input p95 is 275 → 313 ms, and busy-mobile joining p95 is 33 → 42 ms. Radio shows no consistent speedup. Two short captures cannot establish whether every tail difference is a stable regression; these remain limitations rather than omitted results. Browser traffic evolves at real frame dt, so transient occupancy, route choice and build admissibility can differ at a given wall time. The independent fixed-step hashes are the behavior-preservation evidence.

All six phases, FPS, p95/p99, input and long tasks are in [the full comparison](browser-results.md); [baseline raw captures](evidence/browser-baseline.json), [optimized captures](evidence/browser-after.json), [baseline CPU summary](browser-profile-baseline.txt), [optimized CPU summary](browser-profile-after.txt).

## Memory and lifecycle

The initial repeated workflow exposed a genuine preexisting retention bug in both builds. A native-click control, without Playwright selectors, radio or Tracker, accumulated **506 detached DOM nodes and 54 listeners per game/menu cycle**. Heap retainers traced it to Pixi 8.19.0 pooled render-texture destroy callbacks holding old renderers/canvases. `GameCanvas` now clears returned idle textures through the public `TexturePool.clear(true)` API after scene teardown and before renderer destruction. Borrowed textures and shared atlas `Assets` are preserved.

Five native cycles now return to exactly **249 nodes / 212 listeners each time**, versus baseline 755 → 2,779 nodes / 266 → 482 listeners. A separate four-cycle real UI check on each layout keeps listeners at 238; menu DOM counts remain 256–258 desktop / 258–260 mobile rather than gaining ~515 each cycle. Canvases disappear at menu; repeated entry still renders atlas art, cars, shadows and rain with no page errors. Radio-only cycling did not produce the game retention pattern. [Investigation, controls and raw evidence](memory-native-README.md), [real UI cycle results](evidence/memory-fixed-results.json).

Memory is **not certified leak-free**. GC-normalized menu heap still increases roughly 9.6 → 11.8 MiB desktop and 9.4 → 11.5 MiB mobile in the four-cycle follow-up; remaining JS caches/JIT/state retention is uncharacterized. The terrain margin retains additional live sprites: a separate zoom-out/in comparison costs approximately 4–5 MiB extra live JS heap. Its extent is bounded by the map, but it does not shrink immediately after zooming in. GPU texture/media/native memory are not covered comprehensively by these JS heap measurements. A longer controlled soak and target-device memory trace remain necessary.

The frame matrix was completed before the final disposal-only fix. That fix changes unmount cleanup, not the simulation/render/interaction paths timed while playing. It was tested separately in an isolated production build with native and real UI lifecycle cycles; final typecheck/build covers all four fixes.

## Functional verification

- Final model/audio regressions: **69/71 test files pass**. The four assertions failing in Flow and IntersectionSafety reproduce on the pristine integrated baseline; no traffic balance or expectations were changed to hide them. [Final suite](model-full-final.txt), [baseline failure details](model-baseline-failure-detail.txt).
- Nineteen focused assertions pass, including exact cache invalidation and read-scope purity/cleanup. All 120 full-city differential checkpoints match across both fixtures, including closure insertion, in-place movement, removal and reload. Repeated fixed-step before/after runs also match every saved checkpoint. [Preservation](model-preservation-final.json).
- All 16 frame-workload contexts complete real construction/joining/radio and geometry/membership reload checks without page errors. Twenty-four paused terrain comparisons are exactly pixel-identical. [Visual checks](evidence/visual-results.json).
- Final TypeScript check and normal production build pass. The existing large-bundle warning remains. [Build log](evidence/final-build.txt).

[Exact performance-only source patch](performance-changes.patch) excludes the preexisting integrated edits. The source baseline can be reconstructed in a throwaway copy by reversing this patch and checking the recorded hashes; never reverse it in the user's active workspace.

## Scope and reproducibility

The user's explicit request authorizes this performance pass; earlier “no performance tests” delivery notes describe those earlier tasks. Nothing is published. All town writes occur in new isolated browser contexts with non-local network requests blocked. Existing player browser storage and the historical supplied-town fixture are untouched.

Baseline is today's integrated working tree, including preexisting uncommitted work, captured before performance edits. It is **not** Git HEAD or a claim about an earlier published version. `baseline-source-sha256.json` records source hashes. The before source is `/tmp/integrated-model-pristine`; browser snapshots are `/tmp/integrated-perf-before` and `/tmp/integrated-perf-after`. Instrumentation and module-access hooks are added only to those temporary snapshots by `instrument.py`, never to shipped source.

Small model fixture: 32 roads, seven buildings, including homes/store/park/office and two unjoined apartments. Busy: historical supplied town, 200 roads, 50 buildings, 39 initial trips, parsed through today's normal validation and existing gateway migration. Browser small-town copies move the two unjoined apartments to y=4 in the fixture setup, away from live road reservations, so joining has a reproducible clear area; all home/office demand remains active. Browser busy-town construction uses ordinary tools/funds to add two blocks in vacant land. These new apartment areas initially lack public-road connections; the workload measures legal placement/joining and existing live traffic, not maximum apartment traffic throughput. Copies begin identically before and after; no demand reduction or simulation-rule changes are used.

Production browser: headless Chromium 151, Pixi 8.19.0 / React 19.2.4 / Vite 6.4.3, SwiftShader software graphics, desktop 1440×900 and mobile layout 390×844, DPR 1. Mobile uses touch taps, touch scroll and pinch; desktop uses mouse and wheel. No CPU throttling. This is mobile **layout/emulated input**, not physical-phone hardware, thermal behavior or mobile Safari. Build uses Vite's normal production optimization with embedded libraries disabled so all assets are local; no RUN host/CDN dependency. Early development-build smoke tests and failed harness setup captures are excluded from the comparison.

`browser.mjs` runs two fresh contexts per town/layout/version, sequentially with no concurrent build/test/benchmark. Each context warms up then captures live traffic, pan/zoom, real construction, actual apartment join preview/apply, inspectors/Tracker, and title-screen radio tuning/playback. Each phase lasts at least six wall seconds; scripted gestures/actions may run longer. CPU sampling is enabled only for the first live phase; the second live sample is unprofiled. Runtime span instrumentation is identical in both builds. Geometry and complex membership must survive an actual page reload, real construction/join results are asserted, radio must actually play, and page errors fail the run.

Radio currently belongs to the title screen. Its sample follows a real Menu click which tears down the canvas and stops the town. It does not represent concurrent radio plus live traffic. Playback, tuner/seek, power and return/reload are exercised without adding a new radio feature.

Metrics:

- Frames: actual requestAnimationFrame intervals, p50/p95/p99, maximum and >33.4ms count. FPS is frames / sum of intervals. Epoch guards prevent callbacks from a prior phase entering the next capture.
- CPU: synchronous `stepCity`, render preparation, HUD reports, ground/world rebuilds, previews/weather and Pixi render submission. These are overlapping inclusive spans and **not GPU timings**. The browser's existing 100ms dt cap and subdivision remain unchanged; report simulated progress separately from wall time.
- Input: capture-handler start to second requestAnimationFrame, a responsiveness proxy including frame scheduling, not hardware-to-photon or field INP. Queued event delay is also captured. Chromium Event Timing entries ≥16ms record reported event duration/processing delay; shorter omitted events are not assigned zero duration.
- Memory: CDP JS heap at warmed gameplay start after forced GC, gameplay end before GC, and menu after GC; per-phase browser heap values are approximate snapshots. These positions are different lifecycle states, not a leak comparison. A separate repeated-cycle test compares GC-normalized menu state. GPU texture/media decoder/native process memory are not fully represented by JS heap.

Do not sum overlapping CPU spans or interpret CPU idle samples as measured GPU time. Source-mapped samples and explicit spans distinguish game JavaScript from the large unaccounted frame interval, but software graphics/compositor scheduling needs hardware tracing for attribution.

## Reproduction

```sh
# Prepare isolated copies of source/public/config and link node_modules first.
python3 docs/performance-integrated/instrument.py /tmp/integrated-perf-before
# In the respective snapshot:
RUNDOT_GAME_DISABLE_EMBEDDED_LIBS=true ./node_modules/.bin/vite build --sourcemap
./node_modules/.bin/vite preview --host 127.0.0.1 --port 5311 --strictPort
# After snapshot uses port 5312.
node docs/performance-integrated/browser.mjs baseline http://127.0.0.1:5311
node docs/performance-integrated/browser.mjs after http://127.0.0.1:5312
node --experimental-strip-types docs/performance-integrated/visual.mjs
node docs/performance-integrated/memory.mjs
# Final disposal follow-up uses its isolated production copy on port 5313.
node docs/performance-integrated/memory-native-ui.mjs
AFTER_URL=http://127.0.0.1:5313 node docs/performance-integrated/trace.mjs
```

Browser/Chromium paths in harnesses reflect this installed environment. Outputs go to `/tmp/integrated-*` so evidence writes cannot reload or disturb the test build. See [model methods and results](model-README.md) for deterministic simulation and regression commands.
