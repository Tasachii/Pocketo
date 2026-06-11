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
});
