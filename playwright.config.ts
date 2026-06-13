import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  // รันบน production build + preview (ไม่ใช่ dev server) เพื่อความ deterministic:
  // ไม่มี on-the-fly transform / HMR และ React ไม่ double-invoke แบบ StrictMode dev
  // base ของ production คือ /Pocketo/ (ตรงกับชื่อ repo — GitHub Pages path case-sensitive)
  // block service worker ตอน e2e — PWA SW ไม่ใช่สิ่งที่เทสต์นี้ตรวจ และมัน
  // แทรกตอน reload ทำให้ assertion เรื่อง persistence flaky
  use: { baseURL: "http://localhost:5199/Pocketo/", serviceWorkers: "block" },
  webServer: {
    command: "npm run build && npm run preview -- --port 5199 --strictPort",
    url: "http://localhost:5199/Pocketo/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 }, // มือถือ — แอพเป็น mobile-first
      },
    },
  ],
});
