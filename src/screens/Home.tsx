import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { EnsoRing } from "../components/EnsoRing";
import { IconAuto, IconDelete, IconMoon, IconSun, IconSwap } from "../components/Icons";
import { NumberTicker } from "../components/NumberTicker";
import { fmt, fmtBaht } from "../core/money";
import type { Tx } from "../core/types";
import { calcBalances, fmtThaiDate, monthKey } from "../db/data";
import { db } from "../db/db";
import type { ThemeMode } from "../state/useTheme";

export function Home({
  themeMode,
  onCycleTheme,
}: {
  themeMode: ThemeMode;
  onCycleTheme: () => void;
}) {
  const txs = useLiveQuery(() => db.tx.toArray(), []) ?? [];
  const pockets =
    useLiveQuery(() => db.pockets.orderBy("sortOrder").toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id!, c])),
    [categories],
  );
  const pocketById = useMemo(
    () => new Map(pockets.map((p) => [p.id!, p])),
    [pockets],
  );

  const balances = useMemo(() => calcBalances(pockets, txs), [pockets, txs]);
  const total = useMemo(
    () => [...balances.values()].reduce((s, v) => s + v, 0),
    [balances],
  );

  const now = new Date();
  const mk = monthKey(now.getFullYear(), now.getMonth());
  const { income, expense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of txs) {
      if (!t.date.startsWith(mk)) continue;
      if (t.type === "IN") income += t.amount;
      else if (t.type === "OUT") expense += t.amount;
    }
    return { income, expense };
  }, [txs, mk]);

  const recent = useMemo(
    () =>
      [...txs]
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
        )
        .slice(0, 8),
    [txs],
  );

  const ThemeIcon =
    themeMode === "dark" ? IconMoon : themeMode === "light" ? IconSun : IconAuto;

  const txLabel = (t: Tx): { icon: string; name: string } => {
    if (t.type === "TRANSFER") {
      const to = t.toPocketId != null ? pocketById.get(t.toPocketId) : undefined;
      return { icon: "", name: `โอนไป ${to?.name ?? "?"}` };
    }
    if (t.type === "INIT") return { icon: "", name: "ยอดตั้งต้น" };
    const c = t.categoryId != null ? catById.get(t.categoryId) : undefined;
    return { icon: c?.icon ?? "", name: c?.name ?? "ไม่ระบุหมวด" };
  };

  const remove = async (t: Tx) => {
    if (window.confirm("ลบรายการนี้?")) await db.tx.delete(t.id!);
  };

  return (
    <div>
      {/* wordmark — จุดเดียวที่มี katakana */}
      <header className="rise flex items-center justify-between pt-2">
        <div className="flex items-baseline gap-2">
          <h1 className="font-zen text-xl font-bold tracking-tight">Pocketo</h1>
          <span className="font-mincho text-sm text-faint">ポケット</span>
        </div>
        <button
          onClick={onCycleTheme}
          className="pressable p-2 text-sub"
          aria-label="สลับธีม"
          title={
            themeMode === "dark" ? "มืด" : themeMode === "light" ? "สว่าง" : "ตามระบบ"
          }
        >
          <ThemeIcon size={20} />
        </button>
      </header>

      {/* ยอดรวม — ตัวเลขคือ hero */}
      <section className="rise rise-1 flex flex-col items-center pb-10 pt-12">
        <p className="pb-2 text-sm text-sub">ยอดรวมทุกกล่อง</p>
        <NumberTicker
          value={total}
          className="font-zen text-5xl font-medium tracking-tight"
        />
        <div className="flex gap-5 pt-4 text-sm">
          <span style={{ color: "var(--income)" }} className="tabular">
            +฿{fmt(income)}
          </span>
          <span className="text-faint">·</span>
          <span style={{ color: "var(--expense)" }} className="tabular">
            −฿{fmt(expense)}
          </span>
          <span className="text-faint">เดือนนี้</span>
        </div>
      </section>

      {/* กล่องเงินย่อ */}
      {pockets.length > 1 && (
        <section className="rise rise-2 -mx-5 flex gap-3 overflow-x-auto px-5 pb-8">
          {pockets.map((p) => {
            const bal = balances.get(p.id!) ?? 0;
            const progress = p.goal ? bal / p.goal : 0;
            return (
              <div
                key={p.id}
                className="flex shrink-0 items-center gap-3 rounded-2xl bg-surface px-4 py-3"
              >
                <EnsoRing
                  progress={p.goal ? progress : 0}
                  size={40}
                  stroke={3.5}
                  color={p.goal ? "var(--accent)" : "var(--line)"}
                >
                  <span className="text-base">{p.icon}</span>
                </EnsoRing>
                <div>
                  <p className="text-xs text-sub">{p.name}</p>
                  <p className="tabular font-zen text-sm font-medium">
                    {fmtBaht(bal)}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* รายการล่าสุด */}
      <section className="rise rise-3">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pb-10 pt-16 text-center">
            <EnsoRing progress={0.92} size={64} stroke={3} color="var(--line)" />
            <p className="text-sm text-sub">
              ยังไม่มีบันทึก
              <br />
              แตะปุ่ม + เพื่อจดรายการแรกของคุณ
            </p>
          </div>
        ) : (
          <>
            <h2 className="pb-3 text-sm font-medium text-sub">ล่าสุด</h2>
            <ul className="space-y-1">
              {recent.map((t) => {
                const { icon, name } = txLabel(t);
                const isIn = t.type === "IN" || t.type === "INIT";
                const isTransfer = t.type === "TRANSFER";
                return (
                  <li
                    key={t.id}
                    className="group flex items-center gap-3 rounded-2xl px-2 py-2.5"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-lg">
                      {isTransfer ? (
                        <IconSwap size={16} className="text-sub" />
                      ) : (
                        icon || "•"
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px]">{name}</p>
                      <p className="text-xs text-faint">
                        {fmtThaiDate(t.date)}
                        {t.note ? ` · ${t.note}` : ""}
                      </p>
                    </div>
                    <span
                      className="tabular font-zen text-[15px] font-medium"
                      style={{
                        color: isTransfer
                          ? "var(--neutral)"
                          : isIn
                            ? "var(--income)"
                            : "var(--expense)",
                      }}
                    >
                      {isTransfer ? "" : isIn ? "+" : "−"}฿{fmt(t.amount)}
                    </span>
                    <button
                      onClick={() => remove(t)}
                      className="pressable p-1 text-faint opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                      aria-label="ลบรายการ"
                    >
                      <IconDelete size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
