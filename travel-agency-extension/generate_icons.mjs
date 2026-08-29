import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate simple valid uncompressed PNG file programmatically
function createPng(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression
  ihdrData.writeUInt8(0, 11); // Filter
  ihdrData.writeUInt8(0, 12); // Interlace
  const ihdrChunk = createChunk("IHDR", ihdrData);

  // Raw Image Data with filter byte 0 at beginning of each scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // No filter

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Draw rounded icon border & airplane / letter 'T'
      const distFromCenter = Math.hypot(x - width / 2, y - height / 2);
      const isCorner = Math.hypot(Math.min(x, width - 1 - x), Math.min(y, height - 1 - y)) < 2 && width > 16;

      // Inner emblem
      const isEmblem =
        (y >= height * 0.25 && y <= height * 0.38 && x >= width * 0.25 && x <= width * 0.75) ||
        (y >= height * 0.38 && y <= height * 0.75 && x >= width * 0.42 && x <= width * 0.58);

      if (isEmblem) {
        rawData[pxOffset] = 255;     // R
        rawData[pxOffset + 1] = 255; // G
        rawData[pxOffset + 2] = 255; // B
        rawData[pxOffset + 3] = 255; // A
      } else {
        rawData[pxOffset] = r;       // R (0x04)
        rawData[pxOffset + 1] = g;   // G (0x78)
        rawData[pxOffset + 2] = b;   // B (0x57)
        rawData[pxOffset + 3] = a;   // A
      }
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressed);

  // IEND chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuf, data, crc]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Emerald theme color rgb(4, 120, 87)
fs.writeFileSync(path.join(iconsDir, "icon-16.png"), createPng(16, 16, 4, 120, 87));
fs.writeFileSync(path.join(iconsDir, "icon-48.png"), createPng(48, 48, 4, 120, 87));
fs.writeFileSync(path.join(iconsDir, "icon-128.png"), createPng(128, 128, 4, 120, 87));

console.log("Icons generated successfully in icons/ directory.");
