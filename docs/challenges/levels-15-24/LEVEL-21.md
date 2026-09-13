# Level 21: Open, rescue, restore

Stable ID: `temporary-two-way`. **Implemented locally; ready for user playtest.**

Divert → two-way → rescue → original arrows → reopen → journeys.

Divert the marked approach at (14,8). Let traffic clear. Select the eastbound street from (14,8) to (18,8) and Restore two-way while Divert stays on. Let police clear the crash at (13,8). Wait for crews to leave before restoring those same eastbound arrows. Remove Divert last, then observe shopping returns. A missing legal route needs a road fix; “traffic must clear” means wait with Play running.

Budget: $3,500. Four homes, 26×18 map. Required new services: none; existing services are supplied.

Divert at (14,8), immediately east of the crash, holds new arrivals while existing eastbound cars can leave. The starting town contains two real civilian trips. Reference operations wait on the ordinary occupied-road guard, convert (14,8) through (18,8), wait for real police clearance and departure, restore eastbound, then reopen. Add a northern bypass via y=4 or southern bypass via y=10 between x=11 and x=20 to restore all household trips and maintained service access. The two reference solutions share the taught sequence but use different permanent recovery roads. Show Divert approach focuses the correct tile. Do not put Divert downstream in front of cars that need to leave.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 109.23s / 109.23s; remaining funds: $3030 / $3230. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/temporary-two-way.json), [solution receipts](evidence/solutions.json).

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
