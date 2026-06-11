import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useT } from "../i18n";
import type { Dict } from "../i18n";
import { IconBack, IconSwap } from "../components/Icons";
import { TxEditor } from "../components/TxEditor";
import { fmt } from "../core/money";
import type { Tx } from "../core/types";
import { db } from "../db/db";

const FILTERS = [
  { id: "ALL", labelKey: "filter_all" },
  { id: "IN", labelKey: "filter_in" },
  { id: "OUT", labelKey: "filter_out" },
  { id: "TRANSFER", labelKey: "filter_transfer" },
] as const satisfies ReadonlyArray<{ id: string; labelKey: keyof Dict }>;
type FilterId = (typeof FILTERS)[number]["id"];

const PAGE = 100;

/** ประวัติรายการทั้งหมด: ค้นหา + กรองชนิด + แตะเพื่อแก้ไข */
export function History({ onClose }: { onClose: () => void }) {
  const { t, date: fmtDate, monthYear } = useT();
  const txs = useLiveQuery(() => db.tx.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const pockets = useLiveQuery(() => db.pockets.toArray(), []) ?? [];

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterId>("ALL");
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Tx | null>(null);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id!, c])),
    [categories],
  );
  const pocketById = useMemo(
    () => new Map(pockets.map((p) => [p.id!, p])),
    [pockets],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...txs]
      .sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
      )
      .filter((tx) => {
        if (filter === "IN" && tx.type !== "IN" && tx.type !== "INIT")
          return false;
        if (filter === "OUT" && tx.type !== "OUT") return false;
        if (filter === "TRANSFER" && tx.type !== "TRANSFER") return false;
        if (!needle) return true;
        const cat =
          tx.categoryId != null ? catById.get(tx.categoryId) : undefined;
        const hay = [
          tx.note ?? "",
          cat?.name ?? "",
          fmt(tx.amount),
          pocketById.get(tx.pocketId)?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
  }, [txs, q, filter, catById, pocketById]);

  const shown = filtered.slice(0, limit);

  // จัดกลุ่มตามเดือน
  const groups = useMemo(() => {
    const out: Array<{ label: string; rows: Tx[] }> = [];
    for (const tx of shown) {
      const label = monthYear(
        Number(tx.date.slice(0, 4)),
        Number(tx.date.slice(5, 7)) - 1,
      );
      const last = out[out.length - 1];
      if (last?.label === label) last.rows.push(tx);
      else out.push({ label, rows: [tx] });
    }
    return out;
  }, [shown, monthYear]);

  return (
    <div className="fade fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div
        className="mx-auto max-w-md px-5 pb-10"
        style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
      >
        <header className="sticky top-0 z-10 -mx-5 bg-bg/95 px-5 pb-3 pt-2 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="pressable -ml-2 p-2 text-sub"
              aria-label={t("back")}
            >
              <IconBack />
            </button>
            <h1 className="font-zen text-lg font-bold">{t("hist_title")}</h1>
            <span className="ml-auto text-xs text-faint">
              {t("hist_count", { n: filtered.length })}
            </span>
          </div>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder={t("hist_search")}
            className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
          />
          <div className="flex gap-1.5 pt-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setLimit(PAGE);
                }}
                className="pressable rounded-full border px-3 py-1 text-xs"
                style={
                  filter === f.id
                    ? {
                        borderColor: "var(--accent)",
                        color: "var(--accent)",
                        background:
                          "color-mix(in srgb, var(--accent) 8%, transparent)",
                      }
                    : { borderColor: "var(--line)", color: "var(--sub)" }
                }
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </header>

        {groups.length === 0 ? (
          <p className="pt-16 text-center text-sm text-sub">
            {t("hist_notFound")}
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="pt-4">
              <h2 className="pb-1 text-xs font-medium text-faint">{g.label}</h2>
              <ul>
                {g.rows.map((tx) => {
                  const cat =
                    tx.categoryId != null ? catById.get(tx.categoryId) : undefined;
                  const isIn = tx.type === "IN" || tx.type === "INIT";
                  const isTransfer = tx.type === "TRANSFER";
                  const name = isTransfer
                    ? t("home_transferTo", {
                        name:
                          tx.toPocketId != null
                            ? (pocketById.get(tx.toPocketId)?.name ?? "?")
                            : "?",
                      })
                    : tx.type === "INIT"
                      ? t("home_initBalance")
                      : (cat?.name ?? t("home_uncategorized"));
                  return (
                    <li key={tx.id}>
                      <button
                        onClick={() => setEditing(tx)}
                        data-testid="history-row"
                        className="pressable flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-base">
                          {isTransfer ? (
                            <IconSwap size={15} className="text-sub" />
                          ) : (
                            (cat?.icon ?? "•")
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
            </section>
          ))
        )}

        {filtered.length > limit && (
          <button
            onClick={() => setLimit((l) => l + PAGE)}
            className="pressable mt-4 w-full rounded-2xl bg-surface py-3 text-sm text-sub"
          >
            {t("hist_loadMore", { n: filtered.length - limit })}
          </button>
        )}
      </div>

      {editing && (
        <TxEditor
          tx={editing}
          categories={categories}
          pockets={pockets}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
