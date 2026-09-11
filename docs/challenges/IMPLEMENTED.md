## Sparse starter-town backdrop (latest)

User approved the one-town progression design and asked actual Grok about starting less dense. Grok recommended a sparse1–25town and preserving the approved dense city for later. Implemented a new referenced backdrop with modest buildings, open lots, gravel/dirt scenery and the exaggerated repair plaque; adjusted decorative site/character coordinates to its streets. Portraits, ribbons, mission rules and saves remain. Desktop/narrow artwork and full progression checks plus build pass. [Delivery](starter-town/README.md). No publication or future-city unlock implementation.

## One-town map revision after user rejection (latest)

The earlier five-theme/fantasy progression overhaul is superseded. Actual installed Grok received the user's rejection and returned a one-town, top-down commute-map design based on the title screen and DKC-style progress markers. Codex implemented it: pannable city, The Man's actual reference identity, completed portraits plus corner award ribbons, optional crew/manager map dialogue, same25 sites with only1–4 playable. Existing saves remain authoritative. Desktop/mobile touch/progression and full route checks plus production build pass. [Current delivery](commute-map/README.md). Local only; no publication.

## 25-site progression map (September 10, local)

Actual installed Grok art-directed the new selection scene; Codex implemented the numbered city-works journey, generated city mural, five district palette treatments, permanent-star stamps and a hardhat manager at the next unfinished site. Levels 1–4 remain playable with unchanged saves. Level 5 is visibly in the works; 6–25 are non-playable upcoming sites. Mission names are removed from the map, retained in briefings. Desktop/narrow progression and full route browser checks and production build pass. [Delivery, recommendation and screenshots](progression-overhaul/README.md). No publication.

## Challenge fast-forward (September 10, local)

Added a 1×/2× toggle beside Play/Pause. Playback multiplies the frame delta before the existing fixed 25ms challenge simulation steps; mission deadlines, trips, collision checks and result times continue using simulation time. The HUD labels its clock as game time. Selecting speed while paused does not start traffic. Speed changes retain the live scene and current attempt. Retry/Reset, Next and re-entering a level start at 1×; pause/resume retains the current speed. Sandbox speed and save formats are unchanged.

Verification: all **263 model tests** and production build pass. New regression compares solved and failed Level 2 runs at both speeds: identical city state, outcome and recorded duration, including the 45-game-second deadline, with half as many playback frames. Desktop 1440×900 and narrow 390×844 browser checks verify approximately doubled live progression, accurate game-time countdown, pause, speed switching without remount, reset to 1× and button fit. Screenshots inspected in `speed-evidence/`. Local only; no publication.

## Mission Reset fix (September 10, local)

Replaced `window.confirm` with the game’s modal dialog. Browser confirmation is suppressed in embedded frames without `allow-modals`, making the old Reset action return without resetting. The in-game dialog pauses traffic; Keep playing or Escape restores the prior pause state. Reset restores the authored map/budget and clears pan/rotation/tool selection state. Earned stars, other attempts and the sandbox remain saved.

Production build passes. `verify-reset.mjs` verifies desktop 1440×900 and narrow 390×844 inside an iframe without `allow-modals`: blocked browser confirmation, working in-game reset, cancel/resume, Escape while paused, repeated resets, actual construction through the remounted scene, reload, and preserved stars/other saves. Updated `verify-route.mjs` passes both layouts including completion, Next and Retry. No publication in this fix.

# Challenge lessons

Play/Pause and Reset now sit together at the bottom-right inside the playable map. Reset asks before discarding construction, restores the current lesson and budget paused, and retains saved stars and the sandbox. The header contains navigation and budget only. This replaces the earlier header Run traffic and objective Retry controls. Verified 262 model tests, production build and desktop/narrow browser checks, including Reset cancellation/confirmation, map restoration, saved stars and unchanged sandbox. Evidence: `control-evidence/`; reproducible script: `verify-route.mjs`. Uploaded the exact verified build as RUN 1.7.8 with public publication requested; upload receipt reports review. See `../releases/run-1.7.8-receipt.json`.

Background music: the existing **Tranquil City** track starts on entering Challenges and loops continuously through level selection, planning, running traffic and result screens, using the same saved mute/volume settings as the sandbox. Returning to the main menu stops this track; the user intends a separate main-menu track, not installed by this change. Challenge pause does not pause music; app sleep/backgrounding and mute still do. Sandbox simulation pause retains its existing audio behavior. Verified playback lifecycle with a mocked audio element and a production build; no new track or radio unlock is introduced.

## Route map and revised lessons (latest, September 10)

Delivered locally: a winding numbered road map with level briefings, a saved completion star and a victory screen with **Retry**, **Next** and **Level map**. The visual treatment uses this game's roads, cream/gold panels and teal type; it does not copy the supplied Candy Crush artwork. Main menu remains reachable. All four levels are selectable; functional sandbox unlock gates and additional star tiers are not implemented.

| Level | Objective | Reproducible result |
| --- | --- | --- |
| 1 · The first road | Connect one home/store; win on actual store arrival | Six road tiles; arrival at 7.5 simulated seconds, before the visit finishes or a return is recorded |
| 2 · Roads for the neighborhood | Three vertically spaced homes must shop and return within 45 simulated seconds | A branching road/spine solution returns all three in 24.025 seconds; $140 remains from $600 |
| 3 · Share the crossing | Repair missing roads and get all ten households shopping and home without an accident | Four missing road tiles alone cause a real collision at 38.375 seconds, with nine households home; a stop completes safely at 31.2 seconds, a light at 42.9 seconds |
| 4 · Room to move (bonus) | Original nine-home sustained-flow challenge | Original challenge ID, goals and saved progress retained |

Level 3 starts without a light or stop. Its competing approaches use the ordinary collision engine, not a scripted crash. Untouched/disconnected layouts cannot win. The reference repairs demonstrate why controls help; no prescribed control is required if a different safe layout serves everyone. Ten households make the conflict reproducible, but the jump in complexity needs playtesting.

Only Level 2 has an attempt deadline, per the latest user request. Its clock begins when traffic runs; pause freezes it, and building while paused costs no time. Timeout or collision ends that disposable attempt with Retry; neither revokes earned stars nor affects the sandbox. Levels 1 and 3 have no deadline; the bonus's rolling measurement window remains distinct from a failure countdown. The 45-second target and budgets are implementation balance defaults. All challenge income remains disabled; normal construction refunds remain.

Old neighborhood runs are archived under the challenge save's `archivedRuns` when selecting the revised layout; their stars and full old city data survive. Old Room to move runs remain on their original ID, now shown as a bonus. No sandbox town, tutorial, consent or cash/land receipt is migrated or reset by these lesson changes.

Verification: **262/262 model tests pass**, production build passes. New regressions cover immediate arrival, vertical branching and timeout, real unsigned collisions versus two safe controls, pause, frame sizes and reload. Desktop 1440×900 and narrow 390×844 Chromium runs cover actual menu/road/control clicks, real-time Level 1 arrival, victory/Next/Retry, three saved stars after reload, archived legacy layout and retained stars, and byte-identical sandbox storage. Longer Level 2/3 simulations are advanced directly through the shared model in the browser; they are not claimed as human playtests. Screenshots were inspected for route and result readability. Reproduce with `verify-route.mjs`; evidence is in `route-evidence/`. Older browser scripts below document previous interfaces and are superseded by this route test.

Automated solvability and save isolation are verified. **Observed fun is not established**: playtest the 45-second allowance, ten-home difficulty jump, road-drawing effort on a phone and whether one completion star gives enough reward. No publication.

## Earlier opening lessons and fixed budgets (superseded order/goals)

User places **The first road** first (one home and a store), **Roads for the neighborhood** second (three homes sharing a store), and **Room to move** third. All are selectable. Opening lessons use Road/Clear only, protect their buildings, and require actual shopping return journeys from every household. Start paused; run traffic after connecting the entrance arrows. They are untimed and share the normal traffic engine.

Starting budgets are implementation defaults: $140, $240 and $1,200. **Challenges receive no ongoing support or visit income.** The challenge step wrapper preserves its construction balance while running the real simulation; trips, needs, visits and return attribution still advance. Building spends the budget; clearing player-built construction refunds its cost. Newly authored inherited buildings/roads have zero paid receipts, so selling them cannot mint money. Insufficient-budget feedback suggests clearing paid work or retrying, never waiting for income. Sandbox income is unchanged. Existing FLOW money is preserved on migration, then stops growing through simulation.

Each level now has an independent saved run and permanent star. The original single-level FLOW save/star migrates to Room to move; it is not reinterpreted as Lesson 1. Retry only replaces the selected attempt. The main-menu Challenges button shares Continue commute's gold button styling, and gameplay offers direct **Main menu** and **Levels** exits. Both save the challenge without touching the sandbox.

Verification: **259 model tests pass**, production build passes, desktop1440×900 and narrow390×844 browser checks pass. Real road-tool/map clicks solve both opening lessons; budget remains unchanged during live traffic and extended simulated visits, each star persists across reload, the old FLOW star/balance survives migration, and sandbox saved JSON stays unchanged. Model tests also cover no completion for disconnected starts, every household returning, refunds and fixed budgets across reload. `verify-opening.mjs` and `opening-evidence/` contain reproduction/evidence. The FLOW browser regression remains in `verify.mjs`. Numeric budgets and observed fun remain playtest questions.

The original delivery record below describes the earlier one-level slice. Its normal-income and single-level statements are superseded by this update.


Implemented locally September 10, 2026. The sandbox remains the main game; challenges develop alongside it as focused, repeatable lessons and simulation tests. Claude's story and proposed monetization direction in DESIGN.md is preserved. No publication.

## Player entry and objective

Main menu → **Challenges** → **Room to move**. The normal sandbox Start/Continue button remains the primary entry. The first challenge reuses the nine-home FLOW town, with three shops and an overloaded shared approach. It starts paused with $1,200, normal prices/refunds and ordinary visit income. The player chooses when to run traffic and may edit while paused or running.

**Help all nine households shop and get home twice in the latest minute of traffic. Keep that service steady for 15 simulated seconds.** This means two completed shopping return journeys per household in the rolling 60 seconds, routes available, no current stop over 20 seconds, and no known unfinished trip over 60 seconds. Pausing freezes observation. There is no civic failure countdown; needing more time does not revoke progress. One permanent star is awarded for completion, including after reload and retry. Additional star tiers are not implemented.

The lesson is to distinguish a restriction on journeys from a shortage of shop space, then observe real service after changing roads, junction controls or shop placement. Homes stay fixed so removing demand cannot solve the puzzle. Roads, stops/lights, shops, diversions and emergency stations use real sandbox behavior. Land expansion, extra homes/parks, tutorial commands and outside connection are unavailable for this bounded lesson. Camera commands remain available. Future A-to-B/inventory levels remain separate queued work.

The previous four-second receipt rule was too short for this challenge: the baseline briefly qualified, with a longest uninterrupted run of 12 seconds in a ten-minute comparison. This challenge explicitly asks for 15 seconds of stable service. It does **not** alter the sandbox civic goal, its demand, earned receipts or four-second recognition rule. These challenge thresholds are implementation balance choices requiring observed play.

## Implementation and isolation

- `cityChallenges.ts` creates the town, enforces available tools and protected homes, evaluates actual FLOW visits/returns/current waiting, and advances the shared engine in fixed 25ms ticks. It has no sandbox-save reference.
- `CitySceneSession` injects a city, placement policy, step function and persistence callback into the existing renderer/input scene. Sandbox defaults remain unchanged. Restricted challenge commands are guarded in the scene, including keyboard-selected tools through the placement policy; previews use the same policy. Challenge UI never swaps `getSave().city`.
- Challenge run, accumulator, observation state and permanent star persist independently under `working-on-it:challenges:v1`, with local/host timestamp selection and serialized coalesced writes. Reload returns to the menu; Continue challenge restores the run paused. Retry makes a fresh attempt while retaining its star. RUN sleep/quit persists the active experience; challenge sleep does not flush the sandbox.
- Dedicated challenge UI presents progress, visits/returns/waiting, optional access/capacity/current-tail details, camera/rotation, visitor/traffic views and existing-road approach observations. It does not reuse sandbox tutorial/claim actions against the wrong city.

## Verification

**256 model tests pass**, including the three new challenge regressions and all prior emergency/save, FLOW, tutorial, economy and land tests. Production build/type-check pass with the existing Vite chunk-size advisory.

Identical demand, 240 simulated seconds after the queued start:

| Layout | Star earned | Returns in final rolling minute |
| --- | --- | --- |
| Unchanged baseline | No | 13 |
| Retimed existing light | Yes | 23 |
| Nearer shops | Yes | 31 |

Neither solution changes home count or existing committed purposes; both retain zero outside arrivals and zero accidents in this comparison. Regression tests cover fixed-tick consistency across frame sizes, pause, queued reload continuation, protected homes and earned progress after later disconnection.

Desktop 1440×900 and narrow 390×844 Chromium checks use actual menu buttons and a real light-tool/map click; verify paused start, Run/Pause, command restrictions, success, saved continuation, retry and permanent star. The sandbox fixture contains roads, homes/shops and prior receipts; its saved JSON remains byte-for-byte unchanged through challenge play, leaving, reload and retry. Returning to the sandbox restores its geometry. Screenshots inspected; narrow tools scroll horizontally. Rules scroll inside a fixed dock so the paused map keeps its area; regression checks verify stable bounds and rendered map pixels after opening details. Browser tests use isolated origins/contexts and block external requests, not the player's active town. Evidence: `evidence/`; reproducible browser script: `verify.mjs` with `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` through `nix develop -c node`.

Automated correctness is established for this slice. Enjoyment, diagnostic clarity, the 15-second confirmation and additional star criteria still need player observation. This is one playable challenge, not a finished campaign, general level editor, inventory framework or A-to-B level.
