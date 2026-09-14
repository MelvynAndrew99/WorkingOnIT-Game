# Level 16: A local police station

Stable ID: `call-the-police`. **Implemented locally; ready for user playtest.**

Place a police station with road access and clear the crash.

A minor crash needs police. Choose a station site, connect its entrance to the road and run traffic. Placing the building alone does not complete this job.

Budget: $3,000. Four homes, 26×18 map. Required new services: policeStation.

No police are supplied. Reference: Police at (12,12), rotation 2, entrance on the southern street. Alternative: (2,14), rotation 2, with a longer connecting road. Neither a building count nor access alone earns the award.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 10.00s / 14.00s; remaining funds: $2400 / $2180. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/call-the-police.json), [solution receipts](evidence/solutions.json).

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
