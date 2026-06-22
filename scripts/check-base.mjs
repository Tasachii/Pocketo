// ตรวจ base path ของ build: dist/index.html ต้องอ้าง "/Pocketo/" (P ใหญ่)
// GitHub Pages case-sensitive — พลาดเป็นตัวเล็ก = deploy พัง (A11/D5)
// รันหลัง `npm run build` ใน CI: node scripts/check-base.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "dist", "index.html"), "utf8");

if (!html.includes("/Pocketo/")) {
  console.error("✗ base path check: dist/index.html ไม่พบ '/Pocketo/' (P ใหญ่)");
  process.exit(1);
}
if (/\/pocketo\//.test(html)) {
  console.error("✗ base path check: พบ '/pocketo/' (ตัวเล็ก) ใน dist/index.html — GitHub Pages จะ 404");
  process.exit(1);
}
console.log("✓ base path check: dist/index.html อ้าง '/Pocketo/' ถูกต้อง");
