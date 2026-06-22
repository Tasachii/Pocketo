import { describe, expect, it } from "vitest";
import { BACKSPACE, pressKey } from "./quickadd";

describe("pressKey — แป้นตัวเลข QuickAdd", () => {
  it("กด 0 เป็นตัวแรก → ยังว่าง (ตัด leading zero)", () => {
    expect(pressKey("", "0")).toBe("");
  });

  it("กด 0 แล้ว 5 → '5' ไม่ใช่ '05'", () => {
    expect(pressKey(pressKey("", "0"), "5")).toBe("5");
  });

  it("จุดบนค่าว่าง → no-op", () => {
    expect(pressKey("", ".")).toBe("");
  });

  it("จุดครั้งแรก → ต่อท้ายได้", () => {
    expect(pressKey("5", ".")).toBe("5.");
  });

  it("จุดครั้งที่สอง → ถูกข้าม", () => {
    expect(pressKey("5.2", ".")).toBe("5.2");
  });

  it("จำนวนเต็มเกิน 7 หลัก → ถูกปฏิเสธ", () => {
    expect(pressKey("1234567", "8")).toBe("1234567");
  });

  it("ทศนิยมเกิน 2 ตำแหน่ง → ถูกปฏิเสธ", () => {
    expect(pressKey("1.23", "4")).toBe("1.23");
  });

  it("backspace ลบตัวสุดท้าย", () => {
    expect(pressKey("123", BACKSPACE)).toBe("12");
  });

  it("backspace บนค่าว่าง → ยังว่าง", () => {
    expect(pressKey("", BACKSPACE)).toBe("");
  });

  it("ลำดับพิมพ์จริง 12345678 → คงไว้ 1234567", () => {
    let s = "";
    for (const k of "12345678") s = pressKey(s, k);
    expect(s).toBe("1234567");
  });

  it("ลำดับพิมพ์จริง 1.234 → 1.23", () => {
    let s = "";
    for (const k of "1.234") s = pressKey(s, k);
    expect(s).toBe("1.23");
  });
});
