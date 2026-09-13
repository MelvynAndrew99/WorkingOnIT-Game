# Claude-only artwork follow-up

**Completed and installed2026-09-13:** Claude resumed after the reset and delivered both64-frame sets. User approved runtime integration; the main atlas now contains the unchanged source pixels and the renderer selects actual saved entrances. The earlier limit/status below is historical. See [delivery](README.md#artwork-status).

User correction2026-09-13: the coral/plum4×4 building reads as an office; lightly adapt it for office use. Create a distinct residential apartment block,4 residents upgrading to6. Multiple blocks connect through community roads and join via UI. User explicitly assigns all artwork to Claude.

Actual installed Claude jobs were invoked. The first authored selectable-entrance source and a64-frame sheet in `docs/artwork/housing/apartment/`. The correction job started `docs/artwork/offices/lot-kit.mjs` and dependency-free PNG helpers in that folder and `docs/artwork/housing/residential-apartment/`. Both then reported **session limit, resets2:40pm America/New_York**. New office/residential artwork is incomplete and is **not installed**. Code placeholders remain in the running game. Preserve the existing original house art and main atlas.

Resume Claude's art work, limited to the two new folders:

- Office: keep the current flat-roof coral/plum identity, change signage and appropriate details to office. Eight work spaces upgrading to16 are provisional model capacity, not numbers to bake into art.
- Residential: distinct modest apartment block on a4×4 lot, visual upgrade corresponding to4→6 residents. Modular for communities; no enclosing walls/roads outside its lot.
- Both:64×64 native sprites, four level1 primary rotations plus4×15 level2 entrance choices. Separate512×512 sheet +JSON manifest for each type is ready for future renderer integration.
- Fixed primary offsets relative to lot origin: rotation0 south `(0,4)`,1 west `(-1,0)`,2 north `(3,-1)`,3 east `(4,3)`.
- Second entrance can be any other cardinal perimeter tile: north `(x,-1)`, east `(4,y)`, south `(x,4)`, west `(-1,y)`, x/y0..3. First entrance never moves. Exactly two visible driveways after upgrade.
- Suggested keys `office_1_S`, `office_2_S_N_0`; residential uses `apartment_…`. For north/south, offset means world x; east/west uses world y. Keep buildings upright.
- Manifest frame records: x/y/w/h, level, rotation, primary/secondary road-tile offsets. Review same-side, corner and opposite-side examples beside original homes at native and enlarged size.

Do not have another implementer redesign or patch these images without the user's direction. Game logic is independent of sprites; final artwork can replace placeholders without save migration.
