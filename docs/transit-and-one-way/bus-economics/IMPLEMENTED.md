# Representative bus riders delivered locally

September 11, 2026. Implements the agreed home/shop/park prototype on the existing BUS-01/02 fleet, route, traffic and save work. The later user request for yellow occupancy markers at stops is included. No publication, performance testing, mission edits or active player-save changes.

## Player behavior

- Each home uses its nearest usable stop within six connected road tiles. Walking works both ways beside a one-way road. A complete, physically usable route must connect that catchment to a different stop serving a shop or park.
- One opening request per served home, then one every 20 simulated seconds, with at most two unfinished requests per home. Saved home clocks prevent repeated opening demand on reload, restart or route duplication. All buses and routes share these limits.
- Real platform arrivals unload first, then board the oldest eligible waiting riders, up to eight total seats. Depot boarding happens on its off-road platform before departure. Roadside boarding retains the existing traffic obstruction and dwell formula.
- Shopping stays last five seconds; park stays last ten. Separate representative stay pools allow four/eight concurrent visitors, with excess arrivals waiting at the destination stop. Finished stays queue for the real return bus; requests complete at their origin stop.
- Bus labels show actual combined `n/8` loads. Stops and depots show waiting counts and the same yellow rounded visitor dots used by other buildings, capped at eight visible dots with the full numeric count retained. No new menu or pedestrian sprites.
- Broken roads preserve queues and onboard ownership. The inspector reports route blockage and homes with no useful service or overdue demand held by a cap. Return to depot stops admission, finishes existing round trips and parks the fleet. Pending edits wait for dependent trips; occupied buildings/stops cannot be demolished.

## Attribution and persistence

Representative passengers have separate saved records and onboard ownership from existing linked household/gateway journeys. A route drains those linked journeys before generating or boarding the new passengers. Existing direct walking/car demand continues; the representative riders do not remove cars or manufacture shopping payments, household returns, park benefits, mission credit, permits or extra fatalities. Capital prices remain depot $1,000 / stop $50 / bus $400, with no fare or upkeep.

Stable IDs, opening receipts, request clocks, stages, destination intent, queue times and stay timers persist. Validation checks shared IDs, ownership, eight-seat capacity, two-request household limits, destination stay bounds and `generated = active + completed + cancelled`. Corrupt state is rejected through existing save recovery. Deleting an unused home retains its small demand receipt so no existing ID can be reseeded.

A crashed bus keeps representative riders through scene clearance and its physical depot recovery. Only at that depot are disrupted tokens canceled explicitly; they never become successful trips or per-rider casualty credits. Existing responder rules remain intact.

The town admits at most 256 representative requests. It retains admitted trips when saturated. Catchment assignment uses one bounded multi-source road flood per simulated second, with stable stop-ID ties. No per-pedestrian movement or performance measurements were added.

Gateway abstraction remains a follow-on: existing admitted linked gateway riders finish, and normal gateway/walking/car opportunity logic stays intact. This prototype generates new representative demand only from homes toward shops/parks. Eventual household coupling and demonstrated car reduction remain separate work.

## Verification

Functional coverage includes physical loads and returns, all eight seats filled from four homes on a one-way road, shared demand clocks, twenty-second cadence, capacity saturation, disconnected sidewalks/roads, stopped service draining, pending route edits, legacy passenger coexistence, destination queueing, corruption rejection, and actual police/EMS crash clearance plus depot cancellation. The controlled representative-only fixture leaves money, household state, completion counts and service history unchanged.

[Model results](model-results.json) record 367 assertions across all 44 model files, followed by all 32 assertions in the four affected transit suites after the final depot-spacing fix (including its new regression). TypeScript and the production build pass. No profiling, benchmarks or FPS capture were run.

[Desktop/narrow UI results](ui-results.json) cover pointer route selection, buying/starting service, actual three-rider loads, three-rider return queues, completed trips, saved home clocks, reload and stopping service. Both layouts have no page errors. Screenshots: [desktop stop dots](stop-dots-desktop.png), [narrow stop dots](stop-dots-narrow.png), [loaded bus](loaded-desktop.png), [narrow inspector](panel-narrow.png).

The [UI check](ui-check.mjs) uses isolated local storage and a frozen local source copy. It advances the real bus/traffic model to representative states without profiling. Before reload it gives the isolated fixture's existing demand clocks a valid twenty-second departure hold, preventing fresh generation during the asynchronous browser reload; already traveling riders may still finish, with conservation checked. The player's town is never used or modified.
