# Mission 19 — Reopen the shortcut

The user found the mandatory Divert coordinate and second-entrance sequence frustrating. Their final chosen lesson starts with a crash and Divert already placed: civilian cars travel the long way around, then removing Divert after rescue opens a shorter route. The proposed optional-star system and construction puzzle are not part of this change.

Revision 5 keeps stable mission ID `past-the-wreck`, supplies the left-hand detour and police connection, and exposes only the Divert tool. The three objectives are actual police clearance, removing Divert, and watching a household finish a new shopping round trip after reopening. That last observation lets the improvement play out before the completion dialog pauses traffic. No construction or coordinates are needed. The original $3,200 allowance remains provisional and unused; its display is hidden in this lesson.

Show Divert selects the tool and centers the highlighted blocked tile. The map label changes from “DIVERT · KEEP UNTIL CLEAR” to “REMOVE DIVERT.” Tapping too early explains that police must finish first. Responders retain the shared physical road rules and existing outbound passage through civilian diversions. No artificial rescue or shopping credit is awarded.

Older attempts remain parseable and are archived when this new map is selected, with permanent mission awards and sequential unlocks preserved. The active sandbox and other missions are unchanged. Saved `roadReopened` evidence ensures only later shopping trips count; malformed timestamps and false completion are rejected.

## Verification

- `node --experimental-strip-types --test src/game/jamCampaign.test.ts src/game/emergencyCampaign.test.ts src/game/cityChallenges.test.ts`
- `npm run build` (TypeScript and production bundle).
- `verify-browser.mjs`: isolated desktop 1440×900 and narrow 390×900 contexts; preplaced Divert, explained early removal, real clearance, reload before removal, Show Divert selection, actual map click, mission win and Level 20 unlock. External requests are blocked.
- Regression checks prove that every home's available shopping route gets shorter when the diversion is removed, and actual civilian cars traverse both the long detour before reopening and the shortcut afterwards. The supplied layout completes with no added accidents.

Screenshots and browser results are in `evidence/`. These are functional checks, not performance measurements. No publication or active-player-save access.
