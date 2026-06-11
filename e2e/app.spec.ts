import { expect, test } from "@playwright/test";

// แต่ละ test ได้ browser context ใหม่ → IndexedDB ว่างเสมอ

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Pocketo")).toBeVisible();
});

async function addExpense(page: import("@playwright/test").Page, digits: string, category = "อาหาร") {
  await page.getByRole("button", { name: "จดรายการใหม่" }).click();
  for (const d of digits) {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
  await page.getByRole("button", { name: "ถัดไป" }).click();
  await page.getByRole("button", { name: new RegExp(category) }).click();
  // รอ QuickAdd ปิดก่อน (ปิดเอง ~650ms หลังบันทึก) กันคลิกถัดไปโดนปุ่มในแผงหมวด
  await expect(page.getByText("แตะหมวดเพื่อบันทึกทันที")).toBeHidden();
}

test("จดรายจ่าย 3 แตะ เห็นในรายการล่าสุดและยอดเดือน", async ({ page }) => {
  await addExpense(page, "99");
  await expect(page.getByText("ล่าสุด")).toBeVisible();
  await expect(page.getByText("−฿99").first()).toBeVisible();
});

test("กล่องออมตั้งแบ่ง 20% — รายรับถูกแบ่งอัตโนมัติ", async ({ page }) => {
  await page.getByRole("button", { name: "กล่องเงิน" }).click();
  await page.getByRole("button", { name: "เพิ่มกล่อง" }).click();
  await page.getByPlaceholder("เช่น ออมฉุกเฉิน").fill("ออม");
  await page.getByLabel("แบ่งจากรายรับ (%)").fill("20");
  await page.getByRole("button", { name: "บันทึก" }).click();

  await page.getByRole("button", { name: "หน้าแรก" }).click();
  await page.getByRole("button", { name: "จดรายการใหม่" }).click();
  await page.getByRole("button", { name: "รายรับ" }).click();
  for (const d of "1000") {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
  await page.getByRole("button", { name: "ถัดไป" }).click();
  await page.getByRole("button", { name: /เงินเดือน/ }).click();

  await page.getByRole("button", { name: "กล่องเงิน" }).click();
  await expect(page.getByText("฿200").first()).toBeVisible(); // 20% ของ 1,000
  await expect(page.getByText("฿800").first()).toBeVisible(); // เหลือในกล่องหลัก
});

test("ตั้งงบหมวดอาหาร แล้วเห็นแถบงบในรายงาน", async ({ page }) => {
  await page.getByRole("button", { name: "ตั้งค่า" }).click();
  await page.getByRole("button", { name: /อาหาร/ }).first().click();
  await page.getByLabel("งบต่อเดือน (บาท)").fill("1000");
  await page.getByRole("button", { name: "บันทึก" }).click();

  await page.getByRole("button", { name: "หน้าแรก" }).click();
  await addExpense(page, "900");

  await page.getByRole("button", { name: "รายงาน" }).click();
  await expect(page.getByText("งบประมาณเดือนนี้")).toBeVisible();
  await expect(page.getByText("฿900 / ฿1,000")).toBeVisible();
});

test("ภาษี: เงินเดือน 360,000 → ภาษี 2,500", async ({ page }) => {
  await page.getByRole("button", { name: "ภาษี" }).click();
  await page.getByLabel("เงินได้ทั้งปี (เงินเดือน/ค่าจ้าง)").fill("360000");
  await expect(page.getByText("฿2,500").first()).toBeVisible();
  await expect(page.getByText("เงินได้สุทธิ")).toBeVisible();
});

test("สลับธีมและจำค่าหลัง reload", async ({ page }) => {
  const html = page.locator("html");
  await expect(html).toHaveClass(/dark/); // dark เป็น default
  await page.getByRole("button", { name: "สลับธีม" }).click(); // → light
  await expect(html).not.toHaveClass(/dark/);
  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
});

test("แก้ไขรายการจากหน้าทั้งหมด", async ({ page }) => {
  await addExpense(page, "50");
  await page.getByRole("button", { name: "ทั้งหมด →" }).click();
  await expect(page.getByRole("heading", { name: "รายการทั้งหมด" })).toBeVisible();
  await page.getByTestId("history-row").first().click();
  await page.getByLabel("จำนวนเงิน (บาท)").fill("75");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByText("−฿75").first()).toBeVisible();
});

test("ลบรายการแล้วเลิกทำได้", async ({ page }) => {
  await addExpense(page, "60");
  await page.getByRole("button", { name: /อาหาร/ }).first().click();
  await page.getByRole("button", { name: "ลบ", exact: true }).click();
  await expect(page.getByText(/ลบรายการแล้ว/)).toBeVisible();
  await page.getByRole("button", { name: "เลิกทำ" }).click();
  await expect(page.getByText("−฿60").first()).toBeVisible();
});
