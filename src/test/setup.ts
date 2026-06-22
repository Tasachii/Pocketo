// Setup สำหรับ Vitest — โหลดก่อนทุกไฟล์เทสต์
// jest-dom matchers (toBeInTheDocument ฯลฯ) สำหรับ component tests
// fake-indexeddb ให้ db (Dexie) ทำงานในเทสต์โดยไม่ต้องมีเบราว์เซอร์จริง
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
