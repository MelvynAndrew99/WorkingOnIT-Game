# Approved service building artwork

September 9, 2026. **User approved this set on September 9, 2026.** The atlas now includes these service buildings; the game selects them by building kind and entrance side.

Open [the interactive review](review.html) or [the comparison sheet](comparison.png). The comparison shows existing home/store artwork beside the new designs, then the tall footprint and a native-resolution strip. The review page switches entrance-side variants and display scale; the sprite exports contain architecture only. The actual road-access arrow remains part of the game renderer and is not shown in this preview.

- **Fire station:** brick hose tower, flame emblem, industrial roof and shuttered vehicle bays.
- **Police station:** blue civic portico, gold shield, distinct divided windows and small mast.
- **Hospital / EMS:** pale stepped wings, prominent teal medical symbol, clinical glazing and a shuttered ambulance bay on the wide facade.

All use the existing fixed viewpoint and native 16 pixels per logical tile. Each service has four named exports: `south`, `west`, `north`, `east`. South/north are **48×32**, west/east are **32×48**, corresponding to the existing 3×2 / 2×3 footprint. The building facade stays upright. North and lateral versions replace active front entrances with windows or closed shutters; north/south or west/east do not rotate the artwork. Identical west/east facade files are intentional: the map's entrance apron/arrow carries the different access location. Closed shutters are architectural details, not extra simulation entrances.

## Editable source and provenance

[generate.mjs](generate.mjs) is the editable, deterministic pixel composition source. It imports the project's `tools/png.mjs`, reads frame rectangles from generated `src/game/cityAtlas.ts`, and samples `public/images/city/city-atlas.png`. Existing roof and wall pieces are from Kenney Roguelike Modern City (CC0); the untouched source and license remain under `src/assets/source/kenny/kenney_roguelike-modern-city/`. Service-specific shapes, palette accents, symbols and facade details were drawn programmatically by a Codex subagent. No image-generation model or external image service was used; no source images were uploaded.

Regenerate from the repository root:

```sh
nix develop -c node docs/artwork/service-buildings/generate.mjs
```

The generator writes only candidate PNGs in this folder, including `current-home.png` and `current-store.png` for comparison. Those reference renders reproduce skin 0 of `buildingPieces` with rounding to native pixel boundaries; they are not captured game screenshots. The PNG sheet uses a small embedded alphabet rather than the digits-only helper in `tools/png.mjs`.

## Integration

`tools/build-city-atlas.mjs` packs the approved PNGs as `building_{kind}_{side}` frames and validates their dimensions. `cityArt.ts` selects the service image from building kind and entrance side, sizing it to the already-rotated model footprint. Homes/stores retain their existing compositions. The plot, entrance apron, connection/status decorations and actual road entrance marker remain separate. Building dimensions, dispatch, collision behavior, entrance geometry, funds and saves are unchanged.

Verify actual phone zoom and all four orientations when revising these assets. The comparison is a visual candidate review, not proof of integrated gameplay. At native scale the major symbols and silhouettes carry identity; individual bricks and shutter lines are incidental. Tall versions have deeper roofs because their logical footprints are taller, not because the facade rotates. There are no animated shutters, parked emergency vehicles, alternative skin families, or new vehicle sprites in this bounded set.

## Verification

Production build passed after integration and label fixes. [browser-check.mjs](browser-check.mjs) checks all four orientations at 320×640, 390×844, and 1440×900, with isolated saves, loaded native frame sizes and no page errors. All twelve combinations passed. Screenshots `in-game-{width}-rotation-{0..3}.png` show the actual game. [Hospital placement preview](in-game-hospital-placement.png) verifies the approved art appears in the construction ghost without placing a building. Visual inspection confirmed the silhouettes, upright orientation and clear entrance arrows. Station names sit above the roof, or above the access tile for north entrances. Physical-device performance and player recognition remain unmeasured.

## Proposed reusable lesson

Status: **proposed**, for lead review. For service buildings that share a footprint, distinct roof massing and facade structure can carry identity alongside color and a large symbol. Retain a native-pixel comparison against existing art and preserve a code-editable source, then verify normal phone zoom before adoption. Evidence here is deterministic export and visual inspection of both footprint shapes; in-game readability and player recognition remain untested. User selection remains the artwork adoption boundary.
