const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([len, typeAndData, crc]);
}

function generatePNG(size) {
  // 8-byte PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // bit depth: 8
  ihdr.writeUInt8(6, 9); // color type: 6 (RGBA)
  ihdr.writeUInt8(0, 10); // compression method
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace method

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw pixel data: Each scanline starts with filter byte (0) followed by size * 4 bytes (RGBA)
  const scanlineLength = 1 + size * 4;
  const rawData = Buffer.alloc(size * scanlineLength);

  const radius = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Cybernetic color palette
      // Base: #0E0E10 (14, 14, 16)
      // Card: #18181B (24, 24, 27)
      // Accent: #99F4D1 (153, 244, 209)
      // Ice Cyan: #CCFFFF (204, 255, 255)
      // Border: #26262C (38, 38, 44)

      let r = 14, g = 14, b = 16, a = 255;

      if (dist < radius) {
        // Inside rounded badge
        r = 24; g = 24; b = 27; a = 255;

        // Shield border ring
        if (Math.abs(dist - radius * 0.75) < (size * 0.07)) {
          r = 153; g = 244; b = 209; a = 255;
        } else if (dist < radius * 0.35) {
          // Center core
          r = 204; g = 255; b = 255; a = 255;
        } else if (dist > radius - 2) {
          // Outer rim
          r = 38; g = 38; b = 44; a = 255;
        }
      } else if (dist < radius + 1.5) {
        // Antialiased edge
        const t = (radius + 1.5 - dist) / 1.5;
        r = 38; g = 38; b = 44; a = Math.round(t * 255);
      } else {
        // Transparent outside
        r = 0; g = 0; b = 0; a = 0;
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
  const buf = generatePNG(size);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated ${filePath} (${buf.length} bytes)`);
});
