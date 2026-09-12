// ---------------------------------------------------------------------------
// bus-art.mjs — candidate minibus sprites (4 fixed camera views) + comparison
//
// SOURCE INSPECTION FINDINGS (actually read, 2026-09-11):
//   /tmp/claude-bus-art-scope/modern-city.png  — 640x480, 16px art tiles on a
//     17px stride grid (cols 0..37, rows 0..27; tile origin = col*17, row*17).
//     Vehicles live in the right-hand block, roughly x 527..639 / y 272..459,
//     i.e. cols 31..37 x rows 16..27. Contents there: a green hatch/sedan set,
//     a grey van/pickup set and an orange-red car set, each drawn as four
//     fixed-camera views (side E, side W, front S, rear N) — NOT rotations.
//     Palette is muted/desaturated (cream #e6e0d2-ish, mid greys, soft greens,
//     dull orange), 1px darker edge shading, flat fills, no gradients.
//   /tmp/claude-bus-art-scope/urban-pack.png   — smaller sheet: road/plaza
//     tiles, doors/windows, props, character strip and a few tiny top-down
//     civilian cars (orange / red / green, approx x 265..400, y 140..235).
//   >>> RESULT: NO BUS, COACH, MINIBUS OR ANY MULTI-WINDOW LONG VEHICLE EXISTS
//       IN EITHER AUTHORIZED SHEET. Only short civilian cars/vans/pickups.
//   Therefore the bus below is drawn from scratch, pixel by pixel, matching the
//   Kenney viewpoint (side elevation for E/W, foreshortened front/rear face
//   with receding roof for S/N), pixel density and muted palette. NO source
//   pixels are reused in the sprites; the sheet is only read again to paste a
//   reference crop — modern-city.png region (x=527, y=272, w=51, h=68),
//   i.e. cols 31..33 x rows 16..19 — into comparison.png for side-by-side
//   judging.
//
// Canvases: bus-E/bus-W 36x24, bus-S/bus-N 22x29, everything else transparent.
// Body fits a one-tile (16px) vehicle envelope in width; length is the long
// axis only, as with the Kenney vans. Candidate art only — no integration.
// ---------------------------------------------------------------------------

import { blank, rect, set, write, read, blit } from '../../../../tools/png.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT = new URL('.', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);

const SRC_CITY = new URL('../../../../src/assets/source/kenny/kenney_roguelike-modern-city/Tilemap/tilemap.png', import.meta.url).pathname;
const SRC_URBAN = new URL('../../../../src/assets/source/kenny/kenney_rpg-urban-pack/Tilemap/tilemap.png', import.meta.url).pathname;

// --- palette: muted cream + muted teal, sampled in spirit from the sheets ----
const CREAM_L = [244, 238, 221, 255]; // sunlit roof
const CREAM = [230, 222, 201, 255]; // body
const CREAM_D = [197, 186, 161, 255]; // shaded body / panel lines
const CREAM_DD = [160, 149, 126, 255]; // deep shade, grille
const TEAL_L = [110, 166, 161, 255];
const TEAL = [ 78, 136, 132, 255];
const TEAL_D = [ 50,  94,  92, 255];
const GLASS_L = [187, 203, 202, 255];
const GLASS = [146, 169, 172, 255];
const GLASS_D = [103, 127, 132, 255];
const TIRE = [ 45,  47,  52, 255];
const TIRE_L = [ 73,  76,  82, 255];
const HUB = [124, 128, 134, 255];
const DARK = [ 58,  56,  52, 255]; // wheel wells / underbody
const LAMP = [236, 216, 150, 255];
const LAMP_D = [193, 170, 106, 255];
const TAIL = [176,  84,  72, 255];
const TAIL_D = [131,  60,  52, 255];
const SHADOW = [ 38,  40,  44, 90];

// ============================ SIDE VIEW (E / W) =============================
// Facing right when flip === false (East). West is the same fixed-camera side
// elevation mirrored on X — never a rotation of another view.
function drawSide(flip) {
  const W = 36, H = 24;
  const img = blank(W, H);
  const R = (x, y, w, h, c) => rect(img, flip ? W - x - w : x, y, w, h, c);
  const P = (x, y, c) => set(img, flip ? W - 1 - x : x, y, c);

  // ---- roof (lit) --------------------------------------------------------
  R(6, 4, 24, 1, CREAM_L);
  R(4, 5, 29, 1, CREAM_L);
  R(3, 6, 31, 1, CREAM);
  P(33, 6, CREAM_D);           // nose bevel
  P(2, 6, CREAM_D);            // tail bevel
  R(2, 7, 32, 1, CREAM_D);     // shadow under the roof lip

  // ---- window band -------------------------------------------------------
  R(2, 8, 32, 5, CREAM);
  const win = (x, w) => {
    R(x, 8, w, 1, GLASS_L);
    R(x, 9, w, 2, GLASS);
    R(x, 11, w, 1, GLASS_D);
  };
  win(5, 6); win(12, 6); win(19, 4);   // saloon windows
  win(24, 3);                          // entrance door glass
  win(29, 4);                          // windscreen
  P(29, 8, CREAM);                     // bevelled windscreen top corner
  P(32, 8, CREAM_L);

  // ---- lower body --------------------------------------------------------
  R(2, 12, 32, 1, CREAM_D);            // window sill line
  R(2, 13, 32, 1, CREAM);
  R(2, 14, 32, 1, TEAL);               // livery stripe
  R(2, 15, 32, 1, TEAL_D);
  R(2, 16, 32, 2, CREAM);
  R(2, 18, 32, 1, CREAM_D);
  R(3, 19, 30, 1, TEAL_D);             // skirt
  R(4, 20, 28, 1, DARK);               // underbody

  // door frame + a panel seam so it does not read as a plain box
  R(23, 7, 1, 12, CREAM_D);
  R(27, 7, 1, 12, CREAM_D);
  R(18, 13, 1, 5, CREAM_D);

  // lamps
  R(32, 16, 2, 2, LAMP); P(32, 17, LAMP_D);
  R(2, 16, 2, 2, TAIL);  P(3, 17, TAIL_D);

  // ---- wheels (rear c=8, front c=29 under the driver) --------------------
  for(const c of [8,29]){ R(c-1,16,3,1,DARK); R(c-2,17,5,1,DARK); P(c-3,18,DARK); P(c+3,18,DARK); P(c-3,19,DARK); P(c+3,19,DARK); R(c-1,17,3,1,TIRE); R(c-2,18,5,3,TIRE); R(c-1,21,3,1,TIRE); P(c,17,TIRE_L); P(c,19,HUB); }

  // ---- contact shadow ----------------------------------------------------
  R(5, 21, 26, 1, SHADOW);
  return img;
}

// ========================= FRONT / REAR VIEW (S / N) ========================
// Fixed camera, slightly elevated: the roof recedes upward, the front (S) or
// rear (N) face sits at the bottom. Built independently from the side sprite.
function drawEnd(isRear) {
  const W = 22, H = 29;
  const img = blank(W, H);

  // ---- tyres first, body is painted over them -> only slivers show -------
  for(const cx of [2,19]){ rect(img,cx,22,1,6,TIRE); rect(img,cx,22,1,1,TIRE_L); }

  // ---- receding roof -----------------------------------------------------
  rect(img, 5, 4, 12, 1, CREAM);        // far roof edge
  rect(img, 4, 5, 14, 2, CREAM_L);
  rect(img, 3, 7, 16, 10, CREAM_L);
  rect(img, 3, 7, 1, 10, CREAM_D);      // left roof edge in shade
  rect(img, 18, 7, 1, 10, CREAM_D);     // right roof edge in shade
  rect(img, 4, 5, 1, 2, CREAM_D);
  rect(img, 17, 5, 1, 2, CREAM_D);
  rect(img, 8, 9, 6, 3, CREAM);         // roof hatch
  rect(img, 8, 9, 6, 1, CREAM_D);
  rect(img, 9, 13, 4, 1, CREAM_D);      // roof seam
  rect(img, 3, 17, 16, 1, CREAM_D);     // roof lip shadow onto the glass

  if (!isRear) {
    // ---------------- S : windscreen + front face -------------------------
    rect(img, 4, 18, 14, 5, GLASS);
    rect(img, 4, 18, 14, 1, GLASS_D);
    rect(img, 4, 22, 14, 1, GLASS_D);
    for (let i = 0; i < 4; i++) set(img, 5 + i, 21 - i, GLASS_L); // stepped sheen
    set(img, 9, 18, GLASS_L);
    rect(img, 3, 18, 1, 5, CREAM);       // A-pillars
    rect(img, 18, 18, 1, 5, CREAM);

    rect(img, 3, 23, 16, 1, TEAL);       // livery stripe
    rect(img, 3, 24, 16, 1, CREAM);
    rect(img, 3, 25, 16, 2, CREAM);
    rect(img, 4, 25, 3, 2, LAMP);        // headlamps
    rect(img, 15, 25, 3, 2, LAMP);
    rect(img, 4, 26, 3, 1, LAMP_D);
    rect(img, 15, 26, 3, 1, LAMP_D);
    rect(img, 8, 25, 6, 2, CREAM_DD);    // grille
    rect(img, 8, 26, 6, 1, DARK);
    rect(img, 3, 27, 16, 1, TEAL_D);     // bumper
  } else {
    // ---------------- N : rear window + tail panel ------------------------
    rect(img, 5, 18, 12, 4, GLASS_D);
    rect(img, 5, 18, 12, 1, GLASS);
    rect(img, 5, 19, 3, 1, GLASS_L);
    rect(img, 3, 18, 2, 4, CREAM);
    rect(img, 17, 18, 2, 4, CREAM);
    rect(img, 3, 22, 16, 1, CREAM_D);

    rect(img, 3, 23, 16, 1, TEAL);       // livery stripe
    rect(img, 3, 24, 16, 3, CREAM);
    rect(img, 4, 24, 3, 2, TAIL);        // tail lamps
    rect(img, 15, 24, 3, 2, TAIL);
    rect(img, 4, 25, 3, 1, TAIL_D);
    rect(img, 15, 25, 3, 1, TAIL_D);
    rect(img, 9, 24, 4, 2, CREAM_D);     // rear hatch panel
    rect(img, 9, 25, 4, 1, CREAM_L);     // plate
    rect(img, 3, 27, 16, 1, TEAL_D);     // bumper
    rect(img, 4, 26, 2, 1, DARK);        // exhaust
  }

  rect(img, 4, 28, 14, 1, SHADOW);       // contact shadow
  return img;
}

// ================================ render ====================================
const busE = drawSide(false);
const busW = drawSide(true);
const busS = drawEnd(false);
const busN = drawEnd(true);

write(busE, out('bus-E.png'));
write(busW, out('bus-W.png'));
write(busS, out('bus-S.png'));
write(busN, out('bus-N.png'));

// ============================= comparison sheet =============================
const CW = 620, CH = 190;
const cmp = blank(CW, CH);
rect(cmp, 0, 0, CW, CH, [46, 50, 54, 255]);
rect(cmp, 0, 146, CW, 1, [70, 75, 80, 255]);

// 4x enlargements, nearest-neighbour
blit(cmp, busE, 0, 0, 36, 24, 8, 8, 4);
blit(cmp, busW, 0, 0, 36, 24, 160, 8, 4);
blit(cmp, busS, 0, 0, 22, 29, 312, 8, 4);
blit(cmp, busN, 0, 0, 22, 29, 408, 8, 4);

// Kenney civilian reference crops beside them (read-only, not reused as art)
try {
  const city = read(SRC_CITY);
  // cols 31..33 x rows 16..19 of the 17px-stride grid => the 4-view car sets
  blit(cmp, city, 527, 272, 51, 68, 504, 8, 2);
} catch (e) {
  rect(cmp, 504, 8, 102, 136, [80, 60, 60, 255]);
}
try {
  const urban = read(SRC_URBAN);
  blit(cmp, urban, 265, 140, 68, 46, 504, 150, 1); // urban-pack small cars, 1x
} catch (e) { /* reference optional */ }

// native-size row
blit(cmp, busE, 0, 0, 36, 24, 8, 152, 1);
blit(cmp, busW, 0, 0, 36, 24, 52, 152, 1);
blit(cmp, busS, 0, 0, 22, 29, 96, 152, 1);
blit(cmp, busN, 0, 0, 22, 29, 126, 152, 1);

write(cmp, out('comparison.png'));

console.log('No bus exists in either Kenney sheet (cars/vans/pickups only).');
console.log('Wrote bus-N.png, bus-E.png, bus-S.png, bus-W.png, comparison.png to', OUT);
