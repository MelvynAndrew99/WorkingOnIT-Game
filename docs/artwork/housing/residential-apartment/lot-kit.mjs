/**
 * Shared 4x4 lot-art kit: palette, 3x5 font, entrance geometry, edge paving, the walk ring
 * and the review-sheet builder. The building itself is drawn by each folder's generate.mjs.
 *
 * This file is duplicated byte-for-byte in
 *   docs/artwork/offices/lot-kit.mjs
 *   docs/artwork/housing/residential-apartment/lot-kit.mjs
 * on purpose, so either folder can be moved or regenerated without the other. If you change
 * one, copy it across (`diff` them) or the two sheets will drift apart.
 *
 * Entrance contract (world-aligned lot offsets on a 4x4 lot, 16px tiles, lot-local origin at
 * lot tile (0,0)):
 *   perimeter tiles: N x0..3 y-1 | E x4 y0..3 | S x0..3 y4 | W x-1 y0..3   (16 tiles)
 *   fixed primary, by rotation: 0 S(0,4) | 1 W(-1,0) | 2 N(3,-1) | 3 E(4,3)
 *   level 2 adds one player-chosen second entrance: any of the other 15 perimeter tiles.
 * The primary never moves on upgrade, and a frame only draws the driveways it actually has.
 *
 * Grass and road tiles are sampled from the Kenney Roguelike Modern City frames already in the
 * runtime atlas (CC0); everything else is drawn in code. No image-generation service is used.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as png from './png-nodeps.mjs';

export const { blank, read, write, get, over, blit } = png;

/** Native frame size and tile size, in pixels. */
export const S = 64, T = 16;

const hex = h => [...h.matchAll(/../g)].map(v => parseInt(v[0], 16)).concat(255);
/** One shared palette for both lots. Nothing here is yellow: yellow stays for waiting markers. */
export const C = Object.fromEntries(Object.entries({
  ink: '262230',
  // Office block: coral stucco with plum banding (the look the user approved).
  wall: 'dc9a7c', wallLight: 'eab396', wallDark: 'b97a60', trim: 'f3e6d2',
  plum: '7d4a8e', plumLight: 'a574b4', plumDark: '553066',
  // Residential block: red brick with cream courses and a grey shingle roof.
  brick: 'a8564a', brickLight: 'c26d5c', brickDark: '7d3a33',
  cream: 'f0e2c6', creamDark: 'c9b494',
  shingle: '5a6672', shingleLight: '78848f', shingleDark: '3d4650',
  door: '7a4a2c', doorDark: '54321d',
  // Shared.
  roof: '575c63', roofLight: '7a8088', roofDark: '41454b', gravel: '646a71',
  glass: '5f93a3', glassLight: 'b6d6d6', glassDark: '3d6878',
  tank: 'a8703f', tankDark: '7a4d2c', tankLight: 'c98f58', metal: '9aa3a8', metalDark: '6a7479',
  asphalt: '474e53', asphaltDark: '3a4045', line: 'e8e4d6', curb: 'b9bdb6',
  path: 'd6cdb0', pathEdge: 'aea58a', walk: 'ccd2cc', walkEdge: '9fa8a2',
  hedge: '2f6e46', hedgeLight: '4f9a5c', leaf: '6fae3f', leafDark: '47823a',
  pink: 'e58fa0', white: 'f8f4e6', bench: 'a8703f', red: 'c4544a',
  teal: '3fd0c0', sheet: '30483e', sheetDark: '1d2f30',
}).map(([k, h]) => [k, hex(h)]));

export const ink = c => typeof c === 'string' ? C[c] : c;
export const shade = a => [18, 40, 30, a];
export function box(im, x, y, w, h, c) {
  const col = ink(c);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
    if (x + i >= 0 && y + j >= 0 && x + i < im.width && y + j < im.height) over(im, x + i, y + j, col);
}

// ---------------------------------------------------------------------------
// Runtime atlas sampling (grass and road tiles for the sprites and review sheets).
// ---------------------------------------------------------------------------
let atlas = null, atlasFrames = {};
export function initAtlas(root) {
  atlas = read(path.join(root, 'public/images/city/city-atlas.png'));
  const source = fs.readFileSync(path.join(root, 'src/game/cityAtlas.ts'), 'utf8');
  atlasFrames = Object.fromEntries([...source.matchAll(/(\w+): \{\s*x: (\d+),\s*y: (\d+),\s*w: (\d+),\s*h: (\d+)\s*\}/g)]
    .map(m => [m[1], m.slice(2).map(Number)]));
}
export function tile(im, name, x, y) {
  const f = atlasFrames[name]; if (!f) throw Error(`no atlas frame ${name}`);
  for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++)
    if (x + i >= 0 && y + j >= 0 && x + i < im.width && y + j < im.height) over(im, x + i, y + j, get(atlas, f[0] + i, f[1] + j));
}
/** The 4x4 grass lot every frame starts from. */
export function grassLot(im) {
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) tile(im, (i + j) % 2 ? 'grassA' : 'grassB', i * T, j * T);
}

// ---------------------------------------------------------------------------
// 3x5 font: building signage and review-sheet labels.
// ---------------------------------------------------------------------------
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '101111111101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101011', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111',
  4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010',
  8: '111101111101111', 9: '111101111001111',
  '+': '000010111010000', '-': '000000111000000', '.': '000000000000010', '/': '001001010100100',
  ' ': '000000000000000',
};
/** Width in pixels of `str` at `scale` (the trailing gap is not counted). */
export const wordWidth = (str, scale = 1) => Math.max(0, String(str).length * 4 - 1) * scale;
export function word(im, str, x, y, c, scale = 1) {
  for (const ch of String(str).toUpperCase()) {
    const g = FONT[ch];
    if (g) for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r * 3 + k] === '1') box(im, x + k * scale, y + r * scale, scale, scale, c);
    x += 4 * scale;
  }
}

// ---------------------------------------------------------------------------
// Entrance geometry: the 16 perimeter tiles and the fixed primary per rotation.
// ---------------------------------------------------------------------------
export const SIDE_ORDER = ['N', 'E', 'S', 'W'];
export const worldTile = (side, offset) =>
  side === 'N' ? { x: offset, y: -1 } : side === 'E' ? { x: 4, y: offset }
    : side === 'S' ? { x: offset, y: 4 } : { x: -1, y: offset };
export const PERIMETER = SIDE_ORDER.flatMap(side => [0, 1, 2, 3].map(offset => ({ side, offset, ...worldTile(side, offset) })));
/** Fixed primary entrance per rotation; an upgrade never moves it. */
export const PRIMARY = [
  { rotation: 0, side: 'S', offset: 0 }, { rotation: 1, side: 'W', offset: 0 },
  { rotation: 2, side: 'N', offset: 3 }, { rotation: 3, side: 'E', offset: 3 },
].map(p => ({ ...p, ...worldTile(p.side, p.offset) }));
export const same = (a, b) => a.side === b.side && a.offset === b.offset;
/** The 64 frames every lot sheet carries: 4 base rotations, then 4 x 15 upgrade choices. */
export function variantList(prefix) {
  const out = [];
  for (const p of PRIMARY) out.push({ level: 1, primary: p, secondary: null, key: `${prefix}_1_${p.side}` });
  for (const p of PRIMARY) for (const s of PERIMETER) {
    if (same(p, s)) continue;
    out.push({ level: 2, primary: p, secondary: s, key: `${prefix}_2_${p.side}_${s.side}_${s.offset}` });
  }
  return out;
}

/**
 * Pack the 64 variants into one 512x512 sheet and build the manifest both folders publish.
 * `draw(variant) -> image` renders one 64x64 frame; `extra(variant)` adds the per-type capacity
 * fields. Frames are packed row-major: level 1 first (rotations 0..3), then each rotation's 15
 * level-2 choices in perimeter order N, E, S, W.
 */
export function packSheet(variants, draw, extra = () => ({})) {
  const COLS = 8;
  const sheet = blank(COLS * S, Math.ceil(variants.length / COLS) * S);
  const sprites = {}, frames = {};
  const entrance = e => ({ side: e.side, offset: e.offset, x: e.x, y: e.y });
  variants.forEach((v, i) => {
    const im = draw(v);
    sprites[v.key] = im;
    const x = (i % COLS) * S, y = Math.floor(i / COLS) * S;
    blit(sheet, im, 0, 0, S, S, x, y);
    frames[v.key] = {
      x, y, w: S, h: S, level: v.level, rotation: v.primary.rotation, ...extra(v),
      primary: entrance(v.primary), secondary: v.secondary ? entrance(v.secondary) : null,
    };
  });
  return { sheet, sprites, frames };
}
/** The copy-in frame table, so integration never transcribes 64 rectangles by hand. */
export function frameTable(name, variants, frames, sheet, keyDoc) {
  return [
    `/** Generated artwork table (see this folder's generate.mjs). Frames of the ${sheet.width}x${sheet.height}`,
    ` * sheet. ${keyDoc} */`,
    `export const ${name}: Record<string, {x: number; y: number; w: number; h: number}> = {`,
    ...variants.map(v => { const f = frames[v.key]; return `    ${v.key}: {x: ${f.x}, y: ${f.y}, w: ${f.w}, h: ${f.h}},`; }),
    '};',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Occupancy mask: keeps garden and decor out of whatever the chosen driveways and walks used.
// ---------------------------------------------------------------------------
let mask = new Uint8Array(S * S);
let lanes = new Uint8Array(S * S);
export function resetMask() { mask = new Uint8Array(S * S); lanes = new Uint8Array(S * S); }
export function mark(x, y, w, h) {
  for (let j = Math.max(0, y); j < Math.min(S, y + h); j++) for (let i = Math.max(0, x); i < Math.min(S, x + w); i++) mask[j * S + i] = 1;
}
export function markLane(x, y, w, h) {
  for (let j = Math.max(0, y); j < Math.min(S, y + h); j++) for (let i = Math.max(0, x); i < Math.min(S, x + w); i++) lanes[j * S + i] = 1;
}
export function free(x, y, w, h) {
  if (x < 0 || y < 0 || x + w > S || y + h > S) return false;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (mask[j * S + i]) return false;
  return true;
}
/** True where a car lane was paved: walks stop at it instead of being painted across it. */
export const isLane = (x, y) => x >= 0 && y >= 0 && x < S && y < S && lanes[y * S + x] === 1;

// ---------------------------------------------------------------------------
// Edge paving: driveway mouth, one tile of parking lane, stalls, and an optional edge hedge.
// `inward` is +1 when depth grows toward the building (N/W) and -1 when it shrinks (S/E).
// ---------------------------------------------------------------------------
export const EDGE = {
  N: { horizontal: true, hedge: 0, hedgeLight: 1, lane: 2, curb: 10, inward: 1 },
  S: { horizontal: true, hedge: 62, hedgeLight: 62, lane: 54, curb: 53, inward: -1 },
  W: { horizontal: false, hedge: 0, hedgeLight: 1, lane: 2, curb: 10, inward: 1 },
  E: { horizontal: false, hedge: 62, hedgeLight: 62, lane: 54, curb: 53, inward: -1 },
};
const LANE_DEEP = 8;
/** Place a box in edge space: `a` runs along the edge, `b` is depth from the image origin. */
export function put(im, side, a, b, la, lb, c) {
  const [x, y, w, h] = EDGE[side].horizontal ? [a, b, la, lb] : [b, a, lb, la];
  box(im, x, y, w, h, c); mark(x, y, w, h);
  return [x, y, w, h];
}
/**
 * Asphalt band for one entrance: its own tile plus one tile of parking, toward the lot centre.
 * Held `LANE_INSET` clear of the two neighbouring lot borders, so the only paving that ever
 * reaches a lot edge is a real driveway mouth: a lot never looks like it has a driveway onto a
 * street it has not paid for (and the verifier can read the mouths straight off the border rows).
 */
export const LANE_INSET = 2;
export function laneSpan(offset) {
  const a0 = offset * T, a1 = a0 + T;
  const [from, to] = a0 + T / 2 < S / 2 ? [a0, a1 + T] : [a0 - T, a1];
  return [Math.max(LANE_INSET, from), Math.min(S - LANE_INSET, to)];
}
/**
 * Pave the entrances. `hedgeSpan` is 'edge' for a planted verge along the whole lot edge
 * (the office look) or 'lane' to plant only beside the paving (the lighter residential look).
 */
export function pave(im, entrances, { hedgeSpan = 'edge' } = {}) {
  const sides = [...new Set(entrances.map(e => e.side))];
  for (const side of sides) {
    const e = EDGE[side], here = entrances.filter(x => x.side === side);
    const bands = hedgeSpan === 'edge' ? [[0, S]] : here.map(({ offset }) => laneSpan(offset));
    for (const [a0, a1] of bands) {
      put(im, side, a0, e.hedge, a1 - a0, 2, 'hedge');
      put(im, side, a0, e.hedgeLight, a1 - a0, 1, 'hedgeLight');
    }
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

// ---------------------------------------------------------------------------
// Walk ring: a corridor between the building and the curbs, parameterised clockwise from the
// south-west corner, so any lobby can be joined to any driveway by the shorter arc.
// ---------------------------------------------------------------------------
export function makeRing(lo, hi) {
  const leg = hi - lo, len = leg * 4;
  const point = t => {
    t = ((t % len) + len) % len;
    if (t < leg) return [lo + t, hi];                                                // south, west to east
    if (t < leg * 2) return [hi, hi - (t - leg)];                                    // east, south to north
    if (t < leg * 3) return [hi - (t - leg * 2), lo];                                // north, east to west
    return [lo, lo + (t - leg * 3)];                                                 // west, north to south
  };
  const clamp = v => Math.max(lo, Math.min(hi, v));
  const at = (side, offset) => {
    const c = clamp(offset * T + T / 2);
    if (side === 'S') return c - lo;
    if (side === 'E') return leg + (hi - c);
    if (side === 'N') return leg * 2 + (hi - c);
    return leg * 3 + (c - lo);
  };
  const gap = (a, b) => { const d = ((b - a) % len + len) % len; return Math.min(d, len - d); };
  return { lo, hi, leg, len, point, clamp, at, gap };
}
/**
 * One lobby per entrance, joined along the shorter arc of the ring. `doors` are door centre x
 * positions on the building's south face; `base` its ground line. The walk is accumulated as a
 * pixel mask first, so it is never painted across lane asphalt (the lane is already walkable):
 * each walk visibly ends where that lot's own pavement begins.
 */
export function walks(im, { doors, base, entrances, ring, wide = 3, color = 'path', edge = 'pathEdge' }) {
  const off = wide >> 1;
  const doorT = doors.map(x => ring.clamp(x) - ring.lo);                              // lobbies sit on the south leg
  let pairs;
  if (entrances.length === 1) pairs = [[entrances[0], doorT[0], doors[0]]];
  else {
    const t = entrances.map(e => ring.at(e.side, e.offset));
    const straight = ring.gap(t[0], doorT[0]) + ring.gap(t[1], doorT[1]);
    const crossed = ring.gap(t[0], doorT[1]) + ring.gap(t[1], doorT[0]);
    pairs = straight <= crossed
      ? [[entrances[0], doorT[0], doors[0]], [entrances[1], doorT[1], doors[1]]]
      : [[entrances[0], doorT[1], doors[1]], [entrances[1], doorT[0], doors[0]]];
  }
  const walk = new Uint8Array(S * S);
  const lay = (x, y, w, h) => {
    for (let j = Math.max(0, y); j < Math.min(S, y + h); j++) for (let i = Math.max(0, x); i < Math.min(S, x + w); i++)
      if (!lanes[j * S + i]) walk[j * S + i] = 1;
  };
  for (const [entrance, t0, doorX] of pairs) {
    lay(doorX - off - 1, base, wide + 2, ring.hi + off + 1 - base);                   // lobby stoop out to the ring
    const t1 = ring.at(entrance.side, entrance.offset);
    const fwd = ((t1 - t0) % ring.len + ring.len) % ring.len;
    const dir = fwd <= ring.len - fwd ? 1 : -1, steps = dir > 0 ? fwd : ring.len - fwd;
    for (let s = 0; s <= steps; s++) { const [x, y] = ring.point(t0 + dir * s); lay(x - off, y - off, wide, wide); }
  }
  const set = (x, y) => x >= 0 && y >= 0 && x < S && y < S && walk[y * S + x] === 1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (walk[y * S + x] || lanes[y * S + x]) continue;
    let touching = false;
    for (let j = -1; j <= 1 && !touching; j++) for (let i = -1; i <= 1; i++) if (set(x + i, y + j)) { touching = true; break; }
    if (touching) { box(im, x, y, 1, 1, edge); mask[y * S + x] = 1; }
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (walk[y * S + x]) { box(im, x, y, 1, 1, color); mask[y * S + x] = 1; }
}

// ---------------------------------------------------------------------------
// Small planting used by both lots.
// ---------------------------------------------------------------------------
export function shrub(im, x, y, w = 6, h = 5) {
  box(im, x + 1, y + h, w - 1, 1, shade(90));
  box(im, x + 1, y, w - 2, h, 'leafDark'); box(im, x, y + 1, w, h - 2, 'leafDark');
  box(im, x + 1, y + 1, w - 3, h - 3, 'leaf');
}
export function flowers(im, x, y, w) {
  box(im, x, y, w, 2, 'hedge');
  for (let i = 1; i < w - 1; i += 3) box(im, x + i, y, 1, 1, 'pink');
  mark(x, y, w, 2);
}
export function tree(im, x, y) {
  box(im, x + 4, y + 9, 4, 2, shade(90));
  box(im, x + 4, y + 7, 2, 4, 'tankDark');
  box(im, x + 2, y, 6, 2, 'leafDark'); box(im, x, y + 1, 10, 6, 'leafDark'); box(im, x + 2, y + 6, 6, 2, 'leafDark');
  box(im, x + 2, y + 2, 5, 4, 'leaf'); box(im, x + 3, y + 1, 3, 1, 'leaf');
}

// ---------------------------------------------------------------------------
// Review sheets. Teal marks the fixed primary entrance tile, pink the chosen second one;
// in game the access arrow does this. Roads are drawn on every edge an entrance uses.
// ---------------------------------------------------------------------------
export const Z = 4, CELL = 112, ORIGIN = 24;
export function cellSheet(sprites, items, cols, title) {
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
  for (const [lx, ly, str] of labels) word(big, str, lx * Z, ly * Z, 'white', 3);
  if (title) word(big, title, 8 * Z, 2 * Z, 'white', 3);
  return big;
}
