// จับ screenshot จริงจากแอพสำหรับเอกสาร — ปั้นข้อมูลตัวอย่างผ่าน UI แล้วถ่ายทุกหน้า
// ใช้: เปิด dev server ที่พอร์ต 5201 ก่อน แล้วรัน `node scripts/capture-screens.mjs`
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = "http://localhost:5201";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await page.goto(BASE);
await page.getByText("Pocketo").first().waitFor();

const btn = (name, exact = false) => page.getByRole("button", { name, exact });

async function addTx(digits, category, income = false) {
  await btn("จดรายการใหม่").click();
  if (income) await btn("รายรับ", true).click();
  for (const d of digits) await btn(d, true).click();
  await btn("ถัดไป").click();
  await page.getByRole("button", { name: new RegExp(category) }).click();
  await page.getByText("แตะหมวดเพื่อบันทึกทันที").waitFor({ state: "hidden" });
}

// ── ปั้นข้อมูลตัวอย่าง ──
// กล่องเงิน 2 ใบ พร้อมเป้าและกฎแบ่งอัตโนมัติ
await btn("กล่องเงิน").click();
await btn("เพิ่มกล่อง").click();
await page.getByPlaceholder("เช่น ออมฉุกเฉิน").fill("ออมเที่ยวญี่ปุ่น");
await page.getByLabel("เป้าหมายออม (บาท)").fill("30000");
await page.getByLabel("แบ่งจากรายรับ (%)").fill("20");
await btn("บันทึก").click();
await btn("เพิ่มกล่อง").click();
await page.getByPlaceholder("เช่น ออมฉุกเฉิน").fill("ลงทุน");
await page.getByLabel("เป้าหมายออม (บาท)").fill("50000");
await page.getByLabel("แบ่งจากรายรับ (%)").fill("10");
await btn("บันทึก").click();

// รายการประจำ (โชว์ "ประจำที่จะถึง" บนหน้าแรก)
await btn("ตั้งค่า").click();
await btn("+ เพิ่มรายการประจำ").click();
await btn("รายรับ", true).click();
await page.getByLabel("จำนวนเงิน (บาท)").fill("38000");
await page.getByLabel("ทุกวันที่").selectOption("25");
await page.getByLabel("ชื่อรายการ").fill("เงินเดือน");
await btn("บันทึก").click();

// งบประมาณหมวดอาหาร (โชว์แถบงบในรายงาน)
await page.getByRole("button", { name: /อาหาร/ }).first().click();
await page.getByLabel("งบต่อเดือน (บาท)").fill("4000");
await btn("บันทึก").click();

// ธุรกรรมตัวอย่าง
await btn("หน้าแรก").click();
await addTx("38000", "เงินเดือน", true);
await addTx("320", "อาหาร");
await addTx("65", "กาแฟ");
await addTx("1290", "ช้อปปิ้ง");
await addTx("450", "เดินทาง");
await addTx("249", "บันเทิง");
await addTx("890", "หนังสือ");

// ── ถ่ายภาพ ──
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/home-dark.png` });

await btn("สลับธีม").click(); // dark → light
await page.waitForTimeout(450);
await page.screenshot({ path: `${OUT}/home-light.png` });
await btn("สลับธีม").click(); // light → auto
await btn("สลับธีม").click(); // auto → dark
await page.waitForTimeout(300);

await btn("จดรายการใหม่").click();
for (const d of "129") await btn(d, true).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/quick-add.png` });
await btn("ปิด").click();

await btn("กล่องเงิน").click();
await page.waitForTimeout(1100); // รอ ensō วาดครบ
await page.screenshot({ path: `${OUT}/pockets.png` });

await btn("รายงาน").click();
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/reports.png`, fullPage: true });

await btn("ภาษี").click();
await page.getByLabel("เงินได้ทั้งปี (เงินเดือน/ค่าจ้าง)").fill("480000");
await page.getByLabel("ภาษีหัก ณ ที่จ่ายทั้งปี").fill("9000");
await page.getByLabel("SSF").fill("30000");
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/tax.png`, fullPage: true });

await browser.close();
console.log("screenshots saved to", OUT);
