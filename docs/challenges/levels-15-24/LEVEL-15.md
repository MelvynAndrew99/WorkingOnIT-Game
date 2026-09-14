# Level 15: Make room for police

Stable ID: `a-town-that-works`. **Implemented locally; ready for user playtest.**

Connect the police approach and let the crew clear the crash.

The police station south of the crash has an unfinished approach. Connect it to the main street or build another legal approach. Press Play to dispatch the crew and watch it arrive and finish work.

Budget: $1,800. Four homes, 26×18 map. Required new services: none; existing services are supplied.

The police station’s southern street is disconnected. Reference: connect at x=18 between y=8 and y=11. Alternative: connect at x=23. Both use the existing station and real police work.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 10.00s / 13.35s; remaining funds: $1760 / $1760. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/a-town-that-works.json), [solution receipts](evidence/solutions.json).

The old bus-composite attempt retains its ID and award. On selection, revision 1/2 is archived and a revision 3 emergency attempt starts; sandbox saves and other levels are kept.

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
