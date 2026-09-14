# Level 20: Another legal approach

Stable ID: `another-approach`. **Implemented locally; ready for user playtest.**

Reach the crash legally and restore shopping journeys.

The eastbound street prevents police on the east side from reaching the crash to their west. Add another road approach, or safely change directions. Clear the scene, then bring every household home from a new shopping trip. Permanent redesigns are welcome.

Budget: $3,200. Four homes, 26×18 map. Required new services: none; existing services are supplied.

The inherited street is eastbound from (14,8) to (18,8). Reference: a northern civilian bypass and a southern police approach at x=11; alternative: southern civilian bypass and a police approach at x=10. Both preserve the inherited arrows. Safe direction changes are also permitted; the goal checks outcomes, not either reference road shape.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 92.73s / 159.25s; remaining funds: $2750 / $2810. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/another-approach.json), [solution receipts](evidence/solutions.json).

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
