# Neighborhood emergency access

**Implemented and selected as Level 19** following the user's request to fill/shuffle the jam campaign and fund a second entrance. See the [current delivery](jam-25/README.md). The proposal below is preserved as design history; the implemented map includes an unfinished supplied Police connection and verifies a usable second entrance before accepting active-rescue diversion evidence.

User-requested mission concept, September 13, 2026. Proposed slot: Level 19, after service placement and before one-way recovery. Replacing the current Level 19 is proposed, not yet selected. This document is a design handoff, not a playable replacement.

## Requested layout and purpose

A four-lane main road passes the neighborhood. A perpendicular ordinary two-lane road leads from it into a group of homes. A crash inside the neighborhood creates an emergency-access problem. The player explicitly learns to use Divert to keep civilian traffic from feeding the blocked approach and let emergency crews reach and clear the scene.

Claude is working on house graphics separately. This mission can use the existing home mechanics and whichever housing artwork is adopted; it does not depend on apartments or multiple cars per building.

## Proposed teaching stages

1. **Keep the rescue approach clear.** Identify the crash, required crews and civilian approach on the map. Prompt: “Select Divert, then tap the highlighted road to stop new civilian traffic entering this approach. Responding emergency vehicles can pass.” Supply the service buildings so placement is not a second introductory task.
2. **Let existing traffic clear.** Keep Play running. Prompt: “Divert does not remove cars already here. Let them move out so the crew has room.” Maintain a usable civilian escape route. Show an occupied approach separately from a missing legal responder route. If diversion sends cars onto a longer neighborhood route, make that route visually readable.
3. **Reach and clear the crash.** Keep the diversion active during response. Count actual required dispatches, physical arrivals and finished incident work; placing Divert or merely opening a route cannot award completion.
4. **Reopen the neighborhood.** After clearance, prompt: “Select Divert and tap the marked road again to reopen it.” Observe fresh household journeys and retain legal service access. No requirement to rebuild the initial road layout if a permanent improvement works.

Use map focus/highlighting and a short current-step instruction, not coordinates alone. Mark each remaining objective. Keep funds forgiving; no ten-minute duration requirement. Budget, exact tiles, household count and crew roster still need authoring and functional validation.

## Model constraints to respect

Current Divert is tile-based, not directional. It prevents civilians entering the tile from either side. Cars already on it may drive out. Responding services ignore that civilian restriction but still obey legal road directions, occupied road space, roadworks and active wrecks. Routine service returns obey civilian closures again, making reopening relevant.

Do not simply close a sole neighborhood exit and promise the whole queue will disappear. Provide/verify an internal circulation route or place the diversions where they stop incoming demand while leaving queued vehicles a way out. A closed tile across the only available route can relocate a queue instead of draining it. Do not add a mission-only occupancy bypass, teleport cars or grant wrong-way access.

The four-lane main road is a supplied part of this access lesson. Its presence does not, by itself, teach purchasing or placing double roads; that remains a separate progression need.

## Acceptance before a playable replacement

- An untouched run cannot earn the award. Compare actual queue/response behavior with and without the useful diversion; avoid a cosmetic Divert checkbox on an already self-solving rescue.
- Appropriate Divert positions must stop new civilian admissions and allow real approach clearance. An irrelevant disconnected diversion cannot satisfy the lesson.
- Verify the required crews pass the civilian restriction legally, arrive and finish work with no deleted or teleported traffic.
- Verify reopening and fresh civilian returns; do not require a civilian return before rescuing the incident, which is a weakness of the current Level 19.
- Preserve scene identity, diversion/clearance/reopening evidence and remaining stages across reload. If replacing Level 19, version/archive old attempts without discarding earned awards or reinterpreting the old map.
- Verify usable alternatives where the map permits them, readable desktop/narrow instructions and forgiving construction funds. No performance measurements or publication unless requested.
