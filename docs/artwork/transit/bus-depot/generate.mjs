/**
 * Bus depot artwork: one 48×48 native-pixel lot (3×3 tiles) per entrance side.
 * Run from the repository root:
 *   nix develop -c node docs/artwork/transit/bus-depot/generate.mjs
 *   nix develop -c node tools/build-city-atlas.mjs
 *
 * Layout contract, shared with DEPOT_LAYOUT in src/game/cityArt.ts (pixels here, tiles there):
 *   - two parking bays; the scene parks returning buses (bus_E, ~16×11 px) on their centres
 *   - one dark rider platform; the scene draws yellow waiting-rider markers inside it
 *   - the asphalt apron is fenced by a curb and hedge and opens only at the real entrance
 *     (middle tile of the entrance side; busStation rotation 0..3 = S, W, N, E)
 * Nothing in this art is yellow, so rider markers stay unambiguous. Bold outlines and strong
 * contrast because one native pixel is only ~3 screen pixels at play zoom.
 *
 * Grass and sand wall texture are sampled from Kenney Roguelike Modern City frames in the
 * runtime atlas (CC0); everything else is drawn here. The hall stays upright; for a north
 * entrance it moves to the bottom of the lot so the driveway can reach the top edge.
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
  ink: '1b2328', white: 'f8f4e6', teal: '3fd0c0', tealDark: '208c82', tealDeep: '155f59',
  roof: '4a5a66', roofLight: '6a7c88', roofDark: '33404a',
  glass: '2c4a5e', glassLight: '8fc3cf', shutter: '8a969c', shutterDark: '5d6a70',
  asphalt: '474e53', asphaltDark: '3a4045', line: 'e8e4d6', paint: '5fb8ae',
  curb: 'b9bdb6', hedge: '2f6e46', hedgeLight: '4f9a5c',
  pad: '2e3a42', bench: 'f29a3a', benchDark: 'a4561f',
}).map(([k, h]) => [k, hex(h)]));
const S = 48;
const ink = c => typeof c === 'string' ? C[c] : c;
function box(im, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (x + i >= 0 && y + j >= 0 && x + i < im.width && y + j < im.height) over(im, x + i, y + j, ink(c)); }
function tile(im, name, x, y) { const f = frames[name]; for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++) if (x + i >= 0 && y + j >= 0 && x + i < im.width && y + j < im.height) over(im, x + i, y + j, get(atlas, f[0] + i, f[1] + j)); }
const shadow = [0, 0, 0, 70];

/** Pixel layout per entrance side. Mirrors DEPOT_LAYOUT in cityArt.ts. */
export const LAYOUT = {
  // Hall on top; bays open onto an aisle that leads straight to the bottom driveway.
  S: { hall: 0, bays: [[2, 19, 20, 13], [26, 19, 20, 13]], openTop: false, platform: [1, 36, 15, 9], drive: [17, 45, 14, 3], decor: [33, 34] },
  // Hall at the bottom so the driveway can reach the top edge.
  N: { hall: 32, bays: [[2, 17, 20, 13], [26, 17, 20, 13]], openTop: true, platform: [1, 3, 15, 9], drive: [17, 0, 14, 3], decor: [33, 2] },
  // Side entrances: an aisle runs in from the driveway, bays below it, platform at the far end.
  W: { hall: 0, bays: [[2, 33, 20, 13], [26, 33, 20, 13]], openTop: true, platform: [31, 19, 15, 9], drive: [0, 18, 3, 13] },
  E: { hall: 0, bays: [[2, 33, 20, 13], [26, 33, 20, 13]], openTop: true, platform: [2, 19, 15, 9], drive: [45, 18, 3, 13] },
};

/** 48×16 transit hall: seamed metal roof, cream facade, teal band, bus sign, office and workshop door. */
function hall(im, y) {
  box(im, 0, y, S, 8, 'ink');
  box(im, 1, y + 1, S - 2, 6, 'roof');
  for (let x = 3; x < S - 2; x += 4) box(im, x, y + 2, 1, 5, 'roofDark');
  box(im, 1, y + 1, S - 2, 1, 'roofLight');
  const wall = frames.wall_sand_m;
  for (let j = 0; j < 8; j++) for (let i = 1; i < S - 1; i++) over(im, i, y + 8 + j, get(atlas, wall[0] + (i % 16), wall[1] + 4 + j));
  box(im, 0, y + 8, 1, 8, 'ink'); box(im, S - 1, y + 8, 1, 8, 'ink');
  box(im, 1, y + 8, S - 2, 2, 'teal'); box(im, 1, y + 10, S - 2, 1, 'tealDark');
  // Sign board over the office: white plate, teal bus with windows and wheels.
  box(im, 3, y + 1, 15, 9, 'ink'); box(im, 4, y + 2, 13, 7, 'white');
  box(im, 5, y + 3, 11, 4, 'teal'); box(im, 6, y + 4, 2, 1, 'white'); box(im, 9, y + 4, 2, 1, 'white'); box(im, 12, y + 4, 2, 1, 'white');
  box(im, 14, y + 4, 1, 2, 'tealDeep');
  box(im, 7, y + 7, 2, 1, 'ink'); box(im, 12, y + 7, 2, 1, 'ink');
  // Office: glazed door and window.
  box(im, 4, y + 11, 5, 5, 'ink'); box(im, 5, y + 12, 3, 4, 'glass'); box(im, 5, y + 12, 3, 1, 'glassLight');
  box(im, 11, y + 11, 8, 4, 'ink'); box(im, 12, y + 12, 6, 2, 'glass'); box(im, 12, y + 12, 6, 1, 'glassLight');
  // Workshop: two roller doors where the fleet is serviced.
  for (const dx of [23, 36]) {
    box(im, dx, y + 10, 11, 6, 'ink'); box(im, dx + 1, y + 11, 9, 5, 'shutter');
    for (let j = 12; j < 16; j += 2) box(im, dx + 1, y + j, 9, 1, 'shutterDark');
  }
  if (y + 16 < S) box(im, 0, y + 16, S, 1, shadow);
}
/** Painted bay: white side lines, teal BUS lettering visible whenever the bay is empty. */
const GLYPH = { B: '110101110101110', U: '101101101101111', S: '011100010001110' };
function bay(im, [x, y, w, h], openTop) {
  box(im, x, y, 1, h, 'line'); box(im, x + w - 1, y, 1, h, 'line');
  box(im, x, openTop ? y + h - 1 : y, w, 1, 'line');
  let gx = x + Math.floor((w - 11) / 2); const gy = y + Math.floor((h - 5) / 2);
  for (const ch of 'BUS') { const g = GLYPH[ch]; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') box(im, gx + c, gy + r, 1, 1, 'paint'); gx += 4; }
}
function platform(im, [x, y, w, h]) {
  box(im, x - 1, y - 1, w + 2, h + 2, 'ink');
  box(im, x, y, w, h, 'pad');
  box(im, x, y - 1, w, 1, 'teal');
}
function depot(side) {
  const L = LAYOUT[side], im = blank(S, S);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) tile(im, (i + j) % 2 ? 'grassA' : 'grassB', i * 16, j * 16);
  // Asphalt apron fenced by a hedge and curb on its outer edges, open only at the driveway.
  const top = L.hall === 0 ? 17 : 0, bottom = L.hall === 0 ? S : 32;
  box(im, 0, top, S, bottom - top, 'asphalt');
  const outerY = L.hall === 0 ? S - 2 : 0;
  box(im, 0, top, 2, bottom - top, 'hedge'); box(im, S - 2, top, 2, bottom - top, 'hedge'); box(im, 0, outerY, S, 2, 'hedge');
  box(im, 0, outerY, S, 1, 'hedgeLight');
  box(im, 2, top, 1, bottom - top, 'curb'); box(im, S - 3, top, 1, bottom - top, 'curb');
  box(im, 2, L.hall === 0 ? S - 3 : 2, S - 4, 1, 'curb');
  const [dx, dy, dw, dh] = L.drive;
  box(im, dx, dy, dw, dh, 'asphalt');
  for (const b of L.bays) bay(im, b, L.openTop);
  platform(im, L.platform);
  if (L.decor) {
    const [ox, oy] = L.decor;
    box(im, ox, oy + 4, 11, 1, 'bench'); box(im, ox, oy + 6, 11, 1, 'bench'); box(im, ox, oy + 7, 11, 1, 'benchDark');
    box(im, ox + 1, oy + 8, 1, 2, 'ink'); box(im, ox + 9, oy + 8, 1, 2, 'ink');
  }
  hall(im, L.hall);
  return im;
}

const SIDES = { S: 'south', W: 'west', N: 'north', E: 'east' };
const sprites = {};
for (const [side, suffix] of Object.entries(SIDES)) { sprites[side] = depot(side); write(sprites[side], path.join(OUT, `bus-depot-${suffix}.png`)); }

// Review sheet at ×5: each side beside its road, empty and with two parked buses plus eight riders.
const Z = 5, cell = 88;
const sheet = blank(4 * cell + 8, 2 * cell + 8, [48, 72, 62, 255]);
const ROAD = { S: [0, 1, 'road10'], N: [0, -1, 'road10'], E: [1, 0, 'road5'], W: [-1, 0, 'road5'] };
const origin = (k, row) => [24 + k * cell, 24 + row * cell];
Object.entries(ROAD).forEach(([side, [rx, ry, road]], k) => {
  for (let row = 0; row < 2; row++) {
    const [ox, oy] = origin(k, row);
    for (let t = 0; t < 3; t++) tile(sheet, road, ox + (rx ? (rx > 0 ? 48 : -16) : t * 16), oy + (ry ? (ry > 0 ? 48 : -16) : t * 16));
    blit(sheet, sprites[side], 0, 0, S, S, ox, oy);
  }
});
const big = blank(sheet.width * Z, sheet.height * Z); blit(big, sheet, 0, 0, sheet.width, sheet.height, 0, 0, Z);
const busF = frames.bus_E, yellow = hex('ffd779');
Object.keys(ROAD).forEach((side, k) => {
  const [ox, oy] = origin(k, 1), L = LAYOUT[side];
  for (const [x, y, w, h] of L.bays) {
    const bw = Math.round(.98 * 16 * Z), bh = Math.round(bw * busF[3] / busF[2]);
    const cx = (ox + x + w / 2) * Z - bw / 2, cy = (oy + y + h / 2) * Z - bh / 2;
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) over(big, Math.round(cx + i), Math.round(cy + j), get(atlas, busF[0] + Math.floor(i * busF[2] / bw), busF[1] + Math.floor(j * busF[3] / bh)));
  }
  const [px, py] = L.platform;
  for (let i = 0; i < 8; i++) box(big, Math.round((ox + px + 1 + (i % 4) * 3.5) * Z), Math.round((oy + py + 1 + Math.floor(i / 4) * 4) * Z), Math.round(.18 * 16 * Z), Math.round(.18 * 16 * Z), yellow);
});
write(big, path.join(OUT, 'all-sides.png'));
console.log(`Wrote ${Object.keys(sprites).length} bus depot sprites and all-sides.png to ${OUT}`);
