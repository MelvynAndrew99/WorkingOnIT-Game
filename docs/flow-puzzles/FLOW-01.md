# FLOW-01: useful service through a shared approach

Implemented locally September 10, 2026. No publication. This delivers the demand/measurement foundation and reproducible model prototype. Current-objective integration and visible Flow feedback remain FLOW-02; observed fun remains FLOW-03. No new scenario is inserted into a player's town.

## Reproduce

From the repository root:

```sh
nix develop -c node --experimental-strip-types docs/flow-puzzles/prototype.mjs
nix develop -c npm test
nix develop -c npm run build
```

The first command reconstructs an isolated town, advances the real simulation, reloads the full queued city into independent comparisons, and writes [prototype-results.json](prototype-results.json). It does not access the browser, localStorage, RUN or a player save. [Fixture source](../../src/game/fixtures/flowTown.ts) checks every building and road placement succeeds. Its $10,000 construction wallet is test funding, not a new-game economy change.

Nine homes generate normal bounded shopping needs at the existing eight-second interval, with unchanged initial staggering, three-need cap and one car per home. There are six western homes and three northern homes. All initially use three stores east of the junction at (8,6). The signal favors north–south, giving too little green to the busier western approach. Every home can reach every store and get home; the test checks those paths. No outside traffic, parks, crashes, speed changes, invented vehicles or demand pulses are used in this comparison.

Warm up for 120 simulated seconds, clone/reload that queued save, then apply a solution. Allow another 60 seconds for committed trips and queues to respond, then measure 180 seconds. Each run keeps the same homes, starting needs, clocks and demand rules. Measurement duration is a developer observation interval, not a player failure timer.

## Demonstrated outcomes

| Same queued town | Completed shopping stays | Actual returns home | Fewest returns by any home | Waiting vehicle-seconds* | Longest sampled stop | Minimum spare slots* |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original NS timing | 47 | 46 | 3 | 553 | 15.725 s | 3 |
| Favor EW timing | 69 | 68 | 7 | 180 | 8.250 s | 3 |
| Two nearby stores | 96 | 93 | 7 | 314 | 14.750 s | 11 |

*Live quantities sampled once per simulated second. A waiting vehicle has stopped for at least two seconds, including a completed parked visit unable to leave. Completed stays and returns use actual simulation event timestamps. Visits and returns in a window need not match: some drivers began before the window or finish after it. Slot counts include inbound reservations, not just parked customers.

Both solutions improve returns by more than 40%, reduce measured waiting by more than 30%, and repeatedly serve every affected household. Every sampled comparison has zero homes waiting for capacity and zero homes without access. There are no incidents. At least three reachable store slots remain spare throughout sampled baseline operation; capacity is not the active restriction.

1. **Retiming:** tap the existing light once, changing NS to EW priority. This costs $0 and adds no road, building or land. Existing movement/control rules produce the improvement.
2. **Destination placement:** retain NS timing. Add a store at (6,7), rotation 2, entering the existing western approach at (7,6); add another at (0,1), entering (1,3), with roads at (0,3), (0,4), (0,5), (1,3). Normal prices apply. Future western trips can avoid the overloaded crossing. Existing cars retain their home, destination, purpose, path and fractional position at the moment of construction. No committed journey is reassigned to make the comparison succeed.

A preplanned EW layout, created with the same homes and demand, completes 72 returns in the measured 180 seconds and qualifies at every one-second observation. It needs no jam, intervention or escalating demand to be recognized. The preplanned nearby-store variant also improves service (83 returns); it exposes more variation around the provisional rolling threshold.

## Measurement contract

[cityFlow.ts](../../src/game/cityFlow.ts) exposes `flowSnapshot(city, targetHomes, purpose = 'shopping')`. It is read-only and does not award or revoke anything. FLOW-02 can use it alongside the existing diagnostics and mission system; there is no second mission system or new permanent job history.

- The caller holds a fixed positive household target for a comparison. The effective target cannot be smaller than the current home count. Deleting homes below the fixed target does not improve qualification. Replacement households can qualify through their own new service, without permanent dependence on a demolished ID. Future objective integration must persist the chosen target; do not recompute a smaller target after demolition.
- Reuse the existing bounded 60-second return history. Optional household/purpose, visit timestamp and departure timestamp attribute real local service. Old unlabelled returns remain valid historical traffic data but are not invented shopping evidence. History size and existing traffic HUD window remain unchanged.
- A stay counts only at the existing exactly-once completed-visit boundary. A return counts only at physical return arrival following an observed completed stay. Leisure, external cars, responders and pre-visit legacy trips cannot masquerade as new household shopping returns.
- Report every current household's visit/return count, outstanding need, current purpose, journey age, stopped duration and qualification. Completed-trip averages are accompanied by missing homes, homes with no returns, vehicles still waiting, and access/capacity/traffic counts. Unknown historical journey ages remain explicit and are omitted from duration averages.
- Check usable routes to a destination and home, plus the current car's committed goal. Full reachable destinations include inbound reservations. Cars stopped on usable routes are traffic-limited; parked customers with completed stays remain visible until they can merge and return.
- `pendingNeeds` uses existing capped household demand, including the need committed to an unfinished visit. It is not an infinite arrival backlog. The report integrates sampled outstanding needs and waiting rather than inferring success from low averages or an empty road.
- No samples means Measuring, not an automatic good grade. Prototype qualification requires two actual returns per current home within 60 simulated seconds, no access/capacity exclusion, no current stop above 20 seconds and no known unfinished journey above 60 seconds. These are unselected prototype parameters, not professional LOS values or permanent mission requirements.
- Pause makes no simulation progress. Queries have no wall-clock expiry, mutate no city data and cannot revoke existing mission, cash or land receipts. No new receipt is created by FLOW-01.

## Purpose audit and correction

Committed goals were already preserved by road replanning and new destination construction. The audit found a separate departure-choice bug: equally urgent shopping/leisure always preferred leisure. If a leisure trip lasted at least its demand refill interval, leisure became ready again before every subsequent departure and shopping could starve indefinitely.

Departure ties now alternate using optional saved `lastDeparturePurpose`. It changes only future departure choice after normal route/capacity/admission checks succeed. First-time behavior still tries leisure on the first equal-urgency tie. A missing/full destination still permits fallback to the other purpose, and the active tutorial's shopping emergency override remains. A regression reproduces the long-park-trip case and verifies both purposes keep completing across repeated full-city reloads. Existing towns gain no buildings, altered roads, automatic gateway or new tutorial stage.

## Verification

- **244/244 model tests passed**, including ten new FLOW-01 regressions. [Full output](evidence/model-tests.txt).
- **Production build and TypeScript passed.** Vite retains its large-chunk advisory. [Build output](evidence/production-build.txt).
- Same queued-save interventions, every household and approach, reachable spare capacity, per-purpose actual returns, successful foresight, full/blocked destinations, visible unserved households, fixed-target demolition/rebuilding, legacy and malformed ancillary attribution, history bounds, read-only observations and pause are covered.
- Reload matches complete city data and future trip/history continuation. Cash claims, land progression, tutorial, outside consent, payment provenance and geometry survive. Free retiming recovers with zero funds at maximum map bounds, without adding a building site or land; this is not a claim that every arbitrarily blocked full map is solvable without rearrangement.
- Existing diversion artwork/orientation and police/EMS recovery implementations were preserved. The saved police-junction jam and other emergency regressions remain in the passing full suite.
- No UI source changed, so no desktop/narrow browser screenshots were required or produced. No player town was modified and no build was published.

## Remaining balance and observed-fun questions

The comparison proves real movement and causal improvement, not enjoyment. No player observed or played this prototype. FLOW-03 still needs to show that a player notices the usable store capacity, identifies the approach restriction, chooses an alternative and enjoys watching traffic recover.

The nine-home target, two returns per minute and stop/age tolerances are provisional. The original layout qualifies on 40 of 180 individual observations, retiming on 165, and nearby destinations on 135. At the three sampled minute endpoints the baseline does not qualify; retiming qualifies at all three; destination placement qualifies at the last two. This is normal variation around a narrow rolling sample, and rules out shipping this raw Boolean as a flashing player grade or an established sustained-service balance. Do not manufacture failure when the original layout genuinely serves everyone in a sample. FLOW-02 should select stable feedback and decide how much sustained evidence earns a permanent existing-system receipt.

Outstanding shopping demand remains near its cap even with the improvements: the eight-second need refill is faster than many complete trips. This prototype therefore demonstrates fair repeated service and reduced waiting, not that every generated desire is immediately satisfied. Mixed shopping/leisure neighborhoods have fair purpose selection now, but their mission thresholds and outside-growth demand still need their own calibration. The store solution uses two stores and four road tiles; relative cost, space and readability versus free retiming remain playtest questions.
