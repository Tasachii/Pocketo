import { expect, test } from "@playwright/test";

// A11/C4.2 — ล็อกการสะกด base path "/Pocketo/" (P ใหญ่)
// GitHub Pages case-sensitive: path ตัวเล็กต้องไม่ mount แอพ (ป้องกัน deploy พัง)

test("lowercase /pocketo/ ไม่ serve แอพ (case-sensitive guard)", async ({ page }) => {
  // baseURL = .../Pocketo/ — ขอ path ตัวเล็กตรง ๆ
  const res = await page.request.get("http://localhost:5199/pocketo/");
  expect(res.status()).toBe(404);
});

test("uppercase /Pocketo/ serve แอพได้ปกติ", async ({ page }) => {
  const res = await page.request.get("http://localhost:5199/Pocketo/");
  expect(res.ok()).toBe(true);
});
