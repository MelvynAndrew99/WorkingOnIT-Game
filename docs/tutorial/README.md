# Guided traffic tutorial and outside-city connection

## September 9 follow-up: Practice retired

The Practice button, expanded placement action and runtime district builder have been removed. Old practice construction and saved learning/payment receipts remain. Teaching now supports the player's controlled crossing and real bypass without a practice flag. See [implementation and verification](../practice-removal/README.md). Mayor Help/Later proposals remain queued. Prior descriptions of available practice placement below are historical.

Implemented locally September 9, 2026. Open the guidance button, then Tutorial. New towns start with active guidance; existing saves are offered an optional tutorial. Skip tutorial is available from the title menu and from lessons. Growth missions remain on a separate page of the same dialog.

Seven lessons cover a completed shopping visit, parked leisure visits/capacity, autonomous driver rules, junction controls, conflicting-traffic accidents, emergency crews and detours. Every construction tool stays available. Lessons observe real state and persist progress; completing a lesson never replaces the player's town or silently opens outside traffic.

Optional free solutions use the ordinary placement rules on a detached copy of the city. They add a starter example or isolated practice district in vacant land, expanding only when needed, and commit only if every placement succeeds. Existing construction and funds are preserved. Assistance is recorded per lesson and cannot be repeatedly collected by demolishing its example. Free buildings retain the normal construction-refund rule; the finite one-time grants are intentionally generous tutorial help.

The practice district supplies actual households and destination demand. Conflicting claims at its unsigned crossing accumulate a warning and generate ordinary minor, serious and fire incidents. The first active incident pauses gameplay and opens the guide. Police, Clinic and Fire stations dispatch through the real roads and lanes, perform their respective work, then return. Deadlines and rescue outcomes remain real; pausing freezes simulation time. A safe-crossing acknowledgement lets players keep preventive controls instead of undoing their work to produce a crash. It acknowledges the emergency explanation without inventing rescue statistics.

The free emergency solution precedes the bypass example: changing the roads or controlling a crossing can legitimately prevent the later collision demonstration. The final bypass provides a route around the crossing and adds controls. Players can instead build their own service access, route or preventive controls. Exact scenario timing is provisional, not a human pacing target.

## Autonomous traffic and main-game transition

Household drivers generate shopping/leisure needs, choose reachable destinations with visitor capacity, queue at junctions, park, return home and reroute around closures or wrecks. Responders have dispatch, outbound priority driving, scene work and normal return states. These systems already existed; the tutorial now exposes and teaches them.

Connecting outside traffic is explicit: build a road to a map edge and choose it in the tutorial/connection panel. Access opens after a home and store, or immediately after skipping. Existing tools are available equally in either path. The selected gateway remains at its saved coordinates when land expands; it is marked CITY on the map. Connecting preserves the town and ends active tutorial guidance. Reviewing lessons later does not disconnect an existing gateway.

Outside visitors use the same routing, occupancy, visitor reservations, parked stays, income and collision systems. Their origin is a gateway, never an invisible household. Provisional arrivals occur every max(4, 12 - homes) seconds, with at most min(16, 2 + homes + destinations) active visitors. Closed/blocked gateways or full/unreachable destinations miss arrivals rather than accumulating a hidden backlog. Scaling depends on town growth, not player skill or a demand to cause accidents. Road removal can leave visitors waiting in real positions until access returns. Shopping pays once per completed stay; outside leisure does not invent household tax benefits.

## Validation

135 simulation tests pass, including 24 new tests for tutorial progress/free assistance, real warning/collision/rescue/bypass sequencing, external visits, capacity, blocked routes, exactly-once payment and save continuation. The default assisted lesson sequence completes with actual trips and all required crews, preserving original construction and funds, with no fatalities in the measured fixture. The natural practice warning appears at 6.85 simulation seconds and the first minor collision at 38.375 seconds in its isolated fixture; player edits and other traffic can change that timing.

TypeScript and production build pass. Browser checks passed at 320×640, 390×844 and 1440×900: free help, both skip paths, saved explicit connection, real outside arrivals and first natural crash pause/guide. Guide buttons meet 44px targets, text meets 17.6px, with no horizontal overflow or page errors. Screenshots and browser-check.mjs are alongside this file. Physical-device comfort and player pacing still need playtesting. Future bus stops, wider roads, one-way roads, further architecture/customization and efficiency missions are not implemented by this slice. No new artwork was adopted.

Free rescue assistance is a worked example in the practice district; incidents elsewhere still require crews and road access in their own part of town. A newly placed control cannot claim the safe-crossing alternative while its practice wreck is active. The final safety-acknowledgement guard is covered by a real-incident regression after the full browser pass. This update is local and has not been uploaded to RUN.

## Latest economy correction

The free worked-solution controls described historically above are superseded. The tutorial now uses ordinary player placement with automatic, finite cost waivers after60 simulated seconds of stalled objective progress. New towns start with900 and earn visit revenue; existing funds are preserved. No Free Help button or acceptance step is required. Practice districts remain optional real-traffic teaching scenarios. New paid/free provenance prevents zero-cost construction from generating demolition refunds. See docs/economy-rework/contract.md and its reviewed ownership correction.
