# Skipping and moving bus stops — September 12, 2026

## Delivered locally after the diagnosis

User selected automatic skipping with traffic-risk-style notices, then requested passenger wait times instead of map IDs and rejected verbose/cluttered labels. The implementation now:

- Selects the next reachable valid curb in the existing route order, returning to the depot at the end of a run. Buses already approaching an invalid stop reconsider at physical tile boundaries through existing lane/occupancy checks. Genuine road blockage still requires a physical way out.
- Retains passengers waiting at skipped stops and those already aboard for skipped destinations. Working stops continue serving demand. Skipping does not complete a journey, discard a rider, or grant money/mission credit.
- Shows a persistent “bus stop cannot be served · Show” warning, a compact map marker, and a selected-stop explanation with Move stop. The depot and internal route IDs remain stable.
- Shows the oldest current queue time at a stop and `load/8 · seconds` on a bus. The bus time is the maximum queue-plus-ride time of current representative passengers on that leg, excluding destination stays. Legacy linked riders contribute their recorded wait to stop inspection; legacy onboard elapsed time is not invented. Values are sampled at the existing half-second HUD report using saved timestamps. No passenger timer state or time-display path queries were added.
- Moves a stop for no charge, preserving ID, paid amount, route order, passengers and wait timestamps. Choose an empty legal roadside square within six connected tiles of the old curb. The bus must first clear the platform/approach. Existing riders can finish with a saved, bounded twelve-tile walking allowance after a move; new demand still uses six tiles. Linked walkers preserve fractional position and physically follow the new sidewalk path. Invalid moves are atomic.

The copied user town now releases both buses within five simulated seconds without changing a road. Its invalid stop can be moved from (-2,8) to (-2,7), preserving its six waiting riders and current onboard riders. This verifies removal of the reported blocker, not universal congestion-free operation.

Validation: the full 52 model-test-file suite passed; focused tests cover original-town skip/move/reload, in-flight invalidation, atomic rejection, linked walking/boarding preservation and timestamp semantics. Desktop 1440×900 and narrow 390×900 browser checks exercised the actual warning, inspection, move preview, Cancel and map relocation with isolated browser storage. Screenshots and results are in `evidence/`. Typecheck and the production build also pass.

No active player save edits, publication, happiness/economy penalties, or performance measurements. This supersedes the diagnosis-only/no-runtime-change status below. The original city capture remains preserved.

## Original diagnosis

The supplied city passes `parseCity`. Bus 14934 is at stop 14749, curb (6,18), with four representative riders, dwell zero and phase `bus-dwell`. Bus 15013 is in its depot. Both remain held after 60 simulated seconds.

Route 14981 is running but blocked by stop 14813 at (-2,8), curb (-1,8). The adjoining road at (-1,9) has a west branch at (-2,9), failing `busStopIssue`'s requirement that the curb and both neighboring road tiles each have exactly two road neighbors. `dispatch` validates the entire circuit before every departure, so a different stop's invalid geometry holds the bus at its current stop and prevents depot departures. This is not an unfinished boarding timer.

In a separate clone, the actual bulldozer action at (-2,9) removes both carriageways of the paired wide section for a $40 refund. Route validation then passes; after save/reload, both buses physically move within five simulated seconds, preserving buildings and claimed rewards. This verifies removal of this particular blocker, not congestion-free operation of the whole town. Directly removing only the single road tile was an initial diagnostic probe, not the final player-tool reproduction.

Run from the repository root:

```sh
node --experimental-strip-types src/game/cityBusStops.test.ts
```

The city-only capture is retained here; the original attachment remains untouched. No runtime change, active browser/save modification, publication or performance measurement. User asked for an explanation; junction-adjacent stop support and better feedback remain possible follow-up changes.

The `reproduce.mjs` script now checks the corrected behavior; the original 60-second standstill is documented above.
