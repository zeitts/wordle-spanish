#!/usr/bin/env node
// Rasterises frontend/public/favicon.svg into the two bitmap icons browsers
// still ask for by themselves:
//
//   favicon.ico          16 + 32 + 48 px, for browsers with no SVG-favicon support
//   apple-touch-icon.png 180 px, for "Add to Home Screen" on iOS
//
// The mark is redefined here rather than parsed out of the SVG, so the two files
// have to be kept in sync by hand -- it is nine rectangles, that is cheap enough.
//
// Usage:  node scripts/build-icons.mjs
//
// No dependencies: the PNG and ICO containers are written out below, and shapes
// are antialiased by supersampling. Re-run and commit the output after editing
// the mark; nothing in the build pipeline calls this.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "frontend", "public");

// ---------- the mark, in favicon.svg's 32x32 design grid ----------

const GRID = 32;
const PAD = 4; // grid inset from the icon edge
const CELL = 7; // tile side
const GAP = 1.5; // between tiles
const TILE_RADIUS = 1.5;
const BG_RADIUS = 6;

const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const BG = hexToRgb("#121213");
const TILES = [
  ["#538d4e", "#3a3a3c", "#b59f3b"],
  ["#3a3a3c", "#538d4e", "#3a3a3c"],
  ["#b59f3b", "#3a3a3c", "#538d4e"],
].map((row) => row.map(hexToRgb));

// Is the point inside a rounded rectangle? Distance is measured from the point
// to the nearest corner circle's centre, clamped so straight edges stay straight.
function inRoundRect(px, py, x, y, w, h, r) {
  const qx = Math.max(x + r - px, 0, px - (x + w - r));
  const qy = Math.max(y + r - py, 0, py - (y + h - r));
  return qx * qx + qy * qy <= r * r;
}

// Colour of the topmost shape under a point, or null if outside the icon.
function sample(px, py, bgRadius) {
  if (!inRoundRect(px, py, 0, 0, GRID, GRID, bgRadius)) return null;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = PAD + col * (CELL + GAP);
      const y = PAD + row * (CELL + GAP);
      if (inRoundRect(px, py, x, y, CELL, CELL, TILE_RADIUS)) {
        return TILES[row][col];
      }
    }
  }
  return BG;
}

const SUB = 4; // subsamples per axis, so 16 per pixel

// Renders the mark to a raw 8-bit RGBA buffer, row-major.
function render(size, bgRadius) {
  const step = GRID / (size * SUB);
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let hits = 0;
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const c = sample(
            (x * SUB + sx + 0.5) * step,
            (y * SUB + sy + 0.5) * step,
            bgRadius,
          );
          if (!c) continue; // outside the icon: stays transparent
          r += c[0];
          g += c[1];
          b += c[2];
          hits++;
        }
      }
      if (!hits) continue;
      // Average only the covered subsamples, so edge pixels keep their hue
      // instead of being darkened towards the transparent background.
      const i = (y * size + x) * 4;
      pixels[i] = Math.round(r / hits);
      pixels[i + 1] = Math.round(g / hits);
      pixels[i + 2] = Math.round(b / hits);
      pixels[i + 3] = Math.round((hits / (SUB * SUB)) * 255);
    }
  }
  return pixels;
}

// ---------- PNG (8-bit RGBA, no interlacing) ----------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type 6 = truecolour with alpha
  // bytes 10-12 (compression / filter / interlace) are all 0

  // Each scanline is prefixed with its filter type; 0 means "none".
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- ICO holding PNG frames (Vista+, and every current browser) ----------

function encodeIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // resource type 1 = icon
  header.writeUInt16LE(frames.length, 4);

  let offset = header.length + frames.length * 16;
  const entries = frames.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size; // 0 would mean 256
    entry[1] = size;
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

// ---------- write ----------

mkdirSync(OUT_DIR, { recursive: true });

const ico = encodeIco(
  [16, 32, 48].map((size) => ({
    size,
    png: encodePng(size, render(size, BG_RADIUS)),
  })),
);
writeFileSync(join(OUT_DIR, "favicon.ico"), ico);
console.error("wrote favicon.ico (" + ico.length + " bytes, 16/32/48px)");

// iOS rounds home-screen icons itself, so this one is full-bleed and square --
// rounding it here too would show black slivers in the corners.
const touch = encodePng(180, render(180, 0));
writeFileSync(join(OUT_DIR, "apple-touch-icon.png"), touch);
console.error("wrote apple-touch-icon.png (" + touch.length + " bytes, 180px)");
