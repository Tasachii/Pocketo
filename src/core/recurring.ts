/** Engine รายการประจำรายเดือน — pure function ทั้งหมด */

const pad = (n: number) => String(n).padStart(2, "0");

/** วันที่ day ของเดือนนั้น เลื่อนเป็นวันสุดท้ายถ้าเดือนสั้นกว่า (เช่น 31 → 28 ก.พ.) */
export function clampedDate(year: number, month0: number, day: number): string {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  return `${year}-${pad(month0 + 1)}-${pad(Math.min(day, lastDay))}`;
}

export interface RecurringWindow {
  day: number;
  since: string;
  lastPosted?: string;
}

/**
 * วันครบกำหนดทั้งหมดที่ยังไม่ได้สร้างรายการ จนถึงวันนี้ (รวมวันนี้)
 * - ไม่ย้อนก่อนวันสร้างกฎ (since, inclusive)
 * - ไม่ซ้ำกับที่สร้างแล้ว (lastPosted, exclusive)
 * - ตามเก็บย้อนหลังให้ครบทุกเดือนถ้าผู้ใช้ไม่ได้เปิดแอพนาน
 */
export function dueDates(rule: RecurringWindow, today: string): string[] {
  const lower =
    rule.lastPosted && rule.lastPosted > rule.since
      ? rule.lastPosted
      : rule.since;
  const exclusiveLower = rule.lastPosted !== undefined && lower === rule.lastPosted;

  let y = Number(lower.slice(0, 4));
  let m = Number(lower.slice(5, 7)) - 1;
  const ty = Number(today.slice(0, 4));
  const tm = Number(today.slice(5, 7)) - 1;

  const out: string[] = [];
  while (y < ty || (y === ty && m <= tm)) {
    const d = clampedDate(y, m, rule.day);
    const aboveLower = exclusiveLower ? d > lower : d >= lower;
    if (aboveLower && d <= today) out.push(d);
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

/** วันครบกำหนดถัดไป (หลังวันนี้) — ไว้แสดง "กำลังจะถึง" */
export function nextOccurrence(rule: RecurringWindow, today: string): string {
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7)) - 1;
  for (let i = 0; i < 3; i++) {
    const d = clampedDate(y, m, rule.day);
    if (d > today && d >= rule.since) return d;
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return clampedDate(y, m, rule.day);
}
