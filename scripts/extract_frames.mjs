import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

const buf = fs.readFileSync('public/images/runner-spritesheet.png');
let pos = 8;
const idatChunks = [];
let width = 0, height = 0;
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IHDR') {
    width = buf.readUInt32BE(pos + 8);
    height = buf.readUInt32BE(pos + 12);
  } else if (type === 'IDAT') {
    idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
  }
  pos += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idatChunks));
const stride = 1 + width * 4;
const pixels = Buffer.alloc(width * height * 4);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

for (let y = 0; y < height; y++) {
  const filter = raw[y * stride];
  const rowStart = y * stride + 1;
  const prevRowOffset = (y - 1) * width * 4;
  const currRowOffset = y * width * 4;
  for (let x = 0; x < width * 4; x++) {
    const rawVal = raw[rowStart + x];
    const left = (x >= 4) ? pixels[currRowOffset + x - 4] : 0;
    const up = (y > 0) ? pixels[prevRowOffset + x] : 0;
    const upLeft = (y > 0 && x >= 4) ? pixels[prevRowOffset + x - 4] : 0;
    let val = 0;
    if (filter === 0) val = rawVal;
    else if (filter === 1) val = (rawVal + left) & 0xff;
    else if (filter === 2) val = (rawVal + up) & 0xff;
    else if (filter === 3) val = (rawVal + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) val = (rawVal + paeth(left, up, upLeft)) & 0xff;
    pixels[currRowOffset + x] = val;
  }
}

function makePng(w, h, rgbaBuffer) {
  const subStride = 1 + w * 4;
  const rawSub = Buffer.alloc(h * subStride);
  for (let sy = 0; sy < h; sy++) {
    rawSub[sy * subStride] = 0;
    rgbaBuffer.copy(rawSub, sy * subStride + 1, sy * w * 4, (sy + 1) * w * 4);
  }
  const compressed = zlib.deflateSync(rawSub);
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  function makeCrc32() {
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    return function(buf) {
      let c = -1;
      for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
      return c ^ -1;
    };
  }
  const crc32 = makeCrc32();
  function makeChunk(type, data) {
    const len = data.length;
    const b = Buffer.alloc(12 + len);
    b.writeUInt32BE(len, 0);
    b.write(type, 4, 4, 'ascii');
    data.copy(b, 8);
    b.writeInt32BE(crc32(b.subarray(4, 8 + len)), 8 + len);
    return b;
  }
  return Buffer.concat([
    header,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Normalized canvas dimensions: 128 x 160
const CANVAS_W = 128;
const CANVAS_H = 160;
const GROUND_Y = 152; // baseline foot contact

function exportNormalizedFrame(srcX, srcY, srcW, srcH, outputPath) {
  const outRgba = Buffer.alloc(CANVAS_W * CANVAS_H * 4);
  const targetX = Math.round((CANVAS_W - srcW) / 2);
  const targetY = Math.round(GROUND_Y - srcH);

  for (let sy = 0; sy < srcH; sy++) {
    const dy = targetY + sy;
    if (dy < 0 || dy >= CANVAS_H) continue;
    for (let sx = 0; sx < srcW; sx++) {
      const dx = targetX + sx;
      if (dx < 0 || dx >= CANVAS_W) continue;
      const srcIdx = ((srcY + sy) * width + (srcX + sx)) * 4;
      const dstIdx = (dy * CANVAS_W + dx) * 4;
      outRgba[dstIdx] = pixels[srcIdx];
      outRgba[dstIdx + 1] = pixels[srcIdx + 1];
      outRgba[dstIdx + 2] = pixels[srcIdx + 2];
      outRgba[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  const png = makePng(CANVAS_W, CANVAS_H, outRgba);
  fs.writeFileSync(outputPath, png);
}

const dir = 'public/images/runner';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// 8 running frames
const runBoxes = [
  { x: 181, y: 220, w: 99, h: 143 },
  { x: 264, y: 220, w: 104, h: 142 },
  { x: 370, y: 220, w: 116, h: 142 },
  { x: 490, y: 218, w: 105, h: 148 },
  { x: 604, y: 220, w: 104, h: 146 },
  { x: 699, y: 219, w: 95, h: 146 },
  { x: 790, y: 221, w: 96, h: 141 },
  { x: 899, y: 224, w: 106, h: 138 }
];

runBoxes.forEach((b, i) => {
  exportNormalizedFrame(b.x, b.y, b.w, b.h, `${dir}/run_${i}.png`);
});

// 5 jump frames
const jumpBoxes = [
  { x: 26, y: 450, w: 82, h: 98 },
  { x: 162, y: 399, w: 94, h: 150 },
  { x: 317, y: 412, w: 121, h: 134 },
  { x: 461, y: 452, w: 89, h: 102 },
  { x: 590, y: 474, w: 87, h: 82 }
];

jumpBoxes.forEach((b, i) => {
  exportNormalizedFrame(b.x, b.y, b.w, b.h, `${dir}/jump_${i}.png`);
});

// 6 exit sprint frames
const exitBoxes = [
  { x: 18, y: 590, w: 75, h: 78 },
  { x: 124, y: 586, w: 82, h: 85 },
  { x: 242, y: 584, w: 82, h: 84 },
  { x: 387, y: 586, w: 85, h: 85 },
  { x: 533, y: 589, w: 77, h: 81 },
  { x: 707, y: 590, w: 67, h: 80 }
];

exitBoxes.forEach((b, i) => {
  exportNormalizedFrame(b.x, b.y, b.w, b.h, `${dir}/exit_${i}.png`);
});

// Front standing pose from Row 3 right:
exportNormalizedFrame(715, 402, 58, 157, `${dir}/idle.png`);

// And dust cloud:
exportNormalizedFrame(815, 625, 95, 45, `${dir}/dust.png`);

console.log('Successfully extracted and saved all normalized character frames!');
