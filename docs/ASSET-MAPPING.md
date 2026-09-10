# City artwork: source packs and tile mapping

September 8, 2026. Maintenance record for the graphics pass. Gameplay direction is in
docs/DESIGN.md; user intent and approval boundaries are in AGENTS.md.

## Licences and what is stored where

Both packs are Kenney, Creative Commons Zero (CC0): free for personal, educational and
commercial use, crediting optional. The downloaded packs stay **unmodified** in the repo,
licence files included:

| Pack | Path | Grid |
| --- | --- | --- |
| Roguelike Modern City 2.0 (2022-10-29) | `src/assets/source/kenny/kenney_roguelike-modern-city/` | 16×16 px tiles, 1 px spacing, 37×28 tiles |
| RPG Urban Pack 1.0 (2019-01-05) | `src/assets/source/kenny/kenney_rpg-urban-pack/` | 16×16 px tiles, 1 px spacing, 27×18 tiles |

Nothing loads from `src/assets/source/` at runtime. `tools/build-city-atlas.mjs` copies the
tiles the game actually uses into one packed sheet. **Only Roguelike Modern City is used** —
see the vehicle note below for why the RPG Urban Pack was tried and dropped. Its files stay in
the repo untouched.

- `public/images/city/city-atlas.png` — 256×161 px, ~17 KB, 103 frames
- `src/game/cityAtlas.ts` — generated frame rectangles (geometry only, do not hand-edit)

Rebuild after changing the tile picks:

```bash
nix develop -c node tools/build-city-atlas.mjs
```

The atlas is listed in `src/assets/manifest.ts` under the `critical` bundle, so the loading
screen warms it before the menu appears.

## Style choice

**Roguelike Modern City, throughout.** It is the only one of the two packs with a real road
kit — flat asphalt, lane dashes, junction marks and single-pixel kerb lines that can be
recombined per neighbour — plus nine-slice roofs, wall strips, shopfronts, awnings and signs
that compose to any building footprint. That matters more than decoration here: the goal was
readable construction feedback and legible traffic.

### Why the RPG Urban Pack is not used

It was used for vehicles in the first pass, on the reading that its cars were true overhead
sprites that could be rotated to any heading. **That was wrong.** They are front elevations:
you see a windscreen, a grille, headlights and two front wheels. Worse, the car sprites are
24×22 px — wider than they are long — so at every rotation they read as driving sideways,
which is exactly how they looked in play.

Neither pack has rotatable top-down cars. Modern City instead ships each vehicle as four
fixed-viewpoint views, which is the right answer anyway: the whole town is drawn as upright
facades on a flat ground plane, so a car should show its side, front or back from that same
viewpoint rather than spinning like a top-down sprite.

The RPG Urban pack stays in the repo — untouched, licence included — in case a later
milestone wants its pedestrians or its road furniture.

## Tile mapping

Coordinates are `column,row` in the pack's `Tilemap/tilemap.png` (tile 16 px, stride 17 px).

### Roguelike Modern City

| Atlas frame(s) | Source | Use |
| --- | --- | --- |
| `grassA`, `grassB` | 0,24 · 1,24 | Ground, alternating by a stable per-tile hash |
| `dirt` | 4,24 | Tint base for an entrance with no road yet |
| `plot`, `plotWorn` | 0,20 · 1,21 | Pavement under building footprints and the access apron |
| `road0`…`road15` | composed (below) | One baked variant per cardinal-neighbour mask |
| `arrowN/E/S/W` | 19,21 · 19,24 · 19,22 · 19,23 | Access marker painted on the entrance tile |
| `roof_{red,grey,pale,tan}_{tl,tr,t,l,bl,br,b,r,mid}` | col offsets 0/8/16/24, rows 0–1 | Roof nine-slice, one family per building skin |
| `wall_{brick,stone,sand}_{one,l,m,r}` | col offsets 0/4/8, row 5 | Facade strip (single, left, middle, right) |
| `windowHome` | 26,17 | Home facade window |
| `windowFlat` | 25,19 | Spare plain pane |
| `shopGlassL/shopGlass/shopGlassR` | 20,24 · 21,24 · 22,24 | Store front glazing with its green display band |
| `doorHome` | 20,27 | Front door, drawn only on a south-facing entrance |
| `doorStore` | 25,25 | Shop door, same rule |
| `awningGreen`, `awningOrange` | 24,12 · 28,12 | Store awning strip under the roof |
| `signBar`, `signDots` | 32,8 · 32,9 | Store sign on the roof face |
| `tree_green/amber/pine` | 31,10-11 · 32,10-11 · 33,10-11 | Scenery on empty grass |
| `bush` | 31,13 | Scenery on empty grass |
| `crateFruit`, `crateVeg` | 12,18 · 13,18 | Produce crate outside a connected store |
| `cone` | 14,18 | Spare prop |

Road variants are **composed**, not copied. Each is plain asphalt (11,19 — the one perfectly
flat asphalt tile in the pack) plus markings lifted off their own background:

- kerb line on each side with **no** road neighbour: 18,22 (top) · 17,22 (bottom) · 18,21 (left) · 17,21 (right)
- centre dash on a straight run: 9,20 (north–south) · 9,19 (east–west)
- white cross at a four-way junction: 12,19

That gives corners, T-junctions, crossroads, dead ends and isolated stubs from one 4-bit
lookup at runtime (`roadFrame(mask)` in `src/game/cityArt.ts`).

### Vehicles

Three vehicles, four views each, never rotated. Each occupies six columns of the sheet:

| Atlas frame | Source tiles | View |
| --- | --- | --- |
| `car_{colour}_W` | 31–33, r … r+1 | Side, facing west (white headlight left, amber indicator right) |
| `car_{colour}_E` | 34–36, r … r+1 | Side, facing east |
| `car_{colour}_N` | 31–32, r+2 … r+3 | Rear — a car driving away shows its back (amber lamps low) |
| `car_{colour}_S` | 33–34, r+2 … r+3 | Front — a car driving towards you (white headlights low) |

`r` is 16 for `green`, 20 for `silver`, 24 for `amber`. All twelve frames are trimmed to their
opaque content, so the renderer can size a vehicle by real width rather than by transparent
padding. `silver` doubles as a tintable base, giving six visually distinct trip vehicles from
three sets.

`facingFor(dx, dy, previous)` in `cityArt.ts` picks the view from the movement vector and
holds the previous facing when a step has no direction. There is no sprite rotation anywhere.

## How the pieces become buildings

`src/game/cityArt.ts` holds every visual decision; `src/game/cityScene.ts` only turns model
tiles into positions. Simulation code never sees an atlas coordinate.

- The footprint's last row is the facade; every row above it is roof, nine-sliced.
- Skins are chosen from the building's stable id, so a building always looks the same.
- A store gets glazing across the facade, an awning under the roof and a sign; a home gets
  windows.
- **Doors appear only where the entrance actually is.** The model's `entrance()` decides which
  footprint tile touches the access tile and on which face. A south face gets a real front
  door. North, east and west faces get a paved apron instead — never a door, because a door on
  a wall with no road access would advertise an entrance the simulation does not have.
- The access tile itself carries the marker: a painted arrow pointing at the building, green
  when the building is genuinely connected and amber when it is not, on a dark pad so it reads
  over both grass and asphalt. With no road there yet, the tile also gets a tinted dirt patch
  and a coloured border.

Screenshots of all eight orientations (home and store × four rotations) are in
`docs/city-graphics/orientations-all-eight.png`.

## Known limitations

- The pack's side views are hatchbacks but its front and rear views are boxy vans, so a
  vehicle changes silhouette when it turns a corner. Colour carries the identity instead. This
  is the pack's own inconsistency, not something the renderer can fix without redrawing art.
- Store art faces south in every rotation, so a store whose access is north shows its
  shopfront away from the road. That is the honest reading of "artwork stays upright"; the
  alternative was rotating facades, which AGENTS.md rules out.
- The map still fits entirely on screen, so on a 320 px phone tiles are small targets. Camera
  and expansion controls are separate, in-progress work (see docs/MAP-EXPANSION-HANDOFF.md);
  the renderer already derives its bounds from `city.map` rather than the starter constants,
  so it will follow a larger map without further changes to the drawing code.
- Vehicles occupy a lane offset but do not queue, avoid each other or stop at junctions. The
  art supports that later; the model does not model it yet.
- No crosswalk, traffic-light or gateway art is used yet. Modern City contains all three if
  the external-connection milestone wants them.

## Approved service buildings (2026-09-09)

The atlas also includes twelve user-approved service frames, `building_{hospital,fireStation,policeStation}_{N,E,S,W}`, from [the service building source folder](artwork/service-buildings/README.md). These combine Kenney roof/wall textures with code-drawn service details. Native sizes are 48×32 for north/south access and 32×48 for east/west. `cityArt.ts` chooses by kind and actual entrance side; the scene preserves the separate plot/apron/road arrow and placement tint. The atlas builder checks dimensions before packing.

## Approved emergency vehicles (2026-09-09)

`car_{police,ems,fire}_{N,E,S,W}` frames come from the [editable service-vehicle source](artwork/service-vehicles/README.md). The user approved the code-drawn patrol car, box ambulance and ladder-equipped engine. Frames retain native 36×24 side and 22×29 front/rear canvases. `vehicleView` selects by service/facing; the scene consumes persisted lane shift and only flashes lights during response/scene work. Simulation footprints remain independent of sprite dimensions.

## Kenney diversion and prepared roadworks props (2026-09-10)

Modern City 16px tiles (17px stride): `barrierOrange` (24,5), `barrierWarning` (24,6), `barrierYellow` (24,7), plus existing `cone` (14,18). `workSurface` composes asphalt (11,19) with dirt (4,24); `detourN/E/S/W` combine barrier palette/legs with the existing directional arrow markings. All source coordinates are zero-based. The warning barrier and cone now render existing Divert tiles; remaining frames are prepared for future mechanics. See [preview and verification](artwork/roadworks/README.md). Previous atlas frame pixels are preserved.
