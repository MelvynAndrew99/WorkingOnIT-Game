# Arcade / Realistic roadworks contract

September 10, 2026. User confirmed upgrade areas should initially block responders as well as civilians, and requested an Arcade/Realistic preference in the pause menu. Actual installed Grok reviewed a text-only brief: [review](grok-modes-review.md), [brief](grok-modes-brief.txt). This is the implementation contract proposal, not a delivered simulation mode. Existing runtime has no road widening or timed work orders; the selector should ship with working roadworks.

## Confirmed invariant

**No vehicle enters an active upgrade area, in either mode.** This resolves the earlier lead/Grok emergency-pass-through debate. Existing Divert remains distinct: it restricts ordinary traffic on usable roads and allows outbound emergency responses. New hard work-zone blocking must be applied consistently to dispatch, pathfinding, rerouting, passing, junction admission and live movement. No imagery of an excavated road over a secretly traversable lane.

Mode choice is not a second traffic engine. Both modes retain actual detours, vehicle occupancy, lane/merge rules, useful service, existing tutorial/outside consent and permanent reward/land receipts. Short construction downtime is the user's expectation; Realistic should not become a lengthy idle wait merely to justify the label.

## Proposed first preset behavior

| Behavior | Arcade | Realistic |
| --- | --- | --- |
| Upgrade timing | Shorter disruption | Longer, more planning-sensitive disruption |
| Cancel after work begins | Shorter physical restoration of the old road | Longer restoration commitment |
| Essential access preview | Always | Always |
| Ordinary optional tips | Existing player tips preference | Existing player tips preference |
| Active work blocks responders | Yes | Yes |
| Road physics and detours | Shared | Shared |

Exact seconds, ratios, prices and reward consequences are unselected. Grok's provisional multipliers are not adopted as balance. Its suggestion to withhold hints in Realistic is not adopted initially: preserve the user's independent tips preference and keep essential explanations in both modes. The first distinction concerns roadworks; it does not silently introduce a different economy, collision rate, vehicle AI or broad real-world training model.

A user question is pending about whether Arcade should additionally protect construction-related missed rescues. Until selected, the proposal retains real rescue deadlines and outcomes in both modes; no casualty protection is authorized or implemented by this document. If protection is selected, define how causation is attributed and how deadlines persist before applying it. Never reset an existing timer or resurrect a saved fatality when changing mode.

## Pause-menu proposal

Label: **Simulation style**. Default candidate: Arcade for new towns, saved per town. Old towns retain all geometry and history, with the default only affecting future optional roadwork quotes.

- **Arcade:** “Shorter road upgrades and faster restoration when you cancel.”
- **Realistic:** “Longer road upgrades and restoration. Plan for the disruption.”
- Shared explanation: “Roadworks block all vehicles, including emergency crews. Pause stops the work clock.”
- Switching: “Applies to new upgrades. Work already started keeps its quoted times.”

A mode switch while paused must persist without closing/resuming the pause dialog or losing its precedence to briefings. Changing mode does not reset the town, restart lessons, change difficulty receipts, or reschedule active work. Store the mode and exact quoted completion/restoration durations in each accepted work order, so toggling cannot restart, instantly finish or repeatedly shorten a project. Paused simulation and reload preserve remaining time. Offline work progress is not assumed.

## Hard closure with forgiving recovery

Preview identifies whose access changes, including station exit/return routes, destinations and existing responders. No path is different from a congested path; neither preview nor mode guarantees arrival before an incident deadline.

Grok recommends refusing every work order that cuts access. The lead does not adopt that as a blanket rule: short, intentional closures are part of the user's proposed puzzle, and an isolated area is not necessarily a permanently stuck game if bounded completion/restoration is guaranteed. Refuse physical conflicts and impossible/uncancellable work, explain temporary access loss, and make preparation/cancellation safe. Never start over a vehicle, working crew or committed passing reservation. A preparation area that cannot drain remains open to its occupants and cancellable.

Reserve restoration funding or make the already-paid order cover making the road usable again; do not require a new purchase to escape a zero-funds trap. Completion/restoration must not depend on a fictional construction vehicle reaching the area it closed. Real construction crews are not part of this initial timer design. Ending one order removes only that order's restrictions and does not reopen player-owned diversions.

## Delivery order and file boundaries

1. **Existing-tool flow prototype remains first.** Validate a road-limited bottleneck and two solutions before adding cosmetic capacity changes.
2. **Model foundation:** proposed `cityRoadworks.ts` owns saved preparation/working/restoring/completed transitions and quotes. `cityModel.ts` validates/backfills data and exposes physical blocked areas; routing/traffic/emergency modules consume the same constraint. Add invariant and continuation tests.
3. **Real widening:** extend geometry, lane choice, junctions, entrances and safe conversions independently of art. Every completed upgrade must have actual functionality; do not ship a timer that only repaints an unchanged road. Grok's proposed placeholder work on unchanged roads can be a test fixture, not a player-facing upgrade.
4. **Integrated timed work + presets:** connect preview, start, cancel/restore and remaining time; add the pause selector only when it changes those actual orders. Preserve current mission/UI layout and desktop/narrow verification scope.
5. **Playtest:** compare the same sole-access and redundant towns in both modes. Shorter does not automatically mean more fun. Check genuine tasks to do while the work proceeds, readable relief, and whether Realistic demands planning rather than mere waiting.

Required tests include responder detour/wait/restore; real outbound and return access; occupied work area; incident during preparation; missing alternative route; destination capacity; road edits during works; zero money/full map; duplicate starts/cancels; quoted-time preservation across mode changes and saves; pause freeze; no double charges/refunds/rewards; old saves. On desktop/narrow verify pause modal, current mission, actual pointer placement, work overlays, elapsed time and reload. No publication is authorized for this new mechanic by the previous UI-only release request.


## Delivery status for this collaboration

Actual Grok completed the design review. No runtime mode toggle, hard work zones or widening was introduced in this pass; those must be implemented and verified together according to the sequence above. The user then assigned sprites to Claude. Both bounded installed-Claude generation attempts timed out without artwork; [sprite assignment status](../artwork/roadworks/README.md) records the limitation and prepared export workflow. No publication occurred.
