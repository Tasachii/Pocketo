import { describe, expect, it } from "vitest";
import {
  calcThaiTax,
  marginalRate,
  progressiveTax,
  savingIfDeductMore,
  TAX_YEAR_2568,
} from "./tax";

describe("progressiveTax — ขอบทุกขั้นบันได", () => {
  const cases: Array<[number, number]> = [
    [0, 0],
    [150_000, 0], // จบขั้น 0%
    [150_001, 0.05], // เริ่มขั้น 5% (1 บาทแรก)
    [300_000, 7_500], // 150,000 × 5%
    [500_000, 27_500], // 7,500 + 200,000 × 10%
    [750_000, 65_000], // 27,500 + 250,000 × 15%
    [1_000_000, 115_000], // 65,000 + 250,000 × 20%
    [2_000_000, 365_000], // 115,000 + 1,000,000 × 25%
    [5_000_000, 1_265_000], // 365,000 + 3,000,000 × 30%
    [6_000_000, 1_615_000], // 1,265,000 + 1,000,000 × 35%
  ];
  for (const [taxable, expected] of cases) {
    it(`เงินได้สุทธิ ${taxable.toLocaleString()} → ภาษี ${expected.toLocaleString()}`, () => {
      const { total } = progressiveTax(taxable, TAX_YEAR_2568.brackets);
      expect(total).toBeCloseTo(expected, 2);
    });
  }

  it("ผลรวม byBracket ต้องเท่ากับ total", () => {
    const { total, byBracket } = progressiveTax(
      1_234_567,
      TAX_YEAR_2568.brackets,
    );
    const sum = byBracket.reduce((s, b) => s + b.tax, 0);
    expect(sum).toBeCloseTo(total, 2);
  });
});

describe("calcThaiTax — หักค่าใช้จ่ายและลดหย่อน", () => {
  it("เงินเดือน 360,000: หักค่าใช้จ่าย 100,000 (ชนเพดาน) + ส่วนตัว 60,000 → ภาษี 2,500", () => {
    const r = calcThaiTax({ totalIncome: 360_000 });
    expect(r.expenseDeduction).toBe(100_000);
    expect(r.taxableIncome).toBe(200_000);
    expect(r.totalTax).toBeCloseTo(2_500, 2); // (200,000−150,000) × 5%
  });

  it("รายได้น้อย: หักค่าใช้จ่าย 50% ไม่ชนเพดาน", () => {
    const r = calcThaiTax({ totalIncome: 100_000 });
    expect(r.expenseDeduction).toBe(50_000);
    expect(r.totalTax).toBe(0);
  });

  it("รายได้ 0 → ทุกอย่าง 0 ไม่ NaN", () => {
    const r = calcThaiTax({ totalIncome: 0 });
    expect(r.totalTax).toBe(0);
    expect(r.effectiveRate).toBe(0);
    expect(r.taxRefund).toBe(0);
  });

  it("เพดานรายตัว: ประกันสังคมเกิน 9,000 ถูกตัด + มี note", () => {
    const r = calcThaiTax({
      totalIncome: 600_000,
      deductions: { socialSecurity: 20_000 },
    });
    expect(r.applied.socialSecurity).toBe(9_000);
    expect(r.notes.length).toBeGreaterThan(0);
  });

  it("ประกันชีวิต+สุขภาพ รวมไม่เกิน 100,000", () => {
    const r = calcThaiTax({
      totalIncome: 1_000_000,
      deductions: { lifeInsurance: 100_000, healthInsurance: 25_000 },
    });
    expect(r.applied.lifeInsurance + r.applied.healthInsurance).toBe(100_000);
  });

  it("SSF เพดาน 30% ของเงินได้", () => {
    const r = calcThaiTax({
      totalIncome: 300_000,
      deductions: { ssf: 200_000 },
    });
    expect(r.applied.ssf).toBe(90_000); // 30% ของ 300,000
  });

  it("กลุ่มเกษียณรวมไม่เกิน 500,000 (ตัด pvd → rmf ก่อน)", () => {
    const r = calcThaiTax({
      totalIncome: 3_000_000,
      deductions: { ssf: 200_000, rmf: 400_000, pvd: 200_000 },
    });
    const total = r.applied.ssf + r.applied.rmf + r.applied.pvd;
    expect(total).toBe(500_000);
    expect(r.applied.ssf).toBe(200_000); // ssf ถูกตัดท้ายสุด → คงเต็ม
    expect(r.applied.pvd).toBe(0); // โดนตัดก่อน
    expect(r.applied.rmf).toBe(300_000);
  });

  it("เงินบริจาคไม่เกิน 10% ของเงินได้หลังหักลดหย่อน", () => {
    const r = calcThaiTax({
      totalIncome: 1_000_000,
      deductions: { donation: 500_000 },
    });
    // base = 1,000,000 − 100,000 − 60,000 = 840,000 → donation cap 84,000
    expect(r.donationApplied).toBe(84_000);
    expect(r.taxableIncome).toBe(756_000);
  });
});

describe("calcThaiTax — WHT และเงินคืนภาษี", () => {
  it("WHT น้อยกว่าภาษี → จ่ายเพิ่มส่วนต่าง", () => {
    const r = calcThaiTax({ totalIncome: 360_000, wht: 1_000 });
    expect(r.finalTax).toBeCloseTo(1_500, 2);
    expect(r.taxRefund).toBe(0);
  });

  it("WHT มากกว่าภาษี → ได้เงินคืน (แยก field ไม่ติดลบ)", () => {
    const r = calcThaiTax({ totalIncome: 360_000, wht: 10_000 });
    expect(r.finalTax).toBe(0);
    expect(r.taxRefund).toBeCloseTo(7_500, 2);
  });
});

describe("simulator", () => {
  it("marginalRate ตรงขั้น", () => {
    expect(marginalRate(100_000)).toBe(0);
    expect(marginalRate(200_000)).toBe(0.05);
    expect(marginalRate(600_000)).toBe(0.15);
    expect(marginalRate(10_000_000)).toBe(0.35);
  });

  it("ซื้อลดหย่อนเพิ่มในขั้นเดียว = extra × marginal rate", () => {
    expect(savingIfDeductMore(400_000, 50_000)).toBeCloseTo(5_000, 2); // ขั้น 10%
  });

  it("ซื้อลดหย่อนคร่อมขั้น คิดแยกส่วนถูกต้อง", () => {
    // 320,000 → ลด 50,000: 20,000 อยู่ขั้น 10% + 30,000 อยู่ขั้น 5% = 3,500
    expect(savingIfDeductMore(320_000, 50_000)).toBeCloseTo(3_500, 2);
  });
});
