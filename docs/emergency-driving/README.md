# Emergency vehicles and priority driving

September 9 follow-up: [emergency recovery](../emergency-recovery/README.md) supersedes the six-tile cap and adds outbound diversion access, saved waiting lanes and alternate scene approaches. Details below record the initial driving slice.

Implemented September 9, 2026 after user approval. Vehicle artwork was separately shown and explicitly selected; see [approved sprites and editable source](../artwork/service-vehicles/README.md).

## In play

- Police, EMS and fire use distinct patrol-car, ambulance and fire-engine sprites with four fixed-camera views.
- Outbound responders travel at 3 tiles/s and can cross red lights or stop signs when the intersection and exit are clear. Stations on controlled junctions can dispatch without waiting for green when the space is clear.
- Responders can pass a queue in the opposing lane, including straight through an empty controlled junction. They reserve the whole maneuver before moving sideways, including a safe merge and every adjoining junction tile.
- Other drivers yield to conflicting emergency approaches and hold their lane while being passed. Cars already clearing a junction and same-direction lead traffic keep moving to make space.
- Returning crews use normal speed (2 tiles/s), traffic rules and lane, with response flashing switched off. Scene work retains flashing lights.
- The renderer follows the simulation's persisted lateral position. Amber service labels identify a pass; labels remain above the vehicle artwork.

## Deliberate limits

Passing currently requires a straight corridor of at most six tiles. Lane changes take 0.4 seconds at the start and merge tiles. These are provisional implementation defaults, not user-selected balance. This is not unrestricted overtaking around corners or through arbitrarily long queues. Occupied opposing lanes, blocked exits and working crews still delay a response.

Both lanes at the start and merge are reserved; the opposing lane is held through the queue. Crossed junction areas are exclusive. Conflicting closures, demolition and nearby new road connections briefly wait until the committed maneuver finishes. Other road edits remain available and responders reroute afterward if needed.

No new tutorial, audio, payment system or outside traffic was added. The existing station dispatch, scene work, emergency outcomes and city saves remain in use. The new optional `Trip.emergencyPass` stores corridor indices, stage and lateral shift; older saves omit it. Parsing validates corridor geometry and reservations instead of silently resetting lane position.

## Verification

- `nix develop -c npm test`: 102 tests pass, including fifteen independent [emergency safety checks](../../src/game/cityEmergencySafety.test.ts).
- Tests check actual tile/lane bodies every tick, real red-light queue passing before green, oncoming traffic, opposing responders, junction exits, same-direction lead progress, all three saved passing stages, corrupted state, and protected edits through adjoining junction areas.
- Production build passes. Browser checks at 390×844 and 1440×900 verify twelve dedicated textures, exact paused mid-shift boot/reload, resumed opposing-lane driving, arrival while the queue remains at red, and all three real service dispatches.
- [Phone passing](in-game-390-opposing-lane.png), [phone service vehicles](in-game-390-all-services.png), and [desktop arrival](in-game-1440-arrived-on-red.png) use the actual game renderer.

Run [browser-check.mjs](browser-check.mjs) against local Vite with `CITY_URL`, `CITY_PLAYWRIGHT_MODULE` and `CITY_CHROMIUM_PATH` overrides as needed. The script uses isolated browser contexts and leaves the developer's saved town untouched. It resolves mounted module URLs to avoid duplicate Vite state instances after hot reload.

Physical-device performance and player recognition remain unmeasured. Passing reservations are deliberately conservative; larger vehicle bodies, longer queues and curved passing need their own occupancy design and acceptance checks.
