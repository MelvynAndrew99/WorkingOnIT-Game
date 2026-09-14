/**
 * Apartment building artwork, v2: a fixed primary entrance plus a PLAYER-CHOSEN second entrance.
 * Run from the repository root: nix develop -c node docs/artwork/housing/apartment/generate.mjs
 *
 * Artwork only. Nothing here is packed into the approved city atlas; this folder ships its own
 * compact sheet and manifest so the lead can integrate without touching that atlas.
 *
 * Entrance contract (world-aligned lot offsets on a 4x4 lot, tile 16px):
 *   perimeter tiles: N x0..3 y-1 | E x4 y0..3 | S x0..3 y4 | W x-1 y0..3   (16 tiles)
 *   fixed primary, by rotation: 0 S(0,4) | 1 W(-1,0) | 2 N(3,-1) | 3 E(4,3)
 *   level 2 adds one player-chosen second entrance: any of the other 15 perimeter tiles.
 * The primary never moves on upgrade, and a frame only ever draws the driveways it actually has.
 *
 * Layout that makes 15 free choices drawable: the block is centred on the lot (x 11..52) and
 * grows upward from a fixed base line (y 53), leaving an ~11px service ring on all four edges.
 * Each entrance paves a driveway mouth through the hedge on its own edge, plus one tile of
 * parking lane (two stalls, so level 1 parks 2 household cars and level 2 parks 4), and a walk
 * runs around the ring from the nearest lobby to that driveway. The building itself is identical
 * in every frame and always upright; only paving, walks and garden change.
 *
 * Identity at play zoom (one native pixel is ~3 screen pixels):
 *   - flat charcoal roof with parapet, rooftop water tank and AC unit (homes have pitched roofs)
 *   - coral stucco block, dense window grid, plum floor bands (no other building uses plum;
 *     nothing is yellow, which stays reserved for waiting markers)
 *   - plum lobby canopy with an "APT" plate; level 2 is a floor taller with balconies and a
 *     second lobby, so "more people" reads at a glance.
 *
 * Grass/road tiles are sampled from Kenney Roguelike Modern City frames in the runtime atlas
 * (CC0); everything else is drawn here. No image-generation service was used.
 *
 * Outputs (this folder only): apartment-sheet.png + apartment-sheet.json (64 frames, 512x512),
 * review-levels.png, review-choices.png, review-neighborhood.png, review-neighborhood-native.png.
 * v1 exports (apartment-*.png, all-sides.png, neighborhood*.png, generate-v1.mjs) are left alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Shared tool when its `pngjs` dependency is installed, otherwise the local zlib-only stand-in.
const png = await import('../../../../tools/png.mjs').catch(() => import('./png-nodeps.mjs'));
const { blank, read, write, get, over, blit } = png;
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
  teal: '3fd0c0', sheet: '30483e', sheetDark: '1d2f30',
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
// 3x5 font for the APT plate (it has to fit an 11px sign).
const PLATE = { A: '010101111101101', P: '110101110100100', T: '111010010010010' };
function word(im, str, x, y, c) {
  for (const ch of str) {
    const g = PLATE[ch];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r * 3 + k] === '1') box(im, x + k, y + r, 1, 1, c);
    x += 4;
  }
}
// 5x5 font for review-sheet labels: N and W need the width to stay apart from M.
const LABEL = {
  L: ['10000', '10000', '10000', '10000', '11111'], S: ['01111', '10000', '01110', '00001', '11110'],
  N: ['10001', '11001', '10101', '10011', '10001'], E: ['11111', '10000', '11110', '10000', '11111'],
  W: ['10001', '10001', '10101', '10101', '01010'], 0: ['01110', '10011', '10101', '11001', '01110'],
  1: ['00100', '01100', '00100', '00100', '01110'], 2: ['11110', '00001', '01110', '10000', '11111'],
  3: ['11110', '00001', '01110', '00001', '11110'], '+': ['00000', '00100', '01110', '00100', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000'],
};
function label(im, str, x, y, c, scale) {
  for (const ch of String(str).toUpperCase()) {
    const g = LABEL[ch] ?? LABEL[' '];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) if (g[r][k] === '1') box(im, x + k * scale, y + r * scale, scale, scale, c);
    x += 6 * scale;
  }
}

// ---------------------------------------------------------------------------
// Entrance geometry: the 16 perimeter tiles and the fixed primary per rotation.
// ---------------------------------------------------------------------------
const SIDE_ORDER = ['N', 'E', 'S', 'W'];
const worldTile = (side, offset) =>
  side === 'N' ? { x: offset, y: -1 } : side === 'E' ? { x: 4, y: offset }
    : side === 'S' ? { x: offset, y: 4 } : { x: -1, y: offset };
const PERIMETER = SIDE_ORDER.flatMap(side => [0, 1, 2, 3].map(offset => ({ side, offset, ...worldTile(side, offset) })));
/** Fixed primary entrance per rotation; an upgrade never moves it. */
const PRIMARY = [
  { rotation: 0, side: 'S', offset: 0 }, { rotation: 1, side: 'W', offset: 0 },
  { rotation: 2, side: 'N', offset: 3 }, { rotation: 3, side: 'E', offset: 3 },
].map(p => ({ ...p, ...worldTile(p.side, p.offset) }));
const same = (a, b) => a.side === b.side && a.offset === b.offset;

// ---------------------------------------------------------------------------
// The building. Centred on the lot, grown upward from a fixed base line.
// ---------------------------------------------------------------------------
const BW = 42, ROOF = 8, FLOOR = 7, GROUND = 10;
const BX = 11, BASE = 53;
const FLOORS = { 1: 3, 2: 4 };
/** Household cars the simulation parks here; the stall stripes are drawn to match. */
const CARS = { 1: 2, 2: 4 };
const height = level => ROOF + FLOOR * (FLOORS[level] - 1) + GROUND + 1;
/** Lobby door centres (x within the building). Level 1 keeps its lobby on upgrade. */
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
// Service ring: paving, walks and garden. An occupancy mask keeps the garden out
// of whatever the chosen driveways and walks used, so no variant collides.
// ---------------------------------------------------------------------------
let mask = new Uint8Array(S * S);
/** Asphalt the cars use. Walks stop at it instead of being painted across it. */
let lanes = new Uint8Array(S * S);
function markLane(x, y, w, h) {
  for (let j = Math.max(0, y); j < Math.min(S, y + h); j++) for (let i = Math.max(0, x); i < Math.min(S, x + w); i++) lanes[j * S + i] = 1;
}
function mark(x, y, w, h) {
  for (let j = Math.max(0, y); j < Math.min(S, y + h); j++) for (let i = Math.max(0, x); i < Math.min(S, x + w); i++) mask[j * S + i] = 1;
}
function free(x, y, w, h) {
  if (x < 0 || y < 0 || x + w > S || y + h > S) return false;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (mask[j * S + i]) return false;
  return true;
}
/**
 * Per-edge bands, in depth order from the lot edge inward.
 * hedge: 2 rows at the very edge | lane: 8 rows of asphalt | curb: 1 row facing the building.
 * `inward` is +1 when depth grows toward the building (N/W) and -1 when it shrinks (S/E).
 */
const EDGE = {
  N: { horizontal: true, hedge: 0, hedgeLight: 1, lane: 2, curb: 10, inward: 1 },
  S: { horizontal: true, hedge: 62, hedgeLight: 62, lane: 54, curb: 53, inward: -1 },
  W: { horizontal: false, hedge: 0, hedgeLight: 1, lane: 2, curb: 10, inward: 1 },
  E: { horizontal: false, hedge: 62, hedgeLight: 62, lane: 54, curb: 53, inward: -1 },
};
const LANE_DEEP = 8;
/** Place a box in edge space: `a` runs along the edge, `b` is depth from the image origin. */
function put(im, side, a, b, la, lb, c) {
  const [x, y, w, h] = EDGE[side].horizontal ? [a, b, la, lb] : [b, a, lb, la];
  box(im, x, y, w, h, c); mark(x, y, w, h);
  return [x, y, w, h];
}
/**
 * Asphalt band for one entrance: its own tile plus one tile of parking lane toward the lot centre.
 * Held 2px clear of the neighbouring lot edges so the only paving that reaches a lot border is
 * the driveway mouth itself: a lot never looks like it has a driveway onto a street it has not
 * paid for.
 */
const LANE_INSET = 2;
function laneSpan(offset) {
  const a0 = offset * T, a1 = a0 + T;
  const [from, to] = a0 + T / 2 < S / 2 ? [a0, a1 + T] : [a0 - T, a1];
  return [Math.max(LANE_INSET, from), Math.min(S - LANE_INSET, to)];
}
function pave(im, entrances) {
  const sides = [...new Set(entrances.map(e => e.side))];
  for (const side of sides) {
    const e = EDGE[side], here = entrances.filter(x => x.side === side);
    put(im, side, 0, e.hedge, S, 2, 'hedge');
    put(im, side, 0, e.hedgeLight, S, 1, 'hedgeLight');
    for (const { offset } of here) {
      const [a0, a1] = laneSpan(offset);
      markLane(...put(im, side, a0, e.lane, a1 - a0, LANE_DEEP, 'asphalt'));
      put(im, side, a0, e.curb, a1 - a0, 1, 'curb');
    }
    // Driveway mouths are cut last so a neighbouring lane never paves over them.
    for (const { offset } of here) markLane(...put(im, side, offset * T + 2, e.hedge, T - 4, 2, 'asphalt'));
    // Two stalls per entrance, on the half of the lane away from the road, clear of every mouth.
    const mouths = here.map(({ offset }) => [offset * T, offset * T + T]);
    const stallAt = e.inward > 0 ? e.lane + 3 : e.lane;
    for (const { offset } of here) {
      const [a0, a1] = laneSpan(offset);
      const ext = offset * T === a0 ? a1 - T : a0;                                   // start of the parking tile
      for (const a of [ext, ext + 8, ext + T]) {
        if (mouths.some(([m0, m1]) => a > m0 - 2 && a < m1 + 2)) continue;
        put(im, side, a, stallAt, 1, 5, 'line');
      }
    }
  }
}

// Walk ring: a 3px footpath around the building, parameterised clockwise from the south-west
// corner so any lobby can be joined to any driveway by the shorter arc. It is never painted
// over lane asphalt, so each walk visibly ends where that lot's pavement begins.
const RING_LO = 6, RING_HI = 57, RING_LEG = RING_HI - RING_LO, RING_LEN = RING_LEG * 4;
function ringPoint(t) {
  t = ((t % RING_LEN) + RING_LEN) % RING_LEN;
  if (t < RING_LEG) return [RING_LO + t, RING_HI];                                   // south, west to east
  if (t < RING_LEG * 2) return [RING_HI, RING_HI - (t - RING_LEG)];                  // east, south to north
  if (t < RING_LEG * 3) return [RING_HI - (t - RING_LEG * 2), RING_LO];              // north, east to west
  return [RING_LO, RING_LO + (t - RING_LEG * 3)];                                    // west, north to south
}
const clamp = v => Math.max(RING_LO, Math.min(RING_HI, v));
function ringT(side, offset) {
  const c = clamp(offset * T + T / 2);
  if (side === 'S') return c - RING_LO;
  if (side === 'E') return RING_LEG + (RING_HI - c);
  if (side === 'N') return RING_LEG * 2 + (RING_HI - c);
  return RING_LEG * 3 + (c - RING_LO);
}
const ringGap = (a, b) => { const d = ((b - a) % RING_LEN + RING_LEN) % RING_LEN; return Math.min(d, RING_LEN - d); };
function walks(im, level, entrances) {
  const doors = LOBBIES[level].map(l => BX + l);
  const doorT = doors.map(x => clamp(x) - RING_LO);                                   // lobbies sit on the south leg
  // One lobby per entrance; pick the pairing with the shorter total walk.
  let pairs;
  if (entrances.length === 1) pairs = [[entrances[0], doorT[0], doors[0]]];
  else {
    const t = entrances.map(e => ringT(e.side, e.offset));
    const straight = ringGap(t[0], doorT[0]) + ringGap(t[1], doorT[1]);
    const crossed = ringGap(t[0], doorT[1]) + ringGap(t[1], doorT[0]);
    pairs = straight <= crossed
      ? [[entrances[0], doorT[0], doors[0]], [entrances[1], doorT[1], doors[1]]]
      : [[entrances[0], doorT[1], doors[1]], [entrances[1], doorT[0], doors[0]]];
  }
  const walk = new Uint8Array(S * S);
  const lay = (x, y, w, h) => {
    for (let j = Math.max(0, y); j < Math.min(S, y + h); j++) for (let i = Math.max(0, x); i < Math.min(S, x + w); i++)
      if (!lanes[j * S + i]) walk[j * S + i] = 1;                                     // the lane is already walkable
  };
  for (const [entrance, t0, doorX] of pairs) {
    lay(doorX - 2, BASE, 5, RING_HI + 2 - BASE);                                      // lobby stoop out to the ring
    const t1 = ringT(entrance.side, entrance.offset);
    const fwd = ((t1 - t0) % RING_LEN + RING_LEN) % RING_LEN;
    const dir = fwd <= RING_LEN - fwd ? 1 : -1, steps = dir > 0 ? fwd : RING_LEN - fwd;
    for (let s = 0; s <= steps; s++) { const [x, y] = ringPoint(t0 + dir * s); lay(x - 1, y - 1, 3, 3); }
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (walk[y * S + x] || lanes[y * S + x]) continue;
    let edge = false;
    for (let j = -1; j <= 1 && !edge; j++) for (let i = -1; i <= 1; i++) if (walk[Math.min(S - 1, Math.max(0, y + j)) * S + Math.min(S - 1, Math.max(0, x + i))]) { edge = true; break; }
    if (edge) { box(im, x, y, 1, 1, 'pathEdge'); mask[y * S + x] = 1; }
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (walk[y * S + x]) { box(im, x, y, 1, 1, 'path'); mask[y * S + x] = 1; }
}
/** Shrubs, flowers and (level 2) a bench courtyard, wherever the chosen layout left room. */
function garden(im, level) {
  const flowers = (x, y, w) => { box(im, x, y, w, 2, 'hedge'); for (let i = 1; i < w - 1; i += 3) box(im, x + i, y, 1, 1, 'pink'); mark(x, y, w, 2); };
  if (level === 2) {
    for (const [x, y] of [[20, 2], [20, 54], [2, 20], [54, 20]]) {
      const vertical = x !== 20;
      const [w, h] = vertical ? [9, 24] : [24, 9];
      if (!free(x, y, w, h)) continue;
      // Bench and tree: the residents' courtyard, placed in whichever margin stayed clear.
      if (vertical) {
        box(im, x + 1, y + 12, 1, 12, 'bench'); box(im, x + 3, y + 12, 1, 12, 'bench'); box(im, x + 4, y + 12, 1, 12, 'tankDark');
        box(im, x + 5, y + 13, 2, 1, 'ink'); box(im, x + 5, y + 22, 2, 1, 'ink');
        shrub(im, x + 1, y + 2, 7, 7);
      } else {
        box(im, x + 12, y, 12, 1, 'bench'); box(im, x + 12, y + 2, 12, 1, 'bench'); box(im, x + 12, y + 3, 12, 1, 'tankDark');
        box(im, x + 13, y + 4, 1, 2, 'ink'); box(im, x + 22, y + 4, 1, 2, 'ink');
        shrub(im, x + 2, y, 7, 7);
      }
      mark(x, y, w, h);
      break;
    }
  }
  let placed = 0;
  for (const [x, y] of [[2, 2], [55, 2], [2, 55], [55, 55], [2, 30], [55, 30], [30, 2], [30, 55]]) {
    if (placed >= 4 || !free(x - 1, y - 1, 8, 8)) continue;
    shrub(im, x, y, 6, 5); mark(x - 1, y - 1, 8, 8); placed++;
  }
  for (const [x, y, w] of [[14, 14, 12], [38, 14, 12]]) if (free(x, y, w, 3)) flowers(im, x, y, w);
}

function apartment(level, primary, secondary) {
  const im = blank(S, S);
  mask = new Uint8Array(S * S);
  lanes = new Uint8Array(S * S);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) tile(im, (i + j) % 2 ? 'grassA' : 'grassB', i * T, j * T);
  const entrances = secondary ? [primary, secondary] : [primary];
  pave(im, entrances);
  walks(im, level, entrances);
  mark(BX - 1, BASE - height(level) - 3, BW + 5, height(level) + 8);                  // building, shadow and tanks
  garden(im, level);
  building(im, level, BX, BASE);
  return im;
}

// ---------------------------------------------------------------------------
// Sheet: 64 frames of 64x64 in a 512x512 image (4 level-1 rotations + 4 x 15 level-2 choices).
// ---------------------------------------------------------------------------
const variants = [];
for (const p of PRIMARY) variants.push({ level: 1, primary: p, secondary: null, key: `apartment_1_${p.side}` });
for (const p of PRIMARY) for (const s of PERIMETER) {
  if (same(p, s)) continue;
  variants.push({ level: 2, primary: p, secondary: s, key: `apartment_2_${p.side}_${s.side}_${s.offset}` });
}
const COLS = 8, sheet = blank(COLS * S, Math.ceil(variants.length / COLS) * S);
const sprites = {};
const manifestFrames = {};
variants.forEach((v, i) => {
  const im = apartment(v.level, v.primary, v.secondary);
  sprites[v.key] = im;
  const x = (i % COLS) * S, y = Math.floor(i / COLS) * S;
  blit(sheet, im, 0, 0, S, S, x, y);
  const entrance = e => ({ side: e.side, offset: e.offset, x: e.x, y: e.y });
  manifestFrames[v.key] = {
    x, y, w: S, h: S, level: v.level, rotation: v.primary.rotation,
    cars: CARS[v.level], floors: FLOORS[v.level],
    primary: entrance(v.primary), secondary: v.secondary ? entrance(v.secondary) : null,
  };
});
write(sheet, path.join(OUT, 'apartment-sheet.png'));
fs.writeFileSync(path.join(OUT, 'apartment-sheet.json'), JSON.stringify({
  version: 2,
  sheet: 'apartment-sheet.png',
  note: 'Apartment lot art with a fixed primary entrance and a player-chosen second entrance. Lot-local pixel origin is lot tile (0,0); entrance tiles are the road tiles just outside the lot.',
  frameSize: S, tileSize: T, lotTiles: { w: 4, h: 4 },
  keyFormat: {
    level1: 'apartment_1_<primarySide>',
    level2: 'apartment_2_<primarySide>_<secondSide>_<secondOffset>',
    offsetAxis: 'N/S offsets are world x 0..3; E/W offsets are world y 0..3',
  },
  levels: Object.fromEntries([1, 2].map(l => [l, { floors: FLOORS[l], cars: CARS[l], entrances: l === 1 ? 1 : 2 }])),
  primaryByRotation: PRIMARY.map(p => ({ rotation: p.rotation, side: p.side, offset: p.offset, x: p.x, y: p.y })),
  perimeterTiles: PERIMETER.map(p => ({ side: p.side, offset: p.offset, x: p.x, y: p.y })),
  frames: manifestFrames,
}, null, 2) + '\n');
// Copy-in frame table, so integration does not transcribe 64 rectangles by hand.
// It is generated here and lives here; nothing in src/ is written by this script.
fs.writeFileSync(path.join(OUT, 'apartment-frames.ts'), [
  '/** Generated by docs/artwork/housing/apartment/generate.mjs. Frames of apartment-sheet.png',
  ` * (${sheet.width}x${sheet.height}). Level 1: apartment_1_<primarySide>. Level 2:`,
  ' * apartment_2_<primarySide>_<secondSide>_<secondOffset>, offsets on the world axis. */',
  'export const APARTMENT_FRAMES: Record<string, {x: number; y: number; w: number; h: number}> = {',
  ...variants.map(v => { const f = manifestFrames[v.key]; return `    ${v.key}: {x: ${f.x}, y: ${f.y}, w: ${f.w}, h: ${f.h}},`; }),
  '};',
  '',
].join('\n'));

// ---------------------------------------------------------------------------
// Review sheets. Teal marks the fixed primary entrance tile, pink the chosen second one;
// in game the access arrow does this. Roads are drawn on every edge an entrance uses.
// ---------------------------------------------------------------------------
const Z = 4, CELL = 112, ORIGIN = 24;
function cellSheet(items, cols) {
  const rows = Math.ceil(items.length / cols);
  const base = blank(cols * CELL, rows * CELL + 12, C.sheet);
  const marks = [], labels = [];
  items.forEach((item, i) => {
    const ox = (i % cols) * CELL + ORIGIN, oy = Math.floor(i / cols) * CELL + ORIGIN;
    const entrances = [item.primary, item.secondary].filter(Boolean);
    for (const side of new Set(entrances.map(e => e.side))) {
      for (let t = 0; t < 4; t++) {
        const road = worldTile(side, t);
        tile(base, side === 'E' || side === 'W' ? 'road5' : 'road10', ox + road.x * T, oy + road.y * T);
      }
    }
    blit(base, sprites[item.key], 0, 0, S, S, ox, oy);
    entrances.forEach((e, k) => marks.push([ox + e.x * T + 5, oy + e.y * T + 5, k === 0 ? 'teal' : 'pink']));
    labels.push([ox - 8, oy + S + 18, item.label]);
  });
  const big = blank(base.width * Z, base.height * Z);
  blit(big, base, 0, 0, base.width, base.height, 0, 0, Z);
  for (const [mx, my, c] of marks) { box(big, mx * Z, my * Z, 6 * Z, 6 * Z, 'ink'); box(big, mx * Z + 4, my * Z + 4, 6 * Z - 8, 6 * Z - 8, c); }
  for (const [lx, ly, str] of labels) label(big, str, lx * Z, ly * Z, 'white', 2);
  return big;
}
const find = (level, pSide, sSide, sOffset) => {
  const primary = PRIMARY.find(p => p.side === pSide);
  const secondary = sSide ? PERIMETER.find(p => p.side === sSide && p.offset === sOffset) : null;
  const key = level === 1 ? `apartment_1_${pSide}` : `apartment_2_${pSide}_${sSide}_${sOffset}`;
  if (!sprites[key]) throw Error(key);
  return { key, primary, secondary };
};
// Levels: every rotation at level 1, and the same-street upgrade beneath it.
const sameStreet = { S: ['S', 3], W: ['W', 3], N: ['N', 0], E: ['E', 0] };
write(cellSheet([
  ...PRIMARY.map(p => ({ ...find(1, p.side), label: `L1 ${p.side}` })),
  ...PRIMARY.map(p => ({ ...find(2, p.side, ...sameStreet[p.side]), label: `L2 ${p.side}+${sameStreet[p.side][0]}${sameStreet[p.side][1]}` })),
], 4), path.join(OUT, 'review-levels.png'));
// Choices: for every primary, the same side, both corners and the opposite side.
write(cellSheet([
  ...[['S', 3], ['E', 3], ['W', 0], ['N', 0]].map(([s, o]) => ({ ...find(2, 'S', s, o), label: `S+${s}${o}` })),
  ...[['W', 3], ['N', 0], ['S', 3], ['E', 0]].map(([s, o]) => ({ ...find(2, 'W', s, o), label: `W+${s}${o}` })),
  ...[['N', 0], ['W', 0], ['E', 0], ['S', 3]].map(([s, o]) => ({ ...find(2, 'N', s, o), label: `N+${s}${o}` })),
  ...[['E', 0], ['S', 3], ['N', 3], ['W', 1]].map(([s, o]) => ({ ...find(2, 'E', s, o), label: `E+${s}${o}` })),
], 4), path.join(OUT, 'review-choices.png'));

// Street context: the approved homes with a level 1 and a level 2 apartment on the same road.
const homes = [0, 1, 2, 3].map(v => read(path.join(OUT, '..', `home-${v}-south.png`)));
const hood = blank(14 * T + 16, 6 * T + 16, C.sheetDark);
for (let j = 0; j < 6; j++) for (let i = 0; i < 14; i++) tile(hood, (i + j) % 2 ? 'grassA' : 'grassB', 8 + i * T, 8 + j * T);
for (let i = 0; i < 14; i++) tile(hood, 'road10', 8 + i * T, 8 + 4 * T);
blit(hood, homes[0], 0, 0, 32, 32, 8, 8 + 2 * T);
blit(hood, sprites['apartment_1_S'], 0, 0, S, S, 8 + 2 * T, 8);
blit(hood, homes[2], 0, 0, 32, 32, 8 + 6 * T, 8 + 2 * T);
blit(hood, sprites['apartment_2_S_S_3'], 0, 0, S, S, 8 + 8 * T, 8);
blit(hood, homes[3], 0, 0, 32, 32, 8 + 12 * T, 8 + 2 * T);
const hoodBig = blank(hood.width * Z, hood.height * Z);
blit(hoodBig, hood, 0, 0, hood.width, hood.height, 0, 0, Z);
write(hoodBig, path.join(OUT, 'review-neighborhood.png'));
write(hood, path.join(OUT, 'review-neighborhood-native.png'));                        // how small it really is
console.log(`Wrote ${variants.length} frames to apartment-sheet.png (${sheet.width}x${sheet.height}), manifest and review sheets in ${OUT}`);
