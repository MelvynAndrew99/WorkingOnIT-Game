/**
 * Home lot artwork: four house styles × four entrance sides, 32×32 native pixels (one 2×2 lot).
 * Run from the repository root: nix develop -c node docs/artwork/housing/generate.mjs
 * then rebuild the atlas: nix develop -c node tools/build-city-atlas.mjs
 *
 * Wall and grass texture is sampled from the Kenney Roguelike Modern City frames already in
 * the runtime atlas (CC0). Roof shapes, windows, doors, paths and gardens are drawn here.
 * Houses stay upright; only the garden path changes, and it always ends at the lot edge the
 * simulation's entrance actually uses.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blank, read, write, get, over, blit } from '../../../tools/png.mjs';
const OUT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(OUT, '../../..');
const atlas = read(path.join(ROOT, 'public/images/city/city-atlas.png'));
const source = fs.readFileSync(path.join(ROOT, 'src/game/cityAtlas.ts'), 'utf8');
const frames = Object.fromEntries([...source.matchAll(/(\w+): \{\s*x: (\d+),\s*y: (\d+),\s*w: (\d+),\s*h: (\d+)\s*\}/g)].map(m => [m[1], m.slice(2).map(Number)]));
const hex = h => [...h.matchAll(/../g)].map(v => parseInt(v[0], 16)).concat(255);
const C = Object.fromEntries(Object.entries({
  ink: '333b42', shadow: '526966', glass: '78acb2', glassLight: 'bad4cd', cream: 'e1ddc8', white: 'f3eedb',
  wood: 'a8703f', woodDark: '7a4d2c', gold: 'e8bf67', grey: '87948b', greyDark: '5f6b66',
  path: 'd6cdb0', pathEdge: 'aea58a', hedge: '2f6e46', hedgeLight: '4f9a5c', leaf: '6fae3f', leafDark: '47823a',
  bed: '5a4633', pink: 'e58fa0', yellow: 'f0d36a', mail: 'c95c49',
}).map(([k, h]) => [k, hex(h)]));
const ROOFS = { red: ['c4705a', 'a65a49', '7f4238'], tan: ['d8c29a', 'bba27a', '8f7a58'], slate: ['7f93ad', '627590', '475670'], teal: ['6aa39b', '4f857e', '386660'] };

const S = 32;
const ink = c => typeof c === 'string' ? C[c] : c;
function box(im, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (x + i >= 0 && y + j >= 0 && x + i < im.width && y + j < im.height) over(im, x + i, y + j, ink(c)); }
/** Blit an atlas frame at native size, clipped to the image. */
function tile(im, name, x, y) {
  const f = frames[name]; if (!f) throw Error(name);
  for (let j = 0; j < f[3]; j++) for (let i = 0; i < f[2]; i++)
    if (x + i >= 0 && y + j >= 0 && x + i < im.width && y + j < im.height) over(im, x + i, y + j, get(atlas, f[0] + i, f[1] + j));
}
/** Kenney wall texture repeated across a facade. */
function wall(im, x, y, w, h, family) {
  const f = frames[`wall_${family}_m`];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) over(im, x + i, y + j, get(atlas, f[0] + (i % 16), f[1] + 2 + (j % 12)));
  box(im, x, y, 1, h, [0, 0, 0, 40]); box(im, x + w - 1, y, 1, h, [0, 0, 0, 55]);
}
/**
 * Pitched roof seen from the fixed camera: chamfered hip corners, shingle courses, a light
 * ridge and a dark eave. This is what separates a house from the flat commercial roofs.
 */
function roof(im, x, y, w, h, family, hip = 3) {
  const [light, mid, dark] = ROOFS[family].map(hex);
  for (let j = 0; j < h; j++) {
    const inset = Math.max(0, hip - j);
    for (let i = inset; i < w - inset; i++) {
      let c = mid;
      if (j === 0 || i === inset) c = light;
      else if (i === w - inset - 1) c = dark;
      else if (j % 3 === 0 && (i + j) % 6 !== 0) c = dark;
      over(im, x + i, y + j, c);
    }
  }
  box(im, x, y + h, w, 1, dark);
  box(im, x + 1, y + h + 1, w - 2, 1, [0, 0, 0, 70]);
}
function windowPane(im, x, y, w = 5, h = 5) {
  box(im, x, y, w, h, 'ink'); box(im, x + 1, y + 1, w - 2, h - 2, 'glass');
  box(im, x + 1, y + 1, w - 2, 1, 'glassLight'); box(im, x + Math.floor(w / 2), y + 1, 1, h - 2, 'white');
  box(im, x - 1, y + h, w + 2, 1, 'cream');
}
function door(im, x, y, h = 7) {
  box(im, x, y, 5, h, 'ink'); box(im, x + 1, y + 1, 3, h - 1, 'wood'); box(im, x + 1, y + 1, 3, 1, 'woodDark');
  box(im, x + 3, y + Math.floor(h / 2) + 1, 1, 1, 'gold');
}
function shrub(im, x, y, w = 6, h = 5) {
  box(im, x + 1, y, w - 2, h, 'leafDark'); box(im, x, y + 1, w, h - 2, 'leafDark');
  box(im, x + 1, y + 1, w - 3, h - 3, 'leaf'); box(im, x + 1, y + h, w - 1, 1, [20, 50, 35, 90]);
}
function hedge(im, x, y, w) { box(im, x, y, w, 3, 'hedge'); box(im, x, y, w, 1, 'hedgeLight'); box(im, x, y + 3, w, 1, [20, 50, 35, 90]); }
function flowers(im, x, y, w) { box(im, x, y, w, 2, 'hedge'); box(im, x, y + 2, w, 1, [20, 50, 35, 90]); for (let i = 1; i < w - 1; i += 3) box(im, x + i, y, 1, 1, i % 2 ? 'yellow' : 'pink'); }

// ---------------------------------------------------------------------------
// Paths. Home entrances (cityModel.entrance, rotation 0..3) always leave from one lot tile:
//   S bottom-left, W top-left, N top-right, E bottom-right.
// Every house keeps its front door at x 7..11, so each path starts below that door.
// ---------------------------------------------------------------------------
const WALK = { x: 7, w: 4, y: 22 };            // below the front door
const FRONT = { y: 23, h: 4 };                 // walkway across the front garden
const PATHS = {
  S: [[WALK.x, WALK.y, WALK.w, S - WALK.y], [3, 29, 11, 3]],
  E: [[WALK.x, WALK.y, WALK.w, 5], [WALK.x, FRONT.y, S - WALK.x, FRONT.h], [29, 19, 3, 11]],
  N: [[WALK.x, WALK.y, WALK.w, 5], [WALK.x, FRONT.y, 24, FRONT.h], [27, 0, 4, FRONT.y + FRONT.h], [19, 0, 12, 3]],
  W: [[1, FRONT.y, WALK.x + WALK.w - 1, FRONT.h], [WALK.x, WALK.y, WALK.w, 5], [1, 6, 4, FRONT.y + FRONT.h - 6], [0, 3, 3, 11]],
};
function paths(im, side) {
  const rects = PATHS[side];
  for (const [x, y, w, h] of rects) box(im, x - 1, y - 1, w + 2, h + 2, 'pathEdge');
  for (const [x, y, w, h] of rects) box(im, x, y, w, h, 'path');
}
const clear = (side, x, y, w, h) => !PATHS[side].some(([px, py, pw, ph]) => x < px + pw + 1 && x + w > px - 1 && y < py + ph + 1 && y + h > py - 1);

function lawn(im, variant) {
  const g = ['grassA', 'grassB'];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) tile(im, g[(i + j + variant) % 2], i * 16, j * 16);
}
function houseShadow(im, x, y, w, h) { box(im, x + 2, y + 2, w, h, [18, 48, 34, 80]); }

// ---------------------------------------------------------------------------
// Four house styles. All stay inside x 5..26 and y 1..22, leaving lawn on every side.
// ---------------------------------------------------------------------------
const STYLES = [
  { name: 'cottage', roof: 'red', wall: 'sand', draw(im) {
    houseShadow(im, 6, 4, 20, 18);
    box(im, 9, 1, 3, 5, 'greyDark'); box(im, 9, 1, 3, 1, 'grey');           // chimney
    wall(im, 6, 13, 20, 9, 'sand'); roof(im, 5, 3, 22, 9, 'red');
    door(im, 7, 15); windowPane(im, 14, 15); windowPane(im, 20, 15);
  }, garden(im, side) { flowers(im, 14, 23, 11); } },
  { name: 'bungalow', roof: 'tan', wall: 'brick', draw(im) {
    houseShadow(im, 6, 7, 20, 15);
    wall(im, 6, 15, 20, 7, 'brick'); roof(im, 5, 6, 22, 8, 'tan', 4);
    box(im, 6, 13, 7, 2, 'woodDark'); box(im, 6, 13, 7, 1, 'wood');          // porch canopy
    door(im, 7, 15); windowPane(im, 14, 16, 5, 4); windowPane(im, 20, 16, 5, 4);
  }, garden(im, side) { shrub(im, 14, 1, 7, 5); if (side !== 'N') shrub(im, 27, 11, 5, 5); } },
  { name: 'townhouse', roof: 'slate', wall: 'stone', draw(im) {
    houseShadow(im, 6, 4, 16, 18);
    wall(im, 6, 10, 16, 12, 'stone'); roof(im, 5, 2, 18, 7, 'slate', 2);
    box(im, 6, 10, 16, 1, 'cream');                                           // floor band
    windowPane(im, 8, 11, 4, 4); windowPane(im, 16, 11, 4, 4);
    door(im, 7, 16, 6); windowPane(im, 15, 16, 5, 4);
  }, garden(im, side) {
    if (side !== 'N') { shrub(im, 24, 12, 6, 6); shrub(im, 23, 17, 5, 4); } else shrub(im, 23, 16, 5, 5);
    box(im, 13, 22, 1, 3, 'greyDark'); box(im, 12, 21, 3, 2, 'mail');         // mailbox
  } },
  { name: 'garage', roof: 'teal', wall: 'sand', draw(im) {
    houseShadow(im, 6, 4, 20, 18);
    wall(im, 18, 14, 8, 8, 'sand'); roof(im, 17, 8, 10, 5, 'teal', 1);        // lower garage wing
    box(im, 19, 16, 6, 6, 'ink'); box(im, 20, 17, 4, 5, 'grey');
    for (let j = 18; j < 22; j += 2) box(im, 20, j, 4, 1, 'greyDark');
    wall(im, 6, 12, 12, 10, 'sand'); roof(im, 5, 3, 14, 8, 'teal', 3);
    door(im, 7, 15); windowPane(im, 13, 15, 4, 4);
  }, garden(im, side) { box(im, 19, 22, 6, 1, 'pathEdge'); } },
];
/** Low front hedge closes each lot so neighbouring gardens read as separate plots. */
function frontHedge(im, side) {
  const from = side === 'S' ? 15 : side === 'W' ? 12 : 13, to = side === 'E' ? 27 : 30;
  hedge(im, from, 28, to - from);
  if (side !== 'S' && side !== 'W' && clear(side, 1, 27, 5, 4)) shrub(im, 1, 27, 5, 4);
}

function home(v, side) {
  const im = blank(S, S), style = STYLES[v];
  lawn(im, v);
  style.garden(im, side);
  frontHedge(im, side);
  paths(im, side);
  style.draw(im);
  return im;
}

const SIDES = { S: 'south', W: 'west', N: 'north', E: 'east' };
const sprites = {};
for (let v = 0; v < STYLES.length; v++) for (const [side, suffix] of Object.entries(SIDES)) {
  const im = home(v, side); sprites[`${v}-${side}`] = im;
  write(im, path.join(OUT, `home-${v}-${suffix}.png`));
}

// ---------------------------------------------------------------------------
// Review sheet: a tight block of lots on a street, old composition beside the new one.
// ---------------------------------------------------------------------------
function oldHome(v) {
  const im = blank(S, S), skin = [['red', 'sand'], ['tan', 'brick'], ['red', 'stone'], ['tan', 'sand']][v];
  for (let x = 0; x < 2; x++) { tile(im, `roof_${skin[0]}_t${x ? 'r' : 'l'}`, x * 16, 0); tile(im, `wall_${skin[1]}_${x ? 'r' : 'l'}`, x * 16, 16); }
  tile(im, 'doorHome', 0, 16); return im;
}
function road(im, x, y, n, mask) { for (let i = 0; i < n; i++) tile(im, `road${mask}`, x + i * 16, y); }
const board = blank(2 * 8 * 16 + 24, 8 * 16 + 16, [29, 47, 48, 255]);
for (const [col, make] of [[0, (v, side) => oldHome(v)], [1, (v, side) => sprites[`${v}-${side}`]]]) {
  const ox = 8 + col * (8 * 16 + 8), oy = 8;
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) tile(board, (i + j) % 2 ? 'grassA' : 'grassB', ox + i * 16, oy + j * 16);
  road(board, ox, oy + 32, 8, 10); road(board, ox, oy + 112, 8, 10);
  // Lots above the first street face south onto it; the back-to-back block below faces
  // north onto that street and south onto the second one.
  for (let i = 0; i < 4; i++) blit(board, make(i, 'S'), 0, 0, S, S, ox + i * 32, oy);
  for (let i = 0; i < 4; i++) blit(board, make((i + 2) % 4, 'N'), 0, 0, S, S, ox + i * 32, oy + 48);
  for (let i = 0; i < 4; i++) blit(board, make((i + 1) % 4, 'S'), 0, 0, S, S, ox + i * 32, oy + 80);
}
const big = blank(board.width * 4, board.height * 4); blit(big, board, 0, 0, board.width, board.height, 0, 0, 4);
write(big, path.join(OUT, 'neighborhood.png'));
const sheet = blank(4 * 40 + 8, 4 * 40 + 8, [48, 72, 62, 255]);
for (let v = 0; v < 4; v++) Object.keys(SIDES).forEach((side, k) => blit(sheet, sprites[`${v}-${side}`], 0, 0, S, S, 8 + k * 40, 8 + v * 40));
const sheetBig = blank(sheet.width * 4, sheet.height * 4); blit(sheetBig, sheet, 0, 0, sheet.width, sheet.height, 0, 0, 4);
write(sheetBig, path.join(OUT, 'all-sides.png'));
console.log(`Wrote ${Object.keys(sprites).length} home sprites, neighborhood.png and all-sides.png to ${OUT}`);
