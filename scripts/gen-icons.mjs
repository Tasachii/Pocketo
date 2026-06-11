// สร้างไอคอน PWA เป็น PNG ล้วนๆ ด้วย zlib ในตัว Node — ไม่ต้องติดตั้งอะไรเพิ่ม
// ดีไซน์: พื้นหมึกเข้ม + วงแหวนสีชาดเปิดปลาย (สัญลักษณ์เดียวกับวงความคืบหน้าในแอพ)
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BG = [0x13, 0x13, 0x16, 255]; // sumi
const RING = [0xe8, 0x4b, 0x3c, 255]; // vermilion

function crc32(buf) {
  let c,
    table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // scanlines พร้อม filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.3;
  const thick = size * 0.075;
  // ปลายเปิดของวง: เว้นช่วงมุม -55° ถึง -15° (ขวาบน)
  const gapStart = (-55 * Math.PI) / 180;
  const gapEnd = (-15 * Math.PI) / 180;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let [r, g, b, a] = BG;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const inGap = ang > gapStart && ang < gapEnd;
      if (!inGap) {
        // ความหนาแปรตามมุมเล็กน้อย ให้ความรู้สึกฝีแปรง
        // ใช้ความถี่เลขคู่ เพื่อให้ค่าต่อเนื่องตรงรอยต่อมุม ±180°
        const t = thick * (0.82 + 0.26 * Math.sin(2 * ang + 1));
        const edge = Math.abs(dist - radius) - t / 2;
        if (edge < 1) {
          const alpha = Math.max(0, Math.min(1, 1 - edge)); // ขอบนุ่ม 1px
          r = Math.round(RING[0] * alpha + BG[0] * (1 - alpha));
          g = Math.round(RING[1] * alpha + BG[1] * (1 - alpha));
          b = Math.round(RING[2] * alpha + BG[2] * (1 - alpha));
        }
      }
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = a;
    }
  }
  return png(size, px);
}

writeFileSync("public/icon-192.png", makeIcon(192));
writeFileSync("public/icon-512.png", makeIcon(512));
writeFileSync("public/apple-touch-icon.png", makeIcon(180));
console.log("icons generated: 192, 512, 180");
