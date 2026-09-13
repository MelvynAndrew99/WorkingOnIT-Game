# Level 24: Recover the district

Stable ID: `district-recovery`. **Implemented locally; ready for user playtest.**

Place all services, clear both marked scenes and restore household journeys.

Two existing scenes need help: a minor crash on the main street and a vehicle fire on the southern road. Place Police, Clinic and Fire. Crews must reach and clear both scenes, then all four homes must complete new shopping returns. Keep service access usable. Choose your own sites, detours and controls; no fixed road design is required.

Budget: $8,500. Four homes, 26×18 map. Required new services: policeStation, hospital, fireStation.

Two visible scenes exist from the beginning: minor at (13,8), fire at (22,11). No surprise waves or hidden accident quota. Place all three services, clear both identities, and recover all four homes with service access preserved. Reference and alternative relocate the service district and change the bypass. This is a bounded two-scene rehearsal; Level 25 remains reserved for the open-ended finale.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 86.65s / 106.23s; remaining funds: $6010 / $5790. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/district-recovery.json), [solution receipts](evidence/solutions.json).

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
