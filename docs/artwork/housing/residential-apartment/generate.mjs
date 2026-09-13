/**
 * Residential apartment block artwork: a modest brick walk-up on a 4x4 lot, with a fixed primary
 * entrance plus a PLAYER-CHOSEN second entrance.
 * Run from the repository root: nix develop -c node docs/artwork/housing/residential-apartment/generate.mjs
 *
 * Artwork only. Nothing here is packed into the approved city atlas and nothing in src/ or
 * public/ is written; this folder ships its own sheet and manifest for the lead to review. The
 * approved house art is untouched, and the earlier coral/plum block (now the office identity) is
 * preserved unchanged in docs/artwork/housing/apartment/.
 *
 * Identity at play zoom (one native pixel is ~3 screen pixels), against the two neighbours it has
 * to be told apart from:
 *   - vs the homes: three times the footprint, a long horizontal ridge, repeated identical units,
 *     cream string courses and cream balconies, red brick instead of cream render;
 *   - vs the office: pitched grey shingle roof with eaves instead of a flat charcoal parapet,
 *     brick instead of coral stucco, no plum and no signage, punched unit windows instead of
 *     ribbon glazing.
 * Nothing is yellow: yellow stays reserved for waiting markers.
 *
 * The resident count is drawn, not labelled: one balconied unit per resident, so the upgrade is
 * literally countable. Level 1 has two upper floors of two units (4 residents); level 2 adds a
 * third floor and a second front door (6 residents). The ground floor is the shared entrance.
 *
 * Modular for connected communities: the block is narrower than its lot and the planted verge is
 * drawn only beside paving, never as a wall around the whole lot, so blocks placed on adjoining
 * lots read as one development rather than four fenced islands (see review-community.png).
 *
 * Outputs (this folder only): apartment-sheet.png + apartment-sheet.json (64 frames, 512x512),
 * apartment-frames.ts, review-levels.png, review-choices.png, review-community.png,
 * review-neighborhood.png, review-neighborhood-native.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  blank, read, write, blit, box, shade, tile, grassLot, initAtlas,
  S, T, C, PRIMARY, PERIMETER, variantList, resetMask, mark, free,
  pave, makeRing, walks, shrub, tree, flowers, packSheet, frameTable, cellSheet, Z,
} from './lot-kit.mjs';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(OUT, '../../../..');
initAtlas(ROOT);

// ---------------------------------------------------------------------------
// The block. Narrower than the office and centred on the lot, grown upward from a fixed base
// line, so the same building fits every combination of chosen driveways.
// ---------------------------------------------------------------------------
const BW = 38, BX = 13, BASE = 53;
const ROOF = 7, EAVE = 2, FLOOR = 8, GROUND = 9;
/** Upper floors of two units each: 4 residents at level 1, 6 at level 2. */
const FLOORS = { 1: 2, 2: 3 };
const RESIDENTS = { 1: 4, 2: 6 };
const height = level => ROOF + FLOOR * FLOORS[level] + GROUND + 1;
/** Front door centres (x within the block). Level 1 keeps its door on upgrade. */
const DOORS = { 1: [19], 2: [9, 29] };
/** Ground-floor window centres (x within the block), around whichever doors that level has. */
const GROUND_WINDOWS = { 1: [7, 31], 2: [19] };
/** Unit window centres (x within the block): two per upper floor. */
const UNITS = [10, 28];
const RING = makeRing(6, 57);

function unitWindow(im, cx, y) {
  box(im, cx - 3, y, 7, 5, 'ink');
  box(im, cx - 2, y + 1, 5, 3, 'glass');
  box(im, cx - 2, y + 1, 5, 1, 'glassLight');
  box(im, cx, y + 1, 1, 3, 'creamDark');                                               // centre mullion
  box(im, cx - 3, y + 5, 7, 1, 'creamDark');                                           // sill
}
/** A cream balcony per unit: the countable "one more household lives here" detail. */
function balcony(im, cx, y) {
  box(im, cx - 5, y, 11, 3, 'ink');
  box(im, cx - 4, y, 9, 1, 'cream');                                                   // rail
  box(im, cx - 4, y + 1, 9, 1, 'creamDark');
  for (let i = 0; i < 9; i += 2) box(im, cx - 4 + i, y + 1, 1, 1, 'cream');            // balusters
  box(im, cx - 4, y + 2, 9, 1, shade(110));                                            // slab underside
}
function groundWindow(im, cx, y) {
  box(im, cx - 3, y, 7, 4, 'ink');
  box(im, cx - 2, y + 1, 5, 2, 'glass');
  box(im, cx - 2, y + 1, 5, 1, 'glassLight');
  box(im, cx - 3, y + 4, 7, 1, 'creamDark');
}
/** A timber door in a cream entrance surround, under a cream canopy. `base` is the ground line. */
function porch(im, cx, base) {
  const x = cx - 5;
  box(im, x - 1, base - 10, 13, 2, 'ink');                                             // canopy
  box(im, x, base - 10, 11, 1, 'cream');
  box(im, x, base - 9, 11, 1, 'creamDark');
  box(im, x, base - 8, 11, 8, 'ink');                                                  // surround
  box(im, x + 1, base - 7, 9, 7, 'cream');
  box(im, x + 1, base - 7, 9, 1, 'creamDark');
  box(im, x + 2, base - 6, 7, 6, 'doorDark');
  box(im, x + 3, base - 5, 5, 5, 'door');
  box(im, x + 3, base - 5, 5, 2, 'glass'); box(im, x + 3, base - 5, 5, 1, 'glassLight');
  box(im, x + 7, base - 2, 1, 1, 'cream');                                             // handle
}
/** Draw at (x, base): x is the block's left edge, base the row below its ground floor. */
function building(im, level, x, base) {
  const floors = FLOORS[level], h = height(level), top = base - h;
  box(im, x + 2, top + 3, BW, h, shade(85));                                           // drop shadow
  const wallTop = top + ROOF;
  // Brick body with cream quoins at the corners.
  box(im, x, wallTop, BW, base - wallTop, 'ink');
  box(im, x + 1, wallTop, BW - 2, base - wallTop, 'brick');
  box(im, x + 1, wallTop, 1, base - wallTop, 'brickLight');
  box(im, x + BW - 2, wallTop, 1, base - wallTop, 'brickDark');
  for (let y = wallTop + 1; y < base - 1; y += 3) {                                    // light masonry courses
    for (let i = 2 + ((y / 3 | 0) % 2) * 3; i < BW - 3; i += 6) box(im, x + i, y, 2, 1, 'brickDark');
  }
  // Upper floors: a cream string course, then two units.
  for (let f = 0; f < floors; f++) {
    const fy = wallTop + f * FLOOR;
    box(im, x + 1, fy, BW - 2, 1, 'cream');
    box(im, x + 1, fy + 1, BW - 2, 1, 'creamDark');
    for (const u of UNITS) unitWindow(im, x + u, fy + 2);
  }
  // Ground floor: string course, windows, doors and a rendered base course.
  const gy = base - GROUND - 1;
  box(im, x + 1, gy, BW - 2, 1, 'cream');
  box(im, x + 1, gy + 1, BW - 2, 1, 'creamDark');
  for (const w of GROUND_WINDOWS[level]) groundWindow(im, x + w, gy + 3);
  box(im, x + 1, base - 1, BW - 2, 1, 'cream');
  box(im, x + 1, base - 2, BW - 2, 1, 'creamDark');
  for (const d of DOORS[level]) porch(im, x + d, base);
  // Balconies last, so each one sits over the course below it.
  for (let f = 0; f < floors; f++) for (const u of UNITS) balcony(im, x + u, wallTop + f * FLOOR + 7);
  // Shallow hipped shingle roof with eaves: the silhouette that separates it from the flat-roofed
  // office, at a scale no single-family home reaches.
  const rw = BW + EAVE * 2, rx = x - EAVE;
  box(im, rx, top + ROOF, rw, 1, shade(90));                                           // eaves shadow
  box(im, rx, top, rw, ROOF, 'ink');
  box(im, rx + 1, top + 1, rw - 2, ROOF - 2, 'shingle');
  box(im, rx + 3, top + 1, rw - 6, 1, 'shingleLight');                                 // ridge cap catching light
  box(im, rx + 1, top + 2, rw - 2, 1, 'shingleLight');
  box(im, rx + 1, top + ROOF - 3, rw - 2, 1, 'shingleDark');                           // shaded lower pitch
  for (let j = 3; j < ROOF - 3; j++)
    for (let i = (j & 1) ? 1 : 3; i < rw - 3; i += 5) box(im, rx + 1 + i, top + j, 2, 1, 'shingleDark');
  box(im, rx + 1, top + ROOF - 2, rw - 2, 1, 'cream');                                 // cream gutter on the eaves
  box(im, rx + 1, top + ROOF - 1, rw - 2, 1, 'creamDark');
  box(im, x + BW - 12, top + 1, 5, 5, 'ink');                                          // brick chimney
  box(im, x + BW - 11, top + 2, 3, 4, 'brickDark');
  box(im, x + BW - 11, top + 1, 3, 1, 'cream');
  if (level === 2) { box(im, x + 6, top + 2, 4, 4, 'ink'); box(im, x + 7, top + 3, 2, 3, 'metal'); } // stair-core vent
}

// ---------------------------------------------------------------------------
// Garden: trees, beds and (level 2) a residents' bench, wherever the chosen driveways and walks
// left room. Nothing is drawn outside the lot, and there is no wall around it.
// ---------------------------------------------------------------------------
function garden(im, level, entrances) {
  if (level === 2) {
    for (const [x, y] of [[20, 2], [20, 54], [2, 20], [54, 20]]) {
      const vertical = x !== 20;
      const [w, h] = vertical ? [9, 24] : [24, 9];
      if (!free(x, y, w, h)) continue;
      if (vertical) {
        box(im, x + 1, y + 12, 1, 12, 'bench'); box(im, x + 3, y + 12, 1, 12, 'bench');
        box(im, x + 4, y + 12, 1, 12, 'tankDark');
        box(im, x + 5, y + 13, 2, 1, 'ink'); box(im, x + 5, y + 22, 2, 1, 'ink');
        shrub(im, x + 1, y + 2, 7, 7);
      } else {
        box(im, x + 12, y, 12, 1, 'bench'); box(im, x + 12, y + 2, 12, 1, 'bench');
        box(im, x + 12, y + 3, 12, 1, 'tankDark');
        box(im, x + 13, y + 4, 1, 2, 'ink'); box(im, x + 22, y + 4, 1, 2, 'ink');
        shrub(im, x + 2, y, 7, 7);
      }
      mark(x, y, w, h);
      break;
    }
  }
  // A street tree on the side the block opens onto, then shrubs in the remaining margins.
  const near = entrances[0];
  const spots = [[26, 2], [26, 52], [2, 26], [52, 26]]
    .map(([x, y]) => ({ x, y, d: Math.abs(x + 5 - (near.x * T + T / 2)) + Math.abs(y + 5 - (near.y * T + T / 2)) }))
    .sort((a, b) => a.d - b.d);
  for (const s of spots) if (free(s.x - 1, s.y - 1, 12, 13)) { tree(im, s.x, s.y); mark(s.x - 1, s.y - 1, 12, 13); break; }
  let placed = 0;
  for (const [x, y] of [[2, 2], [55, 2], [2, 55], [55, 55], [2, 30], [55, 30], [30, 2], [30, 55]]) {
    if (placed >= 4 || !free(x - 1, y - 1, 8, 8)) continue;
    shrub(im, x, y, 6, 5); mark(x - 1, y - 1, 8, 8); placed++;
  }
  for (const [x, y, w] of [[BX - 9, BASE - 6, 8], [BX + BW + 2, BASE - 6, 8]]) if (free(x, y, w, 3)) flowers(im, x, y, w);
}

function apartment(level, primary, secondary) {
  const im = blank(S, S);
  resetMask();
  grassLot(im);
  const entrances = secondary ? [primary, secondary] : [primary];
  pave(im, entrances, { hedgeSpan: 'lane' });
  walks(im, { doors: DOORS[level].map(d => BX + d), base: BASE, entrances, ring: RING, color: 'walk', edge: 'walkEdge' });
  mark(BX - EAVE - 1, BASE - height(level) - 1, BW + EAVE * 2 + 4, height(level) + 6);
  garden(im, level, entrances);
  building(im, level, BX, BASE);
  return im;
}

// ---------------------------------------------------------------------------
// Sheet: 64 frames of 64x64 in a 512x512 image (4 level-1 rotations + 4 x 15 level-2 choices).
// ---------------------------------------------------------------------------
const variants = variantList('apartment');
const { sheet, sprites, frames } = packSheet(
  variants,
  v => apartment(v.level, v.primary, v.secondary),
  v => ({ floors: FLOORS[v.level] + 1, residents: RESIDENTS[v.level], units: FLOORS[v.level] * UNITS.length }),
);
write(sheet, path.join(OUT, 'apartment-sheet.png'));
fs.writeFileSync(path.join(OUT, 'apartment-sheet.json'), JSON.stringify({
  version: 1,
  sheet: 'apartment-sheet.png',
  note: 'Residential apartment lot art with a fixed primary entrance and a player-chosen second entrance. Lot-local pixel origin is lot tile (0,0); entrance tiles are the road tiles just outside the lot. `residents`/`units` describe what the art draws (one balconied unit per resident); parking stalls are decorative and are not a capacity claim.',
  frameSize: S, tileSize: T, lotTiles: { w: 4, h: 4 },
  keyFormat: {
    level1: 'apartment_1_<primarySide>',
    level2: 'apartment_2_<primarySide>_<secondSide>_<secondOffset>',
    offsetAxis: 'N/S offsets are world x 0..3; E/W offsets are world y 0..3',
  },
  levels: Object.fromEntries([1, 2].map(l => [l, {
    floors: FLOORS[l] + 1, residents: RESIDENTS[l], units: FLOORS[l] * UNITS.length, entrances: l === 1 ? 1 : 2,
  }])),
  primaryByRotation: PRIMARY.map(p => ({ rotation: p.rotation, side: p.side, offset: p.offset, x: p.x, y: p.y })),
  perimeterTiles: PERIMETER.map(p => ({ side: p.side, offset: p.offset, x: p.x, y: p.y })),
  frames,
}, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'apartment-frames.ts'), frameTable(
  'APARTMENT_FRAMES', variants, frames, sheet,
  'Level 1: apartment_1_<primarySide>. Level 2: apartment_2_<primarySide>_<secondSide>_<secondOffset>,\n * offsets on the world axis (N/S: x 0..3, E/W: y 0..3).',
));

// ---------------------------------------------------------------------------
// Review sheets. Teal marks the fixed primary entrance tile, pink the chosen second one;
// in game the access arrow does this. Roads are drawn on every edge an entrance uses.
// ---------------------------------------------------------------------------
const find = (level, pSide, sSide, sOffset) => {
  const primary = PRIMARY.find(p => p.side === pSide);
  const secondary = sSide ? PERIMETER.find(p => p.side === sSide && p.offset === sOffset) : null;
  const key = level === 1 ? `apartment_1_${pSide}` : `apartment_2_${pSide}_${sSide}_${sOffset}`;
  if (!sprites[key]) throw Error(`no frame ${key}`);
  return { key, primary, secondary };
};
const sameStreet = { S: ['S', 3], W: ['W', 3], N: ['N', 0], E: ['E', 0] };
write(cellSheet(sprites, [
  ...PRIMARY.map(p => ({ ...find(1, p.side), label: `L1 ${p.side} 4` })),
  ...PRIMARY.map(p => ({ ...find(2, p.side, ...sameStreet[p.side]), label: `L2 ${p.side}+${sameStreet[p.side][0]}${sameStreet[p.side][1]} 6` })),
], 4, 'apartment levels and rotations: 4 residents upgrading to 6'), path.join(OUT, 'review-levels.png'));
write(cellSheet(sprites, [
  ...[['S', 3], ['E', 3], ['W', 0], ['N', 0]].map(([s, o]) => ({ ...find(2, 'S', s, o), label: `S+${s}${o}` })),
  ...[['W', 3], ['N', 0], ['S', 3], ['E', 0]].map(([s, o]) => ({ ...find(2, 'W', s, o), label: `W+${s}${o}` })),
  ...[['N', 0], ['W', 0], ['E', 0], ['S', 3]].map(([s, o]) => ({ ...find(2, 'N', s, o), label: `N+${s}${o}` })),
  ...[['E', 0], ['S', 3], ['N', 3], ['W', 1]].map(([s, o]) => ({ ...find(2, 'E', s, o), label: `E+${s}${o}` })),
], 4, 'second entrance: same side, both corners, opposite side'), path.join(OUT, 'review-choices.png'));

// ---------------------------------------------------------------------------
// Context sheets, at 4x and at the size the player actually sees.
// ---------------------------------------------------------------------------
/** Lift one frame out of a packed sheet, so a review can place art owned by the sibling folder. */
const blitFrame = (sheetImage, f) => {
  const im = blank(S, S);
  blit(im, sheetImage, f.x, f.y, S, S, 0, 0);
  return im;
};
const scene = (tilesW, tilesH, roadRow, place) => {
  const im = blank(tilesW * T + 16, tilesH * T + 16, C.sheetDark);
  for (let j = 0; j < tilesH; j++) for (let i = 0; i < tilesW; i++) tile(im, (i + j) % 2 ? 'grassA' : 'grassB', 8 + i * T, 8 + j * T);
  for (let i = 0; i < tilesW; i++) tile(im, 'road10', 8 + i * T, 8 + roadRow * T);
  place((src, tx, ty, size = S) => blit(im, src, 0, 0, size, size, 8 + tx * T, 8 + ty * T));
  const big = blank(im.width * Z, im.height * Z);
  blit(big, im, 0, 0, im.width, im.height, 0, 0, Z);
  return [big, im];
};
// Four blocks on adjoining lots sharing one street: the modular / connected-community check.
const [communityBig] = scene(16, 6, 4, put => {
  put(sprites['apartment_1_S'], 0, 0);
  put(sprites['apartment_2_S_S_3'], 4, 0);
  put(sprites['apartment_1_S'], 8, 0);
  put(sprites['apartment_2_S_S_2'], 12, 0);
});
write(communityBig, path.join(OUT, 'review-community.png'));
// The approved homes and both apartment levels on the same road.
const homes = [0, 1, 2, 3].map(v => read(path.join(ROOT, 'docs/artwork/housing', `home-${v}-south.png`)));
const [hoodBig, hood] = scene(14, 6, 4, put => {
  put(homes[0], 0, 2, 32);
  put(sprites['apartment_1_S'], 2, 0);
  put(homes[2], 6, 2, 32);
  put(sprites['apartment_2_S_S_3'], 8, 0);
  put(homes[3], 12, 2, 32);
});
write(hoodBig, path.join(OUT, 'review-neighborhood.png'));
write(hood, path.join(OUT, 'review-neighborhood-native.png'));                          // how small it really is
// Told apart from both neighbours on one street: home, office, apartment, home.
const officeSheet = path.join(ROOT, 'docs/artwork/offices/office-sheet.png');
if (fs.existsSync(officeSheet)) {
  const office = read(officeSheet);
  const officeFrame = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/artwork/offices/office-sheet.json'), 'utf8')).frames['office_2_S_S_3'];
  const [mixBig, mix] = scene(18, 6, 4, put => {
    put(homes[1], 0, 2, 32);
    put(sprites['apartment_2_S_S_3'], 2, 0);
    put(homes[0], 6, 2, 32);
    put(blitFrame(office, officeFrame), 8, 0);
    put(homes[3], 12, 2, 32);
    put(sprites['apartment_1_S'], 14, 0);
  });
  write(mixBig, path.join(OUT, 'review-vs-office.png'));
  write(mix, path.join(OUT, 'review-vs-office-native.png'));
}
console.log(`Wrote ${variants.length} frames to apartment-sheet.png (${sheet.width}x${sheet.height}), manifest and review sheets in ${OUT}`);
