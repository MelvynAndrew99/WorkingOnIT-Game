# One-way roads implemented locally

September 11, 2026. Bus work and coordinated signal offsets remain separate. Existing missions and the player's active save are unchanged; this build has not been published.

## Using the tool

Open **Roads → One-way** (desktop shortcut **8**). Tap neighboring road squares in travel order, then **Apply one-way**. Tap the first square again to close a ring. Cyan arrows preview the selection; yellow arrows show saved direction. **Reverse** applies the opposite of the selected order, **Two-way** removes the selected restrictions, and **Undo tile / Cancel** change only the draft. Direction changes are free in this first slice; road construction still costs its ordinary price.

Directions belong to connections between road squares, so corners work and ring exits remain usable. Changing the ring does not silently change its side branches. This retains current road artwork and physical lane capacity. The tool unlocks alongside Roads in the H tutorial; existing challenge tool lists are unchanged pending the user's mission plan.

An edit touching vehicles, their interpolated segment, a committed junction exit, a scene or an emergency passing reservation is rejected as one atomic change. Let traffic clear before applying; temporary Divert restrictions can help drain approaches. Uncommitted future routes update at a safe position without teleporting or removing travelers. A one-way layout still needs legal outward and homeward access.

## Shared simulation and persistence

`cityDirections.ts` owns the sparse canonical edge contract. Cached BFS, custom avoidance, plan-through-blockage paths, weighted routes, patrols, destination choice and return/access diagnostics use it. Physical spawn, route commitment and movement admission enforce the same rules. Emergency response retains its existing signal/diversion exceptions but follows one-way topology; the first slice does not create an extra passing lane on a one-way segment.

Old saves with no direction data remain two-way. Exact direction signatures invalidate path caches after reversal; arrows remain in the static cached world layer. Road removal clears only vanished connection metadata; rebuilding does not resurrect it. Save validation permits obsolete uncommitted route suffixes to replan, while rejecting direction conflicts on an already committed movement. Unreadable nonempty saves cannot silently become a new town: original bytes remain available for recovery, and saving/gameplay are held if there is no valid copy. A valid mirror may be used only after backing up any unreadable copy.

## Verification

- **303 model tests pass**, including atomic edits, occupied/reserved rejection, stale paths, parser corruption, reverse/two-way restoration, directed reachability and emergency passing restrictions.
- Nine independent ring cases demonstrate every arm's actual shopping visits and returns, simultaneous household service, closure/reload recovery, and separate police/EMS/fire dispatch, work and physical return. [Independent evidence](verification/README.md).
- **Production build passes.** Desktop 1440×900 and narrow 390×900 browser checks actually remove the center, build corners, select through the visible tool, apply/reverse/restore directions, undo/cancel, zoom and reload. Recovery-screen checks preserve malformed-direction save bytes even after attempted flush/new-city calls and download the preserved data.
- The unchanged supplied 200-road/50-building town matches **all 180 full-state checkpoints** against the recorded baseline. Historical median model workload is 2,207 → 2,115ms for 60 simulated seconds; p99 step 2.395 → 2.362ms. This is unchanged behavior with comparable CPU cost, not a claim of target-device smoothness.

Browser scripts, screenshots, logs and frame-pacing results are in [verification](verification/). See the frame-pacing result files for their exact environment and short-sample limits; desktop software rendering remains slow.

## Supplied-town ring and remaining boundary

On an isolated copy, the actual intersection at (10,4) became an eight-road clockwise ring: after 14 simulated seconds all edited tiles had cleared naturally, its center signal and center road were removed, and the four empty corners were built. No vehicles or demand were deleted and all building geometry was preserved.

A circular one-way street **does not automatically give circulating traffic roundabout priority**. The uncontrolled busy-town variant had a minor crash at its south entry. Existing controls are still meaningful: four Stop controls on the entry junctions produced 82 completions with no new accidents over the measured 120 seconds; four Lights produced 71 with no new accidents. These are bounded observations, not guarantees for every demand level or a whole-town optimization claim. [Actual town experiment](verification/player-ring-results.json), [matched control comparison](verification/player-ring-controls.json).

Automatic roundabout yield behavior, coordinated signal offsets, additional lane capacity and buses are not part of this delivery. The current feature supplies legal circular/dense road networks under the existing traffic rules.
