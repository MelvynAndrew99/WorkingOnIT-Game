/**
 * Review helper: pull named frames out of apartment-sheet.png and write them side by side at 6x.
 *   node docs/artwork/housing/apartment/zoom.mjs apartment_1_S apartment_2_S_N_3
 * Writes zoom.png next to the sheet. Nothing else reads this file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = path.dirname(fileURLToPath(import.meta.url));
const png = await import('../../../../tools/png.mjs').catch(() => import('./png-nodeps.mjs'));
const sheet = png.read(path.join(OUT, 'apartment-sheet.png'));
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'apartment-sheet.json'), 'utf8'));
const keys = process.argv.slice(2);
if (!keys.length) throw Error('usage: zoom.mjs <frame key> [...]');
const Z = 6, S = manifest.frameSize, PAD = 6;                                          // PAD keeps the lot edges readable
const cell = S * Z + PAD * 2;
const out = png.blank(keys.length * cell, cell, [120, 40, 90, 255]);
keys.forEach((k, i) => {
  const f = manifest.frames[k];
  if (!f) throw Error(`no frame ${k}`);
  png.blit(out, sheet, f.x, f.y, S, S, i * cell + PAD, PAD, Z);
});
png.write(out, path.join(OUT, 'zoom.png'));
console.log(`Wrote zoom.png: ${keys.join(', ')}`);
