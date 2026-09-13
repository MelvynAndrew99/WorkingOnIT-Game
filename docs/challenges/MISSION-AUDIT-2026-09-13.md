# Mission review after smoother junction departures

Reviewed the current local working tree, including the existing traffic changes. No traffic rules, mission maps, budgets, player saves or publication changed in this review.

## Does pressing Play win?

No award was earned by any of the **21 playable levels** over **600 simulated seconds** without intervention. Levels 2 and 7 terminate earlier through their existing failure rules. This is a bounded functional check, not proof about unlimited simulation time or a performance measurement. Added `src/game/campaignIdle.test.ts` to retain this check with a reload halfway through.

All existing mission test files passed: `challengeLessons`, `cityChallenges`, `campaignLessons`, and `emergencyCampaign`. The latter two cover reference/alternative solutions, actual journeys, construction budgets and reloads. The emergency checks require actual dispatch, arrival and completed incident work.

| Levels | Required player work |
| --- | --- |
| 1–3 | Connect missing roads; serve scattered homes; repair and safely manage a crossing. |
| 4 | Improve sustained shopping service by changing signal timing, roads or destinations. The starting layout remains below the target. |
| 5 | Extend disconnected streets to shopping destinations. |
| 6–7 | Install Stops / Lights, then complete every household's shopping return safely. These remain simple introductory actions. |
| 8–9 | Build a directed return street / recognized one-way roundabout, then complete journeys. |
| 10–11 | Staged apartment lessons; unavailable. |
| 12 | Add an accessible park; complete both shopping and leisure returns for every home. |
| 13 | Purchase a bus, configure stops, start service and complete passenger outings plus household shopping returns. |
| 14 | Staged apartment access lesson; unavailable. |
| 15 | Connect the unfinished police approach and clear the crash. |
| 16 | Place accessible Police and clear the crash. |
| 17 | Place an accessible Clinic; Police and EMS must clear the collision. |
| 18 | Place accessible Fire; all three services must clear the fire. |
| 19 | Carry a civilian shopping return around the active wreck, then connect Police and clear it. |
| 20 | Fix legal access around a one-way restriction; clear the scene and complete fresh shopping returns. |
| 21 | Divert, safely convert to two-way, clear the scene, restore original arrows, reopen and recover journeys. |
| 22 | Place Police and Clinic, clear the scene and recover journeys. |
| 23 | Place all three services, clear the fire and recover journeys with service access retained. |
| 24 | Clear two scenes and restore district journeys. |
| 25 | Finale/reward remains unimplemented. |

## Gaps against the requested progression

- **Income is not taught.** `stepChallenge` restores the construction budget after every simulation tick, and the UI explicitly says “No income.” Spending/refunds are taught, but running traffic cannot finance later construction. A future income lesson should visibly require completed paid journeys to fund an addition and then actual service from that addition. Keep emergency budgets forgiving and avoid turning this into a general economy rebalance.
- **Double-road placement is optional, not a verified lesson.** The four-lane tool is available in Levels 12, 23 and 24; their reference solutions do not need it and no objective proves it carried useful traffic. The staged apartment lessons do not currently fill this gap. Author a usable widening/access lesson before the emergency sequence; require real journeys through the improved access, not decorative pavement.
- **Level 19 punishes an otherwise successful early rescue.** It requires a civilian return before clearance. Connecting Police too early can clear the incident before that receipt exists, forcing a retry. Its instructions disclose this ordering, but a clearer detour-first stage or more flexible recovery objective would improve it. Level 21's strict ordering, by contrast, is the explicitly requested temporary-road teaching sequence.

## Three reproduced individual failures

`npm test` reports **53 passing and 2 failing test files** (55 files before adding the idle regression). Running the two failing files directly reveals the three reported assertions:

1. `cityFlow.test.ts`, “road bottleneck and two real solutions”: the retimed solution gives 73 shopping returns versus 54 for the baseline in its comparison, below the old required 40% increase. Both Level 4 solution tests still earn their awards while the untouched case does not. The destination variant also has intermittent readiness in the sampled windows, so merely reducing the first percentage assertion would not fully repair this test. Review its sustained-service assertions against the intended mission contract.
2. `cityIntersectionSafety.test.ts`, “Level 2 stays quiet”: all homes are served and no crash occurs, but a warning first appears at about 49.325 simulated seconds. Actual Level 2 solution tests finish before 30 seconds and pass. The longer-running quiet-fixture warning deserves review separately from mission completion.
3. `cityIntersectionSafety.test.ts`, “long shared green”: the expected crash does not occur within 120 simulated seconds. The test fails before evaluating its shorter-green alternative. Do not increase accident frequency simply to recreate the former fixture outcome; establish a real conflicting-turn case or revise the claimed lesson based on current traffic behavior.

These failures remain open. The review does not weaken assertions or revert the smoother departure behavior to make the suite green.
