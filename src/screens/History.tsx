import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { IconBack, IconSwap } from "../components/Icons";
import { TxEditor } from "../components/TxEditor";
import { fmt } from "../core/money";
import type { Tx } from "../core/types";
import { fmtThaiDate, THAI_MONTHS } from "../db/data";
import { db } from "../db/db";

const FILTERS = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "IN", label: "รายรับ" },
  { id: "OUT", label: "รายจ่าย" },
  { id: "TRANSFER", label: "โอน" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const PAGE = 100;

/** ประวัติรายการทั้งหมด: ค้นหา + กรองชนิด + แตะเพื่อแก้ไข */
export function History({ onClose }: { onClose: () => void }) {
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
      .filter((t) => {
        if (filter === "IN" && t.type !== "IN" && t.type !== "INIT")
          return false;
        if (filter === "OUT" && t.type !== "OUT") return false;
        if (filter === "TRANSFER" && t.type !== "TRANSFER") return false;
        if (!needle) return true;
        const cat = t.categoryId != null ? catById.get(t.categoryId) : undefined;
        const hay = [
          t.note ?? "",
          cat?.name ?? "",
          fmt(t.amount),
          pocketById.get(t.pocketId)?.name ?? "",
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
    for (const t of shown) {
      const label = `${THAI_MONTHS[Number(t.date.slice(5, 7)) - 1]} ${
        Number(t.date.slice(0, 4)) + 543
      }`;
      const last = out[out.length - 1];
      if (last?.label === label) last.rows.push(t);
      else out.push({ label, rows: [t] });
    }
    return out;
  }, [shown]);

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
              aria-label="กลับ"
            >
              <IconBack />
            </button>
            <h1 className="font-zen text-lg font-bold">รายการทั้งหมด</h1>
            <span className="ml-auto text-xs text-faint">
              {filtered.length} รายการ
            </span>
          </div>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="ค้นหา: หมวด โน้ต จำนวนเงิน กล่อง"
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
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {groups.length === 0 ? (
          <p className="pt-16 text-center text-sm text-sub">ไม่พบรายการ</p>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="pt-4">
              <h2 className="pb-1 text-xs font-medium text-faint">{g.label}</h2>
              <ul>
                {g.rows.map((t) => {
                  const cat =
                    t.categoryId != null ? catById.get(t.categoryId) : undefined;
                  const isIn = t.type === "IN" || t.type === "INIT";
                  const isTransfer = t.type === "TRANSFER";
                  const name = isTransfer
                    ? `โอนไป ${
                        t.toPocketId != null
                          ? (pocketById.get(t.toPocketId)?.name ?? "?")
                          : "?"
                      }`
                    : t.type === "INIT"
                      ? "ยอดตั้งต้น"
                      : (cat?.name ?? "ไม่ระบุหมวด");
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setEditing(t)}
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
                            {fmtThaiDate(t.date)}
                            {t.note ? ` · ${t.note}` : ""}
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
                          {isTransfer ? "" : isIn ? "+" : "−"}฿{fmt(t.amount)}
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
            โหลดเพิ่ม ({filtered.length - limit} รายการ)
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
