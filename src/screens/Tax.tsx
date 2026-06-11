import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "../core/money";
import {
  calcThaiTax,
  savingIfDeductMore,
  TAX_YEAR_2568,
  type Deductions,
} from "../core/tax";
import { db } from "../db/db";

interface FieldDef {
  key: keyof Deductions | "income" | "wht";
  label: string;
  hint?: string;
}

const MAIN_FIELDS: FieldDef[] = [
  { key: "income", label: "เงินได้ทั้งปี (เงินเดือน/ค่าจ้าง)" },
  { key: "wht", label: "ภาษีหัก ณ ที่จ่ายทั้งปี" },
];

const DEDUCTION_FIELDS: FieldDef[] = [
  { key: "socialSecurity", label: "ประกันสังคม", hint: "สูงสุด 9,000" },
  { key: "lifeInsurance", label: "เบี้ยประกันชีวิต", hint: "สูงสุด 100,000" },
  { key: "healthInsurance", label: "เบี้ยประกันสุขภาพ", hint: "สูงสุด 25,000" },
  { key: "pvd", label: "กองทุนสำรองเลี้ยงชีพ (PVD)", hint: "สูงสุด 15% ของเงินได้" },
  { key: "ssf", label: "SSF", hint: "30% ของเงินได้ สูงสุด 200,000" },
  { key: "rmf", label: "RMF", hint: "30% ของเงินได้ สูงสุด 500,000" },
  { key: "tesg", label: "Thai ESG", hint: "30% ของเงินได้ สูงสุด 300,000" },
  { key: "homeLoan", label: "ดอกเบี้ยบ้าน", hint: "สูงสุด 100,000" },
  { key: "donation", label: "เงินบริจาค", hint: "สูงสุด 10% ของเงินได้หลังหักลดหย่อน" },
];

const toNum = (s: string | undefined): number => {
  if (!s) return 0;
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function Tax() {
  const txs = useLiveQuery(() => db.tx.toArray(), []) ?? [];

  const years = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    for (const t of txs) ys.add(Number(t.date.slice(0, 4)));
    return [...ys].sort((a, b) => b - a);
  }, [txs]);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [form, setForm] = useState<Record<string, string>>({});
  const loaded = useRef(false);

  // โหลด/บันทึกฟอร์มของแต่ละปีไว้ใน kv
  useEffect(() => {
    // ถ้าผู้ใช้พิมพ์ก่อนที่ค่าที่เก็บไว้จะโหลดเสร็จ (เปิดหน้าแล้วพิมพ์ทันที)
    // ต้องไม่เอาค่าเก่ามาทับ — merge สิ่งที่พิมพ์ไว้ทับค่าที่เก็บ
    // แต่ตอนสลับปี (เคยโหลดปีอื่นเสร็จแล้ว) ให้แทนที่ทั้งฟอร์ม
    const switchingYear = loaded.current;
    loaded.current = false;
    let cancelled = false;
    db.kv.get(`tax-${year}`).then((row) => {
      if (cancelled) return;
      const stored = (row?.value as Record<string, string>) ?? {};
      setForm((prev) => (switchingYear ? stored : { ...stored, ...prev }));
      loaded.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [year]);
  useEffect(() => {
    if (loaded.current) void db.kv.put({ key: `tax-${year}`, value: form });
  }, [form, year]);

  const pullIncome = () => {
    const sumSatang = txs
      .filter((t) => t.type === "IN" && t.date.startsWith(`${year}-`))
      .reduce((s, t) => s + t.amount, 0);
    setForm((f) => ({ ...f, income: String(sumSatang / 100) }));
  };

  const result = useMemo(
    () =>
      calcThaiTax({
        totalIncome: toNum(form.income),
        wht: toNum(form.wht),
        deductions: Object.fromEntries(
          DEDUCTION_FIELDS.map((d) => [d.key, toNum(form[d.key])]),
        ) as Deductions,
      }),
    [form],
  );

  const hasIncome = toNum(form.income) > 0;
  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const inputCls =
    "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] tabular";

  const fb = (n: number) => `฿${fmt(Math.round(n * 100))}`;

  return (
    <div>
      <header className="rise flex items-center justify-between pt-2">
        <h1 className="font-zen text-xl font-bold tracking-tight">ภาษี</h1>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              ปีภาษี {y + 543}
            </option>
          ))}
        </select>
      </header>

      <section className="rise rise-1 space-y-3 pt-6">
        {MAIN_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs text-sub">{f.label}</span>
            <input
              className={inputCls + " mt-1"}
              inputMode="decimal"
              value={form[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder="0"
            />
          </label>
        ))}
        <button
          onClick={pullIncome}
          className="pressable rounded-xl bg-surface2 px-4 py-2 text-sm text-sub"
        >
          ดึงรายรับปี {year + 543} จากบันทึก
        </button>
      </section>

      <section className="rise rise-2 pt-7">
        <h2 className="pb-3 text-sm font-medium text-sub">ค่าลดหย่อน</h2>
        <div className="grid grid-cols-2 gap-3">
          {DEDUCTION_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs text-sub">{f.label}</span>
              <input
                className={inputCls + " mt-1"}
                inputMode="decimal"
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.hint ?? "0"}
              />
            </label>
          ))}
        </div>
      </section>

      {hasIncome && (
        <section className="rise rise-3 pt-7">
          <div className="rounded-3xl bg-surface p-5">
            <div className="space-y-1.5 text-sm">
              <Row label="หักค่าใช้จ่าย (50% ไม่เกิน 100,000)" value={`−${fb(result.expenseDeduction)}`} />
              <Row label={`ลดหย่อนรวม (รวมส่วนตัว ${fmt(TAX_YEAR_2568.personalAllowance * 100)})`} value={`−${fb(result.allowanceTotal)}`} />
              {result.donationApplied > 0 && (
                <Row label="เงินบริจาค" value={`−${fb(result.donationApplied)}`} />
              )}
              <Row label="เงินได้สุทธิ" value={fb(result.taxableIncome)} strong />
            </div>

            {result.taxableIncome > 0 && (
              <div className="mt-4 space-y-1 border-t border-line pt-4">
                {result.byBracket
                  .filter((b) => b.taxed > 0)
                  .map((b) => (
                    <div
                      key={b.min}
                      className="flex justify-between text-xs text-sub"
                    >
                      <span>
                        {b.rate === 0
                          ? `0 – 150,000 · ยกเว้น`
                          : `${(b.min + 1).toLocaleString()} – ${
                              b.max === Infinity ? "ขึ้นไป" : b.max.toLocaleString()
                            } · ${Math.round(b.rate * 100)}%`}
                      </span>
                      <span className="tabular">{fb(b.tax)}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="mt-4 border-t border-line pt-4 text-center">
              {result.taxRefund > 0 ? (
                <>
                  <p className="text-sm text-sub">ได้เงินคืนภาษีประมาณ</p>
                  <p
                    className="tabular pt-1 font-zen text-3xl font-medium"
                    style={{ color: "var(--income)" }}
                  >
                    {fb(result.taxRefund)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-sub">
                    ภาษีที่ต้อง{toNum(form.wht) > 0 ? "จ่ายเพิ่ม" : "จ่าย"}ประมาณ
                  </p>
                  <p className="tabular pt-1 font-zen text-3xl font-medium">
                    {fb(result.finalTax)}
                  </p>
                </>
              )}
              <p className="pt-1 text-xs text-faint">
                ภาษีทั้งปี {fb(result.totalTax)} · อัตราที่จ่ายจริง{" "}
                {(result.effectiveRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {result.notes.length > 0 && (
            <ul className="space-y-1 pt-3 text-xs" style={{ color: "#b9842f" }}>
              {result.notes.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
          )}

          {result.taxableIncome > 150_000 && (
            <div className="pt-5">
              <h3 className="pb-2 text-sm font-medium text-sub">
                ซื้อกองทุนลดหย่อนเพิ่ม ประหยัดได้อีก
              </h3>
              <div className="flex gap-2">
                {[10_000, 50_000, 100_000].map((x) => (
                  <div
                    key={x}
                    className="flex-1 rounded-2xl bg-surface p-3 text-center"
                  >
                    <p className="text-xs text-sub">+{x.toLocaleString()}</p>
                    <p
                      className="tabular pt-1 text-sm font-medium"
                      style={{ color: "var(--income)" }}
                    >
                      −{fb(savingIfDeductMore(result.taxableIncome, x))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="px-1 pb-4 pt-5 text-xs leading-relaxed text-faint">
            การประมาณการเบื้องต้นสำหรับเงินได้ประเภทเงินเดือน (40(1))
            ตามอัตราปีภาษี 2568 — ตัวเลขจริงขึ้นกับเงื่อนไขส่วนบุคคล
            โปรดตรวจสอบกับกรมสรรพากรอีกครั้งก่อนยื่น
          </p>
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={strong ? "font-medium" : "text-sub"}>{label}</span>
      <span className={`tabular ${strong ? "font-medium" : "text-sub"}`}>
        {value}
      </span>
    </div>
  );
}
