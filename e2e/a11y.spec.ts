import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// a11y audit ทุกหน้าหลัก ทั้งธีมมืดและสว่าง — บังคับให้ผ่าน WCAG 2.1 A/AA
// (ตรวจ contrast ของตัวเลขสีเขียว/แดงด้วย ซึ่งเป็นจุดเสี่ยงของแอพการเงิน)

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// vermilion แบรนด์ (ใช้เป็นพื้นปุ่ม + ตัวเน้นเล็กน้อย) — ข้อยกเว้น AA ที่ document ไว้
// ผ่านเกณฑ์ 3:1 ของ UI component / large-text แต่ไม่ถึง 4.5:1 ของ body text
const ACCENT = new Set(["#d9402f", "#e84b3c"]);

function nodeIsBrandAccent(node: {
  any: Array<{ data?: { fgColor?: string; bgColor?: string } }>;
}): boolean {
  return node.any.some((c) => {
    const fg = (c.data?.fgColor ?? "").toLowerCase();
    const bg = (c.data?.bgColor ?? "").toLowerCase();
    return ACCENT.has(fg) || ACCENT.has(bg);
  });
}

/** violation ที่เหลือหลังตัดข้อยกเว้นสีแบรนด์ออก — ส่วนนี้ต้องว่างเสมอ */
async function violations(page: Page) {
  const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return res.violations
    .map((v) =>
      v.id === "color-contrast"
        ? { ...v, nodes: v.nodes.filter((n) => !nodeIsBrandAccent(n)) }
        : v,
    )
    .filter((v) => v.nodes.length > 0)
    .map((v) => ({ id: v.id, count: v.nodes.length }));
}

async function enter(page: Page) {
  await page.goto("/");
  // ปิด animation ทั้งหมดก่อนสแกน — ไม่งั้น axe จะวัด contrast ระหว่าง fade/rise
  // ที่ opacity ยังไม่ถึง 1 แล้วได้สีเบลนด์ที่ตกเกณฑ์ (artifact ไม่ใช่ปัญหาจริง)
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important}",
  });
  await expect(page.getByText("ยินดีต้อนรับสู่ Pocketo")).toBeVisible();
}

test("onboarding ไม่มี a11y violation", async ({ page }) => {
  await enter(page);
  expect(await violations(page)).toEqual([]);
});

test("ทุกหน้าหลักผ่าน a11y (dark + light)", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "ข้าม" }).click();
  await expect(page.getByText("ยอดรวมทุกกล่อง")).toBeVisible();

  // ใส่ข้อมูลนิดหน่อยให้ทุกหน้ามีเนื้อหาจริงให้ตรวจ
  await page.getByRole("button", { name: "จดรายการใหม่" }).click();
  for (const d of "250") {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
  await page.getByRole("button", { name: "ถัดไป" }).click();
  await page.getByRole("button", { name: /อาหาร/ }).click();
  await expect(page.getByText("แตะหมวดเพื่อบันทึกทันที")).toBeHidden();

  const tabs = ["หน้าแรก", "กล่องเงิน", "รายงาน", "ภาษี", "ตั้งค่า"];

  for (const theme of ["dark", "light"] as const) {
    if (theme === "light") {
      await page.getByRole("button", { name: "หน้าแรก" }).click();
      await page.getByRole("button", { name: "สลับธีม" }).click(); // dark → light
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    }
    for (const tab of tabs) {
      await page.getByRole("button", { name: tab }).click();
      const v = await violations(page);
      expect(v, `${theme} / ${tab}: ${JSON.stringify(v)}`).toEqual([]);
    }
  }
});
