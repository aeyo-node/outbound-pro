/**
 * Package the built extension (dist/) into a zip for the Chrome Web Store or
 * sideloading. Run after `npm run build`. Uses no dependencies.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, '..', 'dist');
const outDir = join(__dirname, '..');
const outFile = join(outDir, 'swaram-browser-assistant.zip');

// Minimal ZIP writer (STORE + optional deflate). We deflate each entry.
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function walk(dir, acc = []) {
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(dist);
const chunks = [];
const central = [];
let offset = 0;

for (const f of files) {
  const name = relative(dist, f).split(sep).join('/');
  const data = readFileSync(f);
  const compressed = deflateRawSync(data);
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32BE(0x04034b50, 0);
  local.writeUInt16BE(20, 4); // version
  local.writeUInt16BE(0, 6); // flags
  local.writeUInt16BE(8, 8); // method = deflate
  local.writeUInt16BE(0, 10); // time
  local.writeUInt16BE(0, 12); // date
  local.writeUInt32BE(crc, 14);
  local.writeUInt32BE(compressed.length, 18);
  local.writeUInt32BE(data.length, 22);
  local.writeUInt16BE(name.length, 26);
  local.writeUInt16BE(0, 28); // extra
  chunks.push(local, Buffer.from(name, 'ascii'), compressed);

  const cen = Buffer.alloc(46);
  cen.writeUInt32BE(0x02014b50, 0);
  cen.writeUInt16BE(20, 4);
  cen.writeUInt16BE(20, 6);
  cen.writeUInt16BE(0, 8);
  cen.writeUInt16BE(8, 10);
  cen.writeUInt16BE(0, 12);
  cen.writeUInt16BE(0, 14);
  cen.writeUInt32BE(crc, 16);
  cen.writeUInt32BE(compressed.length, 20);
  cen.writeUInt32BE(data.length, 24);
  cen.writeUInt16BE(name.length, 28);
  cen.writeUInt16BE(0, 30); // extra
  cen.writeUInt16BE(0, 32); // comment
  cen.writeUInt16BE(0, 34); // disk
  cen.writeUInt16BE(0, 36); // int attrs
  cen.writeUInt32BE(0, 38); // ext attrs
  cen.writeUInt32BE(offset, 42);
  central.push(cen, Buffer.from(name, 'ascii'));

  offset += local.length + name.length + compressed.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32BE(0x06054b50, 0);
end.writeUInt16BE(0, 4);
end.writeUInt16BE(0, 6);
end.writeUInt16BE(files.length, 8);
end.writeUInt16BE(files.length, 10);
end.writeUInt32BE(centralBuf.length, 12);
end.writeUInt32BE(offset, 16);
end.writeUInt16BE(0, 20);

writeFileSync(outFile, Buffer.concat([...chunks, centralBuf, end]));
console.log(`Wrote ${outFile} (${files.length} files)`);
