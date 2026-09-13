# Level 23: Fire and flow

Stable ID: `fire-and-flow`. **Implemented locally; ready for user playtest.**

Build the three services, clear the fire and bring every home back from shopping.

Place Police, Clinic and Fire and connect their entrances. All three crews must finish clearing the fire. Then observe a new shopping return from every home, with legal emergency access maintained. Detours, road controls and permanent redesigns are all available.

Budget: $7,500. Four homes, 26×18 map. Required new services: policeStation, hospital, fireStation.

All three service placements are required. Reference uses the southern bays and northern bypass; alternative builds services farther southwest with southern access/bypass. Each crew must work at the fire, followed by four new shopping returns and usable service access.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 86.65s / 103.73s; remaining funds: $5010 / $4790. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/fire-and-flow.json), [solution receipts](evidence/solutions.json).

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
