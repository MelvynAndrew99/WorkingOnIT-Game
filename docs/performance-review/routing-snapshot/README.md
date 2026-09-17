# Remove unused routing-snapshot work — September 17, 2026

Second incremental performance change, following the road-warning cache. The baseline is the integrated working tree at the start of this request, including that earlier uncommitted change. Only `cityRouting.ts` changes at runtime in this step.

## Changes and limits

- Remove `RoutingSnapshot.revision` and its eager sorted road/blockage/community strings, control JSON serialization and direction signature. Repository source inspection found no production reads; the only readers were two tests. This field was internal derived data, not a save field or mission revision. No global revision counter or invalidation hooks are introduced.
- Skip the road/control scan for responder snapshots. Its old loop called the pure `governingControl` helper for every road and then discarded every result because response control estimates are always empty. Actual responder movement and intersection admission still use their existing rules.
- Preserve ordinary control estimates, queues, blocked tiles, direction and wide-road metadata, community speeds, apartment response entrances, stable path tie-breaking and the detached set/map copies. Those copies protect a published snapshot from subsequent city/index edits. This pass does not introduce shared mutable snapshot storage.

The two former revision assertions now rely on actual routing behavior: the community-road test explicitly verifies the direct route becomes preferred when the slower classification is removed; the direction test retains its old-snapshot isolation, newly forbidden route and infinite route-cost assertions. No traffic expectations were weakened.

## Verification and measurement method

`benchmark.mjs` uses the captured baseline source and the current source in separate module trees. The small and busy fixtures plus the historical 408-road supplied town are parsed through each version. No active save is read or changed.

Snapshot microbenchmarks use the existing prebuilt road index, as shared simulation callers do: 3,000 snapshots per batch, one warmup plus five measured batches, alternating before/after order. Index construction and actual path searches are excluded from these snapshot timings.

Full-model measurements use 3,600 calls at 1/60s (60 simulated seconds) per trial, reload halfway, one warmup plus three measured trials, alternating version order. Reported total sums timed `stepCity` calls; checkpoint hashing and reload are outside those timings. All 60 per-second full-city hashes match between versions in every trial.

A separate 30-second comparison adds, moves and removes a closure and reloads halfway. It compares full city objects at half-second checkpoints, every snapshot field except the intentionally removed revision, all weighted routes between four sampled road nodes in both ordinary/response modes, and responder approaches to active incidents. These checks exercise snapshot creation through evolving queues and incidents as well as topology constraints. Targeted tests additionally cover directions, community roads, control estimates, emergency routes and old-snapshot isolation.

Timing is sequential, without concurrent test/build/browser workloads. It measures Node CPU work, not browser FPS, GPU work, GC pause attribution or physical-phone performance. No browser check is required for the model-only source change; TypeScript and the production build check integration.

[Benchmark](benchmark.mjs), [raw results](results.json), [compact results](summary.jsonl), [focused tests](focused.txt), [full suite](tests.txt), [build](build.txt).

## Results

| Fixture | Ordinary snapshot CPU reduction | Response snapshot CPU reduction | Full model before → after | Full model change |
|---|---:|---:|---:|---:|
| Small | 56.3% | 70.2% | 52.64 → 54.26 ms | +3.1% time |
| Busy | 40.1% | 88.7% | 2087.76 → 1767.62 ms | -15.3% time |
| Historical 408-road town | 36.0% | 91.2% | 4445.21 → 4537.12 ms | +2.1% time |

Every snapshot microbenchmark improves. Full-model results are mixed: the busy fixture improves, while the small and 408-road fixtures initially take slightly more total CPU time. This does not establish a general simulation or FPS speedup. Raw per-trial totals and p95/p99 are retained, including the unfavorable results.

The edited/reloaded differential runs have **180 identical full-city checkpoints, 360 identical snapshot comparisons** (excluding only the removed revision), and **6,296 identical weighted/response route results**. The unedited/reloaded timing runs also match all 60 per-second full-city hashes in every warmup and measured before/after pair.

Four focused test files pass. Full suite: **69/71 files pass**. The one Flow assertion and three IntersectionSafety assertions reproduce on the captured integrated baseline; failure details match after normalizing file paths and timings. [Baseline Flow](baseline-flow.txt), [final Flow](final-flow.txt), [baseline safety](baseline-safety.txt), [final safety](final-safety.txt). TypeScript and production build pass with the existing bundle-size warning.

A fresh-process follow-up on the 408-road town uses one warmup and **five** measured trials per version: median full-model CPU is **4304.86 → 4206.74 ms (-2.3% time)**. Snapshot microbenchmarks improve again; route, snapshot and state comparisons still match. Both runs are retained: [repeat raw results](current-repeat.json), [repeat summary](current-repeat-summary.jsonl). This short comparison is not sufficient to certify a general frame-time gain or regression. Reproduce with `FIXTURE=current-town MODEL_TRIALS=5 RESULT_FILE=current-repeat.json node --experimental-strip-types docs/performance-review/routing-snapshot/benchmark.mjs /tmp/your-baseline-copy`.

## Reproduce

Use Node 24 with the project's installed dependencies. Create a temporary copy of the current `src` and `package.json`, then replace only that copy's `src/game/cityRouting.ts` with [the captured baseline module](baseline-cityRouting.ts.txt). Run from the repository root:

```sh
node --experimental-strip-types docs/performance-review/routing-snapshot/benchmark.mjs /tmp/your-baseline-copy
node --experimental-strip-types --test src/game/*.test.ts
npm run build
```

The original capture is `/tmp/won-routing-before`; [baseline source hashes](baseline-sha256.json) identify the integrated starting source. Do not revert the working tree to reconstruct a benchmark. Results and logs are local artifacts; nothing is published.
