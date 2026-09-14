/**
 * Dependency-free stand-in for tools/png.mjs, used only when `pngjs` is not installed
 * (this workspace had no node_modules and installing is out of scope for the artwork task).
 * Same API and same pixel helpers; PNG coding is done here with node's built-in zlib.
 *
 * Decodes 8-bit non-interlaced PNGs (grey, RGB, palette, grey+alpha, RGBA) to RGBA;
 * encodes 8-bit RGBA. That covers the city atlas and every sprite in this folder.
 */
import zlib from 'node:zlib';
import fs from 'node:fs';

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function decode(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw Error('not a png');
  const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20);
  const depth = buf[24], color = buf[25], interlace = buf[28];
  if (depth !== 8 || interlace !== 0 || !(color in CHANNELS)) throw Error(`unsupported png: depth ${depth} color ${color} interlace ${interlace}`);
  const idat = [];
  let palette = null, trns = null, o = 8;
  while (o + 8 <= buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), body = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IDAT') idat.push(body);
    else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') trns = body;
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = CHANNELS[color], stride = width * ch;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride), prev = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? out[i - ch] : 0, b = prev ? prev[i] : 0, c = prev && i >= ch ? prev[i - ch] : 0;
      const v = line[i];
      out[i] = (filter === 0 ? v : filter === 1 ? v + a : filter === 2 ? v + b : filter === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c)) & 0xff;
    }
  }
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * ch, d = i * 4;
    if (color === 6) { data[d] = pixels[s]; data[d + 1] = pixels[s + 1]; data[d + 2] = pixels[s + 2]; data[d + 3] = pixels[s + 3]; }
    else if (color === 2) { data[d] = pixels[s]; data[d + 1] = pixels[s + 1]; data[d + 2] = pixels[s + 2]; data[d + 3] = 255; }
    else if (color === 0) { data.fill(pixels[s], d, d + 3); data[d + 3] = 255; }
    else if (color === 4) { data.fill(pixels[s], d, d + 3); data[d + 3] = pixels[s + 1]; }
    else { const p = pixels[s] * 3; data[d] = palette[p]; data[d + 1] = palette[p + 1]; data[d + 2] = palette[p + 2]; data[d + 3] = trns && pixels[s] < trns.length ? trns[pixels[s]] : 255; }
  }
  return { width, height, data };
}
export function encode(img) {
  const { width, height, data } = img, stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(data.buffer ?? data, data.byteOffset ?? 0, data.length).copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

export const read = (p) => decode(fs.readFileSync(p));
export const blank = (w, h, rgba = [0, 0, 0, 0]) => {
  const img = { width: w, height: h, data: Buffer.alloc(w * h * 4) };
  for (let i = 0; i < w * h; i++) img.data.set(rgba, i * 4);
  return img;
};
export const write = (img, p) => fs.writeFileSync(p, encode(img));
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
