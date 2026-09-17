# Recovery of the September 17, 13:11 supplied city

Loaded the supplied export through `parseCity` and replayed the current local model in isolation. This is functional gameplay diagnosis, not a performance benchmark or browser/FPS test. No runtime changes, active-save access or publication.

The city has 418 road tiles, 74 buildings, 72 trips, $2,443,300 and one active minor crash at (2,10). It is a newer town than the earlier 414-road performance fixture. Earlier local traffic/performance fixes are present.

## Tested player recovery

Pause traffic, install balanced **Lights** at **(10,10), (4,11), (12,18), (17,18)**, then toggle **Divert off at (2,-2)**. Resume traffic. These are four new controls ($300 total) and one free reopening. The harness applies these edits at the same paused simulation instant through `place`; no cars, incidents, funds or completed journeys are fabricated. Leave the other Divert at (2,9) as it is for this tested recipe.

[Marked location map](recovery-map.svg). [Optional export with only these edits, before advancing time](suggested-edits.json). The player's original is [preserved separately](original.json). The edited export is a convenience for manual import, not installed into the active town.

## Causes

1. **Northern bus exit cut by Divert.** Bus 21635 / trip 35662 sits at stop 21075 at (8,-5), in `bus-dwell`, with no usable onward leg. This stop serves westbound buses; their continuing loop runs through (2,-2), currently diverted. An immediate U-turn is not a legal bus departure. Bus 21634 queues behind, backing up cars through the north/south street at x=10 and onto the east/west street. Reopening (2,-2) releases the queue without moving or deleting vehicles.
2. **Repeated uncontrolled-crossing crashes.** Historical incidents and isolated replays identify (10,10), (4,11), (12,18) and (17,18). Merely releasing the bus queue feeds more traffic into these crossings. Lights address this second problem.
3. **The western rescue is delayed, not permanently deadlocked in this save.** Without edits the original crash clears after 33.125 simulated seconds. With the four-light recovery it clears after 32.15 seconds. This does not erase the earlier save's responder problems; the state is different.

## Controlled comparisons

Each starts from the same export and uses 0.025-second model steps. Three-minute results:

| Edits | New completed journeys (`city.completed`) | New crashes | Active incidents at end | Vehicles with hold >10s |
|---|---:|---:|---:|---:|
| None | 177 | 4 | 2 | 10 |
| Northern reopening only | 175 | 6 | 2 | 13 |
| First three lights only | 169 | 0 | 0 | 10 |
| Reopening + first three lights | 206 | 1 | 1 | 1 |
| Reopening + all four lights | 221 | 0 | 0 | 5 |

Stopped-count snapshots include ordinary queues and signal waits; they are not deadlock counts. Bus-dwell hold does not grow, so this metric omits the original stuck lead bus. Journey counts use the game's existing counter, not a count of distinct residents or bus boardings. The four-light result completes five abstract bus-rider journeys versus two in the unchanged run. A three-minute replay cannot guarantee zero future crashes or optimal throughput.

[Four initial comparisons](experiments.json), [four-light comparison](refined.json). Each final city successfully serializes and passes `parseCity`; the recovered northern bus route preview is valid. Original-route failures in other variants reflect their closure/incident state at the observation time.

## Five-minute recovery and reload check

The four-light plan was replayed for 300 simulated seconds, with a JSON save/reload at 60 seconds. Its first three checkpoints match the earlier four-light summary. At 240 seconds none of the original trip IDs remain; at 300 seconds there are **371 new completed journeys, 16 completed abstract bus-rider journeys, zero new crashes, zero active incidents and zero vehicles with hold >10 seconds**. The route preview is valid and the final save parses. This confirms recovery over the measured interval, not permanent immunity from congestion. [Extended evidence](extended.json), [final vehicle inspection](refined-final-debug.json).

## Gameplay refinements supported by this diagnosis

- **Explain a bus's actual departure blockage in Inspect.** `vehicleDebug` currently reports "At route endpoint" and stoppedSeconds=0 for this indefinitely stalled bus. The depot has a generic blocked-route message, but the vehicle itself does not identify the severed loop or responsible Divert. Track/report departure waiting separately from normal dwell and expose the failed onward leg.
- **Preview the effect of Divert on bus routes.** Before/after route diagnostics should identify a bus already at a stop losing every onward/depot path, with a focus action to the relevant closure. Preserve the player's ability to divert; do not invent U-turns or teleport buses.
- **Make recurrent crossing problems easier to locate.** Existing risk advice already recommends controls, but the repeated-crash locations and control coverage need to be visible together. This save has sufficient services and funds; another emergency building or a generic traffic deletion tool is not needed for the tested recovery.

These are recommendations, not implemented changes.

## Reproduction

Node 24 with native TypeScript stripping:

```
node docs/traffic-recovery/probe.mjs
node docs/traffic-recovery/experiments.mjs
node docs/traffic-recovery/experiments.mjs refined
node docs/traffic-recovery/experiments.mjs refined 300
node docs/traffic-recovery/map.mjs
```

The optional duration argument performs a real JSON round-trip reload at 60 seconds and writes `extended.json`. The schematic shows the affected central/eastern area, not the entire town.
