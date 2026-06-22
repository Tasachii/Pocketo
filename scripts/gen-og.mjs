// สร้างภาพ Open Graph preview (1200×630) ด้วย Playwright เรนเดอร์ HTML → public/og.png
// ใช้: node scripts/gen-og.mjs  (ไม่ต้องมี dev server)
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { markInner } from "./brand-mark.mjs";

mkdirSync("public", { recursive: true });

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;700&family=Shippori+Mincho:wght@700&family=Zen+Kaku+Gothic+New:wght@500;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #131316; color: #eceae4;
         font-family: 'Anuphan', sans-serif; overflow: hidden; position: relative; }
  .grain { position:absolute; inset:0; opacity:.4;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
  .wrap { position: relative; height: 100%; display: flex; align-items: center;
          padding: 0 90px; gap: 60px; }
  .left { flex: 1; }
  .brand { display: flex; align-items: baseline; gap: 16px; }
  .brand b { font-family: 'Zen Kaku Gothic New'; font-size: 56px; font-weight: 700; }
  .brand span { font-family: 'Shippori Mincho'; font-size: 34px; color: #6e6b64; }
  h1 { font-size: 62px; font-weight: 700; line-height: 1.18; margin-top: 36px; letter-spacing: -1px; }
  h1 .a { color: #e84b3c; }
  p { font-size: 30px; color: #a6a39b; margin-top: 28px; }
  .url { position: absolute; bottom: 54px; left: 90px; font-size: 26px;
         color: #6e6b64; font-family: 'Zen Kaku Gothic New'; }
  svg { flex-shrink: 0; }
</style></head>
<body><div class="grain"></div>
<div class="wrap">
  <div class="left">
    <div class="brand"><b>Pocketo</b><span>ポケット</span></div>
    <h1>จดรายรับรายจ่าย<br><span class="a">แบบ kakeibo</span></h1>
    <p>แบ่งกล่องเงิน · คำนวณภาษีไทย · ข้อมูลอยู่ในเครื่องคุณ</p>
  </div>
  <svg width="300" height="300" viewBox="0 0 100 100">${markInner("#e84b3c", "#f3d27a")}</svg>
</div>
<div class="url">tasachii.github.io/pocketo</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("og image saved to public/og.png");
