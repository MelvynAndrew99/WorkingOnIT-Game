# Practice removal

Implemented locally September 9, 2026 under TUTORIAL-01 after the user asked to pick up the next backlog item.

Installed Claude Code removed both Practice actions and updated the on-screen instruction in TutorialCoach. Codex removed the production district builder and neutralized the legacy practice command before any city mutation, including when tutorial metadata is absent. Historical practice coordinates, buildings, zero-payment provenance and learning receipts remain loadable and unchanged.

Lessons now refer to the player's town. At the accident/response lessons, a controlled crossing with no active incidents permits explicit safety acknowledgement. This teaches the service explanation without inventing a rescue or requiring a crash. An actual alternate route around a controlled crossing can complete the detour lesson after safety acknowledgement. Where an incident has occurred, the bypass must relate to an incident rather than unrelated traffic. Natural collisions, real service response, first-crash pause, construction waivers, skip and explicit outside connection retain their behavior.

The mayor's Help/Later request flow is still queued. No renamed district stamp or automatic city proposal was added.

## Verification

- `nix develop -c npm test`: 171/171 pass. An independent Codex agent updated the three relevant test files, retaining natural collision/dispatch coverage and historical refund/save checks.
- Full production build and TypeScript pass with the pre-existing bundle-size advisory.
- [Browser check](browser-check.mjs) passes at 390×900 and 1440×900 in isolated contexts. Neither Practice entry appears; the real safe-crossing button advances the lesson, leaves layout/funds unchanged, records no invented rescue and persists across reload. Phone details remain scrollable in the existing interface.
- Complete player-built tutorial regression earns shopping/leisure visits, installs a control, acknowledges safety and constructs a real bypass without a practice district or crash. Another regression retains real three-service response and the finite rescue construction waiver.
- No personal save was accessed or reset. No deployment performed.

Claude's [handoff](../claude-ui-handoff/practice-removal-result.md) identifies its UI-only work. Its warning about remaining model copy was addressed by the lead during integration.
