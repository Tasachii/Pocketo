import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { EnsoRing } from "../components/EnsoRing";
import { IconPlus, IconSwap } from "../components/Icons";
import { useT } from "../i18n";
import { fmtBaht } from "../core/money";
import type { Pocket } from "../core/types";
import { calcBalances } from "../db/data";
import { db } from "../db/db";
import { PocketDialog } from "./pockets/PocketDialog";
import { TransferDialog } from "./pockets/TransferDialog";

export function Pockets() {
  const { t, name: tName } = useT();
  const pockets =
    useLiveQuery(() => db.pockets.orderBy("sortOrder").toArray(), []) ?? [];
  const txs = useLiveQuery(() => db.tx.toArray(), []) ?? [];
  const balances = useMemo(() => calcBalances(pockets, txs), [pockets, txs]);

  const [editing, setEditing] = useState<Pocket | "new" | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const allocTotal = pockets.reduce((s, p) => s + (p.allocPercent ?? 0), 0);

  return (
    <div>
      <header className="rise flex items-center justify-between pt-2">
        <h1 className="font-zen text-xl font-bold tracking-tight">{t("nav_pockets")}</h1>
        <div className="flex gap-1">
          {pockets.length > 1 && (
            <button
              onClick={() => setTransferOpen(true)}
              className="pressable p-2 text-sub"
              aria-label={t("pk_aria_transfer")}
            >
              <IconSwap size={20} />
            </button>
          )}
          <button
            onClick={() => setEditing("new")}
            className="pressable p-2 text-sub"
            aria-label={t("pk_aria_add")}
          >
            <IconPlus size={20} />
          </button>
        </div>
      </header>

      {allocTotal > 0 && (
        <p className="rise rise-1 pt-3 text-xs text-sub">
          {t("pk_autoSplitNote", { pct: allocTotal, rest: 100 - allocTotal })}
        </p>
      )}

      <section className="rise rise-2 space-y-3 pt-5">
        {pockets.map((p) => {
          const bal = balances.get(p.id!) ?? 0;
          const progress = p.goal ? bal / p.goal : 0;
          return (
            <button
              key={p.id}
              onClick={() => setEditing(p)}
              className="pressable flex w-full items-center gap-4 rounded-3xl bg-surface p-4 text-left"
            >
              <EnsoRing
                progress={p.goal ? progress : 0}
                size={56}
                stroke={4.5}
                color={p.goal ? "var(--accent)" : "var(--line)"}
              >
                <span className="text-xl">{p.icon}</span>
              </EnsoRing>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{tName(p.name)}</p>
                  {p.isMain === 1 && (
                    <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] text-sub">
                      {t("pk_main")}
                    </span>
                  )}
                  {(p.allocPercent ?? 0) > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px]"
                      style={{
                        color: "var(--accent)",
                        background:
                          "color-mix(in srgb, var(--accent) 10%, transparent)",
                      }}
                    >
                      {t("pk_auto", { pct: p.allocPercent ?? 0 })}
                    </span>
                  )}
                </div>
                <p className="tabular pt-0.5 font-zen text-lg font-medium">
                  {fmtBaht(bal)}
                </p>
                {p.goal != null && p.goal > 0 && (
                  <p className="text-xs text-faint">
                    {t("pk_goalLine", {
                      amount: fmtBaht(p.goal),
                      pct: Math.min(100, Math.round((bal / p.goal) * 100)),
                    })}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </section>

      {editing !== null && (
        <PocketDialog
          pocket={editing === "new" ? null : editing}
          pockets={pockets}
          txCount={(id) =>
            txs.filter((t) => t.pocketId === id || t.toPocketId === id).length
          }
          onClose={() => setEditing(null)}
        />
      )}
      {transferOpen && (
        <TransferDialog
          pockets={pockets}
          balances={balances}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </div>
  );
}
