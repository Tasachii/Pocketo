import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  // ใช้พอร์ตเฉพาะของ pocketo และสั่งเปิด server เองเสมอ
  // (กันชนกับ dev server ของโปรเจกต์อื่นที่อาจรันค้างบนพอร์ตยอดนิยม)
  use: { baseURL: "http://localhost:5199" },
  webServer: {
    command: "npm run dev -- --port 5199 --strictPort",
    port: 5199,
    reuseExistingServer: false,
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
