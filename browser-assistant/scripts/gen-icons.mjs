/**
 * Generate placeholder extension icons (solid gold rounded square with an "S").
 * Pure Node — no native deps. Run with: node scripts/gen-icons.mjs
 *
 * Produces icons/icon-{16,32,48,128}.png in the public/icons dir so the build
 * copies them into the extension package. Replace with branded art later.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  // RGBA pixels: gold background, with a darker "S" approximated by a circle.
  const gold = [255, 209, 102, 255];
  const dark = [10, 10, 10, 255];
  const transparent = [0, 0, 0, 0];
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.48;
  const rInner = size * 0.26;

  const raw = Buffer.alloc(size * size * 4 + size); // each row prefixed by filter byte 0
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let px = gold;
      if (dist > rOuter) px = transparent;
      else if (dist < rInner) px = dark;
      // crude "S" bar: vertical/horizontal cuts
      else {
        const top = y < cy - size * 0.12;
        const bot = y > cy + size * 0.12;
        const left = x < cx;
        if (top && left) px = dark;
        if (bot && !left) px = dark;
      }
      const off = y * (size * 4 + 1) + 1 + x * 4;
      raw[off] = px[0];
      raw[off + 1] = px[1];
      raw[off + 2] = px[2];
      raw[off + 3] = px[3];
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

for (const s of [16, 32, 48, 128]) {
  const png = makePng(s);
  writeFileSync(join(outDir, `icon-${s}.png`), png);
  console.log(`wrote icon-${s}.png (${png.length} bytes)`);
}
