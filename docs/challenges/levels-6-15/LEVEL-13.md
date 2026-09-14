# Level 13: All aboard

Stable ID: `first-bus-service`. **Playable locally; ready for user playtest.**

Buy a bus and run an outing from each home to a destination and back.

Tap the depot and Buy bus ($400). Choose both roadside stops and Finish route. Select Start service, then press Play. Waiting passengers appear automatically once service and traffic are running. All four homes need a completed bus passenger outing and a shopping return. Stop placement or an empty bus alone does not win. Bus passengers are additional riders; this lesson does not claim to reduce household car trips.

Budget: $600. Required homes: 4. Definition/map: `src/game/fixtures/campaignTown.ts` (search the stable ID). Reference operations: `src/game/fixtures/campaignSolutions.ts`. Objective/save support: `src/game/cityChallenges.ts`. Regression: `src/game/campaignLessons.test.ts`. Starting run: [fixture](evidence/first-bus-service.json).

Next: play this existing level first; adjust its clarity/map/budget only as needed. Reference solutions and alternatives are verified; player-observed fun remains unverified.

For a small-context follow-up, scope work to this level. Preserve other IDs/maps/awards and sandbox saves. No publication or performance measurements unless requested.

Player-clarity correction: the objective now explicitly lists buying the bus, choosing stops, and starting service/Play separately. A prominent “Next” line shows the first unfinished step, so the purchase instruction is visible without opening Rules. Existing return requirements and saved awards remain intact.
