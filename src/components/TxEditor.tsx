import { useState } from "react";
import { fmt, parseAmount } from "../core/money";
import type { Category, Pocket, Tx } from "../core/types";
import { deleteTxCascade, restoreTxs, updateTx } from "../db/data";
import { showToast } from "./Feedback";
import { Field, inputCls, Overlay } from "./Modal";

const TYPE_LABEL: Record<Tx["type"], string> = {
  IN: "รายรับ",
  OUT: "รายจ่าย",
  TRANSFER: "โอนระหว่างกล่อง",
  INIT: "ยอดตั้งต้น",
};

/** แก้ไข/ลบรายการ — ลบแล้วเลิกทำได้ผ่าน toast (รวมรายการแบ่งอัตโนมัติ) */
export function TxEditor({
  tx,
  categories,
  pockets,
  onClose,
}: {
  tx: Tx;
  categories: Category[];
  pockets: Pocket[];
  onClose: () => void;
}) {
  const [amountStr, setAmountStr] = useState(fmt(tx.amount));
  const [categoryId, setCategoryId] = useState(tx.categoryId);
  const [pocketId, setPocketId] = useState(tx.pocketId);
  const [toPocketId, setToPocketId] = useState(tx.toPocketId);
  const [note, setNote] = useState(tx.note ?? "");
  const [date, setDate] = useState(tx.date);
  const [error, setError] = useState("");

  const cats = categories
    .filter((c) => c.type === (tx.type === "IN" ? "income" : "expense"))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const hasCategory = tx.type === "IN" || tx.type === "OUT";

  const save = async () => {
    const amount = parseAmount(amountStr);
    if (amount === null || amount <= 0) return setError("ใส่จำนวนเงินให้ถูกต้อง");
    if (tx.type === "TRANSFER" && pocketId === toPocketId)
      return setError("ต้นทางและปลายทางต้องต่างกัน");
    await updateTx(tx.id!, {
      amount,
      categoryId: hasCategory ? categoryId : undefined,
      pocketId,
      toPocketId: tx.type === "TRANSFER" ? toPocketId : undefined,
      note: note.trim() || undefined,
      date,
    });
    onClose();
  };

  const remove = async () => {
    const removed = await deleteTxCascade(tx.id!);
    onClose();
    const extra =
      removed.length > 1 ? ` (รวมแบ่งอัตโนมัติ ${removed.length - 1} รายการ)` : "";
    showToast(`ลบรายการแล้ว${extra}`, () => void restoreTxs(removed));
  };

  return (
    <Overlay onClose={onClose}>
      <h2 className="pb-4 font-zen text-lg font-bold">
        แก้ไข{TYPE_LABEL[tx.type]}
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="จำนวนเงิน (บาท)">
            <input
              className={inputCls}
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
            />
          </Field>
          <Field label="วันที่">
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>

        {hasCategory && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="หมวด">
              <select
                className={inputCls}
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
              >
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="กล่อง">
              <select
                className={inputCls}
                value={pocketId}
                onChange={(e) => setPocketId(Number(e.target.value))}
              >
                {pockets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {tx.type === "TRANSFER" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="จาก">
              <select
                className={inputCls}
                value={pocketId}
                onChange={(e) => setPocketId(Number(e.target.value))}
              >
                {pockets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ไป">
              <select
                className={inputCls}
                value={toPocketId}
                onChange={(e) => setToPocketId(Number(e.target.value))}
              >
                {pockets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        <Field label="โน้ต">
          <input
            className={inputCls}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ไม่บังคับ"
          />
        </Field>

        {error && (
          <p className="text-sm" style={{ color: "var(--expense)" }}>
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-1">
          <button
            onClick={remove}
            className="pressable rounded-2xl px-4 py-3 text-sm"
            style={{ color: "var(--expense)" }}
          >
            ลบ
          </button>
          <button
            onClick={save}
            className="pressable flex-1 rounded-2xl py-3 font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            บันทึก
          </button>
        </div>
      </div>
    </Overlay>
  );
}
