# Level 17: A clinic within reach

Stable ID: `clinic-access`. **Implemented locally; ready for user playtest.**

Place a clinic and let police and EMS clear the collision.

Police are provided. Place a Clinic where its entrance can reach the serious collision. Both crews must physically arrive and finish their work. Pause freely to plan; the starting scene allows ample rescue time.

Budget: $3,500. Four homes, 26×18 map. Required new services: hospital.

Police are supplied; EMS is missing. Reference: Clinic at (16,12), rotation 2. Alternative: (2,14), rotation 2, with new access. Both police and EMS must work at the same serious collision.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 10.00s / 14.00s; remaining funds: $2700 / $2480. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/clinic-access.json), [solution receipts](evidence/solutions.json).

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
