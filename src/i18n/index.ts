import { useSyncExternalStore } from "react";
import { en } from "./en";
import { th } from "./th";

export type Lang = "th" | "en";
export type Dict = typeof th;

const DICTS: Record<Lang, Dict> = { th, en };
export const LANG_KEY = "pocketo-lang";

function initialLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "th" || saved === "en") return saved;
  return "th"; // ค่าเริ่มต้นเป็นไทย (กลุ่มผู้ใช้หลัก) — สลับได้ในตั้งค่า/onboarding
}

let current: Lang = initialLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.setAttribute("lang", lang);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** แทรกค่า {name} ลงในข้อความ */
function interpolate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

const MONTHS = {
  th: ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const MONTHS_SHORT = {
  th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const WEEKDAYS = {
  th: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

/**
 * ชื่อกล่อง/หมวดที่ seed มาตอนเริ่มใช้ (ดู db.ts) เก็บใน IndexedDB เป็นภาษาไทย
 * แต่ต้องแสดงตามภาษาที่เลือก — แมพไว้ทั้งสองทิศ จับได้ไม่ว่า seed ด้วยภาษาใด
 * ผู้ใช้ที่ตั้งชื่อเองจะไม่ตรง map → คืนชื่อเดิมตามที่พิมพ์
 */
const DEFAULT_NAMES: Array<{ th: string; en: string }> = [
  { th: "ใช้จ่าย", en: "Spending" },
  { th: "เงินเดือน", en: "Salary" },
  { th: "โบนัส", en: "Bonus" },
  { th: "รายได้เสริม", en: "Side income" },
  { th: "ดอกเบี้ย/ปันผล", en: "Interest / Dividends" },
  { th: "อาหาร", en: "Food" },
  { th: "เดินทาง", en: "Transport" },
  { th: "บ้าน/บิล", en: "Home / Bills" },
  { th: "ของใช้จำเป็น", en: "Essentials" },
  { th: "สุขภาพ", en: "Health" },
  { th: "กาแฟ/คาเฟ่", en: "Coffee / Café" },
  { th: "ช้อปปิ้ง", en: "Shopping" },
  { th: "บันเทิง", en: "Entertainment" },
  { th: "หนังสือ/เรียนรู้", en: "Books / Learning" },
  { th: "ให้/บริจาค", en: "Giving / Donations" },
  { th: "ซ่อม/ฉุกเฉิน", en: "Repairs / Emergency" },
];
const NAME_INDEX = new Map<string, Record<Lang, string>>();
for (const n of DEFAULT_NAMES) {
  NAME_INDEX.set(n.th, n);
  NAME_INDEX.set(n.en, n);
}

export interface Translator {
  lang: Lang;
  t: (key: keyof Dict, params?: Record<string, string | number>) => string;
  /** แปลชื่อกล่อง/หมวดที่ seed มา (ชื่อที่ผู้ใช้ตั้งเองคืนค่าเดิม) */
  name: (raw: string) => string;
  month: (i: number) => string;
  shortMonth: (i: number) => string;
  weekday: (i: number) => string;
  /** วันที่ "11 มิ.ย." / "11 Jun" */
  date: (iso: string) => string;
  /** ปี: ไทยแสดง พ.ศ., อังกฤษแสดง ค.ศ. */
  year: (gregorianYear: number) => number;
  /** "มิถุนายน 2569" / "June 2026" */
  monthYear: (y: number, m0: number) => string;
}

function build(lang: Lang): Translator {
  const dict = DICTS[lang];
  return {
    lang,
    t: (key, params) => interpolate(dict[key] ?? String(key), params),
    name: (raw) => NAME_INDEX.get(raw)?.[lang] ?? raw,
    month: (i) => MONTHS[lang][i] ?? "",
    shortMonth: (i) => MONTHS_SHORT[lang][i] ?? "",
    weekday: (i) => WEEKDAYS[lang][i] ?? "",
    date: (iso) => {
      const d = new Date(`${iso}T00:00:00`);
      return `${d.getDate()} ${MONTHS_SHORT[lang][d.getMonth()]}`;
    },
    year: (y) => (lang === "th" ? y + 543 : y),
    monthYear: (y, m0) =>
      `${MONTHS[lang][m0]} ${lang === "th" ? y + 543 : y}`,
  };
}

/** ใช้ในคอมโพเนนต์ — re-render อัตโนมัติเมื่อสลับภาษา */
export function useT(): Translator {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return build(lang);
}

/** ใช้ใน non-react หรือเมื่อต้องการ snapshot ปัจจุบัน */
export function tr(): Translator {
  return build(current);
}
