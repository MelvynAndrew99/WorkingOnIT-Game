# Level 22: Two crews, one recovery

Stable ID: `paired-response`. **Implemented locally; ready for user playtest.**

Place police and a clinic, clear the scene, then restore every home’s journeys.

Place Police and Clinic with legal approaches to the collision. Both must dispatch, arrive and work. After clearance, every home must finish a new shopping trip. Use a detour or controls where traffic meets; any legal layout is welcome.

Budget: $6,500. Four homes, 26×18 map. Required new services: policeStation, hospital.

Neither police nor clinic is supplied. Two new services share a real serious-collision response. Reference stations occupy their southern-street bays; the alternative moves both farther southwest and joins a different civilian bypass. Every home needs a new shopping return after clearance; earlier trips do not satisfy recovery.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 87.18s / 103.73s; remaining funds: $4710 / $4530. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/paired-response.json), [solution receipts](evidence/solutions.json).

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
