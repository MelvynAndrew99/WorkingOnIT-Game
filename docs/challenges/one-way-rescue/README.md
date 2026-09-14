# Level 21 — The wrong side of the crash

The user's correction is that missions should be simple road puzzles, not instructions to execute a tutorial. This revision presents a crash that police cannot reach because of one-way roads. The player works out the road changes.

The three success conditions describe results: police have a legal route, police actually clear the crash, and a household completes a fresh shopping round trip after clearance. The mission accepts permanent changes. It no longer requires Divert, conversion to two-way, restoration of the original arrows, reopening a designated tile, or a reset because a rescue happened outside that sequence. Briefing and goal copy do not give the solution. Optional Show crash, Show police and Show one-way buttons locate map features; they do not select or apply a solution.

The inherited eastbound street, police station, four homes, crash, $3,500 allowance and ordinary road rules remain. New attempts begin paused with no initial traffic advance, giving players space to examine and edit the puzzle before occupied-road restrictions matter. Police still obey one-way arrows and physical occupancy. Success requires real arrival, completed scene work and a later shopping return.

Stable ID `temporary-two-way` now creates revision 4. Revision 3 is still parsed under its original rules and archived when selected, with earned awards preserved. Other missions retain their behavior, including the newly requested Level 19 Divert lesson. No active-player-save edits, publication or performance testing.

## Verification

- `node --experimental-strip-types src/game/emergencyCampaign.test.ts`: 18 assertions/tests pass, covering all emergency missions, original legacy sequencing, occupied-road guards, malformed evidence, and two materially different Level 21 solutions. A permanent two-way conversion and a new connection preserving all inherited arrows both finish without extra accidents. Neither route needs Divert or restoration.
- `node --experimental-strip-types --test src/game/jamCampaign.test.ts src/game/cityChallenges.test.ts`: campaign and Level 19 regressions.
- `npm run build`: TypeScript and production bundle.
- `verify-browser.mjs`: isolated desktop 1440×900 and narrow 390×900 runs. Actual pointer selection of the road tiles, Restore two-way and Finish, saved direction edits across reload, real rescue and recovery, completion and Level 22 access. The narrow run starts from the stored historical revision 3 fixture and checks archival and award preservation. External requests are blocked.

Screenshots and browser results are in `evidence/`. Model reference solutions belong to verification; they are not player-facing instructions.
