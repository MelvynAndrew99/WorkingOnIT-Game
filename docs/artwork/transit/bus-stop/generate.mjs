/**
 * Bus stop artwork: one 16×16 native-pixel square per curb side. Run from the repository root:
 *   nix develop -c node docs/artwork/transit/bus-stop/generate.mjs
 *   nix develop -c node tools/build-city-atlas.mjs
 *
 * At play zoom one native pixel is only ~3 screen pixels, so everything here is built from
 * bold, outlined, high-contrast shapes: a teal-roofed shelter with a dark back wall so the
 * orange bench stands out, a white bus sign with a teal bus, and a dark waiting pad with a
 * teal boarding curb. The pad stays dark because waiting riders are drawn on it as yellow
 * markers by cityScene.ts; nothing in the art itself is yellow.
 *
 * Grass is sampled from the Kenney Roguelike Modern City frames in the runtime atlas (CC0).
 * The shelter stays upright; the pad, curb and sign move to the boarding side
 * (busStop rotation 0..3 = S, W, N, E).
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
  ink: '1b2328', white: 'f8f4e6', teal: '3fd0c0', tealDark: '208c82',
  wall: '22384a', wallLight: '3a5d72', bench: 'f29a3a', benchDark: 'a4561f',
  pad: '3d4c55', padEdge: '2a353c', curb: '3fd0c0', curbDark: '208c82', shade: '000000',
}).map(([k, h]) => [k, hex(h)]));
const S = 16;
const ink = c => typeof c === 'string' ? C[c] : c;
function box(im, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (x + i >= 0 && y + j >= 0 && x + i < im.width && y + j < im.height) over(im, x + i, y + j, ink(c)); }
function tile(im, name, x, y) { const f = frames[name]; for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++) over(im, x + i, y + j, get(atlas, f[0] + i, f[1] + j)); }
const shadow = [0, 0, 0, 70];

/** 11 wide × 9 tall: outlined teal canopy over a dark back wall with a bright orange bench. */
function shelter(im, x, y) {
  box(im, x + 1, y + 9, 10, 1, shadow);
  box(im, x + 1, y + 3, 9, 5, 'wall'); box(im, x + 2, y + 3, 7, 1, 'wallLight');
  box(im, x + 3, y + 4, 5, 1, 'bench');                                   // backrest
  box(im, x + 2, y + 6, 7, 1, 'bench'); box(im, x + 2, y + 7, 7, 1, 'benchDark');  // seat
  box(im, x + 3, y + 8, 1, 1, 'ink'); box(im, x + 7, y + 8, 1, 1, 'ink');  // legs
  box(im, x + 1, y + 3, 1, 6, 'ink'); box(im, x + 9, y + 3, 1, 6, 'ink');  // posts
  box(im, x, y, 11, 3, 'ink'); box(im, x + 1, y + 1, 9, 1, 'teal'); box(im, x + 1, y + 2, 9, 1, 'tealDark');
}
/** 5 wide plate on an ink pole: teal with a white bus body. */
function sign(im, x, y, pole = 5) {
  box(im, x + 2, y + 5, 1, pole, 'ink'); box(im, x + 3, y + 4 + pole, 1, 1, shadow);
  box(im, x, y, 5, 5, 'ink'); box(im, x + 1, y + 1, 3, 3, 'teal'); box(im, x + 1, y + 2, 3, 1, 'white');
}
/** Dark waiting pad against the curb, with a bright teal boarding edge. */
function pad(im, side, depth) {
  const edge = { S: [0, S - depth, S, depth], N: [0, 0, S, depth], E: [S - depth, 0, depth, S], W: [0, 0, depth, S] }[side];
  const [x, y, w, h] = edge;
  box(im, x, y, w, h, 'pad');
  const inner = { S: [0, y, S, 1], N: [0, depth - 1, S, 1], E: [x, 0, 1, S], W: [depth - 1, 0, 1, S] }[side];
  box(im, ...inner, 'padEdge');
  const lip = { S: [0, 14, S, 2], N: [0, 0, S, 2], E: [14, 0, 2, S], W: [0, 0, 2, S] }[side];
  box(im, ...lip, 'curb');
  const [lx, ly, lw, lh] = lip;
  const outer = { S: [0, 15, S, 1], N: [0, 0, S, 1], E: [15, 0, 1, S], W: [0, 0, 1, S] }[side];
  for (let i = 0; i < S; i += 4) lw > lh ? box(im, i, outer[1], 2, 1, 'curbDark') : box(im, outer[0], i, 1, 2, 'curbDark');
}

const LAYOUT = {
  // Sign beside or above the canopy, never over the pad where riders are drawn.
  S: im => { pad(im, 'S', 4); shelter(im, 0, 3); sign(im, 11, 1, 6); },
  N: im => { pad(im, 'N', 6); shelter(im, 0, 6); sign(im, 11, 6, 5); },
  E: im => { pad(im, 'E', 5); shelter(im, 0, 7); sign(im, 4, 0, 2); },
  W: im => { pad(im, 'W', 5); shelter(im, 5, 7); sign(im, 7, 0, 2); },
};
function stop(side) {
  const im = blank(S, S);
  tile(im, 'grassA', 0, 0);
  LAYOUT[side](im);
  return im;
}

const SIDES = { S: 'south', W: 'west', N: 'north', E: 'east' };
const sprites = {};
for (const [side, suffix] of Object.entries(SIDES)) { sprites[side] = stop(side); write(sprites[side], path.join(OUT, `bus-stop-${suffix}.png`)); }

// Review sheet at ×6: each stop beside its road, empty and with four and eight waiting riders
// drawn exactly where cityScene.ts places its yellow markers.
const Z = 6, cellW = 56;
const sheet = blank(4 * cellW + 8, 3 * 56 + 8, [48, 72, 62, 255]);
const ROAD = { S: [0, 1, 'road10'], N: [0, -1, 'road10'], E: [1, 0, 'road5'], W: [-1, 0, 'road5'] };
const origin = (k, row) => [20 + k * cellW, 20 + row * 56];
Object.entries(ROAD).forEach(([side, [dx, dy, road]], k) => {
  for (let row = 0; row < 3; row++) {
    const [ox, oy] = origin(k, row);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) tile(sheet, 'grassB', ox + i * 16, oy + j * 16);
    for (let t = -1; t <= 1; t++) tile(sheet, road, ox + (dx ? dx * 16 : t * 16), oy + (dy ? dy * 16 : t * 16));
    blit(sheet, sprites[side], 0, 0, S, S, ox, oy);
  }
});
const big = blank(sheet.width * Z, sheet.height * Z); blit(big, sheet, 0, 0, sheet.width, sheet.height, 0, 0, Z);
const yellow = hex('ffd779');
Object.keys(ROAD).forEach((side, k) => [4, 8].forEach((waiting, r) => {
  const [ox, oy] = origin(k, r + 1);
  for (let i = 0; i < waiting; i++) {
    const along = .08 + i % 4 * .22, depth = .04 + Math.floor(i / 4) * .24, far = 1 - .18 - depth;
    const [mx, my] = side === 'S' ? [along, far] : side === 'N' ? [along, depth] : side === 'E' ? [far, along] : [depth, along];
    box(big, Math.round((ox + mx * 16) * Z), Math.round((oy + my * 16) * Z), Math.round(.18 * 16 * Z), Math.round(.18 * 16 * Z), yellow);
  }
}));
write(big, path.join(OUT, 'all-sides.png'));
console.log(`Wrote ${Object.keys(sprites).length} bus stop sprites and all-sides.png to ${OUT}`);
