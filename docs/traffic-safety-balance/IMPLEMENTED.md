# Intersection balancing delivered locally

September 11, 2026. User made shared intersection danger today's priority, including unsuitable controls as demand grows. Preserve the current missions: Level 2 is the light-traffic baseline; Level 3 is the busy-crossing baseline. A safety heatmap/debug map comes later. Poor Flow ratings alone must not cause crashes.

Codex implemented and verified this slice. Installed Grok supplied the earlier [review](grok-review.txt); the latest requirement deliberately supersedes its blanket immunity for controlled intersections. Do not attribute the new controlled-conflict rules or their tested numbers to Grok.

## Resulting rules

- Count distinct pairs of actual incompatible arrivals within a logical intersection, using a 12-simulated-second encounter window. At least one participant must be moving/recently moving, with both on or beside the contact tile. Repeated claims from a stationary pair do not accumulate danger. A third occupant, including a responder, cannot be overwritten by the collision.
- Unsigned encounters add 1.5 exposure. After a one-second gap, exposure cools gradually at 0.35 units per simulated second instead of disappearing abruptly. Quiet, isolated encounters cool below danger; parked cars, same-direction queues, opposing through traffic and ordinary waiting at red do not generate this mechanism.
- Stops still require the normal halt and handle moderate demand. A controlled crossing starts accumulating exposure only after at least eight distinct conflicting vehicles have been observed in the window. Each fresh qualifying stop encounter adds one exposure. Heavy competing arrivals can overwhelm that control, making signals or route separation useful.
- Signals continue to separate perpendicular approaches. A left turn can still conflict with an opposing movement sharing its green. At the same eight-vehicle conflict threshold, those encounters add 1.5 exposure. Timing changes affect the actual encounter sequence; a bad citywide Flow grade never causes red-running or an unrelated crash. Opposing right turns/through movements are excluded from this left-turn mechanism.
- Warn at 2.4 exposure. At six exposure, a crash still needs a **fresh, live conflicting pair**, at least three simulated seconds since the warning began, and available incident capacity. A full meter alone cannot crash stationary cars or manufacture an incident during red/clearance. These are provisional game values, not real-world safety estimates or final playtest balance.

This is the game's explicit deterministic failed-yield event at a contested entry. It does not require the normal occupancy solver to let cars overlap first. The existing incident code converts the participating pair into a wreck at the contact; ordinary movement retains its lane and junction reservations.

## Visible feedback and persistence

Both modes now show the same actionable warning above the map: add controls/separate routes, upgrade an overloaded stop, or change timing/separate conflicting turns. The existing on-map warning ring only appears above the warning threshold. Quiet encounters and telemetry at zero exposure do not produce an alarm. Tutorial/Dashboard wording no longer promises universal control immunity, and a current danger warning blocks the safe-crossing acknowledgement without revoking earlier receipts.

`cityDiagnostics(city).intersections` and `intersectionSafetySnapshot(city)` expose per-area control/preset, window, distinct encounter/vehicle counts, exposure, thresholds and current state for future map diagnostics. This slice does **not** implement the safety heatmap. The existing Traffic heatmap still represents stopped traffic.

Encounter history and warning time survive save/reload. Old risk records remain readable, with a fresh warning grace period if they lack its timestamp. Old per-tile meters and areas joined by road edits normalize to one meter: retain the strongest exposure and deduplicate encounters, never add old meters together. Control changes, removed intersections and active scenes clear inapplicable risk. Existing active incidents, crews, deadlines, fatalities, saved towns, tutorial exceptions, earned stars and mission budgets retain their existing rules.

## Measured comparisons

Real generated household demand, no injected cars or accident counters in these comparisons. Ten simulated minutes for safe references; unsafe runs stop at the first incident. The 18-home comparisons all use the same four stores and spare capacity. These are reproducible fixtures, not universal crash deadlines.

| Reference | First crash | Shopping returns / distinct homes returned | Interpretation |
| --- | --- | --- | --- |
| Level 2 road solution, no controls, 3 homes | None in 600s | 92 / 3 of 3 | Light traffic remains safe, without a warning |
| Level 3 repaired unsigned, 10 homes | 18.875s | 2 / 2 of 10 before crash | Busy crossing becomes dangerous early |
| Same 10-home crossing with stops | None in 600s | 308 / 10 of 10 | Stops remain a valid solution at this demand; occasional warnings can cool |
| Same 10-home crossing with lights | None in 600s | 209 / 10 of 10 | Safe, but a signal is not automatically fastest |
| Heavier crossing, 18 homes, stops | 26.025s | 5 / 5 of 18 before crash | Increased conflicting use can overwhelm stops |
| Same 18 homes with lights | None in 600s | 309 / 18 of 18 | Signal safely serves every household |
| Same 18 homes with the approaches separated into a longer continuous route | None in 600s | 439 / 18 of 18 | Road redesign works without controls or deleted demand |
| Opposing-turn fixture, 24 homes, long EW green | 41.275s | 7 / 7 of 24 before crash | Wrong timing can expose heavy conflicting turns |
| Same 24 homes, shorter EW phase (`ns` preset) | None in 600s | 175 / 24 of 24 | Safer timing trades throughput for separation |
| Same 24 homes, balanced timing | None in 600s | 260 / 24 of 24 | Warnings can reach high exposure without a later eligible collision; no quota |

Every household's first shopping return in the safe regression cases occurs within 180 simulated seconds. Safety is not proof of optimal Flow: shorter trips, sustained service and unfinished journeys remain separate optimization goals. Fixtures, frame timing and departure state are fixed; broader layouts and human playtests can still reveal balance issues.

## Verification and boundaries

- **272/272 model tests pass**, including nine focused safety regressions: quiet/more-used roads, control adequacy, signal timing, all-household service, stationary/red/through-traffic exclusions, third-occupant protection, area merging, saved warning/history validation and frame-chunk equivalence. Existing challenge/town/tutorial/emergency preservation checks pass.
- Production build and TypeScript check pass. [Model output](evidence/model-tests.txt), [build](evidence/build.txt), [measurements](evidence/model-results.json).
- Desktop 1440×900 and narrow 390×844 browser checks use actual road/control map clicks. A player can pause at Level 3's warning, place a stop, resume and earn completion with no accident. Sandbox storage remains byte-for-byte unchanged through challenge play. Real pre-simulated sandbox turning risk shows the corresponding warning and diagnostic state. Screenshots inspected; final sandbox screenshots show live gameplay without the pause modal. [Browser results](evidence/results.json).
- Earlier crash timing exposed physically occupied scene access in old tutorial fixtures. Response tests now supply a real southern approach and pay for its extra roads. Serious/fire response fixtures specify severity on a real collision to isolate rescue behavior instead of requiring a fixed natural crash-count sequence. Real travel, crew work, save/reload, deadlines, finite waivers and eventual clearance are still asserted. No responder teleportation or automatic access roads were added to runtime.
- The **severity cycle and existing responder rosters are unchanged** in this priority slice. Physical pile-ups and incident-based severity remain the separate follow-up from the review; no fire/pile-up relabel was shipped. Road widening remains separate work.

No publication, town reset, altered mission maps, new unlock gates or heatmap release. Automated safety/solvability is verified for these fixtures; player enjoyment and final balance remain playtest questions.

Reproduce model checks with `nix develop -c npm test`, measurements with `nix develop -c node --experimental-strip-types docs/traffic-safety-balance/probe.mjs`, and build with `nix develop -c npm run build`. `verify.mjs` uses local Vite port 5196 and existing `PLAYWRIGHT_MODULE` / `CHROMIUM_PATH` installations; it creates isolated browser contexts and blocks external requests.
