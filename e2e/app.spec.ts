import { expect, test, type Page } from "@playwright/test";

// แต่ละ test ได้ browser context ใหม่ → IndexedDB ว่าง → onboarding โผล่เสมอ

async function dismissOnboarding(page: Page) {
  await expect(page.getByText("ยินดีต้อนรับสู่ Pocketo")).toBeVisible();
  await page.getByRole("button", { name: "ข้าม" }).click();
  // รอ overlay ปิดจริง (= kv onboarded ถูกเขียนแล้ว) ก่อนทำต่อ
  await expect(page.getByText("ยินดีต้อนรับสู่ Pocketo")).toBeHidden();
}

test("onboarding โผล่ครั้งแรก กดผ่านจนจบเข้าแอพได้", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("ยินดีต้อนรับสู่ Pocketo")).toBeVisible();
  await page.getByRole("button", { name: "ถัดไป" }).click();
  await expect(page.getByText("แบ่งเงินเป็นกล่อง")).toBeVisible();
  await page.getByRole("button", { name: "ถัดไป" }).click();
  await expect(page.getByText("ดูภาพรวมและภาษี")).toBeVisible();
  await page.getByRole("button", { name: "เริ่มใช้งาน" }).click();
  // รอ overlay ปิด (kv เขียนแล้ว) ก่อน reload — กัน race
  await expect(page.getByText("ยินดีต้อนรับสู่ Pocketo")).toBeHidden();
  await expect(page.getByText("ยอดรวมทุกกล่อง")).toBeVisible();
  // reload แล้วต้องไม่โผล่อีก (flag ถูก persist ลง IndexedDB)
  await page.reload();
  await expect(page.getByText("ยอดรวมทุกกล่อง")).toBeVisible();
  await expect(page.getByText("ยินดีต้อนรับสู่ Pocketo")).toBeHidden();
});

test("สลับภาษาเป็นอังกฤษและกลับมาไทยได้", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("ยินดีต้อนรับสู่ Pocketo")).toBeVisible();
  // ปุ่มสลับภาษาบน onboarding
  await page.getByRole("button", { name: "Switch language / สลับภาษา" }).click();
  await expect(page.getByText("Welcome to Pocketo")).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText("ยินดีต้อนรับสู่ Pocketo")).toBeHidden();
  // แอพหลักเป็นอังกฤษ
  await expect(page.getByText("Total across pockets")).toBeVisible();
  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
  // สลับกลับเป็นไทยจากหน้า Settings
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Language")).toBeVisible();
  await page.getByRole("button", { name: "ไทย" }).click();
  await expect(page.getByRole("heading", { name: "ตั้งค่า" })).toBeVisible();
});

test.describe("main app", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await dismissOnboarding(page);
  });

  async function addExpense(page: Page, digits: string, category = "อาหาร") {
    await page.getByRole("button", { name: "จดรายการใหม่" }).click();
    for (const d of digits) {
      await page.getByRole("button", { name: d, exact: true }).click();
    }
    await page.getByRole("button", { name: "ถัดไป" }).click();
    await page.getByRole("button", { name: new RegExp(category) }).click();
    // รอ QuickAdd ปิดก่อน (ปิดเอง ~650ms หลังบันทึก)
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

  test("สร้างรายการประจำได้ และโชว์บนหน้าแรก", async ({ page }) => {
    await page.getByRole("button", { name: "ตั้งค่า" }).click();
    await page.getByRole("button", { name: "+ เพิ่มรายการประจำ" }).click();
    await page.getByRole("button", { name: "รายรับ", exact: true }).click();
    await page.getByLabel("จำนวนเงิน (บาท)").fill("38000");
    await page.getByLabel("ทุกวันที่").selectOption("25");
    await page.getByLabel("ชื่อรายการ").fill("เงินเดือน");
    await page.getByRole("button", { name: "บันทึก" }).click();
    // dialog ต้องปิดและกฎโผล่ในรายการ (กัน regression บั๊กกล่องค้าง undefined)
    await expect(page.getByLabel("ชื่อรายการ")).toBeHidden();
    await expect(page.getByText("ทุกวันที่ 25")).toBeVisible();
    await page.getByRole("button", { name: "หน้าแรก" }).click();
    await expect(page.getByText("ประจำที่จะถึง")).toBeVisible();
    await expect(page.getByText("เงินเดือน")).toBeVisible();
  });

  test("ลบรายการแล้วเลิกทำได้", async ({ page }) => {
    await addExpense(page, "60");
    await page.getByRole("button", { name: /อาหาร/ }).first().click();
    await page.getByRole("button", { name: "ลบ", exact: true }).click();
    await expect(page.getByText(/ลบรายการแล้ว/)).toBeVisible();
    await page.getByRole("button", { name: "เลิกทำ" }).click();
    await expect(page.getByText("−฿60").first()).toBeVisible();
  });
});
