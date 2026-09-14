# Local bus implementation

**Latest delivery:** [Representative rider queues, stays, returns and yellow stop occupancy dots](../bus-economics/IMPLEMENTED.md) now drive new bus admission. Existing linked journeys described below drain intact. The newer prototype has separate reward-free records; it does not claim real household service or fewer cars.

Implemented September 11, 2026, from BUS-01/BUS-02 and integration work packages. No publication or performance testing was performed in this task. Existing missions, challenge tool restrictions, and active player saves were not edited. Work was split between Codex foundation, UI and incident reviewers; this is not an installed Claude/Grok delivery.

## Playing

In Services, place a **Bus station** ($1,000, rotatable 3×3 occupied lot), then **Bus stops** ($50, exactly one off-road square). Rotate stops toward a straight existing road. A curb serves one travel direction; opposite service needs the opposite curb. Stops cannot occupy junction approach/exit space.

Tap the depot, buy a **bus** ($400, eight seats, maximum two per depot), choose stops by tapping them in travel order, then **Finish route → Start service**. The depot is the mandatory start/return and passenger interchange. The saved route repeats Depot → stops → Depot. The inspector replaces the tool shelf, keeping the interaction compact on desktop and narrow screens. Route identity is automatically the depot number with a shared transit accent; custom naming/colors and timetable menus are not included.

Buses visibly drive ordinary roads, respect directed paths and traffic controls, dwell in the curb lane, and show their actual occupancy. Parked fleet appears in its retained depot bays. Stops show waiting counts. Dwell is 1 second plus 0.25 seconds per boarding/alighting rider, capped at 4 seconds. Departures from a station are spaced by 12 simulation seconds. These prices/timings are provisional constants; there is no new fare or operating drain.

**Return to depot** stops new admissions while existing rider journeys finish. Route edits are staged until dependent riders return and buses reach their depot. Remove dependent buildings/stops only after journeys clear; return and sell the fleet before removing a depot. Disconnected service keeps physical vehicles, waiting riders, reservations and reasons instead of teleporting people.

## Journey and save behavior

The first successfully placed transit object explicitly activates nearby direct walking in that town. Existing towns without transit keep their old car behavior. Sidewalks use connected cardinal road adjacency, bidirectionally even beside one-way roads, with a six-tile access-leg limit and timed one-tile/second travel. Carriageway diversions leave sidewalks open; deleted sidewalk roads block/replan real walking. Placement shows connected walking paths, not circular geometric coverage.

A household has one active journey. Deterministic departure estimates compare cars, walking and usable transit; capacity or seats are reserved before a traveler leaves. Bus seat reservations identify a fleet vehicle, run and stop interval, allowing reuse on nonoverlapping segments. All modes share the existing store/park activity limits; UI distinguishes activity use from parked cars. Stay completion pays once, and service returns require physical home/gateway arrival. External arrivals use the existing opportunity clock and shared live-visitor cap, with no invented bus loads.

Versioned optional transit data includes fleet purchase receipts, ordered routes, pending edits, run/dwell/departure state and passenger ownership. Parsing rejects orphan/duplicate travelers, mismatched stops/endpoints, invalid timers, overcapacity, impossible seat ownership and lost onboard passengers through existing save recovery. Fleet and journey IDs share the city ID space. Flow, access diagnostics and earned service attribution understand genuine non-car visits/returns; car-arrival challenges remain car-specific.

Crashes freeze onboard journeys and preserve their receipts. Existing real responders/deadlines still apply. Incident outcomes are attributed to affected riders without multiplying fatalities by bus capacity. After scene clearance the bus physically returns; disrupted travelers walk out from its actual depot location, or stay visibly stranded until access is restored, without success credit.

## Verification

Functional tests cover complete household and gateway cycles with repeated reload, paid fleet/refunds, physical curb/dwell behavior, opposite-lane passage, two-bus spacing, mixed activity limits, full seats/nonoverlap reuse, closures, queued reversals, demolition guards, corruption rejection, real police/EMS clearance and incident recovery. A controlled four-household admission fixture completes all four returns in one shared bus versus four household cars. This proves traveler conservation and consolidation, not automatic mode-choice balance or general throughput superiority.

**357 assertion tests across 43 files pass**, with zero failures; see [model results](model-results.json). `npm test`, direct execution of every model test file, TypeScript and production build pass. Direct-file execution is retained because this environment's Node test subprocess wrapper can report file-level passes without emitting nested assertion counts. UI evidence covers desktop (1440) and narrow (390): pointer placement/rotation, depot inspection, ordered route editing, purchase/start, visible deployed minibus, and saved route/fleet reload with no browser page errors. See [UI results](ui-results.json), [desktop](desktop.png), [narrow](narrow.png), and [check script](ui-check.mjs). The UI script preserves its local test-environment paths and uses isolated browser storage/frozen source, not a player's active save.

Prototype visuals reuse existing Kenney architecture/materials with code-drawn compact bus/stop geometry. No new raster artwork was adopted. Larger coaches, transfers, per-person pedestrian sprites, user-selected production art, operating-cost tuning, and measured fleet/demand balance remain follow-ups. No CPU/FPS/frame-pacing measurements were run; those require a new user request.
