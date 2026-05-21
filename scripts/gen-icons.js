// ArtsDominos — PWA icon generator (Node.js built-ins only, no npm)
// Generates assets/icons/icon-192.png and icon-512.png
// Design: double-nine domino tile on a dark Cuban-mahogany background

'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function makePNG(w, h, getPixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < w; x++) {
      const [r, g, b] = getPixel(x, y);
      raw.push(r, g, b);
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.from(raw), { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Color helpers ──────────────────────────────────────
const h2r = s => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)];
const mix  = (a, b, t) => a.map((v,i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
const dist2 = (x,y,cx,cy) => (x-cx)**2 + (y-cy)**2;

const BG_TOP  = h2r('#2C1608');
const BG_BOT  = h2r('#0F0603');
const TILE_T  = h2r('#F9F0DC');
const TILE_B  = h2r('#EEE1C0');
const GOLD    = h2r('#C9A84C');
const GOLD_D  = h2r('#8A6820');
const DOT_C   = h2r('#1A0D07');

// ── Nine-pip positions (normalized 0–1 within each half) ──
const NINE = [
  [0.22, 0.22], [0.50, 0.22], [0.78, 0.22],
  [0.22, 0.50], [0.50, 0.50], [0.78, 0.50],
  [0.22, 0.78], [0.50, 0.78], [0.78, 0.78],
];

function makePixel(size) {
  const S  = size;
  const tw = Math.round(S * 0.46);           // tile width
  const th = Math.round(tw * 1.86);          // tile height  (~2:1 domino)
  const tx = Math.round((S - tw) / 2);       // tile left
  const ty = Math.round((S - th) / 2);       // tile top
  const bw = Math.max(2, Math.round(S * 0.022));  // border width
  const rc = Math.round(tw * 0.12);          // corner radius of tile
  const rcb= rc + bw;                        // corner radius of border
  const dr = Math.max(2, Math.round(tw * 0.072)); // dot radius
  const midY = ty + Math.round(th / 2);
  const halfH = midY - ty;

  // Rounded-rect SDF
  function inRR(px, py, rx, ry, rw, rh, r) {
    if (px < rx || px > rx+rw || py < ry || py > ry+rh) return false;
    const dx = Math.max(0, rx + r - px, px - (rx + rw - r));
    const dy = Math.max(0, ry + r - py, py - (ry + rh - r));
    return dx*dx + dy*dy <= r*r;
  }

  return function getPixel(px, py) {
    // Background gradient top→bottom
    const bg = mix(BG_TOP, BG_BOT, py / S);

    // Gold outer border ring
    if (!inRR(px, py, tx-bw, ty-bw, tw+bw*2, th+bw*2, rcb)) return bg;

    // Dark inset between border and tile face
    if (!inRR(px, py, tx, ty, tw, th, rc)) {
      const edgeDist = Math.min(
        px - (tx - bw), (tx - bw + tw + bw*2) - px,
        py - (ty - bw), (ty - bw + th + bw*2) - py
      );
      const t = Math.max(0, 1 - edgeDist / bw);
      return mix(GOLD, GOLD_D, t);
    }

    // Dividing line (gold bar across middle)
    const lineHalf = Math.max(1, Math.round(bw * 0.6));
    if (Math.abs(py - midY) <= lineHalf) {
      const t = Math.abs(py - midY) / lineHalf;
      return mix(GOLD, TILE_B, t * t);
    }

    // Tile face gradient (upper half lighter, lower slightly warmer)
    const isTop = py < midY;
    const faceT = isTop
      ? (py - ty) / halfH
      : (py - midY) / halfH;
    const face = mix(TILE_T, TILE_B, faceT * 0.55 + (isTop ? 0 : 0.25));

    // Dots (9 pips each half)
    const halfYStart = isTop ? ty    : midY + lineHalf;
    const halfHeight = isTop ? halfH : (th - halfH - lineHalf * 2);

    for (const [nx, ny] of NINE) {
      const cx = tx + nx * tw;
      const cy = halfYStart + ny * halfHeight;
      const d2 = dist2(px, py, cx, cy);
      if (d2 <= dr * dr) {
        // Dot shading: lighter ring edge → dark center
        const t = Math.sqrt(d2) / dr;
        return mix(DOT_C, mix(DOT_C, GOLD_D, 0.3), 1 - t);
      }
      // Soft glow ring just outside each dot (subtle depression effect)
      if (d2 <= (dr + 1.2) * (dr + 1.2)) {
        return mix(face, GOLD_D, 0.18);
      }
    }

    return face;
  };
}

// ── Generate icons ─────────────────────────────────────
const outDir = path.join(__dirname, '..', 'assets', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const buf = makePNG(size, size, makePixel(size));
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buf);
  console.log(`  icon-${size}.png  (${(buf.length / 1024).toFixed(1)} KB)`);
}
console.log('Done.');
