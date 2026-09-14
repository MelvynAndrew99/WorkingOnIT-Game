# Two-tile four-lane roads

Status: design agreed and implementation authorized September 11, 2026. [Local delivery, verification and selected defaults](FOUR-LANE-IMPLEMENTED.md) supersedes design-only status; proposals below remain distinguishable from the implemented scope.

## Agreed direction

The user selected a road two tiles wide, with two lanes in each direction, built on paired one-way carriageways and presented as one road. Keep the existing vehicle scale. Extra land is a meaningful optimization cost: buildings may need moving or demolition. This does not yet select a relocation mechanic or its price. Increased traffic volume needs balancing against actual service, junctions and downstream capacity.

Connections to existing roads are required parts of the design. Two-to-four-lane transitions need dedicated graphics and physical movement rules; wide intersections need different graphics and simulation behavior. This is not a sprite-only capacity upgrade.

Latest placement decision: use the existing select-tool-and-place interaction familiar from Stops/Lights. Select the ordinary or wide road type, then place directly on empty land or over existing roads when the complete footprint fits. No separate stretch-selection/choose-widening-side workflow. The placement preview determines which two tiles are occupied, including required connection space, and highlights obstructions. New wide roads can be built from the start. The user called this a “2 lane button”; because the discussed road has two lanes per direction/four total, the proposed labels are “2-lane road” for the existing road and “4-lane road” for the wide road. Exact labels remain a UI proposal.

## Proposed connection contract

| Connection | Appearance | Movement |
| --- | --- | --- |
| Ordinary road to wide road | Visible taper, centre-line shift and lane split/merge; rotated and mirrored for either widening side | One incoming lane feeds two; two outgoing lanes merge into one before entering the ordinary road. Reserve the actual merging space and give both queues a fair opportunity. |
| Ordinary side street meeting wide road | One visually continuous T or crossing spanning both carriageways | Explicit paths across the near carriageway to the far one. Never treat the halves as unrelated junctions with an uncontrolled waiting space between them. |
| Wide road meeting wide road | One 2×2 intersection, shared stop lines and coherent controls | Lane-specific movements, compatible simultaneous traffic, and clear downstream space before entry. Traffic in the junction must be able to finish clearing. |
| Wide bend | Continuous inner and outer lane markings | Preserve lane identity through the bend, with physical swept-space checks. Do not force every bend into one lane. |
| Building entrance or bus stop | Access on the outside curb | Join/leave the adjacent carriageway safely. Opposite-direction access uses a legal junction/turnaround; no invisible crossing of the centre line. |

An ordinary-road crossing through a straight wide road occupies a nominal 2×1 junction core (rotated as needed); a wide-wide crossing occupies 2×2. These are junction cores, not promises that tapers, turning paths or approach queues fit inside those footprints. Exact taper length and turn geometry require a drawn movement prototype before being selected.

Widening one side offsets the road centre by half a tile. Transition art and vehicle paths must agree on that offset. Preview every tile required by both the widened section and its end transitions. A transition cannot silently consume an occupied building tile or overlap a nearby intersection. For the first implementation, reject combinations without a supported connection shape and explain the missing space; short sections and transitions immediately beside junctions need explicit handling.

Proposed starting policy: median crossings only at junctions and explicitly supported end treatments; no arbitrary midblock U-turns. A wide dead end needs a designed turnaround or an explicit unsupported-placement message. Existing one-way road connections must preserve their directed entries/exits. Existing roundabout controls/yields must not classify the linked halves as an accidental ring.

## Source findings and implementation shape

`src/game/cityTraffic.ts` already provides two physical lanes on directed roads, reserved lane changes, and merges before a second lane ends. However, `slotAt` identifies conflicts per tile, and `laneContinuation` depends on subsequent merge space. Simply placing two directed roads beside one another does not provide a shared wide junction. Buses currently skip ordinary lane-changing logic; their curb-lane behavior and passing traffic need explicit verification on wide roads.

`tools/build-city-atlas.mjs` builds ordinary roads from neighbor masks and Kenney surface/marking pieces. Wide-road topology must drive separate graphic variants; adjacency alone cannot distinguish a median from a street connection. Reuse the included Kenney material first, compose dedicated transition/junction variants, and author only missing pieces after inspecting the packs.

Proposed saved structure: link the two carriageways with road-section identity, orientation and footprint; describe transition and junction membership explicitly. Retain grid occupancy and the existing lane machinery where applicable. Cache legal connections and junction movement paths when roads change. Routing and physical movement must consult the same connections. Junction clearance reservations prevent blocking midway across, while existing safety rules still govern conflicting approaches; widening must not grant blanket crash immunity.

Treat both halves as one placement/edit. With the road tool selected, preview its footprint at the pointer/tapped position, transitions, cost and affected entrances/stops. Placement on empty land creates a new road; placement over an existing road requests conversion if the extra space is available. The preview, rather than a separate widening-side menu, identifies the occupied pair. Resolve obstructing buildings through explicit player actions. Drain traffic and preserve passengers, incidents and committed movement before conversion. Direct placement is the requested input interaction; it does not yet cancel the earlier short physical roadworks/temporary detour direction, including no responder entry during excavation. Construction time, costs and cancellation/refund values remain unsettled. Old towns retain ordinary roads and unchanged saves until deliberately upgraded. Narrowing a wide road back to an ordinary road requires explicit footprint/access and traffic handling before support is promised.

## Balance and validation plan

Widening should provide more usable parallel movement and queue storage, without guaranteeing twice the completed journeys. Narrow exits, turning conflicts and full destinations remain constraints. Do not raise town demand automatically to erase a successful improvement or award service merely for driving on a wide road.

First prove one straight wide section between ordinary roads, with both widening sides and all rotations. Then cover narrow-wide T/crossings, wide-wide T/crossings, bends, curb access and bus stops. Validate real outward/return trips, safe fair merges, downstream blockage, opposing turns, responders, incidents, saved in-progress movement, edit rejection and recovery. Compare completed service at identical demand when balance testing is authorized. Include a case where widening helps and a case where the downstream bottleneck limits it.

UI verification uses desktop and narrow. Performance measurements run only on explicit request. No mission edits, active player-save edits or publication are part of this design pass.

## Actual Grok review and lead assessment

The installed Grok client completed a [general design review](four-lane-grok-review.txt) and, after the user's explicit gameplay/balance clarification, a [focused gameplay review](four-lane-grok-gameplay-review.txt). Inputs are retained in [general brief](four-lane-grok-brief.txt) and [gameplay brief](four-lane-grok-gameplay-brief.txt). These are text-only reviews with tools, web and subagents disabled; Grok did not inspect or test the running game.

Grok supports the footprint and direct placement. Its strongest gameplay recommendation is that widening must visibly improve useful service when the road is the bottleneck, while explaining when the constraint is a junction, narrow exit or full destination. Keep free-flow speed equal initially so widening buys parallel movement, not a universal speed advantage. Let signal timing win for phase allocation problems, parallel routes for separated flows, and bypasses for through traffic around valuable frontage. Land cost already makes the choice consequential. These remain recommendations, not implemented balance.

The focused brief explicitly explained that representative bus riders do not remove car demand. Grok correctly treats buses as a service alternative only where linked household journeys actually deliver service; visible rider counts cannot substantiate congestion relief.

Do not adopt Grok's speculative numerical targets as measured facts or agreed settings. It proposed new-road cost at 2.5–3 times ordinary road and conversion at 1.5 times the entire new-wide-road cost, plus a 1.3–1.6 throughput ratio. The lead recommends leaving prices open: the conversion premium may over-penalize existing towns on top of land loss and downtime. Likewise, do not artificially cap throughput below double to meet a ratio; let physical lanes, junctions and fixed-demand scenarios establish the benefit. Same-speed lanes can yield different service gains by layout.

Corrections to proposed playtests: a wide stretch between unchanged narrow ends may mostly add queue storage, so it cannot be assumed to demonstrate sustained throughput gain. A positive case needs enough feeding traffic and receiving/dispersal capacity to make the original road the actual constraint. A full destination needs more destination capacity or useful alternative service; signals/bypasses alone cannot fix full service slots. Account for retained or rebuilt households/destinations when evaluating demolition, without requiring every legitimate redevelopment to lose. Temporary losses and eventual service recovery both matter.

Grok's refund/cancellation numbers, instant-conversion prototype suggestion, throughput targets and construction duration are proposals only. Existing no-responder-entry roadworks direction remains intact. No runtime changes or measurements were made for these reviews.
