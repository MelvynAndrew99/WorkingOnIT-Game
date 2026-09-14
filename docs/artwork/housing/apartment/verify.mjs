/**
 * Checks apartment-sheet.png against apartment-sheet.json:
 *   1. 64 unique frames, in-bounds, matching the declared sheet/frame size.
 *   2. every declared entrance tile has a driveway mouth cut to the lot edge,
 *      and no other perimeter tile does (so no frame shows an unused driveway);
 *   3. the primary entrance of a rotation is identical at level 1 and level 2;
 *   4. the building itself is pixel-identical in every frame of a level (upright, never moved).
 *   node docs/artwork/housing/apartment/verify.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = path.dirname(fileURLToPath(import.meta.url));
const png = await import('../../../../tools/png.mjs').catch(() => import('./png-nodeps.mjs'));
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'apartment-sheet.json'), 'utf8'));
const sheet = png.read(path.join(OUT, manifest.sheet));
const S = manifest.frameSize, T = manifest.tileSize;
const ASPHALT = [0x47, 0x4e, 0x53];
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

const keys = Object.keys(manifest.frames);
check(keys.length === 64, `expected 64 frames, got ${keys.length}`);
check(new Set(keys).size === keys.length, 'duplicate frame keys');

/** Perimeter tiles whose outermost pixel row/column is paved: the driveway mouths. */
function mouths(frame) {
  const at = (x, y) => png.get(sheet, frame.x + x, frame.y + y);
  const paved = (x, y) => { const c = at(x, y); return ASPHALT.every((v, i) => c[i] === v) && c[3] === 255; };
  const found = [];
  for (let t = 0; t < 4; t++) {
    let n = 0, e = 0, s = 0, w = 0;
    for (let k = 0; k < T; k++) {
      if (paved(t * T + k, 0)) n++;
      if (paved(S - 1, t * T + k)) e++;
      if (paved(t * T + k, S - 1)) s++;
      if (paved(0, t * T + k)) w++;
    }
    for (const [side, count] of [['N', n], ['E', e], ['S', s], ['W', w]]) if (count) found.push({ side, offset: t, count });
  }
  return found;
}
for (const key of keys) {
  const f = manifest.frames[key];
  check(f.w === S && f.h === S, `${key}: frame size ${f.w}x${f.h}`);
  check(f.x >= 0 && f.y >= 0 && f.x + f.w <= sheet.width && f.y + f.h <= sheet.height, `${key}: frame out of sheet bounds`);
  const want = [f.primary, f.secondary].filter(Boolean);
  const got = mouths(f);
  const fmt = list => list.map(e => `${e.side}${e.offset}`).sort().join(',');
  check(fmt(want) === fmt(got), `${key}: driveways ${fmt(got) || '(none)'} but manifest says ${fmt(want)}`);
  for (const m of got) check(m.count >= 10, `${key}: mouth ${m.side}${m.offset} only ${m.count}px wide`);
  for (const e of want) {
    const world = e.side === 'N' ? [e.offset, -1] : e.side === 'E' ? [4, e.offset] : e.side === 'S' ? [e.offset, 4] : [-1, e.offset];
    check(e.x === world[0] && e.y === world[1], `${key}: ${e.side}${e.offset} world offset (${e.x},${e.y}) should be (${world})`);
  }
  check(f.level === 1 ? f.secondary === null : f.secondary !== null, `${key}: wrong entrance count for level ${f.level}`);
  check(f.cars === (f.level === 1 ? 2 : 4), `${key}: cars ${f.cars}`);
}
// Every level-2 frame of a rotation keeps that rotation's level-1 primary.
for (const p of manifest.primaryByRotation) {
  const one = manifest.frames[`apartment_1_${p.side}`];
  check(one && one.primary.side === p.side && one.primary.offset === p.offset, `level 1 ${p.side}: wrong primary`);
  const two = keys.filter(k => k.startsWith(`apartment_2_${p.side}_`));
  check(two.length === 15, `${p.side}: ${two.length} level-2 choices, expected 15`);
  for (const k of two) {
    const f = manifest.frames[k];
    check(f.primary.side === p.side && f.primary.offset === p.offset, `${k}: primary moved`);
    check(!(f.secondary.side === p.side && f.secondary.offset === p.offset), `${k}: second entrance duplicates the primary`);
  }
}
// The block is the same pixels everywhere: only paving, walks and garden vary.
const BAND = { 1: [20, 53], 2: [13, 53] };
for (const level of [1, 2]) {
  const frames = keys.filter(k => manifest.frames[k].level === level);
  const [top, bottom] = BAND[level], ref = manifest.frames[frames[0]];
  for (const k of frames.slice(1)) {
    const f = manifest.frames[k];
    let diff = 0;
    for (let y = top; y < bottom; y++) for (let x = 11; x < 53; x++) {
      const a = png.get(sheet, ref.x + x, ref.y + y), b = png.get(sheet, f.x + x, f.y + y);
      if (a.some((v, i) => v !== b[i])) diff++;
    }
    check(diff === 0, `${k}: building differs from ${frames[0]} in ${diff}px`);
  }
}
if (fails.length) { console.error(`${fails.length} check(s) failed:`); for (const f of fails.slice(0, 20)) console.error(' -', f); process.exit(1); }
console.log(`OK: ${keys.length} frames, driveways match the manifest, primaries fixed, building identical per level.`);
