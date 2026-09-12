# Buses, stations, stops and walking — design contract

**Latest user direction (September 11):** representative abstract rider queues are now explicitly allowed before complete household coupling so buses visibly fill and serve destinations without pedestrian sprites. See [Grok review and revised prototype rules](bus-economics/README.md). This supersedes the strict linked-rider prerequisite below for that prototype; preserve existing linked journeys and separate abstract counts from their income/service receipts.

2026-09-11. Original design/assignment record below. The [bus system](buses/README.md), approved pixel bus art and [representative rider prototype](bus-economics/IMPLEMENTED.md) are now delivered locally. Balance validation and publication are not claimed. Mission structure remains with the user.

## Requested behavior

A bus station occupies a real building lot with visible parking. A bus stop occupies exactly one map square. Player-authored bus services connect neighborhoods and shopping districts; people walk to/from stops. Buses queue with traffic and hold cars up while boarding, but consolidate real journeys so a growing town can serve more households and visitors with fewer cars. One-way streets must constrain buses through the same directed road rules as other traffic.

The footprint, capacities, walking range, prices and timings below are **proposed implementation defaults**, not user-selected balance. Do not add population growth bonuses merely for placing transit or silently increase demand after a successful solution.

## Current code constraints

- `src/game/cityModel.ts`: buildings have rotated physical footprints and one road entrance; current home is 2×2, store/service building 3×2. `BuildingKind`, tool handling, validation and save parsing are exhaustive. `Trip` currently represents a road vehicle and its household journey together; its path/progress is the authoritative vehicle position.
- `src/game/cityVisits.ts`: explicitly models **households, not individual people**. One active trip/car per home; bounded shopping/leisure needs; store/park slots currently combine parking and activity capacity (4/8). Slots reserve on outbound travel. A real completed stay consumes need and pays shopping income once; returning still requires a physical journey. Transit cannot be represented by deleting cars near a stop.
- `src/game/cityExternal.ts`: arrivals are individually spawned car trips, gated by explicit outside connection, free destination capacity and a bounded live-trip limit. Congested arrivals are missed rather than accumulated in a hidden backlog. Bus visitor demand needs the same admission semantics and a real return to the gateway.
- `src/game/cityTraffic.ts`: road occupancy, junction conflicts and passing currently assume one vehicle body reserving one tile. Bus artwork size cannot substitute for swept-body reservations. Ordinary civilian selectors often mean `!trip.service`; a bus must not accidentally count as a household or visitor.
- `src/game/cityFlow.ts`, `cityMissions.ts`, `cityExpansion.ts`, challenge checks and diagnostics currently derive service/access largely from car trips and road paths. Generalize attribution/access deliberately; boarding is neither a completed visit nor a household return. Preserve old receipts and level definitions.

## Objects and player operation

**Station:** propose a rotatable 3×3 lot, containing a small office, two visible bus bays and maneuvering apron. Entire lot is occupied construction, including its parking, and cannot overlap roads/other lots. One actual road access point dispatches and receives buses only when legal and clear. Two bays mean at most two owned buses per station initially; a deployed bus retains its home bay. The station also serves as an interchange: a pedestrian access/frontage node within the same lot is selectable in route stop order, and boarding occurs only at its actual off-road platform after the bus clears the entrance. Interchange users follow the same walking, seat and activity rules as roadside-stop users. Parking is bus fleet storage, not extra destination visitor capacity; private-car park-and-ride is deferred. Fleet purchase and resale have saved actual-payment receipts; no automatic infinite fleet on building/reload.

**Stop:** a rotatable 1×1 off-road lot with sign/shelter and an explicitly selected adjacent road tile/curb side. The stop never consumes an additional hidden land square, but needs an existing adjacent boarding road. The bus occupies that road lane while dwelling; it does not park inside the stop lot. Validate clear physical frontage. Initial placement excludes junction tiles and their swept entry/exit space, so a dwell does not park a bus across an intersection. A nearby parallel street is not automatically the same stop. On two-way streets its curb serves one travel direction; opposite service needs a stop on the other curb or a loop. One-way edits can invalidate its boarding direction and must show the reason.

**Service:** select station → create route → tap stops in order → preview directed travel path and return to station → assign available bus(es) → Start. First version uses a repeating ordered loop with at least two distinct stops. Every segment, final loop segment and depot entry/exit must be legal. The loop need not visually be a circle. No timetable editor or transfers initially. Route name/color, stop order, assigned fleet, boarding counts, queue and route-blocked reason are available on desktop and narrow. Edit a draft and apply atomically; existing buses finish a safe committed movement and serve their current passengers before adopting the new route. Route authoring stores stop IDs and order, not a permanently trusted path.

Fleet spacing is managed by a modest saved departure interval (propose 12 simulated seconds); an obstructed exit waits, never overlaps a bus. Prices and operating costs require economy review; prototype with explicit constants and no boarding fare/income. Do not ship a new operating drain without balancing it against existing income and challenge fixed-budget rules.

## Walking and journey ownership

Use a separate pedestrian access graph: building/stop access nodes connect along sidewalks of existing connected roads, with explicit intersection crossing links. Walking edges are bidirectional even beside a one-way road. They do not cross buildings, empty gaps, diagonal corners or disconnected parallel roads. Initial sidewalks/crossings are implicit infrastructure on existing roads; highlight their actual paths in the placement preview. This abstraction need not simulate individual pedestrian collision agents. Closures distinguish carriageway closure from blocked pedestrian access explicitly; do not infer a walk-through from geometric proximity.

Propose a maximum **six sidewalk tiles per access leg**, with distance measured on that graph. Travel consumes simulation time (propose one tile/second). Coverage outlines are previews, never the eligibility test. Direct walking between nearby home and destination uses the same graph and real timed return, so a compact neighborhood benefits without forcing a bus ride.

One existing household demand unit becomes one traveler record (one representative resident journey), not an invented count of everyone living there. Keep one active journey per household initially, regardless of mode. Use UI labels such as “riders” and “households served”; do not relabel current household counts as census population. Individual household population is a separate future extension.

Proposed ownership:

- A journey record owns home/external origin, purpose, destination, original start time, mode/legs, position on any walking leg, seat reservation, visit timer and reward/return receipt.
- A bus vehicle owns station/route IDs, physical road path/progress, dwell state and onboard journey IDs; it never owns the riders' household needs or shopping reward.
- Existing car trips retain their saved shape through compatibility adapters. Do not rewrite every old trip in a transit migration. New bus trips require an explicit discriminator, and every civilian/incident/visitor selector must be audited.

Journey states: home/gateway → walking to stop → waiting → riding → walking to destination → visiting → walking to return stop → waiting → riding → walking home/gateway → complete. Direct walking/car replace transport legs, not visit/return semantics. Record original departure-to-return duration, including walking and waiting.

At departure choose a legal complete round trip among car, direct walking and available transit using deterministic estimated walk/wait/ride time. Check destination capacity and both directions before committing; provisionally prefer the shorter estimated journey, retain existing stable purpose fairness and use stable ID tie breaks. A bus route merely passing nearby is insufficient. Do not continuously flip mode every tick. A person already at a stop cannot summon the household car there. Replanning preserves their current location and can walk home or take another feasible direct route; no teleportation. Show waiting/unserved demand when no route exists.

## Seats, destination capacity and conservation

Propose eight riders per bus, FIFO boarding with stable journey-ID ties, alight before boarding, and saved boarding order. Bus capacity counts onboard riders, independent of destination slots. Never spawn eight new demands because eight seats exist.

For the initial bounded system, reserve an outbound seat on an identified next bus run/segment before departure plus one destination activity slot. A reservation has a run ID and boarding/alighting stop interval; reuse seats on nonoverlapping intervals. Release missed/canceled reservations explicitly, preserving the traveler and destination intent. Return eligibility requires a running usable service, but do not hold an empty seat for the entire visit; reserve a feasible return run when the visit completes and preserve waiting age. Closed roads can still strand an admitted traveler and must remain visible.

Keep existing store/park totals as **activity capacity** for all modes, maintaining old saves and avoiding unlimited pedestrian income. Car parking may initially continue to have the same limit in parallel; separate parking counts from visitor counts in the UI. A walker/bus rider occupies activity capacity but no car space. Initial admission uses one activity reservation per journey, including walking/queued outbound passengers, released when the completed visitor leaves the destination for return. A bus never reserves a single slot on behalf of all its riders. Prevent duplicate reservations after reload/replan.

Consume need and grant existing visit benefit only after the real stay completes, once per journey. Attribute a household return only at the physical home endpoint; external completion only at the gateway. One bus containing eight travelers is one road vehicle and up to eight separately evidenced completed journeys. Existing progress may gain genuine service through new modes, but unchanged challenges that explicitly require car arrival continue to require it. Transit-aware objectives belong in later user-designed missions.

Visitors: initial service supports a gateway-adjacent stop reached by a real sidewalk path, using the existing explicit connection. Existing arrival clock emits one visitor opportunity, assigned to car/walk/transit at the gateway; count passengers as well as external cars against the existing live-visitor limit. No invisible bus load is added upstream. Reserve activity/seat before admission; full service misses that arrival as today. Actual growth increases opportunities under existing rules; test the larger demand explicitly. A regional bus physically entering from outside is a separate extension, not implied by this depot design.

Conservation invariant per admitted journey: exactly one location/state; at most one household commitment, one destination reservation and one current seat reservation; onboard IDs match physical bus occupancy; at most one visit reward and one return receipt. Unserved, canceled and casualty outcomes are reported separately from successful service.

## Physical traffic and emergency behavior

A bus is an ordinary road participant: obey directions, signals, stops, diversions, closures, queues and actual conflicts. Dwell holds its lane and uses simulation time; propose 1 second minimum plus 0.25 second per boarding/alighting rider, capped at 4 seconds for tuning. Depart only after dwell ends and the next movement is clear. Do not manufacture crash risk from a stationary bus queue.

Start the prototype with a compact bus whose visible body fits the existing one-tile occupancy envelope. This is a provisional stylized minibus, not permission to draw a two-tile coach using a one-tile collider. A larger bus is gated on swept-tail occupancy for turns, crossings, stop approaches, merges and committed emergency passing corridors. Fleet/passenger gains do not depend on unrealistic vehicle length.

Emergency vehicles use the existing physical passing/scene rules; a bus does not disappear or vacate a stop automatically. Review passing eligibility against bus geometry and one-way lane availability. Full road closures block buses and responders consistently. A stranded bus keeps its passengers and physical location while it waits/replans; do not drop its people into the destination. Crash integration must preserve required crews and deadlines. A bus crash freezes onboard journeys and their receipts; capacity alone must not multiply fatalities or silently count every rider as rescued. Before playable transit, extend incident outcome attribution for onboard travelers and test casualty/recovery bookkeeping under the existing severity policy. No new severity probabilities are selected here.

## Editing, removal and saves

Save versioned optional transit state with stable IDs, route order, active run/segment, passenger state, timers, reservations, paid amounts and pending edits. Missing transit data means no transit and no mode conversion; existing construction, trips, funds, receipts and challenge storage survive. Validate referential integrity and finite/bounded values before accepting a save. Corrupt optional transit data must not silently discard onboard people; reject that save candidate through existing recovery selection with diagnostics rather than reset the town.

Road edits retain the current occupied segment and reconsider future route legality using the shared direction API. Closure/disconnection marks service blocked; keep riders, elapsed waits and physical bus geometry across reload. A stop can close to new boardings immediately, but deletion waits until committed boarding/alighting passengers clear or are rerouted through a real reachable stop. Removing a route retires buses after safely unloading and returning. Removing a station requires fleet retirement into its bays and no active rider dependency; explain the concrete blocker. Ordinary vacant objects delete/refund once under existing payment rules. Deleting a home/destination cancels its uncompleted service without rewards; preserve affected travelers' location and explicitly resolve return/safe exit rather than counting a completed trip. These edit guards are preferred to teleporting occupied vehicles.

## Performance and staged delivery

1. **Domain foundation:** trip ownership/adapters, mode-aware activity capacity and actual walking graph, conservation tests. No default save behavior change without placed/activated infrastructure; direct walking activation needs an explicit feature migration rule so old benchmark hashes remain comparable.
2. **Physical bus loop:** depot/stop lots, directed route validation, compact bus movement/dwell, seats, returns, edits and persistence. Validate on small deterministic fixtures before UI integration.
3. **Playable local transit:** real household and gateway visitors, one-shot benefits, Flow/access diagnostics, crash passenger attribution, responsive authoring and selected candidate art. Do not call an empty looping bus “transit delivered.”
4. **Measured balance:** matched demand runs against car-only/walking/transit variants; then larger demand that keeps useful service. Tune fleet, dwell, walk radius and costs from evidence. Longer coaches, transfers, detailed pedestrians and regional arrivals remain follow-ups.

Topology caches include direction revision, sidewalk revision, stop frontage and closure/access policy. Cache immutable stop-to-stop paths/coverage, not changing vehicle occupancy or seat availability. Recompute route legs on edits or bounded route-query events; continue physical movement checks every simulation tick. Index passengers by home/bus/stop/destination, avoid all-pairs passenger×bus scans, cap routes/fleet/active travelers and bounded history explicitly. Rendering may show representative walkers and queue counts rather than a sprite per modeled traveler; authoritative counts remain complete.

Use preserved `docs/performance-review/player-town/` town copies and frozen production assets for desktop and narrow frame pacing, including active bus dwell, queues, zoom, construction and reload. Report FPS, frame p95/p99 and simulation p95/p99 against the same environment and fixed demand, then a documented growth scenario. Existing software desktop ~15 FPS is not target-device smoothness; adoption requires no material unexplained regression and actual-device follow-up remains open. Do not remove collision rules or change timestep for benchmark gains.

## Acceptance and delegation contracts

| Work package | Recommended owner | Required evidence |
| --- | --- | --- |
| Passenger ownership, walking, capacity, save compatibility | Codex simulation implementer | Conservation through every state/reload; existing no-transit town checkpoints unchanged; no double income or household trips |
| Route authoring and new object feedback | Installed Claude, following established UI ownership | Desktop/narrow placement, rotation, stop curb/direction, invalid route reasons, live queue/occupancy and safe delete interactions |
| Fleet and demand balance critique | Installed Grok with bounded text brief | Fixed-demand car reduction **and** all-household service/returns, visitor throughput, dwell/headway sensitivity, no hidden demand suppression |
| Art candidates | Installed Claude/local asset composition specialist | Inspect included Kenney Modern City and Urban packs first; depot parking, one-square stop and four-view bus candidates; editable source, dimensions and clearance overlays; user selection before adoption |
| Integration, emergency and performance verification | Lead Codex plus independent test reviewer | Direction edits/closure during every bus phase, real responders and passenger outcomes, gateway return, corruption recovery, frozen desktop/narrow benchmark |

These are recommended implementation assignments, not claims these external clients have been dispatched. This document itself is the delegated Codex bus-design deliverable.

Minimum regression scenarios: disconnected near stop; legal loop with illegal return; opposite-curb stop; full bus/seat reuse; full store shared by cars and riders; two buses arriving together; bus dwell blocks a following car; closure during walking/boarding/riding/visiting/return; route reversal; depot removal with deployed bus; stop removal with waiting/onboard passengers; completed reward then reload; denied arrival at full gateway service; crash with onboard riders and real rescue/deadline; same demand with fewer cars but equal/increased completed returns; increased households/visitors without starvation. Preserve both sandbox and challenge save isolation.

Proposed reusable lesson for lead review: multi-passenger vehicles require separating the moving vehicle from the journey that owns service credit; measure travelers served and vehicle occupancy independently. This is a design hypothesis until implementation evidence exists.
