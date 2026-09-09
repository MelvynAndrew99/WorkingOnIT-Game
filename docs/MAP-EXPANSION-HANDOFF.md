# Map expansion integration

Current direction is in AGENTS.md and DESIGN.md. Claude's completed graphics pass is now integrated with player-accessible expansion and camera controls.

## Player controls

- Expand opens a cardinal-edge preview. Gold is new land; Add land grows the map for free. Cancel leaves it unchanged. Both axes cap at 64 tiles.
- Pan toggles dragging the camera. Selecting a construction tool returns to building.
- Pinch, wheel, and +/− zoom around the gesture anchor or viewport center.
- Town recenters on existing construction at the normal tile scale.
- Camera movement and expansion work while paused. Expansion preserves focus and existing world coordinates. Touch construction waits for release or a deliberate road drag; multi-touch claims the gesture without building.

## Integration interfaces

- `city.map`: saved `{ x, y, width, height }`; missing bounds migrate to the original 16×14 town.
- `cityMap.ts`: initial dimensions, bounded expansion preview, and signed tile containment.
- `expandCity(city, direction)`: mutates bounds only, returns feedback.
- `cityCamera.ts`: pure design-unit/world transforms, anchored zoom, pan and center clamp.
- `cityControls.ts`: scene-owned command subscription for camera and expansion actions; cleaned up on scene destruction.
- `MapControls.tsx`: expansion dialog/preview and camera buttons, using the existing shared store.
- `cityScene.ts`: Claude's atlas/art composition, with a masked camera world, separate HUD caption, signed hit-testing, and visible-terrain culling. Sprite definitions remain independent of world dimensions.

## Evidence and remaining limits

18 model/camera tests pass. `docs/map-expansion/browser-check.mjs` checks the integrated controls, negative-coordinate construction, gesture safety, and saved expanded-city reload. Run in `nix develop` with Playwright available; optional CITY_PLAYWRIGHT_MODULE and CITY_CHROMIUM_PATH select existing installations, CITY_URL selects dev/preview. Screenshots in that folder are actual browser output.

A local populated 64×64 smoke test used 32 homes, four stores, 342 roads, and 32 active trips. Physical mobile-device load testing remains outstanding. Unlimited cars, congestion, and external-city tutorial/skip progression are not implemented by expansion. Preserve the explicit gateway location in future work; do not relocate it accidentally when adding land.
