# Bottom-right police / EMS approach loop — September 11, 2026

User requested inspection of police and EMS in the bottom-right of their exported city. Original attachment is preserved byte-for-byte in `original-save.json`; no active browser save was accessed or changed. `parseCity` accepts the capture. This pass diagnoses the problem and verifies a player-built recovery; it does not change runtime behavior or publish anything.

## Reproduction

Captured elapsed time: 10043.815. Police 11088 and EMS 11106 are responding to serious incident 11105 at (23,10). Westbound access to its east side is disconnected from the rest of town by the wreck. Its western approach is obstructed by stranded civilian 11089 at (21,10); the southern approach has stranded civilians 11079 and 11080 at (23,12)/(23,11), with 11097 queued behind them at (23,13).

Running an untouched parsed copy through `stepCity(city,1)` 120 times leaves incident 11105 active with neither service complete. Both responders repeatedly reconsider the west and south approaches. The pending rescue deadline expires during this baseline. Incident 11111 elsewhere also remains awaiting police. Full read-only vehicle snapshots and sampled results are in `baseline.jsonl`.

## Cause and scope

Road connectivity alone says the west and south approaches exist. Physical admission cannot traverse their queues. Entering a junction reserves its exit, so police cannot turn from (20,10) into the civilian-occupied (21,10). Existing emergency passing requires a straight starting segment, at least two segments of room and a clear merge; it cannot execute this turn directly into an opposing-lane pass. The south approach also has a stranded vehicle occupying the final scene tile, which response arrival reserves exclusively. The responders repeatedly reroute between these blocked options, producing visible activity without scene access.

Relevant code: `cityTraffic.ts` heldRange, allowed, tryPass, passSlots and replan; `cityRouting.ts` responseRoute. This is an emergency maneuver/routing limitation; removing a stop is insufficient to remove physical reservations. A fix needs explicit safe maneuver geometry and reservations, not blanket occupancy bypass or more optimistic path costs.

## Verified player workaround

On a separate fresh copy, ordinary `place(city,'road',x,y)` succeeds for (24,14), (24,13), (24,12), (24,11). These four tiles connect the existing lower road at (23,14) to the existing upper road at (24,10), one column east of the congested north/south road. No building or existing road is removed.

Both original responders reach the clear east-side approach at (24,10), perform scene work and begin returning; incident 11105 clears within 14 simulated seconds. EMS arrives before the captured deadline, so the outcome is rescued in this experiment. This cannot promise rescue if the player's current simulation has already advanced past that deadline. See `bypass.jsonl`.

No runtime fix or active-browser recovery is claimed. Future implementation should retain this save as a regression, verify physical passage/work/returns, reload continuity, unchanged geometry and progress, and respect rescue deadlines. Current experiment establishes that this town can recover through a player-built route without resetting it.
