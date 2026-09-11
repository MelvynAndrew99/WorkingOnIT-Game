# Fixed outside-city edge and interior connector repair

September 11, 2026. User selected blocking expansion on the connected side, then explicitly requested relocating existing interior connectors to an outer edge and highlighting the road connection players need to build. Implemented locally; no publication.

## Behavior

- Expansion rejects the connected edge before changing geometry, progress or allowances. The compass disables that direction and explains why. Other directions keep normal funding and map-size rules.
- Corner connectors fix their east/west side, leaving the perpendicular direction available; the connector remains on a boundary after that expansion. No saved edge field is required.
- After sandbox save selection and validation at boot, an interior connector moves to the nearest boundary tile not occupied by a building. Ties use row then column order. Existing roads, buildings, incidents, cash, mission receipts and land remain. No roads are auto-built. If all boundary tiles contain buildings, repair waits rather than overwriting a lot.
- Existing visitors keep IDs, positions and local lane geometry. Their saved origin becomes the new connector. Returning visitors enter the normal waiting/routing machinery rather than finishing at their obsolete exit. Parked visitors retain visits and wait for actual return access. Repaired saves round-trip through validation; later loads do not move the connector again.
- A yellow CONNECT TO CITY marker and dedicated reconnection objective with Show city connection select Road and focus the new edge. Urgent rescue instructions retain priority, with a connection action alongside them. The prompt disappears when roads physically link the connector to a store or park. This measures road construction, independently of temporary crashes and diversions; normal traffic still requires usable routes and capacity.

## Supplied town

The original connector (23,10) is inside bounds x=-24, y=-16, width=64, height=44. Repair places it at (39,10), fixing the east side. Existing road reaches (33,10); six player-built road tiles (34,10) through (39,10) complete the link. The original crash and its rescue deadline remain; relocation does not fabricate rescue or clear wrecks.

## Verification

277 model tests pass; production build passes. Regressions cover all four sides, corners, rejection without mutation, real active visitors, the supplied city, idempotent repair, reload, preserved physical positions and real return after reconnection. Browser evidence checks desktop 1440 and narrow 390, the actual sandbox load repair, visible prompt, focused marker, disabled east, successful south expansion and reload. See browser-check.mjs and screenshots. The initial browser harness incorrectly opened the pause menu before clicking through it; corrected to use normal gameplay controls. Screenshot inspection also caught a crowded supplemental prompt on narrow screens; the final dedicated objective uses the existing measured layout.

## Manager direction recorded, separate from this implementation

User's proposed line: “Oh, another crash! Here is what I would do, build more roads!” He sounds sincerely helpful, with his heart in the right place and self-serving motives beneath his choices. Avoid explicit conceited credit-taking punchlines. Delayed unsolicited manager advice remains a separate backlog task; this change does not add a new automatic speech trigger.
