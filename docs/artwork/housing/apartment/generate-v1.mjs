/**
 * Apartment building artwork: two upgrade levels × four entrance sides, 64×64 native pixels
 * (one 4×4 lot, the footprint the housing study proposed).
 * Run from the repository root: nix develop -c node docs/artwork/housing/apartment/generate.mjs
 *
 * Artwork only: nothing here is packed into the atlas yet.
 *
 * Proposed entrance contract (same local rule as homes, entrance row one tile below the lot):
 *   level 1: local tile x 0            -> S bottom-left, W top-left,  N top-right, E bottom-right
 *   level 2: local tiles x 0 and x 3   -> adds S bottom-right, W bottom-left, N top-left, E top-right
 * The first driveway never moves when the building upgrades, so its road stays connected.
 *
 * Identity at play zoom (one native pixel is ~3 screen pixels):
 *   - flat charcoal roof with parapet, rooftop water tank and AC unit (homes have pitched roofs)
 *   - coral stucco block with a dense grid of windows and plum floor bands (no other building
 *     uses plum; nothing is yellow, which stays reserved for waiting markers)
 *   - plum lobby canopy with an "APT" plate, and a striped parking lane along the street
 * Level 2 is one floor taller, gains balconies, a second lobby, a second driveway and a
 * full-length parking lane, so the upgrade reads as "more people" at a glance.
 *
 * Grass is sampled from Kenney Roguelike Modern City frames in the runtime atlas (CC0);
 * everything else is drawn here. The building stays upright; only its position on the lot
 * and the paving change with the entrance side.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blank, read, write, get, over, blit } from '../../../../tools/png.mjs';
const OUT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(OUT, '../../../..');
const atlas = read(path.join(ROOT, 'public/images/city/city-atlas.png'));
const source = fs.readFileSync(path.join(ROOT, 'src/game/cityAtlas.ts'), 'utf8');
const frames = Object.fromEntries([...source.matchAll(/(\w+): \{\s*x: (\d+),\s*y: (\d+),\s*w: (\d+),\s*h: (\d+)\s*\}/g)].map(m => [m[1], m.slice(2).map(Number)]));
const hex = h => [...h.matchAll(/../g)].map(v => parseInt(v[0], 16)).concat(255);
const C = Object.fromEntries(Object.entries({
  ink: '262230', wall: 'dc9a7c', wallLight: 'eab396', wallDark: 'b97a60', trim: 'f3e6d2',
  plum: '7d4a8e', plumLight: 'a574b4', plumDark: '553066',
  roof: '575c63', roofLight: '7a8088', roofDark: '41454b', gravel: '646a71',
  glass: '5f93a3', glassLight: 'b6d6d6', glassDark: '3d6878',
  tank: 'a8703f', tankDark: '7a4d2c', tankLight: 'c98f58', metal: '9aa3a8', metalDark: '6a7479',
  asphalt: '474e53', asphaltDark: '3a4045', line: 'e8e4d6', curb: 'b9bdb6',
  path: 'd6cdb0', pathEdge: 'aea58a', hedge: '2f6e46', hedgeLight: '4f9a5c', leaf: '6fae3f', leafDark: '47823a',
  pink: 'e58fa0', white: 'f8f4e6', bench: 'a8703f',
}).map(([k, h]) => [k, hex(h)]));
const S = 64, T = 16;
const ink = c => typeof c === 'string' ? C[c] : c;
const shade = a => [18, 40, 30, a];
function box(im, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (x + i >= 0 && y + j >= 0 && x + i < im.width && y + j < im.height) over(im, x + i, y + j, ink(c)); }
function tile(im, name, x, y) {
  const f = frames[name]; if (!f) throw Error(name);
  for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++)
    if (x + i >= 0 && y + j >= 0 && x + i < im.width && y + j < im.height) over(im, x + i, y + j, get(atlas, f[0] + i, f[1] + j));
}
function shrub(im, x, y, w = 6, h = 5) {
  box(im, x + 1, y + h, w - 1, 1, shade(90));
  box(im, x + 1, y, w - 2, h, 'leafDark'); box(im, x, y + 1, w, h - 2, 'leafDark');
  box(im, x + 1, y + 1, w - 3, h - 3, 'leaf');
}
const GLYPH = { A: '010101111101101', P: '110101110100100', T: '111010010010010' };
function word(im, str, x, y, c) { for (const ch of str) { const g = GLYPH[ch]; for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r * 3 + k] === '1') box(im, x + k, y + r, 1, 1, c); x += 4; } }

// ---------------------------------------------------------------------------
// The building. Width 42; it grows upward from a fixed base line when upgraded.
// ---------------------------------------------------------------------------
const BW = 42, ROOF = 8, FLOOR = 7, GROUND = 10;
const FLOORS = { 1: 3, 2: 4 };
const height = level => ROOF + FLOOR * (FLOORS[level] - 1) + GROUND + 1;
/** Lobby door centres (x within the building) per level. Level 1 keeps its lobby on upgrade. */
const LOBBIES = { 1: [21], 2: [10, 32] };

function windowPane(im, x, y) {
  box(im, x, y, 4, 4, 'ink'); box(im, x + 1, y + 1, 2, 2, 'glass'); box(im, x + 1, y + 1, 1, 1, 'glassLight');
  box(im, x, y + 4, 4, 1, 'trim');
}
function balcony(im, x, y) {
  // A shallow slab with white rails in front of a window: reads as a lived-in unit.
  box(im, x - 1, y + 3, 6, 2, 'plumDark'); box(im, x - 1, y + 3, 6, 1, 'white');
  box(im, x - 1, y + 4, 1, 1, 'white'); box(im, x + 4, y + 4, 1, 1, 'white');
}
function waterTank(im, x, y) {
  box(im, x + 1, y + 7, 1, 2, 'ink'); box(im, x + 5, y + 7, 1, 2, 'ink');            // legs
  box(im, x + 1, y, 5, 1, 'ink'); box(im, x, y + 1, 7, 7, 'ink');                     // outline + cap
  box(im, x + 2, y - 1, 3, 1, 'ink');
  box(im, x + 1, y + 2, 5, 5, 'tank'); box(im, x + 1, y + 2, 1, 5, 'tankLight'); box(im, x + 5, y + 2, 1, 5, 'tankDark');
  box(im, x + 1, y + 1, 5, 1, 'metalDark'); box(im, x + 2, y, 3, 1, 'metal');
  box(im, x + 1, y + 4, 5, 1, 'tankDark');
}
function acUnit(im, x, y) {
  box(im, x, y, 7, 5, 'ink'); box(im, x + 1, y + 1, 5, 3, 'metal'); box(im, x + 1, y + 1, 5, 1, 'white');
  box(im, x + 2, y + 2, 3, 2, 'metalDark'); box(im, x + 3, y + 2, 1, 2, 'metal');
}
function lobby(im, cx, base) {
  const x = cx - 4;
  // Glass double door under a plum canopy that carries the APT plate, all on the tall ground floor.
  box(im, x + 1, base - 5, 7, 5, 'ink');
  box(im, x + 2, base - 4, 2, 4, 'glass'); box(im, x + 5, base - 4, 2, 4, 'glass');
  box(im, x + 2, base - 4, 2, 1, 'glassLight'); box(im, x + 5, base - 4, 2, 1, 'glassLight');
  box(im, x - 2, base - 11, 13, 7, 'ink');
  box(im, x - 1, base - 10, 11, 5, 'plum');
  word(im, 'APT', x - 1, base - 10, 'white');
  box(im, x - 1, base - 5, 11, 1, 'plumDark');
  box(im, x - 1, base - 4, 1, 4, 'ink'); box(im, x + 9, base - 4, 1, 4, 'ink');       // posts
}
/** Draw at (x, base): x is the building's left edge, base the row below its ground floor. */
function building(im, level, x, base) {
  const floors = FLOORS[level], h = height(level), top = base - h;
  box(im, x + 2, top + 3, BW, h, shade(85));                                          // drop shadow
  // Facade.
  const wallTop = top + ROOF;
  box(im, x, wallTop, BW, base - wallTop, 'ink');
  box(im, x + 1, wallTop, BW - 2, base - wallTop, 'wall');
  box(im, x + 1, wallTop, 1, base - wallTop, 'wallLight'); box(im, x + BW - 2, wallTop, 1, base - wallTop, 'wallDark');
  for (let f = 0; f < floors; f++) {
    const fy = wallTop + f * FLOOR;
    box(im, x + 1, fy, BW - 2, 1, 'plum');                                             // floor band
    const ground = f === floors - 1;
    for (let wx = 4; wx + 4 <= BW - 3; wx += 6) {
      const cx = wx + 2;
      if (ground && LOBBIES[level].some(l => Math.abs(l - cx) < 7)) continue;
      windowPane(im, x + wx, fy + (ground ? 4 : 2));
      if (level === 2 && !ground && (wx / 6 | 0) % 2 === (f % 2)) balcony(im, x + wx, fy + 2);
    }
  }
  box(im, x + 1, base - 1, BW - 2, 1, 'wallDark');
  for (const l of LOBBIES[level]) lobby(im, x + l, base);
  // Flat roof with parapet: this silhouette is what separates it from pitched-roof homes.
  box(im, x, top, BW, ROOF, 'ink');
  box(im, x + 1, top + 1, BW - 2, ROOF - 2, 'roofLight');
  box(im, x + 2, top + 2, BW - 4, ROOF - 4, 'roof');
  for (let j = 0; j < ROOF - 4; j++) for (let i = 0; i < BW - 4; i++) if ((i * 7 + j * 13) % 11 === 0) box(im, x + 2 + i, top + 2 + j, 1, 1, 'gravel');
  box(im, x + 2, top + 2, BW - 4, 1, 'roofDark');
  box(im, x + 1, top + ROOF - 1, BW - 2, 1, 'roofDark');
  box(im, x + 6, top + 4, 3, 2, 'roofDark'); box(im, x + 6, top + 4, 3, 1, 'metalDark');  // roof hatch
  acUnit(im, x + 13, top + 2);
  waterTank(im, x + 29, top - 2);
  if (level === 2) { waterTank(im, x + 20, top - 1); box(im, x + 3, top + 7, 6, 1, 'leafDark'); box(im, x + 4, top + 6, 4, 1, 'leaf'); }
}

// ---------------------------------------------------------------------------
// Lot layout per entrance side. Driveway tiles follow the entrance contract above.
// The parking lane runs along the entrance edge, fenced by a hedge except at driveways.
// ---------------------------------------------------------------------------
const BASE = { S: 42, N: 58, W: 47, E: 47 };
const BX = { S: 11, N: 11, W: 20, E: 2 };
/** Driveway tile index along the entrance edge, [level 1, level 2 addition]. */
const DRIVES = { S: [0, 3], W: [0, 3], N: [3, 0], E: [3, 0] };

function lane(im, side, level) {
  const horizontal = side === 'S' || side === 'N';
  const [first, second] = DRIVES[side];
  // Level 1 paves from its driveway to just past the lobby; level 2 paves the whole edge.
  let from = 0, to = S;
  if (level === 1) [from, to] = first === 0 ? [0, 44] : [20, S];
  const outer = side === 'S' ? S - 2 : side === 'E' ? S - 2 : 0;       // hedge row/column
  const laneAt = side === 'S' ? 47 : side === 'E' ? 47 : 2;             // asphalt start
  const put = (a, b, w, h, c) => horizontal ? box(im, a, b, w, h, c) : box(im, b, a, h, w, c);
  // Hedge on the whole edge first, then open driveways.
  put(0, outer, S, 2, 'hedge'); put(0, side === 'S' || side === 'E' ? outer : outer + 1, S, 1, 'hedgeLight');
  put(from, laneAt, to - from, 15, 'asphalt');
  put(from, side === 'S' || side === 'E' ? laneAt - 1 : laneAt + 15, to - from, 1, 'curb');
  const drives = level === 1 ? [first] : [first, second];
  for (const d of drives) put(d * T + 2, outer, T - 4, 2, 'asphalt');
  // Stall lines on the inner half of the lane, clear of each driveway mouth.
  const stallAt = side === 'S' || side === 'E' ? laneAt : laneAt + 8;
  for (let a = from + 2; a < to - 2; a += 6) {
    if (drives.some(d => a > d * T - 2 && a < (d + 1) * T + 2)) continue;
    put(a, stallAt, 1, 7, 'line');
  }
}
function walkways(im, side, level) {
  const x = BX[side], base = BASE[side];
  const doors = LOBBIES[level].map(l => x + l);
  const rect = [];
  if (side === 'S') for (const d of doors) rect.push([d - 2, base, 5, 46 - base]);
  if (side === 'W' || side === 'E') {
    const toLane = side === 'W' ? 17 : 47;
    const from = Math.min(toLane, ...doors) - 2, to = Math.max(toLane, ...doors) + 3;
    rect.push([from, base + 1, to - from, 4]);
    for (const d of doors) rect.push([d - 2, base, 5, 2]);
  }
  if (side === 'N') {
    rect.push([4, base + 1, S - 8, 3]);
    for (const d of doors) rect.push([d - 2, base, 5, 2]);
    const risers = level === 1 ? [56] : [4, 56];
    for (const r of risers) rect.push([r, 17, 4, base + 4 - 17]);
  }
  for (const [px, py, w, h] of rect) box(im, px - 1, py - 1, w + 2, h + 2, 'pathEdge');
  for (const [px, py, w, h] of rect) box(im, px, py, w, h, 'path');
}
function garden(im, side, level) {
  const flowers = (x, y, w) => { box(im, x, y, w, 2, 'hedge'); for (let i = 1; i < w - 1; i += 3) box(im, x + i, y, 1, 1, 'pink'); };
  if (side === 'S') { shrub(im, 1, 30); if (level === 1) { shrub(im, 55, 49); shrub(im, 48, 54, 5, 4); } }
  if (side === 'N') { shrub(im, level === 1 ? 2 : 56, 22); flowers(im, 14, 61, 12); flowers(im, 38, 61, 12); }
  if (side === 'W' || side === 'E') {
    // Level 2 fills the spare corner with a small courtyard: bench and tree for the residents.
    const cx = side === 'W' ? 22 : 4;
    shrub(im, side === 'W' ? 56 : 2, 54, 6, 5);
    if (level === 2) {
      box(im, cx + 12, 55, 12, 1, 'bench'); box(im, cx + 12, 57, 12, 1, 'bench'); box(im, cx + 12, 58, 12, 1, 'tankDark');
      box(im, cx + 13, 59, 1, 2, 'ink'); box(im, cx + 22, 59, 1, 2, 'ink');
      shrub(im, cx + 2, 53, 7, 7);
    } else flowers(im, cx + 10, 56, 16);
  }
}

function apartment(level, side) {
  const im = blank(S, S);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) tile(im, (i + j) % 2 ? 'grassA' : 'grassB', i * T, j * T);
  garden(im, side, level);
  lane(im, side, level);
  walkways(im, side, level);
  building(im, level, BX[side], BASE[side]);
  return im;
}

const SIDES = { S: 'south', W: 'west', N: 'north', E: 'east' };
const sprites = {};
for (const level of [1, 2]) for (const [side, suffix] of Object.entries(SIDES)) {
  const im = apartment(level, side); sprites[`${level}-${side}`] = im;
  write(im, path.join(OUT, `apartment-${level}-${suffix}.png`));
}

// ---------------------------------------------------------------------------
// Review sheets.
// all-sides.png: both levels, every entrance side, roads on the entrance edge and a small
// marker on each real entrance tile. neighborhood.png: level 1 and 2 on a street of homes.
// ---------------------------------------------------------------------------
const ENTRY = { S: [0, 1], W: [-1, 0], N: [0, -1], E: [1, 0] };
function entranceTiles(side, level) {
  const [first, second] = DRIVES[side];
  return (level === 1 ? [first] : [first, second]).map(d => {
    if (side === 'S') return [d, 4]; if (side === 'N') return [d, -1];
    return [side === 'W' ? -1 : 4, d];
  });
}
const Z = 4, cell = 104;
const sheet = blank(4 * cell + 16, 2 * cell + 16, [48, 72, 62, 255]);
const markers = [];
Object.keys(SIDES).forEach((side, k) => [1, 2].forEach((level, row) => {
  const ox = 28 + k * cell, oy = 28 + row * cell, [ex, ey] = ENTRY[side];
  for (let t = 0; t < 4; t++) {
    const tx = ex ? (ex > 0 ? 4 : -1) : t, ty = ey ? (ey > 0 ? 4 : -1) : t;
    tile(sheet, ex ? 'road5' : 'road10', ox + tx * T, oy + ty * T);
  }
  blit(sheet, sprites[`${level}-${side}`], 0, 0, S, S, ox, oy);
  for (const [tx, ty] of entranceTiles(side, level)) markers.push([ox + tx * T + 5, oy + ty * T + 5]);
}));
const big = blank(sheet.width * Z, sheet.height * Z); blit(big, sheet, 0, 0, sheet.width, sheet.height, 0, 0, Z);
// Teal entrance markers stand in for the game's access arrow.
for (const [mx, my] of markers) { box(big, mx * Z, my * Z, 6 * Z, 6 * Z, 'ink'); box(big, mx * Z + 4, my * Z + 4, 6 * Z - 8, 6 * Z - 8, [63, 208, 192, 255]); }
write(big, path.join(OUT, 'all-sides.png'));

const homes = [0, 1, 2, 3].map(v => read(path.join(OUT, '..', `home-${v}-south.png`)));
const hood = blank(14 * T + 16, 6 * T + 16, [29, 47, 48, 255]);
for (let j = 0; j < 6; j++) for (let i = 0; i < 14; i++) tile(hood, (i + j) % 2 ? 'grassA' : 'grassB', 8 + i * T, 8 + j * T);
for (let i = 0; i < 14; i++) tile(hood, 'road10', 8 + i * T, 8 + 4 * T);
blit(hood, homes[0], 0, 0, 32, 32, 8, 8 + 2 * T);
blit(hood, sprites['1-S'], 0, 0, S, S, 8 + 2 * T, 8);
blit(hood, homes[2], 0, 0, 32, 32, 8 + 6 * T, 8 + 2 * T);
blit(hood, sprites['2-S'], 0, 0, S, S, 8 + 8 * T, 8);
blit(hood, homes[3], 0, 0, 32, 32, 8 + 12 * T, 8 + 2 * T);
const hoodBig = blank(hood.width * Z, hood.height * Z); blit(hoodBig, hood, 0, 0, hood.width, hood.height, 0, 0, Z);
write(hoodBig, path.join(OUT, 'neighborhood.png'));
// Native-scale strip: how small it really is before zoom.
write(hood, path.join(OUT, 'neighborhood-native.png'));
console.log(`Wrote ${Object.keys(sprites).length} apartment sprites and review sheets to ${OUT}`);
