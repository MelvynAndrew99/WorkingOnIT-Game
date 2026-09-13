/**
 * Cut named frames out of office-sheet.png and write zoom.png at 6x for close inspection.
 *   node docs/artwork/offices/zoom.mjs office_1_S office_2_S_N_0
 * With no arguments it shows one frame per level.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blank, read, write, blit, C } from './lot-kit.mjs';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'office-sheet.json'), 'utf8'));
const sheet = read(path.join(OUT, manifest.sheet));
const keys = process.argv.slice(2);
const wanted = keys.length ? keys : ['office_1_S', 'office_2_S_S_3'];
const Z = 6, S = manifest.frameSize, PAD = 4;
const out = blank((S * wanted.length + PAD * (wanted.length + 1)) * Z, (S + PAD * 2) * Z, C.sheet);
wanted.forEach((key, i) => {
  const f = manifest.frames[key];
  if (!f) throw Error(`no frame ${key}`);
  blit(out, sheet, f.x, f.y, S, S, (PAD + i * (S + PAD)) * Z, PAD * Z, Z);
});
write(out, path.join(OUT, 'zoom.png'));
console.log(`zoom.png: ${wanted.join(' ')} at ${Z}x`);
