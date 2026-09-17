# Traffic recovery correction — 2026-09-17

User authorized traffic logic fixes on the exported town and reported service vehicles waiting at lights. Local implementation preserves existing road directions, collision reservations, incident assignments and save format.

## Changes

- A blocked mandatory second-lane merge now increments hold and total wait once per simulation tick. Police 34374 previously stayed at hold=0 indefinitely. Its inspector now identifies the merge and blocking vehicle.
- Before a service vehicle backs up because a road ahead is blocked, compute its replacement route at the tile centre and check admission using a copy of the trip. A turn across occupied lane space no longer causes the repeated reverse/creep cycle seen for police 34934. The actual route is still rechecked at the centre, and reversing stays within its owned tile at driving speed.
- An active response held at a controlled junction now reports waiting for traffic to clear, rather than implying the red light itself is preventing entry.

Responding police, EMS and fire already bypass red lights when the junction is clear; this behavior is preserved and explicitly tested for all three. Returning crews and patrols retain ordinary signal rules. Occupied junctions/exits still block entry.

## Validation

- Four exported-town regression tests cover exact merge wait accounting, six seconds without reverse/creep across reload, renewed route admission after blocking cars are removed in an isolated fixture, and a physical merge saved/reloaded mid-transition.
- All six focused emergency/recovery test files pass; production TypeScript/Vite build passes (existing bundle-size warning).
- Full suite: 70/72 files pass. The same four assertions in Flow/IntersectionSafety fail on the copied pre-fix baseline, with matching assertion results. No expectations or traffic balancing were altered.
- [60-second unchanged-town replay](replay.json): all six checkpoints parse after serialization; accident count remains 109. Police 34374 holds at (5,10), blocked by car 34336, with hold=60. Police 34934 holds at (14,18), blocked by car 34889, with hold=60.575. All three original incidents remain active: these changes remove artificial behavior, not physical congestion. Tests clearing the conflicting traffic demonstrate recovery.

## Remaining work

Repeated failed path queries and HUD walking-query work identified in the parent diagnosis are unchanged. This is a correctness fix, not a measured frame-rate improvement; the route admission check itself does additional planning work. No timer, rendering cadence, smoothing, active player save, publication or dependency changes.
