# Level 19: Past the wreck

**Superseded by revision 4:** [A second entrance for rescue](../jam-25/README.md) is the current Level 19. The following revision 3 map and receipts are preserved for compatibility and archival verification.

Stable ID: `past-the-wreck`. **Implemented locally; ready for user playtest.**

Complete a shopping return while the wreck is active, then clear it.

Build a detour around the crash between the homes and shop. Observe one household return while the crash is still active. Then connect the unfinished police approach and let the crew clear it. You can prepare both routes while paused; leave the police connection until the detour has carried a return.

Budget: $3,200. Four homes, 26×18 map. Required new services: none; existing services are supplied.

The main-road wreck prevents household shopping. Police access starts disconnected so there is time to observe the detour. Reference: bypass between x=11 and x=16 via y=4; alternative via y=3. Observe a real shopping return before joining police access at x=18 or x=23. This is an explicitly ordered teaching lesson: connecting police before the detour has carried a return can require Reset.

Verification: both reference layouts complete with real dispatched/arrived/completed service receipts. Reference/alternative simulation completion: 55.75s / 59.10s; remaining funds: $2770 / $2730. These are functional simulation outcomes, not performance measurements or player solve times. Neither creates an additional accident. Untouched maps cannot win. Reload and invalid-receipt checks are in `src/game/emergencyCampaign.test.ts`.

Definition/map: `src/game/fixtures/emergencyTown.ts`. Player operations: `src/game/fixtures/emergencySolutions.ts`. Saved objectives: `src/game/cityEmergencyChallenges.ts`. [Starting attempt](evidence/past-the-wreck.json), [solution receipts](evidence/solutions.json).

No publication or active-player-save edits. Apartment mechanics, Level 25 and its song reward remain outside this implementation.
