# Mission requirements: first 25 levels

Latest clarification (2026-09-11): preserve the current Level 2 and Level 3 maps and prioritize the shared intersection mechanics. Light traffic can be safe without controls; heavier conflicting use and unsuitable controls should create danger. The local rebalance and measured mission/sandbox comparisons are [implemented](../traffic-safety-balance/IMPLEMENTED.md). A safety heatmap is later work. The proposed reorder/table below remains a discussion draft, not today's task.

Status: discussion draft for the next design session. The user selected the overall direction below; individual maps, titles, demand, budgets, targets and the detailed order are proposals. This file does not implement or publish new levels.

## Confirmed direction

- The first **10 missions focus on placing roads, connecting homes to stores and reducing commute time**, using different intersection arrangements.
- Plan a first set of **25 short civil-engineering-inspired challenges** covering connections, congestion, crashes and diversion. Fun and readable cause/effect matter more than textbook accuracy.
- Challenges teach patterns that transfer into the main sandbox. They develop alongside it, with a curated route map, quick retries and permanent earned progress.
- The user reports **46 unique players** at this discussion. Quick challenges encouraging people to return is the design hypothesis, not a verified retention result. This is a reported cumulative count, not concurrent or returning players.
- Discuss the maps and requirements next session. Do not automatically replace the current published lessons or start implementing this whole set from this document.

## Shared mission contract

Each authored level must specify its stable ID/revision, starting map, fixed/editable construction, available tools, fixed budget, households and destination demand, objective, measurement window, reference solutions and retry/save behavior. Use the real simulation. No ongoing challenge income; ordinary refunds apply to player-paid construction. Keep the sandbox, tutorial, outside-traffic consent and cash/land receipts separate.

**Connect, observe, improve.** Begin paused. Play/Pause and Reset remain beside one another at the map's bottom-right; Reset confirms and restores only the attempt. Show the objective before entry and during play. Give a clear result, earned star, Retry and Next. Challenge music continues across planning, results and level selection. Exact session lengths and additional star tiers remain unselected.

**Measure every required household.** Level 1 retains immediate store-arrival success. From Level 2 onward, require the specified shopping visits and returns for every required home. Display completed visits, returned households, unmet demand, vehicles waiting and the longest unfinished journey. A low average among completed trips cannot conceal somebody stranded. Diagnose disconnected routes, full destinations and traffic congestion separately. Do not award efficiency for deleting demand, abandoning trips or trapping cars at the store.

For these shopping lessons, “commute time” means the actual home-to-store-and-home journey. Record travel/queue time separately from store dwell time; any displayed round-trip deadline must clearly state whether dwell is included. Use identical demand, destination capacity and initial departure state when comparing layouts. Measure every required household's first round trip and the slowest one, not just a rolling sample of whichever drivers finish fastest. Later congestion lessons may require repeated returns within an explicitly stated observation window.

**Targets need evidence.** In the table, “time target” means a per-level value to select after reference runs and playtests. It does not authorize a new failure countdown. Decide whether faster service earns extra stars or is a completion condition next session. The currently implemented Level 2 has a provisional 45-simulated-second attempt limit; retain it until revised deliberately. Pause freezes simulation time. Never revoke earned stars or sandbox unlocks. Recognize a layout that already meets the demand without forcing it to fail.

**First ten tool boundary (proposal).** Road and Clear are the player actions; buildings stay fixed and stores have spare capacity. Introduce straight routes, bends, T junctions, four-way crossings, staggered junctions and loops through road placement. If a crossing needs a control to make a beginner map safe, supply a fixed, tested control for these lessons. Active Stop/Light lessons follow at 11–13. No forced accidents, responder management or destination shortages in the first ten. Confirm this boundary next session: the user selected different intersections, but has not chosen precisely when each control becomes editable.

## Levels 1–10: roads and shorter shopping journeys

All tools/setup details below are proposed requirements. Every map must have enough construction budget for a verified solution and protect its required buildings.

| Level / working title | Starting problem and road lesson | Completion and improvement requirement | Authoring verification |
| --- | --- | --- | --- |
| 1 · First connection | One home, one store, two entrance stubs and a short straight gap. | Road reaches both entrances; win on the actual car's arrival at the store. No return wait. | Untouched gap cannot serve the trip; a few road placements produce a visibly quick arrival. Preserve the current arrival lesson where possible. |
| 2 · Three neighbors | Three homes spaced vertically beside one store; build branches into a shared route. | All three shop and return; show individual progress and total time. Retain current 45-second condition pending review. | A branching solution serves all homes; leaving one disconnected cannot earn completion. |
| 3 · Around the corner | Home and store face different directions around a fixed building footprint; connect a bend. | All required trips return within the selected target; correct entrance access matters. | A short bend and a longer legal route both work; measured difference comes from actual travel. No diagonal-road requirement. |
| 4 · Meet at a T | Two short residential branches must join the store road. | Serve both branches; improve the slowest household's journey with sensible junction placement. | Neither approach starves; compare two legal T placements at identical demand. |
| 5 · Across town | Two neighborhood approaches meet at a four-way crossing; fixed safe control if necessary. | Connect every arm needed for shopping and meet the service/time target. | Road placement is the lesson; a ready-made control alone cannot complete missing connections. Verify safe service from every required approach. |
| 6 · Two staggered junctions | Offset residential streets feed a store corridor through two T junctions. | Connect the offsets without sending one neighborhood on a long dogleg. | Verify both neighborhoods return and staggered junction behavior remains understandable at the selected demand. |
| 7 · Close the loop | A long U-shaped route already connects homes to a store; a short missing link can close the loop. | Keep service for all homes and reduce observed journey time toward the target. | Compare the original detour with the completed loop; do not secretly increase demand after improvement. |
| 8 · A second way through | Two home clusters share an inconvenient approach; space exists for a parallel connecting road. | Complete every required return and shorten the slowest journey without abandoning the first cluster. | Demonstrate that the new connection is actually used and reduces delay under the game's routing rules. |
| 9 · Choose the connection | Fixed stores on different sides of a neighborhood have spare capacity; players build access roads. | Every home completes a shopping return through a practical route. No requirement to visit every store. | Both shops are viable; destination choice and real journey time respond to the roads, not an arbitrary assigned answer. |
| 10 · Neighborhood road exam | Combine branches, a bend, staggered junctions and an optional loop in one compact map. | Serve every household and meet the declared commute target using roads alone. | At least two different road solutions qualify at the same demand; a good initial solution earns credit immediately. |

## Levels 11–25: congestion, safety and diversion

Continue using existing roads and model mechanics. New tools are available inside their teaching lesson; this does not yet enable sandbox unlock gates. Preset building footprints can provide obstacles without adding terrain systems.

| Level / working title | Starting problem and available change | Completion requirement | Authoring verification / dependency |
| --- | --- | --- | --- |
| 11 · Take turns | A compact meeting of competing approaches; introduce editable Stop controls plus roads. | Every required household returns without a crash. | Unmanaged reference has a reproducible real conflict; a stop works. A genuinely safe alternative road layout also counts. Candidate home for the existing crossing lesson. |
| 12 · Share the green | A busier multi-approach junction; introduce Lights alongside learned tools. | Serve every approach safely within the declared service target. | Demonstrate useful service from the light; do not assume a stop must fail if it already handles the demand. |
| 13 · The right rhythm | Unequal approach demand at an existing light; expose its actual timing presets. | Improve the delayed approach while all households continue completing returns. | Compare actual preset outcomes; no hidden demand changes or success based only on total throughput. |
| 14 · Give the junction room | Closely spaced junctions let one queue block another; permit road relocation and controls. | Relieve spillback and complete service from both feeder streets. | Verify moving/separating the junctions changes real exit availability; test an alternative control solution if viable. |
| 15 · A useful bypass | Local shopping traffic shares one overloaded route; permit a parallel road and controls. | Restore the specified repeated returns with no stranded approach. | Spare store capacity isolates road congestion. Demonstrate two valid layouts at identical demand. |
| 16 · The shop is full | Roads are connected and uncongested, but existing destination capacity is insufficient; introduce an additional store. | Satisfy the fixed shopping demand and return everyone home. | Full-destination feedback is distinct from road waiting; more road alone cannot be presented as the remedy. New store serves real overflow. |
| 17 · Put service nearer | Spare capacity exists, but one remote store creates unnecessarily long journeys; allow store placement and roads. | Shorten complete shopping journeys while preserving all households' service. | Compare a nearer destination solution with a road-access solution where both are feasible. Candidate home for the current Room to move bonus. |
| 18 · The merge queue | Two feeders squeeze into one short approach; roads and learned controls available. | Clear recurring feeder queues and meet the repeated-return target. | Confirm physical merge/exit contention rather than merely long distance; protect the lower-throughput feeder from starvation. |
| 19 · Send traffic around | A congested shortcut competes with a longer, usable route; introduce Divert. | Redirect traffic through a functioning alternative and retain all required returns. | Divert must affect real routing. A stranded queue behind the arrow does not count; verify its direction and road connection. |
| 20 · Keep a way home | Directional diversion helps outbound traffic but threatens the return route. | Complete both legs for every required home after editing the diversion/roads. | Test outbound and return routing independently; flipping an arrow must not quietly trap returning cars. |
| 21 · Around the crash | A declared starting incident blocks a neighborhood route; build a bypass with learned tools. | Restore required civilian journeys around the obstruction. Clearly state that this does not rescue victims or clear the crash. | Author the incident as an explicit fixture using real blockers. Preserve meaningful responder/deadline behavior if present; do not stage unsuspected casualties for a road-only lesson. |
| 22 · Let the crew through | An incident needs emergency access; introduce the verified service tool(s) appropriate to that incident. | Required crews actually reach and finish service before any stated rescue deadline, then civilian shopping returns resume. | Select injury-only versus broader incident roster before authoring. Test dispatch, approach, clearance and crew return with existing mechanics; do not assume another station replaces a stuck assignment. |
| 23 · Recover the junction | A blocked intersection requires both a detour and space for returning emergency vehicles. | Clear the real scene, return required crews, and restore civilian service without resetting. | Regression must cover the reproduced police/EMS access deadlock and save/reload. No teleporting responders or blanket wreck pass-through. |
| 24 · Keep access open | A marked road segment is closed in the starting fixture; reconnect/divert around it while preserving shop and service access. | All required shopping returns and explicitly specified service journeys remain possible and complete. | Use existing static closure/diversion behavior. No widening, automatic work timer or simulation-mode dependency; later roadworks can extend this lesson separately. |
| 25 · Keep the district moving | A compact district combines one road bottleneck, a destination-access choice and a declared diversion or incident. | Meet a clear all-household service target and any explicitly required real clearance goal. | At least two verified solutions at identical demand; no forced sequence of tools. Reuse learned mechanics, keep the objective readable, and ensure a quick attempt is realistic before accepting the map. |

## Acceptance before a level ships

1. Save the authored fixture and reference solution operations; reproduce with the real fixed-step simulation. Record budget used, actual visits/returns, per-home travel and round-trip times, unfinished journeys, unmet demand, queue extremes and accidents.
2. Compare the untouched map, reference solution and plausible near-miss. Disconnection, missing store capacity, unsafe conflicts and slow-but-connected routes must produce truthful feedback. If the starting map already qualifies, count it or revise the authored puzzle openly; never manufacture a failure during play.
3. Verify alternative solutions for optimization lessons and composite challenges. A specific sign, road or building is not the win condition unless the lesson explicitly teaches that action, and real service must still follow.
4. Verify pause, Reset cancellation/confirmation, reload, different frame sizes and permanent earned receipts. Later renumbering must use stable IDs and preserve old runs/stars; archive superseded maps deliberately.
5. Observe a person playing on a phone: can they see the cause, place roads comfortably, understand the result and want another attempt? Check desktop and narrow UI. Automated correctness establishes solvability, not fun or retention.

## Next discussion

- Review the first ten maps before implementation; confirm whether controls remain fixed until Level 11.
- Choose a quick-session goal and how much is building versus watching. Decide whether time is a win threshold, a mastery star, or both. Keep Level 1's arrival payoff immediate.
- Pick budgets, home counts, departure timing and dwell accounting from measured reference runs. Do not copy the current ten-home crossing's difficulty into beginner levels by default.
- Choose initial star criteria and which earned mechanics become available in the sandbox, including preservation for existing towns and tutorial/Skip compatibility.
- Agree how much incident/rescue complexity fits Levels 21–25 and which service roster each uses.
- Move the current crossing and flow lessons later only with a saved-progress migration. Their published IDs and earned stars must survive the first-ten reorder.
- Evaluate whether players return for another short challenge through voluntary playtest feedback and any already-available aggregate platform data. No new analytics collection, daily-reward system or monetization is authorized here.
