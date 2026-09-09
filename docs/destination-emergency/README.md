# Destination visits and emergency recovery

This slice adds places worth traveling to and consequences for unsafe junctions. The user approved implementation; capacities, payouts, exposure thresholds, and rescue timing are provisional balance.

## Player controls

- Home, Store, Road and Remove retain their existing controls and full construction refunds.
- **Buildings** selects Park, Hospital, Fire station, or Police station. Rotate changes the footprint/entrance; artwork stays upright.
- **Closure** (Road closure, key 7) toggles a road's availability for new arrivals. Build a connected bypass to divert traffic; a closure alone cannot create a route. Existing occupants can leave.
- **City report** shows unmet shopping/recreation needs, completed visits, accident needs and rescue deadlines. Tap an existing building with a building tool to inspect its occupancy in the report.
- **Pause** freezes simulation timers while construction remains available. Reports do not automatically pause time.

Shops and parks reserve space for arrivals and parked visitors. A second shop serves overflow demand or offers better access; households do not have to tour every shop. Parked visitor markers appear on the plot and occupy no travel lane. Completed shopping pays once; recent recreation supports bounded household income.

Unsigned conflicting junction claims produce a local warning before a collision. Controls prevent this collision mechanism. A wreck blocks routing, so access roads and bypasses matter. Police recover minor crashes; serious crashes also need EMS, and burning crashes require fire crews too. Crews travel from their stations to reachable access beside the wreck, perform work, and return. EMS must arrive before the rescue deadline to save victims. Losing victims does not remove the blockage or end the town.

## Local verification

Run all npm commands inside `nix develop`. `npm test` exercises the simulation and `npm run build` checks types and bundles the game. `browser-check.mjs` exercises phone/desktop UI, save restoration, destination capacity and visits, and seeded emergency response. Deliberately seeded browser incidents do not prove the collision trigger; actual-conflict tests must cover that separately.

Browser dependencies are supplied via `CITY_PLAYWRIGHT_MODULE`, `CITY_CHROMIUM_PATH`, and `CITY_URL` rather than installing a second application runtime. Screenshots are local evidence, not published artifacts.

## Scope boundaries

This remains a traffic/construction sandbox. The expandable disconnected tutorial, skip flow, external-city connection, missions, density upgrades, weather and larger vehicle roster are subsequent work. Their foundation must preserve the player's town and use these real mechanics. No build was authorized for deployment or public publication.

Verified locally: 87 simulation/camera/integration tests, TypeScript and production build. Browser checks passed at 390×844, 320×640 and 1440×900, including real emergency dispatch and persistence. Existing controls, cold rendering and expansion/gesture checks pass. The smallest checked screen has 194px of playable map after compacting the HUD. Actual native-device performance and balance still need playtesting; the build reports its existing large-chunk advisory.

## Emergency driving update (2026-09-09)

Dedicated police/EMS/fire sprites, civilian yielding and reserved opposing-lane passing are now installed. See [driving behavior and verification](../emergency-driving/README.md). Routine returns use ordinary traffic rules. Passing still requires clear space and a safe merge; it does not erase road access constraints.
