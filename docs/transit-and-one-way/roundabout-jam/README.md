# Roundabout patrol U-turn deadlock

Supplied town, September 12, 2026. The original capture is preserved in [original-save.json](original-save.json); the source attachment was not modified. The save validates with `parseCity`.

## User decision

Realistic traffic problems can remain planning puzzles if the game explains them. Artificial rule deadlocks should be removed, especially when they undermine roundabouts. Emergency vehicles must respect one-way road directions. The separately requested mission is **help a stuck police car reach a crash** by blocking a one-way road, safely converting it to two-way and reopening it. This is recorded in [mission requirements](../../challenges/MISSIONS.md); no playable mission was added or changed.

## Reproduction and cause

At saved time 17746.9011, police patrol 21548 is making a U-turn at (8,4), just outside the western exit of the eight-tile roundabout centered at (10,4). The patrol's five-tile operating radius selects this turnaround. Its turn reserves both lanes. Circulating car 21515 holds (9,3) and the next ring tile (9,4), and cannot advance because its exit needs (8,4). The police car yields to that car and also cannot claim its reserved ring tile. This is a circular reservation/yield wait, not a crash or a missing road connection.

An untouched clone stays stuck for another 120 simulated seconds. Traffic elsewhere completes 154 trips, so citywide throughput conceals the local deadlock. The bus queue is a consequence, not the root cause. The original eight queued trip IDs are 21481, 21515, 21528, 21548, 21552, 21555, 21598 and 21605.

Independent cloned experiments did not validate a simple player road fix: (8,5) alone or with (7,5) leaves the pair stuck; northern candidate tiles contain buildings. Filling the ring center changes its topology and releases the patrol but leaves the original civilian stuck. These experiments were not adopted. Removing the yield alone would not remove the physical reservation conflict.

## Local correction

- New optional patrols exclude U-turn endpoints immediately outside a recognized ring. Other endpoint choices retain the patrol radius and legal return route.
- A saved patrol already stalled at such a turnaround can stop patrolling and route home around another approach. It backs to the tile center at ordinary simulation speed and commits the changed path only through existing lane occupancy checks.
- The saved `patrolReturningHome: true` flag retains police/patrol identity while removing the optional radius restriction for that homeward trip. It does not remove one-way restrictions, closures, traffic gates or lane reservations. Emergency reassignment clears the flag; arrival removes the original trip normally.
- If no legal alternative exists, the patrol keeps its original assignment and position. No teleporting, trip deletion, road edits, forced completions or new player penalty.

The temporary proposed warning was not shipped: the user chose to remove this artificial problem rather than present it as a puzzle.

## Verification

[Regression tests](../../../src/game/cityRoundaboutJam.test.ts) retain the full town. Recovery is checked with reload during backing, immediately after the return route commits, and later in the simulation. Original trip positions are checked for continuous movement and actual endpoint arrival; road/building geometry, road directions/payment, fatality and accident counts remain preserved. Original-source execution in an isolated `/tmp` copy fails the recovery regression.

On the corrected original town:

| Original vehicle | Physical completion after capture |
| --- | ---: |
| Circulating car 21515 | 4.425 simulated seconds |
| Police patrol 21548 | 18.625 simulated seconds |
| Last of all eight original queued vehicles | 75.325 simulated seconds |

The two-minute run has no new crashes and 174 citywide completions. These are functional simulation observations, not performance measurements or a balance benchmark.

Additional checks cover all 100 sampled patrol endpoint choices, no-alternative retention, invalid saved return flags, and emergency reassignment during a diverted patrol return. The existing four-approach roundabout yield/closed-exit tests and all-service legal one-way response tests remain passing. Full **53 model test files**, the updated focused tests, TypeScript and production build pass. An independent code review caught and helped correct an intermediate save-identity defect before delivery.

No UI/rendering change was retained; no new browser check or target-device measurement was run. This verifies model recovery on an isolated town, not recovery in the player's active browser. No active save edits, publication or Git commit/push. Load the updated local game normally with the existing town to apply recovery; RUN requires the user's separate publication step.
