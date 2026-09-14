# Saved police / returning EMS junction jam

Local fix, September 10, 2026. User supplied a full city save after diagnostic snapshots showed police 8003 blocked by stranded car 7994 while returning EMS 8007 yielded indefinitely. Baseline simulation retained active incident 8006 after another 120 simulated seconds.

Two causes were reproduced. Siren yielding stopped the opposing return lane even when police could not enter the junction. Congestion rerouting also excluded every stopped queue in town, eliminating a physically passable alternate approach.

`cityTraffic.ts` now lets ordinary/returning traffic attempt normal admission when a responder has stopped before a junction and cannot reserve its route. Existing gates and lane reservations still apply; an active emergency pass retains priority. Emergency congestion recovery excludes stopped tiles on the current remaining route rather than all stopped vehicles citywide. Wreck/closure legality, approach selection and safe path commitment remain authoritative.

The supplied save is the regression fixture in `src/game/fixtures/police-junction-jam.json`. `cityResponderJam.test.ts` checks both yielding with a blocked police exit and restored siren priority when the exit is clear. The full-save test runs actual simulation until clearance within 60 seconds, requires a safely reserved police pass, reloads during recovery, and preserves roads, buildings, diversions, rescued outcome and fatality count. No roads or vehicles are deleted to obtain success.

All 234 model tests and production build passed. This is a simulation-only correction; no interface/art changes or publication. The user's active browser save was not edited. Exact captured-state recovery is verified in the model; no claim is made that every physically inaccessible scene can clear without road changes.
