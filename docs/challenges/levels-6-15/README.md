> Current update: Level 15 is now the emergency introduction. Its old bus-composite attempt is archived and its award preserved. See [Levels 15–24 delivery](../levels-15-24/README.md). The batch record below describes the earlier delivery; Levels 5–14 remain as described.

# Beginner campaign: Levels 6–15

User request, September 12: create missions while they are away. Follow the chess.com-style progression: a small, readable puzzle first, then multiple stages; connect destinations, grow the road network, introduce Stops/Lights, one-way roads, roundabouts and buses using existing set pieces. Keep the first 25 beginner-friendly; more advanced levels follow after the jam. The user explicitly selected **staging apartment lessons for the later building work**, and reconfirmed that missing-building levels may be skipped.

## Delivered sequence

Original Levels 1–4 keep their stable IDs, maps, progress and existing rules. The earlier `Room to move` remains the more demanding legacy bonus at 4. Level 5 fills the previously empty slot so new numbering stays continuous. There are now **12 playable levels**, with 10, 11 and 14 visibly in preparation. Next skips those slots (9 → 12; 13 → 15), without renumbering saves. All new jobs begin paused and use fixed budgets, ordinary paid-construction refunds, no ongoing income and no new failure countdown.

| Level | Puzzle | Starting cause and player decision | Completion |
|---|---|---|---|
| 5 | A longer connection | Four homes and two shops, with unfinished streets. Extend each street or join the network. | Every home finishes shopping and returns. |
| 6 | Take turns | Five homes share a complete T-junction. One clear action: place Stops. | Stops installed and all five households complete shopping trips begun with the control in place. |
| 7 | Green for the queue | Nine homes approach an unsigned busy crossing. Introduce Lights; subsequent taps let the player compare green presets. | Lights installed and all nine households complete shopping trips begun with the control in place, without an accident. Balanced, NS and EW timings are not secretly ranked by a deadline. |
| 8 | A way back | Three homes and a shop share an inherited eastbound road. It has no legal route home. | Build and direct a new return street, then observe every household return. The main road stays eastbound. A few decorative arrows on an otherwise two-way return do not qualify. |
| 9 | Around the island | Four approaches stop short of a visibly reserved center square. | Build and close a one-way ring, then serve all four homes safely. Both circulation directions work. Entry priority comes from the shared roundabout model. |
| 10 | Apartment avenue — staged | Multiple apartment journeys share limited road space. | Building-dependent brief below. |
| 11 | Another front door — staged | One usable apartment entrance funnels traffic. | Building-dependent brief below. |
| 12 | Shops and strolls | Six homes have one busy shop and no park. | Two stages: each home finishes a shopping round trip and a leisure round trip. A park must have road access. Extra shops and road work are optional solutions, not required expenditure. |
| 13 | All aboard | Four homes, a shop, completed roads, a depot and two usable directional stops. No route or bus is supplied. | Set the stop order, buy/start a bus, complete one representative passenger outing from **each** home and retain every home’s shopping return. An empty bus, boarded riders or total returns from just one home cannot win. |
| 14 | Keep another way in — staged | A blockage cuts an apartment’s only approach. | Building-dependent brief below. |
| 15 | A town that works | The familiar bus town now has a road-loop gap and an unconnected park. | Combine three independently credited service stages: shopping returns, park returns and bus outings for every home. Advance planning counts; no stage spawns a surprise problem or deletes earlier work. |

Stages are transparent checklists, not timed waves. A player can solve several upfront. In the four action-teaching jobs, household shopping credit starts with journeys begun after the taught configuration is in place. Other jobs retain completed shopping/leisure/bus evidence throughout the attempt, including after bounded traffic history expires and across reload. Visits include ordinary 5-second shop / 10-second park stays. All required returns remain physical, using the shared model.

Level 6's quiet untreated T can serve its homes safely; **we do not manufacture an accident**. It is explicitly an introduction to operating Stops, not a claim that every unsigned junction is unsafe. Level 7's untreated busy crossing really crashes under the current shared rules. Levels 6, 7 and 9 end an attempt on an accident. Other new lessons continue so road alternatives remain possible; Reset is available if the player wants a fresh puzzle.

## Beginner balance and alternatives

Budgets are generous construction allowances, not economy tuning. New reference solutions use one control, a short road loop, a single connected park or one bus. No unlock gates, forced purchase of all supplied tools, hidden accident quotas or sandbox changes were introduced. Level 15 allows alternate ways of serving its destinations: repairing the displayed loop gap is a useful suggestion, not a road-count victory gate.

`campaignTown.ts` contains starting set pieces and definitions; `campaignSolutions.ts` contains exact reviewable reference/alternative player operations. `evidence/*.json` preserves the eight new playable starting runs. `evidence/comparisons.json` records untouched/reference/alternative observations, budgets, per-home completed journeys, travel-and-queue time separately from destination dwell, unfinished age, queue maxima, accidents and bus loads. These are functional simulation observations, **not performance measurements**.

The short jobs’ reference solutions finish in about 20–42 simulated seconds. The existing-set-piece bus lesson takes about 85 seconds and the mixed finale about 95. Reversed bus stop order also works but takes longer (roughly 135–138 seconds), with no penalty or failure timer. Values remain provisional until someone plays them. Alternative street routes, both ring directions, another park/shop arrangement and either bus stop order are covered. The “alternative” run for the one-action Stop introduction is the same control placement, intentionally not presented as a distinct solution.

Bus lessons use the existing **representative** riders. Per-home completion is observed only when a returning passenger disappears through the physical origin-stop exchange and the model’s completed counter increases, with no cancellation. Household shopping/leisure receipts remain separate. No bus/car substitution, apartment passengers, fares or household-economic credit has been invented. Teaching actual car reduction with apartments remains building/transit follow-up work.

## Staged building jobs

These are authored design briefs, not fake playable apartment maps. Proposed dimensions/demand below are authoring defaults to revisit with the building implementation; no ordinary home cluster is relabeled as an apartment.

### 10 — Apartment avenue

- Proposed 20×16 board. Apartment at (2,3), proposed 4×4 footprint/four independent households; two shops east at (13,3) and (13,10), park at (3,11). Reserve two tiles along the east–west avenue at y=8–9, with room to branch from the apartment approach.
- Stage 1: connect the apartment, shops and park; prove one shopping and leisure return for every household. Stage 2: serve a repeated demand wave using the same households and destinations. Both a wider avenue and a second connected approach are candidate reference operations.
- The untreated narrow approach must visibly constrain several concurrent apartment journeys, not just one representative car. Compare widening versus a useful parallel route; accept a successful narrow layout if the real model supports it. Select any throughput observation window after those fixtures work. No deadline selected.
- Near miss: widen the avenue but leave an actual destination or apartment entrance disconnected. That must not qualify.

### 11 — Another front door

- Proposed 20×16 board. One four-household apartment at (3,4), one busy store at (13,4), park at (12,10). Keep usable corridors north at y=3 and south at y=9; leave east/west joins incomplete. Apartment doors must reference the same household demand and store doors the same visitor capacity.
- Stage 1: restore legal outbound and return access. Stage 2: connect an alternate entrance and demonstrate actual trips using it while existing journeys remain intact. Do not award solely for drawing extra road tiles.
- Reference A completes the north frontage and a second door connection. Reference B separates arrival/departure circulation via the south frontage. Near miss connects door art to pavement without a usable return, or adds capacity while leaving the bottleneck blocked.
- Requires strict saved multi-entrance routing and real per-household apartment attribution before it opens.

### 14 — Keep another way in

- Reuse the Level 11 board so the new idea is resilience. A visibly blocked approach on the north frontage leaves an apartment/store connection unusable. Introduce the blockage in the briefing; do not surprise the player after they finish a stage.
- Stage 1: identify the affected journeys. Stage 2: connect the second entrance/alternate approach and bring the same pending journeys home. Widening the blocked frontage alone must not win. A foresighted usable alternative counts immediately.
- Prefer a pre-authored closure for the beginner access exercise. If a real crash is chosen later, use an ordinary incident with valid victim/crew state, preserving live journey identity; detailed rescue teaching remains 16–25. Do not fabricate a reservation deadlock.
- Requires apartment multi-journey and multi-entrance support. Incident severity, exact footprints, prices and service windows are intentionally not asserted as implemented.

## Verification and limits

- `src/game/campaignLessons.test.ts`: untouched/reference/alternative solvability, fixed budgets, protected demand and inherited main-road flow, every required household, disconnected park, missing ring, bus setup/boarding versus completed returns, partial-stage persistence, fixed-step frames, pause and reload.
- Existing opening/FLOW tests retain their old maps and receipt behavior. The session interface admits one-way and transit commands only when the lesson supplies those tools; connection/expansion remain unavailable. Keyboard shortcuts use the same available-tool list.
- `verify-browser.mjs` exercises actual one-way road and direction pointer input, depot/stop order/buy/start controls, stages, staged briefings, Next skips, mid-bus reload, Retry/permanent awards and untouched sandbox storage at 1440×900 and 390×844. It uses isolated browser storage. Long simulations are advanced through the shared model, not claimed as human playtests.
- `measure.mjs` reproduces functional evidence with `node --experimental-strip-types docs/challenges/levels-6-15/measure.mjs`.
- No publication, player-save modification, profiling, FPS capture, broader economy tuning, apartment mechanics or Level 25 song reward work. Solvability is checked; player-observed fun and physical-phone usability still need the user’s playtest.

## Final local verification

Production typecheck/build passes. The complete model suite passes all **54 test files**, including 15 campaign-specific cases. New desktop/narrow browser checks pass, and the existing opening-level route regression also passes at both sizes: real Level1 arrival, Level2 completion, Level3 real collision/control retry, saved awards and legacy layout archival. Evidence: `evidence/browser-results.json` and `evidence/opening-browser-results.json`. Selected screenshots are included. New missions open with a view fitted to their authored roads/buildings; the multi-stage objective avoids repeating the same household count above the checklist. The final bus reload checks confirm all four per-home receipts and the same running route at both sizes. The longer opening-browser timeout allows slow software-rendered functional runs; it is not a performance benchmark.

Individual `LEVEL-06.md` through `LEVEL-15.md` handoffs support later smaller-context playtest/follow-up sessions. No automatic work beyond this requested batch is scheduled.

## Inspect cursor refinement

All challenges now start/reset in Inspect mode (`tool: null`). Select a stop to open its inspector and Move stop. Clicking the active construction tool again deselects it; explicit Inspect and Escape also clear construction/move/direction/route drafts without changing the map. The same tool toggle applies in the sandbox. Empty-land inspection cannot place roads; ordinary buildings and roads can also be inspected. `verify-inspect.mjs` checks default/reset inspection, toggles in both modes, a real stop move preserving ID/budget, and Escape cancellation at desktop/narrow sizes.

Inspect verification: production typecheck/build and isolated desktop1440×900/narrow390×844 browser checks pass. The explicit Inspect control sits with map controls in both modes; construction buttons and numeric shortcuts toggle themselves off. Evidence: `evidence/inspect-browser-results.json`.
