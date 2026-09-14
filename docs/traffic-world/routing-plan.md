# Routing intelligence — jam scope and later direction

Status: civilian J1/J2 and emergency J3 implementation verified; see [implementation evidence and remaining limits](routing-implementation.md). Explanation, mission and variation work remains planned. Mockups are removed and variations stay last.

## Scheduling update (2026-09-10)

The user makes the [gameplay UI overhaul](../ui-overhaul/PLAN.md) the next feature priority. J3 remains implemented; J4/J5 and advanced behavior are retained but follow the UI work. J4 should extend the resulting Dashboard/inspector rather than create another competing layout. Blocking correctness fixes remain first; no mockups and variations last.

## Intent and interpretation

The long-term direction includes per-vehicle dynamic route costs, congestion forecasting, adaptive rerouting, lane preference and intersection decisions; a network observer suggesting or applying optimizations; rush/event/emergency/weather conditions; and explanatory overlays with modular Pixi presentation, tuning and event hooks.

For this jam, interpret “AI” as deterministic traffic algorithms over the actual simulation. Do not add an LLM call per vehicle, a hosted traffic service, model training or unmeasured forecasts. This is a scope recommendation to conserve engineering effort and runtime cost, not a claim that deterministic routing guarantees convincing behavior.

Player authority is a design tradeoff: a global system that silently retimes signals, reassigns lanes and builds detours would solve the player's core puzzle. Lead recommendation: the jam network observer diagnoses and suggests; the player chooses infrastructure/control changes. Vehicles may autonomously select routes using existing legal roads. Optional player-enabled signal automation can be a later tool. This advisory boundary is a proposal, not an explicit user rejection of future automation.

## Jam work order and acceptance

| Order | Bounded deliverable | Acceptance |
|---|---|---|
| J0 | Diagnose remaining real responder failures using copied vehicle reports and reproduction fixtures | All required crews arrive, work and return when a valid route/merge exists; no position jumps, duplicate dispatch or city reset |
| J1 | A shared routing snapshot and weighted path query for current road geometry | Legal routes to the original destination, including real returns; closed/wrecked/missing roads remain hard constraints, not costly shortcuts |
| J2 | Congestion-aware route cost with bounded adaptive rerouting | A longer but less-delayed route can win; added roads are discovered; ordinary signal waits do not cause route thrashing; identical inputs produce reproducible choices |
| J3 | Emergency routing policy using the same graph and actual road occupancy | Prioritize response queries and approved response-driving rules; never drive through a wreck, an occupied merge, or another crew because a score says it is preferable; routine returns remain distinct |
| J4 | Explain choices through the existing live vehicle inspector | Show original goal, query/replan trigger, selected route, cost breakdown, measured-data age and rejected alternatives/reasons; separate “no route,” “occupied lane,” “signal wait,” “scene work,” and “full destination” |
| J5 | One measured mission/puzzle on the existing city tools | Compare identical offered demand and observation windows; record arrivals, returns, longest waits, unserved homes and rescue outcomes, not only average throughput |
| Last | Scenario and visual variations after the selected mechanics work | Reuse verified systems and existing art; no mockups |

J0 builds on current fixes, not a claim that the user's exact city has been inspected. Civilian departures, returns and optional active-trip queries now use weighted costs; emergency dispatch/recovery now compares weighted legal scene approaches, while routine service returns use ordinary policy. Connectivity and civilian mandatory obstruction recovery retain their existing behavior. No predictive engine is claimed. The current debugger shows state, route and reservation conflicts; it does not yet log routing-cost history or forecasts.

## Smallest useful routing model

Use current road/entrance geometry first. A query includes the vehicle's physical position/committed segment, original destination, response versus ordinary policy, and a revisioned snapshot. Use a standard nonnegative weighted search (Dijkstra is sufficient initially), rather than inventing a general behavior-tree engine.

An edge's estimated travel cost combines free travel time, a bounded recent queue-delay estimate and applicable control delay. A short downstream lookahead can flag spillback risk. Avoid counting the same delay twice; keep units in estimated seconds where possible. Weights, observation windows, minimum samples and caps are provisional tuning in the rules module. An unknown wait is unknown/estimated, not zero certainty. The jam forecast is this modest estimate, not a separately promised prediction system.

Preserve hard constraints independently of cost: directional legality where supported, actual incident obstruction, entrance access, safe lane/junction reservations and committed emergency maneuvers. A soft penalty must never permit an impossible road. Lane-priority scoring waits for an actual multi-lane graph; current opposing travel lanes and emergency passing do not constitute general multi-lane choice.

Trigger a replan on relevant topology/closure changes or sustained inability to progress. Impose a cooldown and meaningful predicted improvement threshold before replacing a usable route. Exclude irrelevant distant queues. Use stable tie-breaking and stagger bounded requests so every car does not switch simultaneously to the same alternative; verify that the policy does not starve ordinary traffic behind emergency requests. Keep a valid old route while an optional query is queued. No valid route means a visible stopped vehicle and an explanation, not teleportation or a new destination.

Emergency queries may consider other legitimate scene approaches and current response policies. Actual movement still owns safe admission, yielding, passing, scene parking and return merges. Shop capacity is a separate demand constraint: do not relabel a full shop as a road failure or send a shopping trip to the park to improve the score.

## Global observer, not a second hidden city builder

Aggregate existing outcomes and queue/control snapshots. First distinguish unavailable route, full destination, oversubscribed approach and temporary incident blockage. Suggest a concrete inspection target and the evidence. Signal retiming advice should compare approach waits; bypass advice should identify the severed/overloaded corridor. Do not claim a candidate change is optimal without a measured comparison.

The manager can present delayed suggestions after sustained lack of progress, with the accepted enthusiastic “MORE roads!” voice. Keep the factual diagnostic available separately from his fallible advice. Advice must not imply that restoring traffic medically rescues victims. Optional future automation needs an explicit player enable/disable control and visible changes; lane reassignment and temporary automatic detours depend on the appropriate road/control model first.

## Module and event boundaries (proposed, not files created)

- **Routing snapshot/cost layer:** reads geometry and recent traffic measurements; publishes an immutable revisioned view. No Pixi imports.
- **Route query/policy layer:** computes legal alternatives for a specific goal and service mode. Uses a bounded queue/cache and explicit invalidation.
- **Movement integration:** retains authority for current lane occupancy, reservations, smooth turn/reversal, passing and departure admission. Route selection alone cannot move a vehicle.
- **Network diagnostics/advice:** summarizes bottlenecks and produces suggestions, without mutating player controls by default.
- **Pixi route/cost overlay + inspector adapter:** consumes snapshots and selected-vehicle decision traces. Render only requested diagnostics; reuse current UI/art.
- **Rules:** group route weights/caps, sampling windows, query budget, replan cooldown/improvement threshold, emergency priority/fairness and advice delays in the existing tuning surface.

Use narrow typed events at real model boundaries: topology changed, control changed, incident changed, vehicle stalled, route evaluated/adopted/rejected, and trip completed. Payloads include simulation time, relevant IDs/revision and reason. No generic event framework or module rewrite unless these concrete consumers require one. Bound the decision-history buffer; record on changes, not every animation frame.

Derived costs, caches and heatmaps are recomputed after load. Persist only state required for continuity and deterministic cooldowns, with optional backward-compatible fields and explicit validation. Benchmark query counts/frame time on a dense saved town and a target phone before choosing budgets; do not promise a universal vehicle cap or forecast accuracy now.

## Deferred until the baseline works

- Rush-hour and event schedules: data-driven demand by real origin/destination purpose; not six new maps. Small correctness fixtures may exercise demand changes during development, but do not produce scenario variations yet.
- Weather: speed/braking/visibility effects need their own explicit rules and feedback; no cosmetic weather masquerading as implemented routing behavior.
- Full congestion forecasts, gradient overlays and predicted-alternative animations: add only if they answer a demonstrated debugging/player question. Label estimates and their observation window.
- Lane scoring/reassignment, bus lanes, general intersection decision trees, automatic signal optimization and broad optimization strategies: separate modules after their prerequisites are verified.
- Mockups: removed entirely, superseding every earlier comparison-sheet proposal.
- Scenario and visual variations: last, after mechanics.

## Agent scope and completion discipline

No further specialist roundtable is needed just to append this plan. To conserve tokens, each later implementation assignment should receive the relevant shared lessons, one module boundary, concrete fixtures and one acceptance gate. Lead owns integration; choose available specialists when the task is ready rather than promising a provider whose quota/client may be unavailable. Do not mark the plan complete because controls or overlays exist; acceptance requires actual traffic outcomes and saved-city continuity.

## Vehicle roster clarification

User explicitly requests cars, slower trucks and buses that are faster in bus lanes, with distinct sprites for all three. Record speed/lane eligibility as simulation rules independently of sprite dimensions. Cars/trucks can be introduced before general bus-lane routing; bus speed advantage requires real eligible lane connections and safe merges. Do not make buses globally faster or merely recolor cars while claiming new behavior. Distinct artwork follows verified mechanics and the user's end-stage visual-work direction. These vehicle classes are planned, not implemented by this addition.
