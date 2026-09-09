import { PNG } from 'pngjs';
import fs from 'node:fs';

export const read = (p) => PNG.sync.read(fs.readFileSync(p));
export const blank = (w, h, rgba = [0, 0, 0, 0]) => {
    const png = new PNG({ width: w, height: h });
    for (let i = 0; i < w * h; i++) png.data.set(rgba, i * 4);
    return png;
};
export const write = (png, p) => fs.writeFileSync(p, PNG.sync.write(png));
export const get = (img, x, y) => {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return [0, 0, 0, 0];
    const i = (y * img.width + x) * 4;
    return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
};
export const set = (img, x, y, c) => {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
    img.data.set(c, (y * img.width + x) * 4);
};
/** Alpha-over composite of one pixel. */
export const over = (img, x, y, c) => {
    if (c[3] === 0) return;
    if (c[3] === 255) return set(img, x, y, c);
    const d = get(img, x, y);
    const a = c[3] / 255, da = d[3] / 255, oa = a + da * (1 - a);
    if (oa === 0) return set(img, x, y, [0, 0, 0, 0]);
    set(img, x, y, [0, 1, 2].map(i => Math.round((c[i] * a + d[i] * da * (1 - a)) / oa)).concat([Math.round(oa * 255)]));
};
/** Nearest-neighbour blit with integer scale. */
export const blit = (dst, src, sx, sy, sw, sh, dx, dy, scale = 1) => {
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        const c = get(src, sx + x, sy + y);
        for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) over(dst, dx + x * scale + i, dy + y * scale + j, c);
    }
};
export const rect = (img, x, y, w, h, c) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) over(img, x + i, y + j, c);
};

// 3x5 digit font, one string of 5 rows per glyph.
const GLYPHS = {
    0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111',
    4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001',
    8: '111101111101111', 9: '111101111001111', ',': '000000000010100', '-': '000000111000000',
    x: '000101010101000', ' ': '000000000000000',
};
export const text = (img, str, x, y, scale, c) => {
    let cx = x;
    for (const ch of String(str)) {
        const g = GLYPHS[ch] ?? GLYPHS[' '];
        for (let r = 0; r < 5; r++) for (let col = 0; col < 3; col++) {
            if (g[r * 3 + col] === '1') rect(img, cx + col * scale, y + r * scale, scale, scale, c);
        }
        cx += 4 * scale;
    }
    return cx;
};
