# All 25 beginner jam missions

Local implementation, September 13, 2026. This supersedes the staged apartment slots and unimplemented finale status in earlier mission handoffs. The user requested filling the gaps for the final jam day, increasing complexity through familiar skills, and keeping the first 25 simple and fun. More demanding optimization and new interactive objects belong after the jam.

## Playing order

Numbers now follow prerequisites. Existing awards and attempts keep their stable IDs; changing the display number never transfers an award to a different mission.

**Sequential unlocks:** Level 1 starts open. Each later mission requires the immediately preceding mission's permanent award. Locked nodes can show their briefing, which names the required previous level and disables Play. The state selection API enforces the same rule. A failed/unfinished attempt does not unlock anything; retrying an earned mission keeps its award and the next mission unlocked. Existing awards are preserved without fabricating missing earlier completions.

| Level | Job | Player work |
|---|---|---|
| 1 | The first road | Join a home to its shop; real arrival wins. |
| 2 | Roads for the neighborhood | Connect three homes and complete returns within the existing 45-second test. |
| 3 | A longer connection | Extend two unfinished streets to their shops. |
| 4 | Take turns | Introduce Stops and safe shopping returns. |
| 5 | Share the crossing | Combine missing-road repair with crossing control. |
| 6 | Green for the queue | Introduce Lights at a busy crossing. |
| 7 | Room to move | Improve sustained service through timing or destination/access changes. |
| 8 | A way back | Build a legal one-way return street. |
| 9 | Around the island | Build and direct a working roundabout. |
| 10 | Join the avenue | Build the missing four-lane connection and carry real shopping returns along the new road. |
| 11 | Let shopping fund a park | Connect the shop, earn shopping income, buy an accessible park and finish both kinds of trip. |
| 12 | Shops and strolls | Supply shopping and leisure for a larger neighborhood. |
| 13 | All aboard | Purchase/configure/run a bus and complete real passenger outings and shopping returns. |
| 14 | Another way into the neighborhood | Add and use a second connection to the four-lane avenue; reopen any diversion. |
| 15 | Make room for police | Connect the supplied police approach and clear the crash. |
| 16 | A local police station | Place accessible Police and clear the crash. |
| 17 | A clinic within reach | Add Clinic access and complete Police/EMS work. |
| 18 | Room for the fire crew | Add Fire access and clear a three-service incident. |
| 19 | A second entrance for rescue | Build another neighborhood entrance, connect Police, use Divert, clear the crash, reopen and recover journeys. |
| 20 | Another legal approach | Correct one-way emergency access and recover journeys. |
| 21 | Open, rescue, restore | Combine Divert, safe temporary two-way conversion, actual rescue, original arrows and reopening. |
| 22 | Two crews, one recovery | Place two services and restore civilian trips. |
| 23 | Fire and flow | Place all services and recover from a fire. |
| 24 | Recover the district | Clear two scenes and restore district journeys. |
| 25 | What a Jam! | Choose a legal rescue network, clear both scenes, then recover every household with service access maintained. |

The emergency phase restarts with one new concept before combining it with previously taught skills. Funds remain forgiving; no new failure countdown or traffic-optimization quota is introduced. Ten-minute idle simulations are regression checks, not required play durations. Human difficulty/fun still needs player feedback.

## New lessons and evidence

- **10 — $1,000:** ordinary roads across the gap and disconnected wide decorations cannot substitute for real returns using the new four-lane road. Existing home mechanics/art are used; no apartment dependency.
- **11 — $160 initially:** three missing road tiles cost $60. Completed shopping visits pay the existing $100 amount; no idle support income. Earn $300 and provide a $300 park with real shopping/leisure returns. Income is isolated to this mission; all other challenge budgets remain fixed. Refunds do not count as earnings, and rewarded visits do not pay again after reload.
- **14 — $1,200:** a perpendicular two-lane neighborhood street meets a supplied four-lane avenue. Preserve the old entrance and construct another usable connection. Each household must physically return through a route that avoids the original entrance; route existence or decorative roads alone cannot win. Divert can steer traffic toward the new connection and must be removed before completion.
- **19 — $3,200:** reuse that neighborhood concept with a crash inside it and an unfinished supplied police connection. Build a second usable entrance and join the police entrance at (21,9). Divert the original approach at (8,10), keep it active through actual clearance, then reopen and observe fresh household returns. Two verified entrances at x=10 and x=12 cost $470/$430 including controls; the map allows other legal routes. An entrance beyond the active wreck is not usable unless its connection also bypasses the wreck. The mission uses normal civilian diversion, directed routes, reservations and responder work. No queue teleportation or wrong-way exception.
- **25 — $10,000:** the service street is disconnected and the main street has a one-way restriction. Both scenes require real access/arrival/work, followed by new returns from every home. Different service locations and northern/southern detours are verified; no particular road type, Divert use, layout or click order is required. Permanent redesigns remain valid.

Level 19 is a focused Divert lesson: clearing the scene before a usable second entrance and diversion are ready cannot retroactively satisfy the teaching evidence; its checklist explains Reset if this occurs. Players can freely plan/build both connections and set Divert while paused before dispatch. This is the remaining limitation of requiring Divert during an actual rescue, rather than allowing an unrelated toggle afterward.

## Saves and jam reward

The formerly staged stable IDs `apartment-avenue`, `keep-another-way` and `another-front-door` are reused for Levels 10, 11 and 14. Display titles describe the actual home-based lessons. Earlier active mission IDs and awards are preserved despite reordering. Level 19 uses revision 4; revision 3 remains parseable and is archived on selection, with any earned award retained. Source fixture evidence for old Level 19 remains untouched.

New route-return IDs and shopping-income receipts survive reload. Emergency receipts preserve the actual scene, useful diversion, clearance, reopening and subsequent returns. Malformed new receipts are rejected. The existing finale award also serves as a permanent **free What A Jam song entitlement**, retained through retries and reloads and shown on the completion/map screens. **The recording is not installed:** the repo contains the song brief/lyrics, not its selected audio file. This delivery saves the entitlement; it does not claim playable song audio or add a radio system.

## Verification

All mission tests pass, including `campaignIdle.test.ts` for all 25 untouched maps, the existing positive/reference/alternative suites, and `jamCampaign.test.ts` for useful road proof, income attribution/reload, rescue sequencing, old Level 19 compatibility and alternate finale designs. `npm test`: **55/57 test files pass**. The same pre-existing `cityFlow.test.ts` and `cityIntersectionSafety.test.ts` failures remain; see the [earlier audit](../MISSION-AUDIT-2026-09-13.md). No traffic-rule reversion or weakened assertions.

Production typecheck/build passes. [Model solution receipts](evidence/solutions.json) record actual completion times and remaining budgets. These are functional simulation outcomes, not human solve-time or performance claims.

Final locking-specific checks: **8/8 focused tests pass**, and the rebuilt production artifact passes typecheck/build. [Desktop/narrow browser results](evidence/browser-results.json) pass with no page errors, including the real-win unlock, locked-entry guard, retry/reload retention and unchanged isolated sandbox storage. Representative evidence: [neighborhood desktop](evidence/desktop-level-19.png), [neighborhood narrow](evidence/narrow-level-19.png), [locked briefing](evidence/narrow-locked-briefing.png), [finale](evidence/desktop-finale-complete.png), [all-complete map](evidence/narrow-all-complete.png).

`verify-browser.mjs` checks desktop 1440×900 and narrow 390×844 in isolated browser storage: Level 1 open/24 jobs locked, locked briefings and state selection guards, unlocking through a real Level 1 win, retry/reload persistence, actual four-lane pointer placement, Divert pointer toggling, income copy, added-level completions, old Level 19 archival, finale reward persistence and a fully completed level map. Later-level fixture access is seeded only in that isolated test profile. Browser evidence status is recorded alongside its results after execution.

No publication, active-player-save edits, performance testing or house-art edits. Claude's concurrent housing work is preserved.
