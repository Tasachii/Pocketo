import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { CHART_COLORS, Donut, type DonutSlice } from "../components/Donut";
import { IconBack } from "../components/Icons";
import { fmt, fmtBaht } from "../core/money";
import { KAKEIBO_LABEL, type KakeiboGroup } from "../core/types";
import { monthKey, THAI_MONTHS, THAI_MONTHS_SHORT } from "../db/data";
import { db } from "../db/db";

const GROUP_COLORS: Record<KakeiboGroup, string> = {
  needs: "#3e5c76",
  wants: "#bf4a3e",
  culture: "#58855c",
  extra: "#b9842f",
};

export function Reports() {
  const txs = useLiveQuery(() => db.tx.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id!, c])),
    [categories],
  );

  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const mk = monthKey(ym.y, ym.m);

  const shift = (d: number) =>
    setYm(({ y, m }) => {
      const next = new Date(y, m + d, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });

  const monthTxs = useMemo(
    () => txs.filter((t) => t.date.startsWith(mk)),
    [txs, mk],
  );

  const { income, expense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of monthTxs) {
      if (t.type === "IN") income += t.amount;
      else if (t.type === "OUT") expense += t.amount;
    }
    return { income, expense };
  }, [monthTxs]);

  // รายจ่ายแยกหมวด → donut (top 5 + อื่นๆ)
  const { slices, legend } = useMemo(() => {
    const byCat = new Map<number, number>();
    for (const t of monthTxs) {
      if (t.type !== "OUT" || t.categoryId == null) continue;
      byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + t.amount);
    }
    const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    const slices: DonutSlice[] = top.map(([id, v], i) => ({
      label: catById.get(id)?.name ?? "?",
      value: v,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    if (rest > 0)
      slices.push({ label: "ที่เหลือ", value: rest, color: "var(--faint)" });
    return { slices, legend: slices };
  }, [monthTxs, catById]);

  // 4 เสา kakeibo
  const groups = useMemo(() => {
    const sums: Record<KakeiboGroup, number> = {
      needs: 0,
      wants: 0,
      culture: 0,
      extra: 0,
    };
    for (const t of monthTxs) {
      if (t.type !== "OUT" || t.categoryId == null) continue;
      const g = catById.get(t.categoryId)?.group;
      if (g) sums[g] += t.amount;
    }
    return sums;
  }, [monthTxs, catById]);

  // เทรนด์ 6 เดือน
  const trend = useMemo(() => {
    const months: Array<{ label: string; income: number; expense: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ym.y, ym.m - i, 1);
      const key = monthKey(d.getFullYear(), d.getMonth());
      let inc = 0;
      let exp = 0;
      for (const t of txs) {
        if (!t.date.startsWith(key)) continue;
        if (t.type === "IN") inc += t.amount;
        else if (t.type === "OUT") exp += t.amount;
      }
      months.push({
        label: THAI_MONTHS_SHORT[d.getMonth()],
        income: inc,
        expense: exp,
      });
    }
    return months;
  }, [txs, ym]);
  const trendMax = Math.max(1, ...trend.flatMap((m) => [m.income, m.expense]));

  const hasData = monthTxs.some((t) => t.type === "IN" || t.type === "OUT");

  return (
    <div>
      <header className="rise flex items-center justify-between pt-2">
        <h1 className="font-zen text-xl font-bold tracking-tight">รายงาน</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="pressable p-2 text-sub" aria-label="เดือนก่อน">
            <IconBack size={18} />
          </button>
          <span className="min-w-[110px] text-center text-sm font-medium">
            {THAI_MONTHS[ym.m]} {ym.y + 543}
          </span>
          <button onClick={() => shift(1)} className="pressable p-2 text-sub" aria-label="เดือนถัดไป">
            <IconBack size={18} className="rotate-180" />
          </button>
        </div>
      </header>

      <section className="rise rise-1 grid grid-cols-3 gap-3 pt-6">
        {[
          { label: "รายรับ", v: income, color: "var(--income)", sign: "+" },
          { label: "รายจ่าย", v: expense, color: "var(--expense)", sign: "−" },
          {
            label: "คงเหลือ",
            v: income - expense,
            color: "var(--ink)",
            sign: "",
          },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl bg-surface p-3">
            <p className="text-xs text-sub">{c.label}</p>
            <p
              className="tabular pt-1 font-zen text-[15px] font-medium"
              style={{ color: c.color }}
            >
              {c.sign}฿{fmt(Math.abs(c.v))}
            </p>
          </div>
        ))}
      </section>

      {!hasData ? (
        <p className="rise rise-2 pt-16 text-center text-sm text-sub">
          เดือนนี้ยังไม่มีบันทึก
        </p>
      ) : (
        <>
          {expense > 0 && (
            <section className="rise rise-2 pt-8">
              <h2 className="pb-4 text-sm font-medium text-sub">
                รายจ่ายตามหมวด
              </h2>
              <div className="flex items-center gap-6">
                <Donut slices={slices} size={150} thickness={20} />
                <ul className="min-w-0 flex-1 space-y-2">
                  {legend.map((s) => (
                    <li key={s.label} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sub">
                        {s.label}
                      </span>
                      <span className="tabular text-xs">{fmtBaht(s.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {expense > 0 && (
            <section className="rise rise-3 pt-8">
              <h2 className="pb-1 text-sm font-medium text-sub">
                สี่เสาการใช้เงิน
              </h2>
              <p className="pb-4 text-xs text-faint">
                แนวคิด kakeibo — รู้ว่าเงินไหลไปกับอะไร
              </p>
              <div className="space-y-3">
                {(Object.keys(groups) as KakeiboGroup[]).map((g) => {
                  const v = groups[g];
                  const pct = expense > 0 ? (v / expense) * 100 : 0;
                  return (
                    <div key={g}>
                      <div className="flex justify-between pb-1 text-sm">
                        <span>{KAKEIBO_LABEL[g]}</span>
                        <span className="tabular text-sub">
                          {fmtBaht(v)} · {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface2">
                        <div
                          className="h-full rounded-full transition-[width] duration-700"
                          style={{
                            width: `${pct}%`,
                            background: GROUP_COLORS[g],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rise rise-4 pb-4 pt-8">
            <h2 className="pb-4 text-sm font-medium text-sub">
              ย้อนหลัง 6 เดือน
            </h2>
            <div className="flex items-end justify-between gap-2">
              {trend.map((m, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-28 items-end gap-1">
                    <div
                      className="w-2.5 rounded-t-full"
                      style={{
                        height: `${(m.income / trendMax) * 100}%`,
                        minHeight: m.income > 0 ? 3 : 0,
                        background: "var(--income)",
                      }}
                    />
                    <div
                      className="w-2.5 rounded-t-full"
                      style={{
                        height: `${(m.expense / trendMax) * 100}%`,
                        minHeight: m.expense > 0 ? 3 : 0,
                        background: "var(--expense)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-faint">{m.label}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
