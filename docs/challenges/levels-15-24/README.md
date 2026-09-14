# Emergency campaign: Levels 15–24

**September 13 update:** [All 25 jam missions are now implemented](../jam-25/README.md), with sequential unlocks. Level 19 now uses a budgeted second neighborhood entrance and explicit Divert/rescue/reopen objectives; its earlier revision described below is retained only as historical evidence. Level 25 is playable and the former apartment slots are filled with home-based lessons.

Implemented locally on September 12, 2026. These ten playable lessons supersede the old Level 15 bus composite and the design-only status of Levels 16–24. Levels 1–14 retain their IDs, authored maps and objectives. Apartment slots 10, 11 and 14 remain staged. Level 25 and its What A Jam reward remain unimplemented. There are 21 playable jobs among the first 24 numbered slots.

| Level | Lesson | Required outcome | Budget |
|---|---|---|---|
| [15](LEVEL-15.md) | Make room for police | Connect the isolated station; real police response and clearance | $1,800 |
| [16](LEVEL-16.md) | A local police station | Place Police with access; dispatch, arrival, clearance | $3,000 |
| [17](LEVEL-17.md) | A clinic within reach | Place Clinic; provided police and new EMS clear the collision | $3,500 |
| [18](LEVEL-18.md) | Room for the fire crew | Place Fire; all three crews clear the fire | $4,000 |
| [19](LEVEL-19.md) | Past the wreck | A civilian shopping return via a detour while the crash is active, then police clearance | $3,200 |
| [20](LEVEL-20.md) | Another legal approach | Solve one-way access; clearance and fresh household returns | $3,200 |
| [21](LEVEL-21.md) | Open, rescue, restore | Divert, safe two-way conversion, response, original arrows, reopening, fresh returns | $3,500 |
| [22](LEVEL-22.md) | Two crews, one recovery | Place Police and Clinic; clear the scene and restore journeys | $6,500 |
| [23](LEVEL-23.md) | Fire and flow | Place all services; clear a fire and restore journeys with service access | $7,500 |
| [24](LEVEL-24.md) | Recover the district | Place all services; clear two visible scenes and recover the network | $8,500 |

The focused lessons reuse a readable four-home main street and southern service street, varying missing connections, supplied services, direction rules and incident roster. Later lessons leave empty land for alternate service sites and civilian detours. Budgets cover substantially more than either reference solution and do not receive ongoing income. Maps contain explicit initial incidents rather than waiting for random crashes. Serious/fire scenes have a generous 3,600-simulation-second rescue allowance using the existing deadline field; no mission failure countdown or accident quota is added. Taking longer can still produce the shared model’s lost-rescue outcome; clearance remains possible.

Every scene uses ordinary dispatch, legal approach selection, physical arrival, work duration and clearance. No wrong-way exception, occupancy bypass, extra accident generator or sandbox rule change was introduced. The objective observer records service dispatch, actual working/scene parking, and completion for each authored incident identity. Buildings alone cannot win. Fresh recovery returns must start after clearance (after reopening in Level 21), and each of the four homes must return. Live service access remains an objective in recovery jobs.

Level 19 explicitly teaches making a usable detour before connecting police: a return must occur while the starting crash remains active. Level 21 explicitly teaches an ordered temporary conversion; the other later maps accept permanent legal redesigns. Divert belongs at (14,8), upstream of the eastbound street, so cars already on the edited street can exit. Initial civilian cars make the ordinary clear-before-edit guard observable. Keep Divert on through police work, wait for the crew to vacate the edited street, restore the exact original eastbound edges, then reopen. Early clearance without the taught conversion cannot satisfy its clearance stage; Reset is the recovery if that scene has already been cleared out of sequence. Scene and approach focus buttons help locate the relevant roads. Every remaining objective is listed; the current step is repeated above the scrollable checklist.

## Saves and compatibility

Level 15 retains `a-town-that-works`. New emergency attempts use revision 3. Its old revision 1/2 bus town remains parseable, is archived on selection, and retains any earned award. The new map starts as a fresh attempt. Existing single-flow and opening-level migration behavior is retained. No active player saves were accessed or changed during development; browser migration checks use isolated synthetic storage.

Emergency receipts include scene identity/roster, dispatch/arrival/completion, placed building IDs, original direction edges, stage timestamps and household return IDs. The parser rejects malformed or inconsistent evidence. Authored cleared incident records are retained within challenge attempts even if the ordinary cleared-incident history would prune them. Receipts survive pause/reload and simulation step batching. Restoring the opposite one-way direction does not satisfy Level 21. Early reopening invalidates the unfinished conversion sequence; it never grants clearance/recovery credit.

## Verification and handoff

`src/game/emergencyCampaign.test.ts` verifies every untouched map remains incomplete, both reference solutions finish within their budgets with no new accidents/fatalities, actual service receipts, placement-only failure, direction occupancy and wrong-way behavior, paused/current-stage reloads, malformed receipts, and legacy Level 15 parsing. Existing campaign tests retain coverage of Levels 5–14. Initial integration passed all 55 model test files. During final verification, concurrent edits to shared `cityTraffic.ts` changed the workspace: the latest full run passes 52/55, with existing `cityFlow.test.ts`, `cityIntersectionSafety.test.ts` and `cityTraffic.test.ts` failing. Both campaign test files still pass, including all new emergency solutions; production typecheck/build and desktop/narrow UI checks pass. Those shared edits were preserved. See [initial suite](evidence/model-suite.log), [latest suite](evidence/latest-model-suite.log), and the detailed failure logs in `evidence/`.

Reproduce functional simulation evidence with:

```sh
node --experimental-strip-types docs/challenges/levels-15-24/verify-solutions.mjs
node --experimental-strip-types --test src/game/emergencyCampaign.test.ts src/game/campaignLessons.test.ts
npm test
npm run build
```

[Starting attempts and all 20 solution receipts](evidence/solutions.json) are saved beside the per-level fixtures. `verify-browser.mjs` uses `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, optional `EMERGENCY_URL` (default local port 5193) and optional `EMERGENCY_EVIDENCE`. Browser checks cover desktop 1440×900 and narrow 390×844, real Police placement through the palette/map, Play/Pause, response reload, all new briefings/completions, the direction editor, old Level 15 archival and permanent award, unavailable Level 25, and unchanged isolated sandbox storage. See [browser results](evidence/results.json) and screenshots.

No performance profiling, FPS captures, economy balancing, apartment work, song reward, publication, commit or push. Simulation completion is verified; beginner enjoyment and device-specific usability still need the user’s playtest.

Final UI verification used an isolated source snapshot at `/tmp/emergency-campaign-review` because concurrent traffic-file updates caused Vite page reloads. Its `cityTraffic.ts` SHA-256 is `8b71e64c79cda1b85a130cf3b90d9e5a0f718661fabef1288794dd4392e27359`. The source shared by other work was neither reverted nor repaired in this mission task. Browser evidence uses that stable snapshot; it is functional verification, not a performance run.
