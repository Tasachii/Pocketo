import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default tseslint.config(
  {
    // ไฟล์ build/gen/coverage — ไม่ lint
    ignores: ["dist/**", "dev-dist/**", "coverage/**", "node_modules/**", "scripts/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      // เปิด type-aware เฉพาะที่จำเป็น (no-floating-promises ต้องใช้ type info)
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "no-console": "warn",
      // จับ db write ที่ลืม await (เหตุผลหลักของ D8)
      "@typescript-eslint/no-floating-promises": "error",
      // autoFocus บน dialog/prompt เป็น UX ตั้งใจ (โฟกัสช่องแรกเมื่อเปิด) — ยกเว้นไว้
      "jsx-a11y/no-autofocus": "off",
      // useLiveQuery(...) ?? [] สร้าง array ใหม่ทุก render เป็น idiom ของ dexie-react-hooks
      // (snapshot ที่คำนวณใหม่อยู่แล้ว) — ไม่ใช่บั๊ก rules-of-hooks ยังเปิดอยู่
      "react-hooks/exhaustive-deps": "off",
      // กฎ "purity" ชุดใหม่ของ react-hooks v7 จับ pattern ที่แอพนี้ตั้งใจใช้
      // (module store ใน Feedback, reset state ใน effect ของ QuickAdd, Date.now nudge)
      // — นอกขอบเขตงานนี้ (เน้น security/maintainability) rules-of-hooks หลักยังเปิด
      "react-hooks/globals": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      // backdrop ของ modal/overlay เป็น div คลิกเพื่อปิด — Esc/ปุ่มปิดมีอยู่แล้ว
      // การบังคับ role/keyboard บน backdrop เกินขอบเขตงานนี้ (a11y อื่นยังเปิด)
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
    },
  },
  {
    // ไฟล์เทสต์ — runtime คือ vitest/node + DOM
    files: ["src/**/*.test.{ts,tsx}", "src/test/**"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
