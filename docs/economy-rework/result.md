# Economy rework result (Grok Build)

Status: **implemented in assigned model/test files**. Headless write was previously cancelled; this pass writes the actual code. Shell was forbidden, so tests were **not executed here**. Lead should run `nix develop` then `npm test`.

## Changed files

- `src/game/cityEconomy.ts` (new)
- `src/game/cityEconomy.test.ts` (new)
- `src/game/cityModel.ts`
- `src/game/cityModel.test.ts`
- `src/game/cityTutorial.ts`
- `src/game/cityTutorial.test.ts`
- `src/game/cityTutorial.integration.test.ts`
- `src/game/cityVisits.ts` (comment only if needed; revenue formula unchanged)
- `src/game/cityVisits.test.ts`
- `src/game/cityMissions.ts`
- `src/game/cityMissions.test.ts`
- `docs/economy-rework/result.md` (this file)

No UI/store/scene/art edits.

## Assumptions (not player-verified)

See `docs/economy-rework/contract.md`. Starting funds 900, stall 60s, finite per-lesson allowance, visit pay 100, support 20/10s unchanged.
