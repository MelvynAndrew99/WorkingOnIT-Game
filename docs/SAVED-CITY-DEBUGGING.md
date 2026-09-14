# Saved-city troubleshooting brief

User-requested workflow, September 10, 2026: when a player encounters a simulation problem, pull the affected town and diagnostics into an isolated reproduction, trace the actual cause, and retain the case as a regression. Preserve their city and progress throughout.

## Capture the problem

1. Record what the player expected, what happened, the game version or local commit, and whether they are playing localhost or RUN. A screenshot helps identify the scene.
2. Capture the existing vehicle diagnostics while the problem is present. Record selected vehicle and incident IDs, positions, phases, stopped time, reasons and blocker IDs. A second snapshot can establish whether the same vehicles remain stuck as simulated time advances.
3. Capture the **full city save** close to the same time. Diagnostics alone omit the complete road network, buildings, controls and simulation state. Pause if practical to keep the evidence aligned. Do not reset the town or clear the incident before capturing it.

### Current localhost capture instructions

In the game tab's browser developer console, run:

```js
copy(localStorage.getItem('city-workshop:city:v1'))
```

Then paste the clipboard contents into the conversation or a text file. Explain up front that `copy()` normally prints `undefined`: that is its return value, not a failed capture.

If clipboard copying is unavailable, evaluate this and copy its string value:

```js
localStorage.getItem('city-workshop:city:v1')
```

`null` means no local mirror was found in that browser origin/frame. Check the game context; do not fabricate a save or request a reset. The key and persistence behavior are defined in `src/state/save.ts`; verify these instructions against that file if storage changes. RUN uses host appStorage plus a local mirror, so localhost storage is not automatically the player's RUN town. Never ask for the entire browser storage or account credentials.

Console output may wrap the JSON in another quoted/escaped string. Parse the outer JSON, then parse again if the result is a string, until reaching the save object. Preserve the original capture separately. These commands read the persisted mirror, which can be older than the visible simulation; compare its incident/vehicle state with the diagnostic timestamp.

## Reproduce before changing behavior

- Inspect the capture structure and validate `save.city` with `parseCity`. Report invalid or missing data instead of silently starting a fresh town.
- Keep the original save immutable. Run a cloned city through `stepCity` in memory, without RUN storage access or writes to the player's browser. Preserve existing repository work.
- Record baseline behavior over a bounded amount of simulated time: which vehicle blocks which, whether the incident clears, and whether trips resume. A screenshot or debugger explanation is evidence to investigate, not proof of the whole cause.
- Trace actual routing, lane/junction reservations, yielding, dispatch, scene work and return behavior. Separate physical lack of access from simulation deadlock or misleading feedback.
- Test hypotheses on separate clones. Removing a blocker can help identify a dependency, but the final recovery test must retain the original town and demand unless a player-built workaround is explicitly the behavior being tested.

## Fix and prove recovery

Use the smallest behavior change that resolves the reproduced cause. Preserve real travel, safe occupancy, actual crew completion, rescue deadlines/outcomes, saved progress and construction. Do not manufacture success by teleporting crews, deleting stranded cars, erasing demand or marking the incident complete.

Retain a regression fixture and meaningful assertions:

- The reported failure occurs on the baseline and resolves with the fix within a bounded simulation interval.
- Responders physically reach/work at the scene; relevant trips or returns recover.
- Lane/passing reservations remain valid, and normal priority still works when the obstructing condition is absent.
- Recovery survives save/reload, including a reload during the maneuver where relevant.
- Town geometry and earned progress remain intact; no duplicate rewards or invented rescues.

Keep only game-state data needed for reproduction in committed fixtures. Add a focused synthetic test when it makes the underlying rule easier to understand. Run the relevant regression suite and production build; use desktop and narrow browser checks when UI/input/rendering changes are involved. Distinguish model verification from an observed recovery in the player's active browser.

Record the cause, change, evidence and remaining limitations. Tell the player how to load the local correction. Publication remains a separate authorized action; debugging does not itself authorize deployment.

## Worked example: police / EMS junction jam

[Full incident record](emergency-recovery/police-junction-jam/README.md), [regression tests](../src/game/cityResponderJam.test.ts), and [captured fixture](../src/game/fixtures/police-junction-jam.json).

Vehicle diagnostics identified police 8003 blocked by stranded car 7994, while returning EMS 8007 kept yielding. The full town reproduced incident 8006 remaining active for another 120 simulated seconds. Two causes were confirmed: yielding held the opposing lane despite the police's blocked exit, and congestion rerouting excluded every stationary queue in town, including a passable alternative.

The correction lets traffic attempt normal admission while a responder cannot advance and limits emergency congestion avoidance to obstructions on its current route. The captured town then clears through actual police passing and work, with a reload during recovery and no geometry edits. All 234 model tests and the production build passed at delivery. This is the standard of evidence to aim for in future reports, not a promise that all road layouts are physically recoverable without player changes.
