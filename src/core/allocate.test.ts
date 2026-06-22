import { describe, expect, it } from "vitest";
import { splitByPercent } from "./allocate";

describe("splitByPercent", () => {
  it("แบ่ง 100% พอดี ผลรวมเท่าต้นฉบับเป๊ะระดับสตางค์", () => {
    // 1,000.01 บาท แบ่ง 3 กล่อง 33/33/34
    const out = splitByPercent(100_001, [
      { pocketId: 1, percent: 33 },
      { pocketId: 2, percent: 33 },
      { pocketId: 3, percent: 34 },
    ]);
    expect(out.reduce((s, a) => s + a.amount, 0)).toBe(100_001);
  });

  it("แบ่งบางส่วน: ผลรวม = round(amount × Σ% / 100)", () => {
    // เงินเข้า 333.33 บาท แบ่งออม 20% ลงทุน 10%
    const out = splitByPercent(33_333, [
      { pocketId: 1, percent: 20 },
      { pocketId: 2, percent: 10 },
    ]);
    expect(out.reduce((s, a) => s + a.amount, 0)).toBe(10_000); // 30% ของ 33,333 = 9,999.9 → 10,000
  });

  it("จำนวนเฉพาะหารไม่ลงตัว ไม่มีสตางค์หาย", () => {
    const out = splitByPercent(99_999, [
      { pocketId: 1, percent: 50 },
      { pocketId: 2, percent: 50 },
    ]);
    expect(out.reduce((s, a) => s + a.amount, 0)).toBe(99_999);
    expect(Math.abs(out[0].amount - out[1].amount)).toBeLessThanOrEqual(1);
  });

  it("กฎ 0% ถูกข้าม / ไม่มีกฎ → ว่าง", () => {
    expect(splitByPercent(10_000, [{ pocketId: 1, percent: 0 }])).toEqual([]);
    expect(splitByPercent(10_000, [])).toEqual([]);
  });

  it("รวมเกิน 100% → โยน error", () => {
    expect(() =>
      splitByPercent(10_000, [
        { pocketId: 1, percent: 60 },
        { pocketId: 2, percent: 50 },
      ]),
    ).toThrow();
  });

  it("จำนวนติดลบหรือศูนย์ → ว่าง", () => {
    expect(splitByPercent(0, [{ pocketId: 1, percent: 50 }])).toEqual([]);
    expect(splitByPercent(-5, [{ pocketId: 1, percent: 50 }])).toEqual([]);
  });

  it("กฎเดียว 20% → ก้อนเดียว = round(amount × 0.2)", () => {
    const out = splitByPercent(100_000, [{ pocketId: 1, percent: 20 }]);
    expect(out).toEqual([{ pocketId: 1, amount: 20_000 }]);
  });

  it("largest-remainder: แจกเศษให้ก้อนเศษมากสุดก่อน (tie-break ตาม index)", () => {
    // 100.00 บาท (10000 สตางค์) แบ่ง 33/33/34 → exact = 3300/3300/3400 ลงตัวพอดี
    // ใช้ 10001 ให้มีเศษ: exact = 3300.33/3300.33/3400.34 → floor 3300/3300/3400 รวม 10000
    // remainder = round(10001) - 10000 = 1 → ก้อนเศษมากสุด (index 2, .34) ได้ +1
    const out = splitByPercent(10_001, [
      { pocketId: 1, percent: 33 },
      { pocketId: 2, percent: 33 },
      { pocketId: 3, percent: 34 },
    ]);
    expect(out.reduce((s, a) => s + a.amount, 0)).toBe(10_001);
    expect(out[2].amount).toBe(3_401); // ก้อนเศษมากสุดได้สตางค์พิเศษ
  });

  it("Σ = round(amount × Σ% / 100) เป๊ะ สำหรับหลายจำนวน", () => {
    for (const amount of [1, 7, 33_333, 100_001, 555_555]) {
      const out = splitByPercent(amount, [
        { pocketId: 1, percent: 20 },
        { pocketId: 2, percent: 10 },
      ]);
      const sum = out.reduce((s, a) => s + a.amount, 0);
      expect(sum).toBe(Math.round((amount * 30) / 100));
    }
  });

  it("จำนวนมาก (B3): 9,999,999.99 บาท แบ่ง 33/33/34 → ไม่ off-by-one", () => {
    const amount = 9_999_999_99; // satang
    const out = splitByPercent(amount, [
      { pocketId: 1, percent: 33 },
      { pocketId: 2, percent: 33 },
      { pocketId: 3, percent: 34 },
    ]);
    expect(out.reduce((s, a) => s + a.amount, 0)).toBe(
      Math.round((amount * 100) / 100),
    );
  });
});
