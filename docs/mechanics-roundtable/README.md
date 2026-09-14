# Mechanics roundtable — September 9, 2026

Status: design research and recommended work order, not implemented mechanics or playtested balance. User requested discussion with actual installed Claude Code and Grok Build; Codex coordinated and reviewed both. Their initial proposals contain errors and withdrawn recommendations: use this synthesis and final reviews, not those drafts, as the recommendation. User approval of research is not approval of every proposed rule.

## Explicit user confirmation during the discussion

The user agreed that the strongest early distinction is road congestion versus insufficient store visitor capacity, with clear feedback; new currencies, upkeep charges and broad upgrade trees stay out of the first slice. “Keep it simple to start.” This narrow boundary is accepted user direction. Detailed milestone targets, future occupancy and other recommendations below remain proposals.

## Latest user direction

Economy, buildings and road puzzles must form a persistent efficiency game. Early ample room permits imperfect solutions; chosen growth and density make space and routing decisions increasingly interesting. The player should not feel rushed. Visible long-term progression and purpose matter, with Clash of Clans offered as inspiration. Build the result incrementally. Preserve all earlier accepted ownership, real journeys, safe solutions, refund and no-reset requirements.

## Assignments and discussion

- **Claude Code:** buildings, demand and progression; how upgrades and destination placement create spatial choices. Researched OpenTTD catchments and Cities: Skylines demand, then reviewed Codex and Grok.
- **Grok Build:** economy, incentives, idle production and exploit risks; researched transport payments, production efficiency and progression, then reviewed Claude and Codex.
- **Codex:** road puzzle progression, solvability, source verification and integration. Corrected both specialists' mistaken reading of starting cash as a building, visit-versus-return payment, park income, and current crash pacing.

Claude's initial web tools were denied; its initial recalled inspirations were explicitly unverified. A second invocation with explicit web permissions returned sourced research. Grok returned linked research including secondary sources. The primary sources independently checked by the lead are listed below; unverified secondary claims do not establish the contract.

Final cross-review: [Claude](claude-final.md) and [Grok](grok-cross-review.md) explicitly accepted the common first-slice contract. Codex adopts it with the diagnostic and recovery qualifications below. Grok returned a complete review; its client subsequently emitted a session-cleanup warning, so the claim rests on the saved response, not process status.

## Shared recommendation

**Choose growth → observe purposeful traffic → make a workable improvement → see better service and income → choose the next ambition.** An inefficient but functioning town is an acceptable place to stop and enjoy it. Success must not automatically summon enough traffic or accidents to invalidate the solution.

Reward useful completed visits, not the number of cars currently on roads or their distance travelled. Faster cycles can earn more visits per minute until genuine demand or destination capacity becomes the limiting factor. At that point the town is working well; offer growth, do not manufacture demand merely to maintain congestion.

Shopping keeps its existing once-per-completed-visit payment. Cars must still return; track return failures, unserved households, waiting and safety alongside income so profitable arrivals cannot conceal stranded residents. Visitor slots free when cars depart the destination. No hidden efficiency payout multiplier, distance bonus or ordinary congestion fines in the first proposed slice. Specific emergency deadlines remain a separate existing mechanic needing its own pacing review; this recommendation does not remove them.

Keep full refunds of actual construction payments, real park leisure journeys and the current household-based park benefit pending measurement. Let a working city continue producing while watched or left running. Offline earnings are a separate unapproved feature. No construction wait timers, wallet cap, forced collection clicks or new currency proposed for the first slice.

Space makes the early patch interesting: a long connector can restore access now, while occupying room that later homes or destinations might use. It remains a valid solution if it works. Do not award compactness universally or make demolition mandatory. Basic stops/lights remain accessible; wider roads, one-way roads and buses are future alternatives rather than prerequisites withheld during an impossible puzzle.

## Building roles

| Building/system | Purpose in the loop | Spatial choice |
| --- | --- | --- |
| Home | Generates real shopping and leisure needs | Spread homes along available roads or later opt into additional households in an existing footprint |
| Store | Serves shopping, reserves visitor capacity, pays for completed visits | Central shared destination versus additional shop nearer unmet demand; extra stores must not invent customers |
| Park | Creates real leisure journeys and the existing bounded household benefit | Balance attractive destination access with shopping flow; never satisfy shopping by sending the car here |
| Clinic | Sends real EMS from its entrance | Protect access and a usable scene approach; another clinic is only useful if it can actually reach the incident |
| External connection | Adds real outside customers when chosen | Shared local approach versus separate access and destinations near the gateway |
| Later occupancy upgrade | More households in the same building footprint | Chosen density loads existing roads; preview added demand and offer a safe reversal path |

A new building or upgrade should eventually add a distinct traffic decision, not merely a larger income number. Occupancy is recommended before adding an entirely new work/school trip system, but after testing current buildings and outside traffic. Upgrades, downgrades and new trip purposes are not implemented by this document. Exact road-capacity forecasts are uncertain; show estimates honestly rather than promising an upgrade cannot reduce income.

## Proposed opening progression

These are puzzle archetypes for the player's own city, not architecture stamped onto the map. Existing H onboarding remains the starting foundation.

| Beat | Purpose and visible change | Available approaches | Progress/reward direction |
| --- | --- | --- | --- |
| Establish a neighborhood | Homes actually shop and return | Player placement after the initial guided pair; existing infrastructure | First earned income and existing tutorial progression |
| Serve the next neighborhood | Additional chosen homes and park share a crossing; open destination slots but queued approaches identify a road bottleneck | Control the junction, use a perimeter connector, or distribute destinations if that changes the overloaded journeys | Small once-claimed civic reward for real service; no required queue or crash |
| Give customers somewhere to go | A shop has full inbound/occupied slots despite usable roads | Additional appropriately located shop; later capacity upgrades after designed | Recognition for serving previously unmet demand |
| Welcome outside customers | Explicit connection introduces bounded outside demand | Separate local entrances from through traffic, route around the district, or serve arrivals nearer gateway | Next growth opportunity/land progression in the same town |
| Make the district denser | Player opts into more households within existing footprint | Reorganize access, use remaining corridors, redistribute destinations, or expand with earned land | Visible upgrade/skyline progression; advanced tools only in subsequent verified slices |

Do not claim a road edit solves a genuinely full destination by itself. Do not claim a second shop always fixes a crossing. A proposed solution must change the actual limiting condition. If a player already supplies adequate service, recognize success immediately; never require them to first create a bad crossing or use the manager's preferred fix.

A local home/shop pod is valid early. Later shared leisure destinations and voluntary outside customers can make connected infrastructure useful. Do not force pointless cross-city shopping or tax isolation just to destroy a good layout. Whether this creates enough variety is a playtest question.

## Economy and feedback

Initial implementation values remain starting cash900, roads20, homes200, stores400, parks300, Clinic800, stops25 and lights75; shopping100/visit, base support20/10 seconds, park benefit15/10 seconds per household served recently. These are existing provisional values, not newly agreed balance.

Measure earned shopping, park benefit, support and construction separately. A home/store pair costs600 before roads: a store's400 price equals four100 shopping receipts, without accounting for the home and road investment. This arithmetic flags potentially rapid growth; it does not establish actual pacing. Measure time to the next meaningful choice and whether fixing a bottleneck improves income before changing numbers.

Claude proposed replacing additive support with a low-income floor. Keep that as an experiment, not an agreed change: too high a floor makes improvement financially irrelevant, while too low or expired assistance may leave recovery tedious. Continuous leisure benefit is legitimate when households actually maintain visits; its window need not be shorter than the repeat interval. Benefits already do not stack per park.

Show a compact player-facing distinction:
- **Road issue:** which origin/destination and outward or return route is affected.
- **Waiting in traffic:** which approach is holding journeys, including real queued vehicles.
- **Destination full:** occupied versus inbound reservations and waiting demand.
- **Serving the town:** completed visits/minute, income/minute and unserved households.

Use diagnostic categories on demand/trips, not a fabricated cause assigned to every empty parking slot. Include blocked and capacity-denied demand even without a spawned car; measure denied outside arrivals without creating an unlimited arrival backlog. Respect current temporary-obstruction departures: cars advance and queue on existing roads, while truly missing connections/capacity can hold departures. Destination-choice improvements using estimated travel time are future work; do not claim omniscient actual travel time or change an active destination silently.

Manager objectives provide civic purpose, with persistent visible rewards and later deferral. Example draft: “A whole second neighborhood. They'll need a larger sign for my office.” After sustained unresolved waiting: “We have land. We have roads. Clearly, we need more of both.” Advice checks feasibility, never awards money just for obedience, and gives the player time to act.

## Solvability and recovery gates

Before shipping each puzzle, demonstrate two materially different working solutions using available tools and affordable funds. Compare fixed demand, the same incident conditions, and several complete demand cycles after warmup. Verify every affected household's outward and return journeys, no indefinitely starved approach, safe modeled conflicts, stable queues, and actual emergency clearance when relevant. Connectivity alone is insufficient.

Also test a good initial layout, no further growth, save/reload during a queue, full destination, full map, zero cash, and edits affecting occupied roads/buildings. Full refunds alone do not prove recovery: zero-paid tutorial construction and active journeys may prevent a useful refund/rebuild. No mission may require earning land by first placing something impossible on the owned map. Design an achievable service/reconfiguration alternative; where necessary, a finite targeted construction allowance is a candidate recovery mechanism to verify, not a promise that current main-game assistance handles it. Never require reset or teleport cars as the solution.

Automated checks establish consistency and recoverability. Player observation must establish fun: can the player identify the bottleneck, explain why an edit helped, enjoy watching it work, and choose another improvement? Numerical thresholds and milestone duration remain open.

## Incremental work order

Assignments below are a proposed sequence, not running implementation or calendar promises.

1. **MECH-01 — Codex:** audit destination commitment outside tutorial and establish reliable demand/access/capacity reasons. Fix goal substitution before building progression on it. Preserve active trip identity, reservations, queues and save continuity.
2. **MECH-02 — Claude UI, Codex model/integration, Grok economy review:** expose the compact diagnostics and one untimed shared-junction growth objective; validate two solutions and a good initial layout. Use existing tools, prices and buildings. This is the first playable design experiment.
3. **MECH-03 — Grok balance proposal, Codex fixtures:** measure income composition and time to meaningful construction; add the destination-capacity scenario. Propose price/support changes only from results.
4. **MECH-04 — Codex simulation, Claude explanation:** test bounded outside demand and local/through-traffic separation in existing cities.
5. **MECH-05 — Claude progression design, Codex implementation review, Grok balance:** specify the first optional occupancy upgrade and reversible growth path. Implement only after the earlier loop is satisfying.

Driving styles, new service complexity, ordinary crisis charges, broad building trees and advanced road types follow those results. Earlier crisis-cost/driver ordering is superseded for this proposed opening-mechanics track; urgent reproducible routing/recovery bugs remain ahead of it.

## Research used

- [Factorio FFF375](https://factorio.com/blog/post/fff-375): Wube distinguishes expanding production from improving existing efficiency and discusses opt-in complexity. Our inference: offer building outward and improving within owned space as legitimate choices.
- [Factorio FFF416](https://www.factorio.com/blog/post/fff-416): unpredictable flow and construction-order effects made the old fluid model frustrating. Our inference: make road causes predictable and visible; do not copy its removal of spatial fluid routing.
- [Mini Motorways official description](https://dinopoloclub.com/games/mini-motorways/): road redesign and upgrades respond to changing demand. Our application keeps persistent ownership and chosen growth.
- [Mini Motorways Creative Mode announcement](https://dinopoloclub.com/2025/08/26/the-creative-mode-update-is-out-now-in-mini-motorways/): player control over destinations and extensive upgrades supports experimentation; this does not prove our economy is engaging.
- [Supercell Clan Capital and Forge](https://supercell.com/en/games/clashofclans/blog/game-updates/capital-forge/): hall progression governs building upgrades. Borrow legible future capabilities, not a new multiplayer economy or timer system.
- [OpenTTD cargo income](https://wiki.openttd.org/en/Manual/Game%20Mechanics/Cargo%20income): payment depends on distance and transit time; its documented incentive to separate stations illustrates why we should not pay for longer journeys.

These sources provide inspiration and specific design cautions, not evidence that our proposed balance has been validated.
