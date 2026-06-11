import type { Satang } from "./types";

/** แปลงบาท (number) → สตางค์ (int) */
export function bahtToSatang(baht: number): Satang {
  return Math.round(baht * 100);
}

export function satangToBaht(satang: Satang): number {
  return satang / 100;
}

/** parse ข้อความที่ผู้ใช้พิมพ์ เช่น "1,250.50" → สตางค์ (null ถ้าไม่ใช่ตัวเลข) */
export function parseAmount(text: string): Satang | null {
  const cleaned = text.replace(/[,\s฿]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return bahtToSatang(n);
}

/** ฟอร์แมตเป็น "1,250.50" — ตัด .00 ทิ้งเพื่อความเรียบ */
export function fmt(satang: Satang): string {
  const baht = Math.trunc(Math.abs(satang) / 100);
  const st = Math.abs(satang) % 100;
  const sign = satang < 0 ? "−" : "";
  const intPart = baht.toLocaleString("en-US");
  return st === 0
    ? `${sign}${intPart}`
    : `${sign}${intPart}.${String(st).padStart(2, "0")}`;
}

export function fmtBaht(satang: Satang): string {
  return `฿${fmt(satang)}`;
}

/** เครื่องหมายนำหน้าตามชนิดรายการ */
export function fmtSigned(satang: Satang, dir: "in" | "out"): string {
  return dir === "in" ? `+฿${fmt(satang)}` : `−฿${fmt(satang)}`;
}
