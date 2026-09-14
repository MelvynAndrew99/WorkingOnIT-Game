# First congestion-aware routing slice

Implemented locally on 2026-09-09. This delivers civilian weighted route selection and bounded optional rerouting (J1/J2), followed by J3 emergency weighted routing. J4 cost explanations, J5 comparative mission, and variations remain later work.

## Behavior

`cityRouting.ts` builds a detached, revisioned snapshot and uses stable binary-heap Dijkstra. Costs are estimated seconds: travel at the car's speed, sustained directional queue holds capped at 12 seconds, and an entry-only control estimate (stop 0.8 seconds, signal 3 seconds). A measured hold includes control delay, so only its excess is added. Parked visitors and service vehicles are not civilian queue samples. Old one-point stranded vehicles conservatively affect every approach. These are current sustained-hold observations, not historical averages or forecasts; empty observations do not prove free flow.

Destination/capacity selection is unchanged. Once selected, household and external departures and real home/gateway returns use weighted legal routes. Missing roads, civilian closures, and wrecks are excluded. Existing blocked-road planning remains available solely to preserve visible pending journeys when no open outbound path exists; movement still stops them before an obstruction.

Optional active-trip queries share one snapshot per traffic tick, with at most two queries per tick, stable ID-staggered initial due times, an eight-second cooldown, and savings of at least two seconds and 20 percent. A due request retains its route until it can be evaluated. Periodic reevaluation discovers added roads even while traffic moves. Moving vehicles do not rewrite committed junction routes. Sustained stopped cars can reconsider a junction, back up within their already-owned tile, and commit only through the existing lane/junction reservation checks. Mandatory obstruction recovery remains separate and is not delayed by the optional query budget.

Only the optional next-query timestamp persists, with backward-compatible validation. Costs and snapshots rebuild from the loaded city. Existing legacy roundtrips retain their prior behavior. The J3 addition below updates service route selection. No emergency passing, parking, work, replacement, or return-admission check is bypassed.

## Verification

- 224 model tests pass, including seven new routing tests: longer clear routes, opposing-lane independence, deterministic queries, hard constraints, control-cost accounting, departure choice, actual visit/return completion, exact reload continuation, cooldown validation, signal stability, and optional-query budget/fairness.
- Existing stalled/new-bypass, no-alternative reverse-loop, EMS/police/fire response, scene parking, replacement, tutorial, capacity, legacy-save and return tests pass.
- Production TypeScript/Vite build passes. Existing large-bundle advisory remains.
- Chromium at 390 and 1440 pixels: actual weighted departure, same destination and road count after local save reload, historical save sentinel preserved, no page errors or horizontal overflow.
- Browser query benchmark: parsed 32×32 dense road save, 100 endpoint queries. Snapshot 2.6–2.7 ms, median query 1.5 ms, p95 4.6–5.0 ms on this workstation. These are desktop measurements at two viewport sizes, not physical-phone performance or a loaded-town frame-time guarantee.

## Limits

The optional query budget does not cap mandatory recovery or departure queries. No historical delay smoothing, spillback forecast, cost-history inspector, global signal automation is delivered. A short measurement snapshot can overestimate a queue about to clear; hysteresis limits adoption but cannot prove optimal travel. Physical phone performance and equal-demand mission balance remain to measure. No mockups or scenario/art variations were made.


## J3 emergency weighted routing

Active police, EMS and fire responses use the same weighted graph for dispatch, available replacement selection, patrol reassignment, obstruction recovery and optional rerouting. Searches compare legal scene approaches by estimated seconds rather than tile count. Response snapshots allow civilian diversions and omit stop/red delay because existing response movement can enter a clear controlled junction. They include current directional holds from civilian and service vehicles, exclude the querying responder and off-road parked crews, and keep active wrecks and missing roads impassable. This is an estimate of observed occupancy, not a guarantee that a passing lane or merge will be available.

Optional response requests run first, with at most two vehicle requests per tick (up to four approach searches per request). Two separate ordinary requests remain available every tick. Due-time ordering, stable ID ties, the existing eight-second cooldown and meaningful-savings threshold apply. Committed passes and moving junction reservations retain their routes. Existing gradual reversal and route-commit admission remain authoritative. Mandatory recovery and dispatch queries are outside this optional budget.

Routine service returns use ordinary speed, closure and control costs, including when departing scene parking. Patrols retain their radius-constrained routine routes. Neither service appearance nor a completed incident grants return-driving privileges. Assignments, completed work, parked merges, cancellation/replacement state and actual return vehicles remain intact. No new save fields or migration are needed; existing optional query timestamps persist and costs rebuild after load.

Verification: all **232 model tests** and the production TypeScript/Vite build pass. Eight J3 regressions cover each service taking a longer clear route and actually completing work/return after exact reload continuation, response versus return constraints, service occupancy samples, optional replanning without a position jump, alternate scene approach selection, and ordinary query/movement progress under repeated response requests. Existing emergency passing/merging, shared-scene clearance, replacement, legacy saves, civilian controls/fairness and tutorial tests remain green.

Chromium at 390 and 1440 pixels verified real simultaneous three-service assignments at fractional progress, local save/reload preserving those assignments and geometry, rescued outcome, all scene work, every original crew home, three civilian completed roundtrips, historical save sentinel preservation and no page errors or horizontal overflow. Browser fixture and logs are retained in this folder. These workstation viewport checks do not establish physical-phone performance or recovery of the user's inaccessible personal save. The existing large production bundle advisory remains.

Release: authorized upload succeeded as RUN **1.7.6** for existing game `l7mD5BHH8LslWkr5mC7d`, with public publication requested. Post-upload tags confirm private/review1.7.6 and public1.7.5. The new build awaits platform review; hosted1.7.6 gameplay has not been verified. Existing uncommitted work was preserved and included in the accumulated build. No mockups or variations were created.
