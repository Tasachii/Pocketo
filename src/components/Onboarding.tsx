import { useState } from "react";
import { EnsoRing } from "./EnsoRing";

export const ONBOARDED_KEY = "pocketo-onboarded";

interface Card {
  ring: string;
  emoji: string;
  title: string;
  body: string;
}

const CARDS: Card[] = [
  {
    ring: "var(--accent)",
    emoji: "¥",
    title: "ยินดีต้อนรับสู่ Pocketo",
    body: "สมุดบัญชีรายรับรายจ่ายสไตล์ kakeibo ของญี่ปุ่น จดได้ใน 3 แตะ ข้อมูลทั้งหมดอยู่ในเครื่องคุณเท่านั้น ไม่ส่งขึ้นที่ไหน",
  },
  {
    ring: "var(--income)",
    emoji: "🫙",
    title: "แบ่งเงินเป็นกล่อง",
    body: "ตั้งกล่องออม ลงทุน หรือเป้าหมายต่างๆ พอมีรายรับเข้า เงินจะถูกแบ่งเข้ากล่องอัตโนมัติตามเปอร์เซ็นต์ที่ตั้งไว้",
  },
  {
    ring: "var(--neutral)",
    emoji: "📊",
    title: "ดูภาพรวมและภาษี",
    body: "ดูว่าเงินไปไหนตามสี่เสา kakeibo ตั้งงบต่อหมวด และประมาณภาษีเงินได้บุคคลธรรมดาไทยจากรายรับที่จดไว้ได้เลย",
  },
];

/** หน้าแนะนำตอนเปิดแอพครั้งแรก — จบแล้วบันทึก flag ใน kv ไม่แสดงอีก */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === CARDS.length - 1;
  const card = CARDS[step];

  // เก็บใน localStorage (sync, อ่านได้ทันทีตอนโหลด) — ไม่ใช่ IndexedDB ที่ async
  // และ race กับ Dexie ตอนเปิดหน้า; flag นี้เป็นค่าต่อเครื่อง ไม่ต้องอยู่ใน backup
  const finish = () => {
    localStorage.setItem(ONBOARDED_KEY, "1");
    onDone();
  };

  return (
    <div className="fade fixed inset-0 z-[90] flex flex-col bg-bg">
      <div
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-7"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 24px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        }}
      >
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-zen text-lg font-bold">Pocketo</span>
            <span className="font-mincho text-sm text-faint">ポケット</span>
          </div>
          {!last && (
            <button onClick={finish} className="pressable text-sm text-sub">
              ข้าม
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div key={step} className="rise flex flex-col items-center">
            <EnsoRing progress={(step + 1) / CARDS.length} size={120} stroke={6} color={card.ring}>
              <span className="text-4xl">{card.emoji}</span>
            </EnsoRing>
            <h2 className="pt-8 font-zen text-2xl font-bold">{card.title}</h2>
            <p className="max-w-xs pt-3 leading-relaxed text-sub">{card.body}</p>
          </div>
        </div>

        {last && (
          <p className="pb-5 text-center text-xs leading-relaxed text-faint">
            ติดตั้งเป็นแอพ: iPhone — Safari แตะปุ่มแชร์ → เพิ่มลงหน้าจอโฮม ·
            Android — Chrome แตะเมนู → ติดตั้งแอพ
          </p>
        )}

        <div className="flex items-center justify-center gap-2 pb-6">
          {CARDS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 20 : 6,
                background: i === step ? "var(--accent)" : "var(--line)",
              }}
            />
          ))}
        </div>

        <button
          onClick={() => (last ? finish() : setStep((s) => s + 1))}
          className="pressable rounded-2xl py-4 font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          {last ? "เริ่มใช้งาน" : "ถัดไป"}
        </button>
      </div>
    </div>
  );
}
