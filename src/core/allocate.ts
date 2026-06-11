import type { Satang } from "./types";

export interface AllocRule {
  pocketId: number;
  percent: number; // 0–100
}

export interface Allocation {
  pocketId: number;
  amount: Satang;
}

/**
 * แบ่งเงินรายรับเข้ากล่องตาม % ด้วย largest-remainder method
 * การันตี: ผลรวมทุกก้อน = round(amount × totalPercent / 100) เป๊ะระดับสตางค์
 * ส่วนที่เหลือ (100 − Σpercent) คงอยู่กล่องหลัก ไม่อยู่ในผลลัพธ์
 */
export function splitByPercent(
  amount: Satang,
  rules: AllocRule[],
): Allocation[] {
  const active = rules.filter((r) => r.percent > 0);
  if (active.length === 0 || amount <= 0) return [];

  const totalPercent = active.reduce((s, r) => s + r.percent, 0);
  if (totalPercent > 100) {
    throw new Error(`allocation percent รวมเกิน 100 (${totalPercent})`);
  }

  const exact = active.map((r) => (amount * r.percent) / 100);
  const floored = exact.map(Math.floor);
  let remainder =
    Math.round((amount * totalPercent) / 100) -
    floored.reduce((s, v) => s + v, 0);

  // แจกเศษสตางค์ให้ก้อนที่มีเศษทศนิยมมากสุดก่อน
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = floored.slice();
  for (const { i } of order) {
    if (remainder <= 0) break;
    result[i] += 1;
    remainder -= 1;
  }

  return active.map((r, i) => ({ pocketId: r.pocketId, amount: result[i] }));
}
