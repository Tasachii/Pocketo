import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { EnsoRing } from "../components/EnsoRing";
import { showToast } from "../components/Feedback";
import {
  IconAuto,
  IconMoon,
  IconRepeat,
  IconSun,
  IconSwap,
} from "../components/Icons";
import { NumberTicker } from "../components/NumberTicker";
import { TxEditor } from "../components/TxEditor";
import { downloadBackup } from "../core/backup";
import { fmt, fmtBaht } from "../core/money";
import { nextOccurrence } from "../core/recurring";
import type { Tx } from "../core/types";
import { calcBalances, monthKey, todayStr } from "../db/data";
import { db } from "../db/db";
import type { ThemeMode } from "../state/useTheme";
import { History } from "./History";

const BACKUP_NUDGE_AFTER = 30 * 24 * 60 * 60 * 1000; // 30 วัน
const SNOOZE = 7 * 24 * 60 * 60 * 1000;

export function Home({
  themeMode,
  onCycleTheme,
}: {
  themeMode: ThemeMode;
  onCycleTheme: () => void;
}) {
  const { t, date: fmtDate } = useT();
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
    for (const tx of txs) {
      if (!tx.date.startsWith(mk)) continue;
      if (tx.type === "IN") income += tx.amount;
      else if (tx.type === "OUT") expense += tx.amount;
    }
    return { income, expense };
  }, [txs, mk]);

  const rules =
    useLiveQuery(() => db.recurring.where("active").equals(1).toArray(), []) ??
    [];
  const today = todayStr();
  const upcoming = useMemo(
    () =>
      rules
        .map((r) => ({ r, next: nextOccurrence(r, today) }))
        .sort((a, b) => a.next.localeCompare(b.next))
        .slice(0, 3),
    [rules, today],
  );

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

  const [editingTx, setEditingTx] = useState<Tx | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // เตือนสำรองข้อมูลเมื่อมีรายการพอสมควรและไม่ได้ export นานเกิน 30 วัน
  const lastExport = useLiveQuery(() => db.kv.get("lastExport"), []);
  const snooze = useLiveQuery(() => db.kv.get("backupSnooze"), []);
  const nowMs = Date.now();
  const showBackupNudge =
    txs.length >= 10 &&
    nowMs - ((lastExport?.value as number) ?? 0) > BACKUP_NUDGE_AFTER &&
    nowMs > ((snooze?.value as number) ?? 0);

  const ThemeIcon =
    themeMode === "dark" ? IconMoon : themeMode === "light" ? IconSun : IconAuto;
  const themeTitle =
    themeMode === "dark"
      ? t("theme_dark")
      : themeMode === "light"
        ? t("theme_light")
        : t("theme_auto");

  const txLabel = (tx: Tx): { icon: string; name: string } => {
    if (tx.type === "TRANSFER") {
      const to = tx.toPocketId != null ? pocketById.get(tx.toPocketId) : undefined;
      return { icon: "", name: t("home_transferTo", { name: to?.name ?? "?" }) };
    }
    if (tx.type === "INIT") return { icon: "", name: t("home_initBalance") };
    const c = tx.categoryId != null ? catById.get(tx.categoryId) : undefined;
    return { icon: c?.icon ?? "", name: c?.name ?? t("home_uncategorized") };
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
          aria-label={t("aria_themeSwitch")}
          title={themeTitle}
        >
          <ThemeIcon size={20} />
        </button>
      </header>

      {/* ยอดรวม — ตัวเลขคือ hero */}
      <section className="rise rise-1 flex flex-col items-center pb-10 pt-12">
        <p className="pb-2 text-sm text-sub">{t("home_allPockets")}</p>
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
          <span className="text-faint">{t("home_thisMonth")}</span>
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

      {/* รายการประจำที่จะถึง */}
      {upcoming.length > 0 && (
        <section className="rise rise-3 pb-7">
          <h2 className="pb-2 text-sm font-medium text-sub">
            {t("home_upcoming")}
          </h2>
          <ul className="space-y-1">
            {upcoming.map(({ r, next }) => {
              const cat =
                r.categoryId != null ? catById.get(r.categoryId) : undefined;
              return (
                <li key={r.id} className="flex items-center gap-3 px-2 py-1.5">
                  <IconRepeat size={14} className="shrink-0 text-faint" />
                  <span className="min-w-0 flex-1 truncate text-sm text-sub">
                    {r.note || cat?.name || t("rec_defaultName")}
                  </span>
                  <span className="text-xs text-faint">{fmtDate(next)}</span>
                  <span
                    className="tabular text-sm"
                    style={{
                      color:
                        r.type === "IN" ? "var(--income)" : "var(--expense)",
                    }}
                  >
                    {r.type === "IN" ? "+" : "−"}฿{fmt(r.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* รายการล่าสุด */}
      <section className="rise rise-4">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pb-10 pt-16 text-center">
            <EnsoRing progress={0.92} size={64} stroke={3} color="var(--line)" />
            <p className="text-sm text-sub">
              {t("home_noRecordsTitle")}
              <br />
              {t("home_noRecordsBody")}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between pb-3">
              <h2 className="text-sm font-medium text-sub">{t("home_latest")}</h2>
              <button
                onClick={() => setHistoryOpen(true)}
                className="pressable text-xs"
                style={{ color: "var(--accent)" }}
              >
                {t("viewAll")}
              </button>
            </div>
            <ul className="space-y-1">
              {recent.map((tx) => {
                const { icon, name } = txLabel(tx);
                const isIn = tx.type === "IN" || tx.type === "INIT";
                const isTransfer = tx.type === "TRANSFER";
                return (
                  <li key={tx.id}>
                    <button
                      onClick={() => setEditingTx(tx)}
                      className="pressable flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2 text-lg">
                        {isTransfer ? (
                          <IconSwap size={16} className="text-sub" />
                        ) : (
                          icon || "•"
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">
                          {name}
                        </span>
                        <span className="block text-xs text-faint">
                          {fmtDate(tx.date)}
                          {tx.note ? ` · ${tx.note}` : ""}
                        </span>
                      </span>
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
                        {isTransfer ? "" : isIn ? "+" : "−"}฿{fmt(tx.amount)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* เตือนสำรองข้อมูล */}
      {showBackupNudge && (
        <section
          className="rise mt-6 rounded-2xl p-4"
          style={{
            background: "color-mix(in srgb, var(--accent) 7%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
          }}
        >
          <p className="text-sm font-medium">{t("home_backupTitle")}</p>
          <p className="pt-1 text-xs text-sub">{t("home_backupBody")}</p>
          <div className="flex gap-2 pt-3">
            <button
              onClick={async () => {
                await downloadBackup(db);
                showToast(t("set_exported"));
              }}
              className="pressable rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              {t("home_backupNow")}
            </button>
            <button
              onClick={() =>
                db.kv.put({ key: "backupSnooze", value: Date.now() + SNOOZE })
              }
              className="pressable rounded-xl px-4 py-2 text-sm text-sub"
            >
              {t("home_later")}
            </button>
          </div>
        </section>
      )}

      {editingTx && (
        <TxEditor
          tx={editingTx}
          categories={categories}
          pockets={pockets}
          onClose={() => setEditingTx(null)}
        />
      )}
      {historyOpen && <History onClose={() => setHistoryOpen(false)} />}
    </div>
  );
}
