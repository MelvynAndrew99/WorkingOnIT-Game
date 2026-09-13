# Level 18: Room for the fire crew

Stable ID: `fire-access`. **Implemented locally; ready for user playtest.**

Place a fire station and let all three crews clear the vehicle fire.

Police and a clinic are provided. Place Fire and connect its entrance. Police, EMS and fire must arrive and work at the marked scene. Extra road space and generous funds let you try different sites.

Budget: $4,000. Four homes, 26×18 map. Required new services: fireStation.

Police and Clinic are supplied. Reference: Fire at (20,12), rotation 2. Alternative: (2,14), rotation 2, with new access. All three services must arrive and finish.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 13.35s / 18.00s; remaining funds: $3300 / $3080. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/fire-access.json), [solution receipts](evidence/solutions.json).

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
