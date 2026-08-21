#!/usr/bin/env node
/* Trim the transparent margin off PNG badge art so every badge's canvas hugs
   its pixels. The site sizes badges by their box, so art that arrives with a
   fat transparent border (the old 256x256 exports) renders visibly smaller
   than art that is cropped tight; trimming normalizes all of it. No deps:
   decodes/encodes PNG with node's zlib (8-bit RGB/RGBA/gray, non-interlaced).

   Usage: node tools/png-trim.js file.png [more.png ...]   (rewrites in place)
*/
"use strict";
const fs = require("fs");
const zlib = require("zlib");

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readChunks(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    chunks.push({ type, data: buf.subarray(off + 8, off + 8 + len) });
    off += 12 + len;
    if (type === "IEND") break;
  }
  return chunks;
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decode(buf) {
  const chunks = readChunks(buf);
  const ihdr = chunks.find(c => c.type === "IHDR").data;
  const width = ihdr.readUInt32BE(0), height = ihdr.readUInt32BE(4);
  const depth = ihdr[8], colorType = ihdr[9], interlace = ihdr[12];
  if (depth !== 8 || interlace !== 0) throw new Error("unsupported PNG (need 8-bit, non-interlaced)");
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error("unsupported color type " + colorType);
  const idat = Buffer.concat(chunks.filter(c => c.type === "IDAT").map(c => c.data));
  const raw = zlib.inflateSync(idat);
  const stride = width * channels;
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = px.subarray(y * stride, (y + 1) * stride);
    const prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      out[x] = v & 0xff;
    }
  }
  return { width, height, channels, colorType, px };
}

function encode(img) {
  const { width, height, channels, colorType, px } = img;
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none (zlib still shrinks it fine)
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  return Buffer.concat([SIG, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// The content box: every pixel whose alpha clears a small threshold (alpha-less
// color types count every pixel, so those images are left untouched).
function contentBox(img, threshold) {
  const { width, height, channels, colorType, px } = img;
  const hasAlpha = colorType === 4 || colorType === 6;
  if (!hasAlpha) return { x0: 0, y0: 0, x1: width - 1, y1: height - 1 };
  const aOff = channels - 1;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * channels;
    for (let x = 0; x < width; x++) {
      if (px[row + x * channels + aOff] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null; // fully transparent
  return { x0, y0, x1, y1 };
}

function crop(img, box) {
  const { channels, px } = img;
  const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
  const out = Buffer.alloc(w * h * channels);
  for (let y = 0; y < h; y++) {
    const src = ((box.y0 + y) * img.width + box.x0) * channels;
    px.copy(out, y * w * channels, src, src + w * channels);
  }
  return { width: w, height: h, channels, colorType: img.colorType, px: out };
}

function trimFile(file) {
  const img = decode(fs.readFileSync(file));
  const box = contentBox(img, 8);
  if (!box) { console.log(file + ": fully transparent, skipped"); return; }
  const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
  if (w === img.width && h === img.height) {
    console.log(`${file}: already tight (${img.width}x${img.height})`);
    return;
  }
  fs.writeFileSync(file, encode(crop(img, box)));
  console.log(`${file}: ${img.width}x${img.height} -> ${w}x${h}`);
}

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: node tools/png-trim.js file.png ..."); process.exit(1); }
files.forEach(trimFile);
