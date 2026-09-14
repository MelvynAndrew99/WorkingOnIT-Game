# Jam review: Levels 20–25

The user requested a focused check of the last six missions, emphasizing that they should be simple road puzzles rather than tutorial instructions. Deeper design refinement is deferred until after the jam; participation and a playable submission take priority over perfection.

| Level | Presented problem | Verified outcomes |
| --- | --- | --- |
| 20 | Police approach is on the wrong side of one-way arrows | Police clearance, new shopping returns from all four homes, emergency access retained |
| 21 | One-way access with households on both sides | Legal police access, actual clearance, one fresh shopping return |
| 22 | Serious collision; police and ambulance services are missing | Both services reach/work, crash clears, all four homes recover |
| 23 | Vehicle fire; three services are missing | Police, ambulance and fire crews reach/work, all four homes recover |
| 24 | Main street crash and southern road fire | Both scenes clear with their required crews; all four homes recover |
| 25 | Two incidents, one-way main street, disconnected southern road and missing services | Both scenes clear, all four homes recover, service access retained |

## Changes

Level 21 now accepts permanent direction changes and alternative road layouts; its old Divert/conversion/restoration sequence is archived under revision 3. [Detailed delivery](../one-way-rescue/README.md).

Levels 20 and 22–25 already accepted different working layouts. Their maps, budgets and success conditions stay intact. Their briefing, map-note and objective copy now describe problems and results instead of giving construction solutions. The code retains the existing requirement for actual newly supplied services in levels that begin without them. Map callouts identify missing responders as “Police needed,” “EMS needed” or “Fire needed.” Location is the player's choice; neither a building alone nor a connected road alone completes a rescue.

The main panel displays a current outcome as “Goal,” with the full outcome checklist in Rules & details. Clearance combines actual dispatch, arrival and completed work, so a shorter checklist does not fabricate any progress. Separate Show crash and Show fire buttons locate both scenes in 24/25. The narrow tool shelf scrolls horizontally to leave space for the goal. No road or traffic-rule changes are introduced by this review.

## Verification

`verify-solutions.mjs` checks two materially different legal designs for each of the six levels, untouched non-completion, saved/reloaded continuation, real rescue/recovery, retained nonnegative funds and no additional accidents or fatalities. All 12 solutions pass. Remaining funds range from $2,750–$7,370 in these reference solutions; budgets have not been tightened. `evidence/solutions.json` records exact outcomes.

The emergency campaign's 18 tests pass, including old Level 21 sequence parsing and occupied-road protection. The campaign/Level 19 regression files pass. TypeScript and production build pass.

`verify-browser.mjs` checks all six levels in both representative layouts, desktop 1440×900 and narrow 390×900. It verifies the current outcome fits its panel, scene controls, no tool-sequence goal text, and completion with actual simulation. Reference operations are invoked in the isolated browser for the six-level sweep; the separate Level 21 browser check exercises actual pointer-based direction editing and reload. These are functional checks, not performance measurements.

## What remains for after the jam

This verifies solvability and removes the instruction-following barriers; it does not establish player-tested difficulty or ideal campaign variety. Levels 20 and 21 remain related one-way rescue puzzles. Levels 22–25 combine service placement with road access rather than presenting six wholly distinct traffic patterns. Broader map differentiation, pacing and design polish are deliberately deferred in `docs/BACKLOG.md`.

No publication, active-player-save access or edits, economy rebalance, new credit/star system, artwork edits or performance measurements.
