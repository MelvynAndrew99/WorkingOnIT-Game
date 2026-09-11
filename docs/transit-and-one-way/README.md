# Buses, walking access and one-way roads

**Update:** one-way roads are now implemented locally; see [delivery and verification](IMPLEMENTED.md). The original design/assignment record below remains the plan for buses and signal coordination, which are not implemented yet.

September 11, 2026. User-requested design and delegation while the user authors the mission structure. This package specifies mechanics for both sandbox and challenges; it does not assign new mission numbers, change current maps, or publish a build.

## Confirmed brief

- A placeable bus station occupies land like other buildings and includes parking.
- Bus stops occupy exactly one square each.
- Buses physically share roads and hold up following traffic when serving stops. Useful transit should carry more travelers with fewer cars, rather than simply subtracting cars from the simulation.
- Neighborhood and shopping-district layout should make walking useful.
- Players can change road direction to build one-way streets and circular layouts. The supplied example removes the center of an intersection and adds the four corner road tiles to make a ring.
- Existing road graphics remain; add readable flow-direction markings.
- Dense one-way street networks should support later lessons in coordinating signals across multiple intersections.
- Smooth frame pacing remains the primary constraint. Preserve the supplied town and use isolated copies for experiments.

## Design decisions for the first implementation

Build directed-road support first, while bus journey modeling and artwork preparation proceed independently. Buses will then use the same legal road transitions as other ordinary traffic. One-way roads are a distinct tool from the previously planned widening/roadworks system; they need no added lanes or new road textures. Construction downtime for widening remains separately planned. The direction-edit design must explicitly protect vehicles already occupying an edited road.

Use a physical station with bus storage bays and a single-square roadside stop on adjacent land, with a selected boarding side. These are lead proposals: exact station dimensions, bay count, vehicle capacity, prices, walking distance and dwell times are provisional in the detailed designs. Stops should serve buses in the road lane, making the stop location a genuine queue-management choice. The station is a depot and passenger interchange; private-car park-and-ride is a later extension, not an implicit extra system.

Represent a traveler journey independently of its vehicle. The current simulation has one car per household and its destination slots combine parking and service capacity (`cityVisits.ts`). Simply placing several households into a car-shaped bus would otherwise duplicate rewards, consume the wrong parking capacity and lose return-trip attribution. Preserve the current household-trip unit initially and label it honestly; literal population growth needs a separate explicit population model. Split destination service capacity from car parking before claiming walkers or riders can use spare service capacity without parking.

Require connected walking access, useful bus service and a valid return itinerary. A painted catchment circle alone does not connect people through buildings or across arbitrary traffic lanes. Include walk-only trips as part of this access foundation so a nearby shop can be useful without a bus ride. Mode choice occurs before departure; existing cars never vanish because a station was built. Growth can increase demand in later authored scenarios, but transit placement does not secretly raise demand or grant instant completed visits.

A one-way ring and roundabout entry priority are separate mechanics. Verify that the pictured small ring actually admits and clears traffic under the junction-area/occupancy rules; do not ship a cosmetic circle that is treated as one locked intersection. The detailed design specifies the entry-priority dependency and acceptance fixtures. More lanes and high-speed roundabout geometry are outside this first slice.

## Delegated work and delivery contracts

Three Codex design agents were launched for this request. These are actual design delegations, not installed Claude/Grok reviews. Runtime assignments below are prepared work packages; they have not been launched as implementation jobs.

| Package | Design owner / document | Implementation ownership and handoff |
| --- | --- | --- |
| OW-01: directed network and physical travel | `one_way_design` — [one-way design](ONE-WAY-DESIGN.md) | Simulation owner: direction schema, shared traversal predicate, path caches, save parser and occupied-road edits. Handoff is passing directed-route/movement/reload tests before UI integration. |
| OW-02: ring behavior and controls | `one_way_design` | Simulation owner: small ring, independent junction admission, entry priority, emergency access and safe service. UI owner: direction painting/preview and clear flow arrows. Lead integrates both. |
| SIG-01: coordinated lights | `one_way_design` | Traffic owner: saved phase offsets with compatible cycle lengths; UI owner: selected-junction timing and corridor preview. Separate acceptance from basic one-way delivery. |
| BUS-01: traveler and walking foundation | `bus_design` — [bus design](BUS-DESIGN.md) | Simulation owner: mode-independent journeys, walk-only/access legs, service versus parking reservations, exact rewards/returns and old-save compatibility. |
| BUS-02: station, stops and service | `bus_design` | Transit owner: placement, fleet, ordered routes, passenger boarding, lane-blocking dwell, disrupted service and saved recovery. Uses OW-01 traversal contract and BUS-01 identities. |
| ART-01: inventory and asset contract | `transit_art` — [art handoff](ART-HANDOFF.md) | Art/UI owner: reuse inspected Kenney pieces, author only missing station/stop/bus views, then atlas and placement previews. Keep logical footprints independent of pixels. |
| VERIFY-01: integration and performance | Lead Codex | Isolated supplied-town variants, passenger conservation, live ring and bus interactions, old-save preservation, desktop/narrow frame pacing and final review. |

Do not have multiple implementation owners edit `cityModel.ts`, `cityTraffic.ts` or `cityScene.ts` concurrently without explicit file-level coordination. New focused modules can be developed independently; lead integrates shared schemas and mutation boundaries. Art can proceed against agreed dimensions without blocking model tests.

## Delivery sequence and acceptance gates

1. **One-way vertical slice:** player can set, reverse and restore direction; ordinary trips and returns honor it; arrows show actual rules. Verify bends, junction entries/exits, impossible routes, active-trip edits, emergency behavior and reload. No duplicate lane capacity is inferred from the existing two-way rendering.
2. **Playable ring:** reconstruct the pictured ring in an isolated fixture and on a copy of the benchmark town. Demonstrate real arrivals and returns from every connected arm, visible yielding, queue recovery and responder access. Report any nearby building access affected by the layout. Keep the player's original roads/save untouched.
3. **Transit vertical slice:** place station, two or more stops and a working route; observe walk → wait → board → drive → alight → visit → return. Dwell blocks following traffic; full buses leave waiting riders visible in the data/UI; a broken route retains their journeys. Compare the same demand with cars, transit and nearby walk-only access.
4. **Growth and coordinated corridors:** test explicit higher-demand fixtures with more completed traveler visits and fewer car movements; separate this result from automatic population growth. Demonstrate saved signal offsets across several junctions and check side-street service, rather than only observing a green main road.

Each runtime gate requires meaningful model regressions, `npm test` and `npm run build` inside Nix, followed by desktop and narrow interaction checks for its UI. For performance use [the supplied-town benchmark](../performance-review/player-town/README.md), same machine/browser/render settings and a frozen source snapshot. Record frame intervals/FPS and p95/p99 alongside simulation time, route-query work, active vehicles and waiting travelers. Compare unchanged old-town behavior separately from deliberately changed ring/transit fixtures. Do not claim current software-rendered desktop measurements prove smoothness on the user's device.

## Scope and status

This is a design delivery. Detailed documents identify code seams, defaults and test obligations; their proposed types and numbers are not implemented behavior or user-selected balance. No bus art, runtime features, mission edits, player-save changes or publication are delivered by this package. The user's mission plan remains pending and will select where these tools are taught and unlocked.
