/** Reducer ของแป้นตัวเลข QuickAdd — pure function ทดสอบได้โดยไม่ต้อง render */

/** ปุ่มลบ (backspace) บนแป้น */
export const BACKSPACE = "⌫";

/**
 * คำนวณสตริงจำนวนเงินใหม่จากปุ่มที่กด
 * กฎ: ตัด leading zero · จุดได้ครั้งเดียว · จำนวนเต็มไม่เกิน 7 หลัก · ทศนิยมไม่เกิน 2
 */
export function pressKey(current: string, key: string): string {
  if (key === BACKSPACE) return current.slice(0, -1);
  if (key === ".") {
    return current.includes(".") || current === "" ? current : `${current}.`;
  }
  const next = current + key;
  const [intPart, frac] = next.split(".");
  if (intPart.length > 7) return current;
  if (frac !== undefined && frac.length > 2) return current;
  return next === "0" ? current : next;
}
