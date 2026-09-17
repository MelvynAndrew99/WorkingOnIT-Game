# Occupancy reads — 2026-09-17

User selected profiling and reducing repeated occupancy-grid builds while preserving current traffic behavior. Earlier failed-route, HUD and traffic corrections remain installed.

## Findings and implementation

In a two-second supplied-town replay, 2,757 of 3,041 grid builds (90.7%) originated in emergency-yield checks. These checks rebuilt occupancy for successive responders even though nothing changed during the query, and conflict detection repeated them before movement began.

- One individual yield query now lazily builds at most one fresh grid and vehicle index, sharing them only between responder checks inside that synchronous read.
- Conflict detection passes its existing initial grid into yield checks while occupancy is unchanged. If `recordConflict` creates a crash, subsequent yield reads build fresh occupancy, preserving the prior behavior after mutation.
- Batched vehicle inspection shares its existing read-only grid with yield checks.
- Movement-phase yield queries still construct a fresh lazy snapshot on each call. No pre-movement grid is reused across sequential car movements, lane changes or completed emergency passes. Route admission and the authoritative movement/reservation grid are unchanged.

[Incremental patch](change.patch). No persistent cache, timer, saved state or traffic-rule changes.

## Validation and results

Baseline: immediate pre-change source copied to `/tmp/won-occupancy-before`. [Comparison/timing harness](check.mjs), [results](results.json). The supplied town matches at 60 full-city checkpoints, plus 70 per-tick checks following road, incident, bus-stop, bus-route and destination edits. Four additional scenarios (saved police junction jam, unsigned crossing, overloaded stops and opposing-turn signal crossing) match at all **9,600 per-tick checkpoints**, including mid-replay save/reload.

New regression tests compare batched diagnostics against independent fresh occupancy reads across movement and verify that adding/removing a blocking car immediately changes emergency yielding. Existing emergency/lane/collision tests remain applicable.

| Twenty simulated seconds, supplied town | Before | After |
|---|---:|---:|
| Occupancy-grid builds | 41,537 | 12,373 |
| Retarget calls | 3,244 | 3,244 |

Grid builds fall **70.2%**. Both instrumented versions end with identical full city state. [Counts](counts.json), collected with the [prior isolated count harness](../failed-routes/count.mjs) using this pass's baseline and candidate roots. Stack-attribution profiling is separate: [harness](profile.mjs), [before](profile-before.json), [after](profile-after.json).

Seven timed samples after one warmup, alternating version order, each replaying five simulated seconds: median model CPU **1,019.39 ms → 647.85 ms**, a **36.4% reduction**. No test/build workloads ran during timing. This is isolated Node model CPU, not browser FPS; the percentage is relative to the already optimized immediate baseline and should not be added to earlier percentages.

Production TypeScript/Vite build passes with the existing bundle-size warning. Full suite: **73/75 files pass**, including the new occupancy-read tests. The four established Flow/IntersectionSafety assertion failures reproduce with identical details on the immediate baseline. No active-player-save edits or publication.
