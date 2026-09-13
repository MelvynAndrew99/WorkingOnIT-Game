/**
 * Checks office-sheet.png against office-sheet.json:
 *   1. 64 unique frames, in bounds, at the declared sheet/frame size;
 *   2. every declared entrance tile has a driveway mouth at least 10px wide cut to the lot edge,
 *      and no other perimeter tile has one (so no frame shows a driveway it does not own);
 *   3. declared world offsets match the N/S = x, E/W = y contract;
 *   4. each rotation keeps its level-1 primary across all 15 level-2 choices, and never repeats
 *      it as the second entrance;
 *   5. the block itself is pixel-identical in every frame of a level: upright and never moved.
 *   node docs/artwork/offices/verify.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { read, get } from './lot-kit.mjs';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const PREFIX = 'office';
/** Building rows per level (top .. exclusive base row) and the block's column span. */
const BAND = { 1: [19, 53], 2: [12, 53] }, COLS = [11, 53];
const ASPHALT = [0x47, 0x4e, 0x53];

const manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${PREFIX}-sheet.json`), 'utf8'));
const sheet = read(path.join(OUT, manifest.sheet));
const S = manifest.frameSize, T = manifest.tileSize;
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

const keys = Object.keys(manifest.frames);
check(keys.length === 64, `expected 64 frames, got ${keys.length}`);
check(new Set(keys).size === keys.length, 'duplicate frame keys');
check(sheet.width === 512 && sheet.height === 512, `sheet is ${sheet.width}x${sheet.height}, expected 512x512`);

/** Perimeter tiles whose outermost pixel row/column is paved: the driveway mouths. */
function mouths(frame) {
  const paved = (x, y) => {
    const c = get(sheet, frame.x + x, frame.y + y);
    return c[3] === 255 && ASPHALT.every((v, i) => c[i] === v);
  };
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
  check(fmt(want) === fmt(got), `${key}: driveways ${fmt(got) || '(none)'} but the manifest says ${fmt(want)}`);
  for (const m of got) check(m.count >= 10, `${key}: mouth ${m.side}${m.offset} only ${m.count}px wide`);
  for (const e of want) {
    const world = e.side === 'N' ? [e.offset, -1] : e.side === 'E' ? [4, e.offset] : e.side === 'S' ? [e.offset, 4] : [-1, e.offset];
    check(e.x === world[0] && e.y === world[1], `${key}: ${e.side}${e.offset} world offset (${e.x},${e.y}) should be (${world})`);
  }
  check(f.level === 1 ? f.secondary === null : f.secondary !== null, `${key}: wrong entrance count for level ${f.level}`);
  check(key === (f.level === 1 ? `${PREFIX}_1_${f.primary.side}` : `${PREFIX}_2_${f.primary.side}_${f.secondary.side}_${f.secondary.offset}`), `${key}: key does not match its entrances`);
}
// Every level-2 frame of a rotation keeps that rotation's level-1 primary.
for (const p of manifest.primaryByRotation) {
  const one = manifest.frames[`${PREFIX}_1_${p.side}`];
  check(one && one.primary.side === p.side && one.primary.offset === p.offset, `level 1 ${p.side}: wrong primary`);
  const two = keys.filter(k => k.startsWith(`${PREFIX}_2_${p.side}_`));
  check(two.length === 15, `${p.side}: ${two.length} level-2 choices, expected 15`);
  for (const k of two) {
    const f = manifest.frames[k];
    check(f.primary.side === p.side && f.primary.offset === p.offset, `${k}: primary moved`);
    check(!(f.secondary.side === p.side && f.secondary.offset === p.offset), `${k}: second entrance duplicates the primary`);
  }
}
// The block is the same pixels everywhere: only paving, walks and planting vary.
for (const level of [1, 2]) {
  const frames = keys.filter(k => manifest.frames[k].level === level);
  const [top, bottom] = BAND[level], ref = manifest.frames[frames[0]];
  for (const k of frames.slice(1)) {
    const f = manifest.frames[k];
    let diff = 0;
    for (let y = top; y < bottom; y++) for (let x = COLS[0]; x < COLS[1]; x++) {
      const a = get(sheet, ref.x + x, ref.y + y), b = get(sheet, f.x + x, f.y + y);
      if (a.some((v, i) => v !== b[i])) diff++;
    }
    check(diff === 0, `${k}: building differs from ${frames[0]} in ${diff}px`);
  }
}
// The upgrade must be visibly taller, and both levels must clear the road tiles on every edge.
check(BAND[2][0] < BAND[1][0], 'level 2 is not taller than level 1');
for (const level of [1, 2]) check(BAND[level][0] >= 11, `level ${level} reaches row ${BAND[level][0]}, inside the 11px service ring`);

if (fails.length) { console.error(`${fails.length} check(s) failed:`); for (const f of fails.slice(0, 20)) console.error(' -', f); process.exit(1); }
console.log(`OK: ${keys.length} office frames, driveways match the manifest, primaries fixed, block identical per level.`);
