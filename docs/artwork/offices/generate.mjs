/**
 * Office lot artwork: the approved coral/plum flat-roof block, lightly adapted to read as an
 * office, with a fixed primary entrance plus a PLAYER-CHOSEN second entrance.
 * Run from the repository root: nix develop -c node docs/artwork/offices/generate.mjs
 *
 * Artwork only. Nothing here is packed into the approved city atlas and nothing in src/ or
 * public/ is written; this folder ships its own sheet and manifest for the lead to review.
 *
 * What changed from the original coral/plum block (docs/artwork/housing/apartment/, preserved):
 *   - a full-width plum fascia under the roof carrying OFFICE in white: the identity at play zoom;
 *   - continuous ribbon glazing with metal mullions instead of the residential punched-window
 *     grid, and a glazed ground-floor shopfront;
 *   - rooftop plant (condensers, a duct run and a comms mast with a dish) instead of the
 *     residential water tanks;
 *   - a plum entrance canopy over glass double doors, and a small plum pylon sign on the forecourt.
 * Kept: the coral stucco body, plum banding, flat charcoal roof with parapet and gravel, the
 * planted verge along every street edge, and the 64x64 / 4x4-lot geometry.
 *
 * Capacity (8 work spaces, 16 upgraded) is provisional model data and is NOT drawn: the stalls
 * and glazing are decorative. Only the entrance geometry is a contract.
 *
 * Outputs (this folder only): office-sheet.png + office-sheet.json (64 frames, 512x512),
 * office-frames.ts, review-levels.png, review-choices.png, review-neighborhood.png,
 * review-neighborhood-native.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  blank, read, write, blit, box, word, wordWidth, shade, tile, grassLot, initAtlas,
  S, T, C, PRIMARY, PERIMETER, variantList, resetMask, mark, free,
  pave, makeRing, walks, shrub, tree, flowers, packSheet, frameTable, cellSheet, Z,
} from './lot-kit.mjs';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(OUT, '../../..');
initAtlas(ROOT);

// ---------------------------------------------------------------------------
// The building. Centred on the lot and grown upward from a fixed base line, so the same block
// fits every combination of chosen driveways. Total heights match the approved original exactly
// (33px at level 1, 40px at level 2).
// ---------------------------------------------------------------------------
const BW = 42, BX = 11, BASE = 53;
const ROOF = 8, FASCIA = 7, FLOOR = 7, GROUND = 11;
/** Ribbon-glazing floors above the ground floor. The upgrade is visibly one storey taller. */
const FLOORS = { 1: 1, 2: 2 };
/** Provisional model capacity, recorded in the manifest only; nothing in the art counts desks. */
const DESKS = { 1: 8, 2: 16 };
const height = level => ROOF + FASCIA + FLOOR * FLOORS[level] + GROUND + 1;
/** Entrance door centres (x within the building). Level 1 keeps its entrance on upgrade. */
const DOORS = { 1: [21], 2: [10, 32] };
const RING = makeRing(6, 57);

/** Continuous glazing with metal mullions: the office read, against the homes' punched windows. */
function ribbon(im, x, y, w) {
  box(im, x, y, w, 6, 'ink');
  box(im, x + 1, y + 1, w - 2, 4, 'glass');
  box(im, x + 1, y + 1, w - 2, 1, 'glassLight');
  box(im, x + 1, y + 4, w - 2, 1, 'glassDark');
  for (let i = 5; i < w - 2; i += 5) box(im, x + i, y + 1, 1, 4, 'metal');
}
function condenser(im, x, y) {
  box(im, x, y, 8, 5, 'ink'); box(im, x + 1, y + 1, 6, 3, 'metal'); box(im, x + 1, y + 1, 6, 1, 'white');
  box(im, x + 2, y + 2, 4, 2, 'metalDark'); box(im, x + 3, y + 2, 1, 2, 'metal');
}
/**
 * Comms mast with a dish: the roof detail that says "workplace", not "flats". It is kept inside
 * the parapet band so no part of the block ever reaches the road when the second entrance is north.
 */
function mast(im, x, y) {
  box(im, x + 2, y + 6, 3, 1, 'ink');                                                  // base plate
  box(im, x + 3, y + 1, 1, 6, 'metalDark');
  box(im, x + 2, y + 2, 3, 1, 'metal'); box(im, x + 2, y + 4, 3, 1, 'metal');          // stays
  box(im, x, y + 3, 2, 3, 'ink'); box(im, x, y + 4, 1, 1, 'white');                    // dish
  box(im, x + 3, y, 1, 1, 'red');                                                      // aircraft light
}
function ductRun(im, x, y, w) {
  box(im, x, y, w, 3, 'ink'); box(im, x + 1, y + 1, w - 2, 1, 'metal');
  for (let i = 2; i < w - 2; i += 3) box(im, x + i, y + 1, 1, 1, 'metalDark');
}
/** Glass double doors under a plum canopy, on the tall ground floor. `base` is the row below it. */
function entrance(im, cx, base) {
  const x = cx - 5;
  box(im, x - 2, base - 11, 15, 3, 'ink');                                             // canopy
  box(im, x - 1, base - 10, 13, 1, 'plum');
  box(im, x - 1, base - 9, 13, 1, 'plumDark');
  box(im, x - 1, base - 8, 1, 1, 'ink'); box(im, x + 11, base - 8, 1, 1, 'ink');       // canopy posts
  box(im, x, base - 8, 11, 8, 'ink');                                                  // door frame
  box(im, x + 1, base - 7, 9, 7, 'plumDark');
  box(im, x + 2, base - 6, 3, 6, 'glass'); box(im, x + 6, base - 6, 3, 6, 'glass');
  box(im, x + 2, base - 6, 3, 1, 'glassLight'); box(im, x + 6, base - 6, 3, 1, 'glassLight');
  box(im, x + 5, base - 6, 1, 6, 'metal');                                             // door leaves
}
/** Draw at (x, base): x is the building's left edge, base the row below its ground floor. */
function building(im, level, x, base) {
  const floors = FLOORS[level], h = height(level), top = base - h;
  box(im, x + 2, top + 3, BW, h, shade(85));                                           // drop shadow
  const wallTop = top + ROOF;
  box(im, x, wallTop, BW, base - wallTop, 'ink');
  box(im, x + 1, wallTop, BW - 2, base - wallTop, 'wall');
  box(im, x + 1, wallTop, 1, base - wallTop, 'wallLight');
  box(im, x + BW - 2, wallTop, 1, base - wallTop, 'wallDark');
  // Signage plaque under the parapet, held clear of the corners so the coral stucco still frames
  // it. This is the identity at play zoom; everything else stays close to the approved block.
  box(im, x + 3, wallTop, BW - 6, FASCIA, 'plum');
  box(im, x + 3, wallTop, BW - 6, 1, 'plumLight');
  box(im, x + 3, wallTop + FASCIA - 1, BW - 6, 1, 'plumDark');
  word(im, 'OFFICE', x + 3 + ((BW - 6 - wordWidth('OFFICE')) >> 1), wallTop + 1, 'white');
  // Ribbon glazing between coral pilasters.
  for (let f = 0; f < floors; f++) {
    const fy = wallTop + FASCIA + f * FLOOR;
    box(im, x + 1, fy, BW - 2, 1, 'plum');                                             // spandrel
    ribbon(im, x + 5, fy + 1, BW - 10);
  }
  // Ground floor: shopfront glazing broken by the entrance canopies.
  const gy = base - GROUND - 1;
  box(im, x + 1, gy, BW - 2, 1, 'plum');
  const doors = DOORS[level];
  let cut = x + 5;
  for (const d of [...doors.map(v => x + v), null]) {
    const stop = d === null ? x + BW - 5 : d - 8;
    if (stop - cut >= 6) ribbon(im, cut, gy + 4, stop - cut);
    if (d !== null) cut = d + 8;
  }
  box(im, x + 1, base - 1, BW - 2, 1, 'wallDark');
  for (const d of doors) entrance(im, x + d, base);
  // Flat roof with parapet and gravel: the silhouette that separates it from pitched-roof homes.
  box(im, x, top, BW, ROOF, 'ink');
  box(im, x + 1, top + 1, BW - 2, ROOF - 2, 'roofLight');
  box(im, x + 2, top + 2, BW - 4, ROOF - 4, 'roof');
  for (let j = 0; j < ROOF - 4; j++) for (let i = 0; i < BW - 4; i++)
    if ((i * 7 + j * 13) % 11 === 0) box(im, x + 2 + i, top + 2 + j, 1, 1, 'gravel');
  box(im, x + 2, top + 2, BW - 4, 1, 'roofDark');
  box(im, x + 1, top + ROOF - 1, BW - 2, 1, 'roofDark');
  box(im, x + 3, top + 4, 3, 2, 'roofDark'); box(im, x + 3, top + 4, 3, 1, 'metalDark'); // roof hatch
  condenser(im, x + 7, top + 2);
  ductRun(im, x + 17, top + 3, 8);
  if (level === 2) condenser(im, x + 26, top + 2);                                      // more plant, more floors
  mast(im, x + 35, top);
}

// ---------------------------------------------------------------------------
// Forecourt: a pylon sign at the corner nearest the street the office opens onto, then clipped
// planting in whatever margins the chosen driveways and walks left free.
// ---------------------------------------------------------------------------
function pylon(im, x, y) {
  box(im, x + 3, y + 10, 4, 1, shade(90));
  box(im, x + 4, y + 7, 2, 3, 'metalDark');
  box(im, x, y, 10, 8, 'ink');
  box(im, x + 1, y + 1, 8, 6, 'plum');
  box(im, x + 1, y + 1, 8, 1, 'plumLight');
  box(im, x + 2, y + 3, 6, 1, 'white'); box(im, x + 2, y + 5, 4, 1, 'white');           // sign marks
}
function forecourt(im, level, entrances) {
  // The pylon goes to whichever lot corner is closest to the fixed primary driveway and still free,
  // so the sign faces the street the office actually opens onto.
  const near = entrances[0], nx = near.x * T + T / 2, ny = near.y * T + T / 2;
  const order = [[3, 2], [51, 2], [3, 51], [51, 51]]
    .map(([x, y]) => ({ x, y, d: Math.abs(x + 5 - nx) + Math.abs(y + 5 - ny) }))
    .sort((a, b) => a.d - b.d);
  for (const c of order) if (free(c.x - 1, c.y - 1, 13, 13)) { pylon(im, c.x, c.y); mark(c.x - 1, c.y - 1, 13, 13); break; }
  if (level === 2) {
    for (const [x, y] of [[22, 2], [22, 53], [2, 22], [53, 22]]) {
      if (!free(x - 1, y - 1, 12, 12)) continue;
      tree(im, x, y); mark(x - 1, y - 1, 12, 13); break;                                // one staff tree
    }
  }
  let placed = 0;
  for (const [x, y] of [[2, 2], [55, 2], [2, 55], [55, 55], [2, 30], [55, 30], [30, 2], [30, 55]]) {
    if (placed >= 4 || !free(x - 1, y - 1, 8, 8)) continue;
    shrub(im, x, y, 6, 5); mark(x - 1, y - 1, 8, 8); placed++;
  }
  // A clipped planter either side of the block, only where the chosen layout left ground clear.
  for (const [x, y, w] of [[BX - 8, BASE - 6, 7], [BX + BW + 2, BASE - 6, 7]]) if (free(x, y, w, 3)) flowers(im, x, y, w);
}

function office(level, primary, secondary) {
  const im = blank(S, S);
  resetMask();
  grassLot(im);
  const entrances = secondary ? [primary, secondary] : [primary];
  pave(im, entrances, { hedgeSpan: 'edge' });
  walks(im, { doors: DOORS[level].map(d => BX + d), base: BASE, entrances, ring: RING });
  mark(BX - 1, BASE - height(level) - 1, BW + 5, height(level) + 6);                    // block and its shadow
  forecourt(im, level, entrances);
  building(im, level, BX, BASE);
  return im;
}

// ---------------------------------------------------------------------------
// Sheet: 64 frames of 64x64 in a 512x512 image (4 level-1 rotations + 4 x 15 level-2 choices).
// ---------------------------------------------------------------------------
const variants = variantList('office');
const { sheet, sprites, frames } = packSheet(
  variants,
  v => office(v.level, v.primary, v.secondary),
  v => ({ floors: FLOORS[v.level] + 1, desks: DESKS[v.level] }),
);
write(sheet, path.join(OUT, 'office-sheet.png'));
fs.writeFileSync(path.join(OUT, 'office-sheet.json'), JSON.stringify({
  version: 1,
  sheet: 'office-sheet.png',
  note: 'Office lot art with a fixed primary entrance and a player-chosen second entrance. Lot-local pixel origin is lot tile (0,0); entrance tiles are the road tiles just outside the lot. `desks` is provisional model capacity and is not drawn.',
  frameSize: S, tileSize: T, lotTiles: { w: 4, h: 4 },
  keyFormat: {
    level1: 'office_1_<primarySide>',
    level2: 'office_2_<primarySide>_<secondSide>_<secondOffset>',
    offsetAxis: 'N/S offsets are world x 0..3; E/W offsets are world y 0..3',
  },
  levels: Object.fromEntries([1, 2].map(l => [l, { floors: FLOORS[l] + 1, desks: DESKS[l], entrances: l === 1 ? 1 : 2 }])),
  primaryByRotation: PRIMARY.map(p => ({ rotation: p.rotation, side: p.side, offset: p.offset, x: p.x, y: p.y })),
  perimeterTiles: PERIMETER.map(p => ({ side: p.side, offset: p.offset, x: p.x, y: p.y })),
  frames,
}, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'office-frames.ts'), frameTable(
  'OFFICE_FRAMES', variants, frames, sheet,
  'Level 1: office_1_<primarySide>. Level 2: office_2_<primarySide>_<secondSide>_<secondOffset>,\n * offsets on the world axis (N/S: x 0..3, E/W: y 0..3).',
));

// ---------------------------------------------------------------------------
// Review sheets. Teal marks the fixed primary entrance tile, pink the chosen second one;
// in game the access arrow does this. Roads are drawn on every edge an entrance uses.
// ---------------------------------------------------------------------------
const find = (level, pSide, sSide, sOffset) => {
  const primary = PRIMARY.find(p => p.side === pSide);
  const secondary = sSide ? PERIMETER.find(p => p.side === sSide && p.offset === sOffset) : null;
  const key = level === 1 ? `office_1_${pSide}` : `office_2_${pSide}_${sSide}_${sOffset}`;
  if (!sprites[key]) throw Error(`no frame ${key}`);
  return { key, primary, secondary };
};
const sameStreet = { S: ['S', 3], W: ['W', 3], N: ['N', 0], E: ['E', 0] };
write(cellSheet(sprites, [
  ...PRIMARY.map(p => ({ ...find(1, p.side), label: `L1 ${p.side}` })),
  ...PRIMARY.map(p => ({ ...find(2, p.side, ...sameStreet[p.side]), label: `L2 ${p.side}+${sameStreet[p.side][0]}${sameStreet[p.side][1]}` })),
], 4, 'office levels and rotations'), path.join(OUT, 'review-levels.png'));
write(cellSheet(sprites, [
  ...[['S', 3], ['E', 3], ['W', 0], ['N', 0]].map(([s, o]) => ({ ...find(2, 'S', s, o), label: `S+${s}${o}` })),
  ...[['W', 3], ['N', 0], ['S', 3], ['E', 0]].map(([s, o]) => ({ ...find(2, 'W', s, o), label: `W+${s}${o}` })),
  ...[['N', 0], ['W', 0], ['E', 0], ['S', 3]].map(([s, o]) => ({ ...find(2, 'N', s, o), label: `N+${s}${o}` })),
  ...[['E', 0], ['S', 3], ['N', 3], ['W', 1]].map(([s, o]) => ({ ...find(2, 'E', s, o), label: `E+${s}${o}` })),
], 4, 'second entrance: same side, both corners, opposite side'), path.join(OUT, 'review-choices.png'));

// Street context: the approved homes and an office at each level on the same road.
const homes = [0, 1, 2, 3].map(v => read(path.join(ROOT, 'docs/artwork/housing', `home-${v}-south.png`)));
const hood = blank(14 * T + 16, 6 * T + 16, C.sheetDark);
for (let j = 0; j < 6; j++) for (let i = 0; i < 14; i++) tile(hood, (i + j) % 2 ? 'grassA' : 'grassB', 8 + i * T, 8 + j * T);
for (let i = 0; i < 14; i++) tile(hood, 'road10', 8 + i * T, 8 + 4 * T);
blit(hood, homes[0], 0, 0, 32, 32, 8, 8 + 2 * T);
blit(hood, sprites['office_1_S'], 0, 0, S, S, 8 + 2 * T, 8);
blit(hood, homes[2], 0, 0, 32, 32, 8 + 6 * T, 8 + 2 * T);
blit(hood, sprites['office_2_S_S_3'], 0, 0, S, S, 8 + 8 * T, 8);
blit(hood, homes[3], 0, 0, 32, 32, 8 + 12 * T, 8 + 2 * T);
const hoodBig = blank(hood.width * Z, hood.height * Z);
blit(hoodBig, hood, 0, 0, hood.width, hood.height, 0, 0, Z);
write(hoodBig, path.join(OUT, 'review-neighborhood.png'));
write(hood, path.join(OUT, 'review-neighborhood-native.png'));                          // how small it really is
console.log(`Wrote ${variants.length} frames to office-sheet.png (${sheet.width}x${sheet.height}), manifest and review sheets in ${OUT}`);
