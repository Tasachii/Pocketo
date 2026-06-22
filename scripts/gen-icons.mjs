// สร้างไอคอน PWA + favicon จากโลโก้กลาง (scripts/brand-mark.mjs) ด้วย Playwright
// ดีไซน์: พื้นหมึกเข้ม (sumi) + วงเอ็นโซสีชาด + เหรียญทองหยอดลงปากกระเป๋า
// ใช้: node scripts/gen-icons.mjs   (ต้องมี chromium ของ Playwright — เป็น devDependency อยู่แล้ว)
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { markInner, markSvg } from "./brand-mark.mjs";

const SUMI = "#131316";
const RING = "#e84b3c"; // 朱 vermilion (โทน dark accent)
const COIN = "#f3d27a"; // 金 ทองสด (บนพื้นหมึก)

// favicon — โปร่งใส ไม่มีพื้น (ปรับเข้ากับสีแท็บได้ทั้งสว่าง/มืด) เหรียญใช้ทองเข้มให้เห็นบนแท็บสว่าง
writeFileSync("public/favicon.svg", markSvg(RING, "#c79a2e", 32) + "\n");
console.log("favicon.svg written");

const browser = await chromium.launch();

async function renderIcon(size, file) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>
       *{margin:0}html,body{width:${size}px;height:${size}px;background:${SUMI};overflow:hidden}
       svg{display:block;width:${size}px;height:${size}px}
     </style></head><body>
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${markInner(RING, COIN)}</svg>
     </body></html>`,
    { waitUntil: "load" },
  );
  await page.screenshot({ path: file, omitBackground: false });
  await page.close();
  console.log(`${file} (${size}×${size})`);
}

await renderIcon(192, "public/icon-192.png");
await renderIcon(512, "public/icon-512.png");
await renderIcon(180, "public/apple-touch-icon.png");

await browser.close();
console.log("icons generated: 192, 512, 180 + favicon.svg");
