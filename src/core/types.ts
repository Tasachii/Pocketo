/** จำนวนเงินทั้งแอพเก็บเป็น "สตางค์" (integer) เพื่อตัดปัญหาทศนิยมลอย */
export type Satang = number;

export type TxType = "IN" | "OUT" | "TRANSFER" | "INIT";

export interface Tx {
  id?: number;
  type: TxType;
  amount: Satang;
  pocketId: number;
  /** ปลายทาง กรณี TRANSFER */
  toPocketId?: number;
  categoryId?: number;
  note?: string;
  /** ISO date: YYYY-MM-DD */
  date: string;
  createdAt: number;
}

export interface Pocket {
  id?: number;
  name: string;
  icon: string;
  /** กล่องหลัก (เงินเข้า default ลงที่นี่) มีได้กล่องเดียว */
  isMain: 0 | 1;
  /** เป้าหมายออม (สตางค์) — ใช้วาด ensō */
  goal?: Satang;
  /** % ที่แบ่งอัตโนมัติเมื่อมีรายรับเข้ากล่องหลัก */
  allocPercent?: number;
  sortOrder: number;
}

export type KakeiboGroup = "needs" | "wants" | "culture" | "extra";

export interface Category {
  id?: number;
  name: string;
  icon: string;
  type: "income" | "expense";
  /** 4 เสาแบบ kakeibo — เฉพาะรายจ่าย */
  group?: KakeiboGroup;
  sortOrder: number;
}

export const KAKEIBO_LABEL: Record<KakeiboGroup, string> = {
  needs: "จำเป็น",
  wants: "อยากได้",
  culture: "ปัญญาและใจ",
  extra: "ไม่คาดคิด",
};
