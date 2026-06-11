import { splitByPercent } from "../core/allocate";
import type { Pocket, Satang, Tx } from "../core/types";
import { db } from "./db";

export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function monthKey(y: number, m0: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

export function fmtThaiDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`;
}

/** ยอดคงเหลือทุกกล่อง คำนวณจากรายการเสมอ (ไม่เก็บ balance — ยอดไม่มีวันเพี้ยน) */
export function calcBalances(
  pockets: Pocket[],
  txs: Tx[],
): Map<number, Satang> {
  const m = new Map<number, Satang>();
  for (const p of pockets) m.set(p.id!, 0);
  const add = (id: number, v: Satang) => m.set(id, (m.get(id) ?? 0) + v);
  for (const t of txs) {
    if (t.type === "IN" || t.type === "INIT") add(t.pocketId, t.amount);
    else if (t.type === "OUT") add(t.pocketId, -t.amount);
    else if (t.type === "TRANSFER") {
      add(t.pocketId, -t.amount);
      if (t.toPocketId != null) add(t.toPocketId, t.amount);
    }
  }
  return m;
}

export interface QuickTxInput {
  type: "IN" | "OUT";
  amount: Satang;
  pocketId: number;
  categoryId?: number;
  note?: string;
  date: string;
}

/**
 * บันทึกรายการ — ถ้าเป็นรายรับเข้ากล่องหลักและมีกฎแบ่งอัตโนมัติ
 * จะสร้างรายการโอนไปกล่องอื่นตาม % ให้ทันที (atomic ทั้งชุด)
 */
export async function saveQuickTx(input: QuickTxInput): Promise<void> {
  await db.transaction("rw", [db.tx, db.pockets], async () => {
    const createdAt = Date.now();
    await db.tx.add({ ...input, createdAt });
    if (input.type !== "IN") return;
    const pockets = await db.pockets.toArray();
    const main = pockets.find((p) => p.isMain);
    if (!main || input.pocketId !== main.id) return;
    const rules = pockets
      .filter((p) => !p.isMain && (p.allocPercent ?? 0) > 0)
      .map((p) => ({ pocketId: p.id!, percent: p.allocPercent! }));
    const allocs = splitByPercent(input.amount, rules);
    for (const a of allocs) {
      await db.tx.add({
        type: "TRANSFER",
        amount: a.amount,
        pocketId: main.id!,
        toPocketId: a.pocketId,
        note: "แบ่งอัตโนมัติ",
        date: input.date,
        createdAt,
      });
    }
  });
}

export async function transfer(
  fromId: number,
  toId: number,
  amount: Satang,
  date: string,
): Promise<void> {
  if (fromId === toId) throw new Error("กล่องต้นทางและปลายทางต้องต่างกัน");
  if (amount <= 0) throw new Error("จำนวนเงินต้องมากกว่า 0");
  await db.tx.add({
    type: "TRANSFER",
    amount,
    pocketId: fromId,
    toPocketId: toId,
    date,
    createdAt: Date.now(),
  });
}
