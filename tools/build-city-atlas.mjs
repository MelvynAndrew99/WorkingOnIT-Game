/**
 * Build the runtime city atlas from the Kenney source packs.
 *
 * Source (CC0, kept intact under src/assets/source/kenny/):
 *   - Roguelike Modern City  — ground, roads, roofs, walls, shopfronts, props,
 *                              vehicles (four fixed-viewpoint views each)
 * The RPG Urban Pack is also in the repo but nothing here uses it: see
 * docs/ASSET-MAPPING.md for why its vehicles turned out not to fit.
 *
 * Outputs:
 *   - public/images/city/city-atlas.png   packed 16px-grid sprite sheet
 *   - src/game/cityAtlas.ts               generated frame table (do not edit)
 *
 * Run: nix develop -c node tools/build-city-atlas.mjs
 *
 * Road tiles are COMPOSED here, not copied: a plain asphalt base plus the
 * pack's own painted markings, one baked variant per cardinal-neighbour mask.
 * That keeps the runtime a table lookup and keeps marking geometry in one file.
 */
import { read, blank, write, get, set, over, rect } from './png.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MC = read(path.join(ROOT, 'src/assets/source/kenny/kenney_roguelike-modern-city/Tilemap/tilemap.png'));
const TILE = 16, STEP = 17;

/** One source tile as a flat RGBA array, gaps removed. */
function tile(sheet, c, r) {
    const out = [];
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) out.push(get(sheet, c * STEP + x, r * STEP + y));
    return out;
}
const px = (t, x, y) => t[y * TILE + x];
const near = (a, b, tol) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tol;

/** The most common opaque colour in a tile — its "unpainted" surface. */
function modal(t) {
    const counts = new Map();
    for (const c of t) {
        if (c[3] < 200) continue;
        const k = c.slice(0, 3).join(',');
        counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    let best = null, n = -1;
    for (const [k, v] of counts) if (v > n) { n = v; best = k; }
    return best.split(',').map(Number).concat([255]);
}

/**
 * Keep only a tile's painted detail, dropping its background surface.
 * Used to lift road markings off their asphalt so they can be recombined.
 */
function paint(t, bg = modal(t), tol = 40) {
    return t.map((c) => (c[3] < 8 || near(c, bg, tol) ? [0, 0, 0, 0] : c));
}

// ---------------------------------------------------------------------------
// Sprite collection. Every sprite is an RGBA buffer plus its size in pixels.
// ---------------------------------------------------------------------------
const sprites = new Map();
/** @param trim crop the result to its opaque content — vehicles are scaled by real size. */
function add(name, w, h, draw, trim = false) {
    const buf = new Array(w * h).fill(null).map(() => [0, 0, 0, 0]);
    draw({
        /** Blit a whole source tile at tile-grid position (tx, ty). */
        tile(sheet, c, r, tx = 0, ty = 0) { this.pixels(tile(sheet, c, r), tx * TILE, ty * TILE); },
        /** Blit a flat 16x16 pixel array at a pixel offset. */
        pixels(t, ox, oy) {
            for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
                const c = px(t, x, y);
                if (c[3] === 0) continue;
                const dx = ox + x, dy = oy + y;
                if (dx < 0 || dy < 0 || dx >= w || dy >= h) continue;
                const i = dy * w + dx;
                buf[i] = c[3] === 255 ? c : blend(buf[i], c);
            }
        },
    });
    if (!trim) { sprites.set(name, { w, h, buf }); return; }
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (buf[y * w + x][3] < 8) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const tw = x1 - x0 + 1, th = y1 - y0 + 1;
    const cropped = [];
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) cropped.push(buf[(y0 + y) * w + x0 + x]);
    sprites.set(name, { w: tw, h: th, buf: cropped });
}
function blend(d, c) {
    const a = c[3] / 255, da = d[3] / 255, oa = a + da * (1 - a);
    if (oa === 0) return [0, 0, 0, 0];
    return [0, 1, 2].map((i) => Math.round((c[i] * a + d[i] * da * (1 - a)) / oa)).concat([Math.round(oa * 255)]);
}

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------
add('grassA', TILE, TILE, (d) => d.tile(MC, 0, 24));
add('grassB', TILE, TILE, (d) => d.tile(MC, 1, 24));
add('plot', TILE, TILE, (d) => d.tile(MC, 0, 20));      // pavement forecourt under buildings
add('plotWorn', TILE, TILE, (d) => d.tile(MC, 1, 21));  // pavement with light debris
add('dirt', TILE, TILE, (d) => d.tile(MC, 4, 24));

// ---------------------------------------------------------------------------
// Roads — 16 baked variants indexed by cardinal-neighbour mask (N=1 E=2 S=4 W=8)
// ---------------------------------------------------------------------------
const [ASPHALT_C, ASPHALT_R] = [11, 19];   // the one perfectly flat asphalt tile in the pack
const EDGE = { N: paint(tile(MC, 18, 22)), S: paint(tile(MC, 17, 22)), W: paint(tile(MC, 18, 21)), E: paint(tile(MC, 17, 21)) };
const DASH_V = paint(tile(MC, 9, 20));     // short white bar, road running north/south
const DASH_H = paint(tile(MC, 9, 19));     // short white bar, road running east/west
const JUNCTION = paint(tile(MC, 12, 19));  // white cross, used at 4-way junctions
export const DIRS = ['N', 'E', 'S', 'W'];
for (let mask = 0; mask < 16; mask++) {
    add(`road${mask}`, TILE, TILE, (d) => {
        d.tile(MC, ASPHALT_C, ASPHALT_R);
        // A side with no road neighbour gets the pack's painted road edge.
        DIRS.forEach((dir, i) => { if (!(mask & (1 << i))) d.pixels(EDGE[dir], 0, 0); });
        const count = DIRS.filter((_, i) => mask & (1 << i)).length;
        if (count === 4) d.pixels(JUNCTION, 0, 0);
        else if (mask === 0b0101) d.pixels(DASH_V, 0, 0);   // straight N-S
        else if (mask === 0b1010) d.pixels(DASH_H, 0, 0);   // straight E-W
    });
}

// Painted arrows, marking lifted off its asphalt so it can sit on any surface.
add('arrowN', TILE, TILE, (d) => d.pixels(paint(tile(MC, 19, 21)), 0, 0));
add('arrowS', TILE, TILE, (d) => d.pixels(paint(tile(MC, 19, 22)), 0, 0));
add('arrowW', TILE, TILE, (d) => d.pixels(paint(tile(MC, 19, 23)), 0, 0));
add('arrowE', TILE, TILE, (d) => d.pixels(paint(tile(MC, 19, 24)), 0, 0));

// ---------------------------------------------------------------------------
// Building parts — roofs, walls, openings, shop dressing
// ---------------------------------------------------------------------------
// Roof 9-slices. Each family occupies 8 columns; the first four carry the trim.
const ROOFS = { red: 0, grey: 8, pale: 16, tan: 24 };
const ROOF_SLICE = { tl: [0, 0], tr: [1, 0], t: [2, 0], l: [3, 0], bl: [0, 1], br: [1, 1], b: [2, 1], r: [3, 1], mid: [4, 0] };
for (const [family, o] of Object.entries(ROOFS))
    for (const [slice, [c, r]] of Object.entries(ROOF_SLICE))
        add(`roof_${family}_${slice}`, TILE, TILE, (d) => d.tile(MC, o + c, r));

// Wall strips. Each family occupies 4 columns: single, left, middle, right.
const WALLS = { brick: 0, stone: 4, sand: 8 };
const WALL_SLICE = { one: 0, l: 1, m: 2, r: 3 };
for (const [family, o] of Object.entries(WALLS))
    for (const [slice, c] of Object.entries(WALL_SLICE))
        add(`wall_${family}_${slice}`, TILE, TILE, (d) => d.tile(MC, o + c, 5));

add('windowHome', TILE, TILE, (d) => d.tile(MC, 26, 17));   // brown-framed pane
add('windowFlat', TILE, TILE, (d) => d.tile(MC, 25, 19));   // plain pane
add('shopGlassL', TILE, TILE, (d) => d.tile(MC, 20, 24));   // storefront display, left frame
add('shopGlass', TILE, TILE, (d) => d.tile(MC, 21, 24));    // storefront display with green band
add('shopGlassR', TILE, TILE, (d) => d.tile(MC, 22, 24));   // storefront display, right frame
add('doorHome', TILE, TILE, (d) => d.tile(MC, 20, 27));     // wooden front door
add('doorStore', TILE, TILE, (d) => d.tile(MC, 25, 25));    // glass shop door
add('awningGreen', TILE, TILE, (d) => d.tile(MC, 24, 12));
add('awningOrange', TILE, TILE, (d) => d.tile(MC, 28, 12));
add('signBar', TILE, TILE, (d) => d.tile(MC, 32, 8));
add('signDots', TILE, TILE, (d) => d.tile(MC, 32, 9));

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
const TREES = { green: 31, amber: 32, pine: 33 };
for (const [name, c] of Object.entries(TREES))
    add(`tree_${name}`, TILE, TILE * 2, (d) => { d.tile(MC, c, 10, 0, 0); d.tile(MC, c, 11, 0, 1); });
add('bush', TILE, TILE, (d) => d.tile(MC, 31, 13));
add('crateFruit', TILE, TILE, (d) => d.tile(MC, 12, 18));
add('crateVeg', TILE, TILE, (d) => d.tile(MC, 13, 18));
add('cone', TILE, TILE, (d) => d.tile(MC, 14, 18));

// ---------------------------------------------------------------------------
// Vehicles — four fixed-viewpoint views each, never rotated.
//
// The town is drawn as upright facades on a flat ground plane, so a car shows
// its side when it drives across the screen and its front or back when it
// drives towards or away from the player. Each vehicle occupies six columns:
//   31-33 side facing west · 34-36 side facing east   (rows r, r+1)
//   31-32 rear             · 33-34 front              (rows r+2, r+3)
// ---------------------------------------------------------------------------
const VEHICLES = { green: 16, silver: 20, amber: 24 };
const view = (name, c, r, cols) => add(`car_${name}`, TILE * cols, TILE * 2, (d) => {
    for (let j = 0; j < 2; j++) for (let i = 0; i < cols; i++) d.tile(MC, c + i, r + j, i, j);
}, true);
for (const [name, r] of Object.entries(VEHICLES)) {
    view(`${name}_W`, 31, r, 3);
    view(`${name}_E`, 34, r, 3);
    view(`${name}_N`, 31, r + 2, 2);
    view(`${name}_S`, 33, r + 2, 2);
}

// ---------------------------------------------------------------------------
// Pack: shelf-fit into a power-of-two-width sheet, 1px transparent gutter.
// ---------------------------------------------------------------------------
const GUTTER = 1, SHEET_W = 256;
const names = [...sprites.keys()].sort((a, b) => sprites.get(b).h - sprites.get(a).h || a.localeCompare(b));
const frames = {};
let cx = GUTTER, cy = GUTTER, rowH = 0;
for (const name of names) {
    const s = sprites.get(name);
    if (cx + s.w + GUTTER > SHEET_W) { cx = GUTTER; cy += rowH + GUTTER; rowH = 0; }
    frames[name] = { x: cx, y: cy, w: s.w, h: s.h };
    cx += s.w + GUTTER;
    rowH = Math.max(rowH, s.h);
}
const SHEET_H = cy + rowH + GUTTER;
const sheet = blank(SHEET_W, SHEET_H, [0, 0, 0, 0]);
for (const name of names) {
    const s = sprites.get(name), f = frames[name];
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) set(sheet, f.x + x, f.y + y, s.buf[y * s.w + x]);
}
const outPng = path.join(ROOT, 'public/images/city/city-atlas.png');
fs.mkdirSync(path.dirname(outPng), { recursive: true });
write(sheet, outPng);

const outTs = path.join(ROOT, 'src/game/cityAtlas.ts');
fs.writeFileSync(outTs, `/**
 * GENERATED by tools/build-city-atlas.mjs — do not edit by hand.
 *
 * Frame rectangles inside public/images/city/city-atlas.png, which is packed
 * from the Kenney CC0 pack kept intact under src/assets/source/kenny/.
 * Semantic meaning lives in cityArt.ts; this file is only geometry.
 */
export const ATLAS_URL = 'images/city/city-atlas.png';
export const ATLAS_TILE = ${TILE};
export interface Frame { x: number; y: number; w: number; h: number }
export const FRAMES = ${JSON.stringify(Object.fromEntries(Object.entries(frames).sort(([a], [b]) => a.localeCompare(b))), null, 4).replace(/"([a-zA-Z_$][\w$]*)":/g, '$1:')} as const;
export type FrameName = keyof typeof FRAMES;
`);

// A contact sheet for review; not shipped.
const previewDir = process.env.CITY_ATLAS_PREVIEW;
if (previewDir) {
    const S = 4;
    const prev = blank(SHEET_W * S, SHEET_H * S, [24, 28, 38, 255]);
    for (let y = 0; y < SHEET_H; y++) for (let x = 0; x < SHEET_W; x++) {
        const c = get(sheet, x, y);
        if (c[3] === 0) continue;
        rect(prev, x * S, y * S, S, S, c);
    }
    write(prev, previewDir);
}
console.log(`city-atlas.png ${SHEET_W}x${SHEET_H}, ${names.length} frames`);
