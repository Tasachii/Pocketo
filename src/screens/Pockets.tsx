import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { EnsoRing } from "../components/EnsoRing";
import { IconPlus, IconSwap } from "../components/Icons";
import { useT } from "../i18n";
import { confirmDialog } from "../components/Feedback";
import { Field, inputCls, Overlay } from "../components/Modal";
import { fmt, fmtBaht, parseAmount } from "../core/money";
import type { Pocket } from "../core/types";
import { calcBalances, todayStr, transfer } from "../db/data";
import { db } from "../db/db";

const POCKET_ICONS = ["💰", "🏦", "📈", "✈️", "🎓", "🏠", "🚗", "💍", "🎮", "🧧", "🌱", "🛡️"];

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

function PocketDialog({
  pocket,
  pockets,
  txCount,
  onClose,
}: {
  pocket: Pocket | null;
  pockets: Pocket[];
  txCount: (id: number) => number;
  onClose: () => void;
}) {
  const { t, name: tName } = useT();
  const [name, setName] = useState(pocket ? tName(pocket.name) : "");
  const [icon, setIcon] = useState(pocket?.icon ?? POCKET_ICONS[0]);
  const [goalStr, setGoalStr] = useState(
    pocket?.goal ? fmt(pocket.goal) : "",
  );
  const [allocStr, setAllocStr] = useState(
    pocket?.allocPercent ? String(pocket.allocPercent) : "",
  );
  const [initStr, setInitStr] = useState("");
  const [error, setError] = useState("");

  const isMain = pocket?.isMain === 1;

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError(t("pk_errName"));
    const goal = goalStr ? parseAmount(goalStr) : null;
    if (goalStr && goal === null) return setError(t("pk_errGoal"));
    const alloc = allocStr ? Number(allocStr) : 0;
    if (!Number.isFinite(alloc) || alloc < 0 || alloc > 100)
      return setError(t("pk_errPct"));
    const otherAlloc = pockets
      .filter((p) => p.id !== pocket?.id)
      .reduce((s, p) => s + (p.allocPercent ?? 0), 0);
    if (otherAlloc + alloc > 100)
      return setError(
        t("pk_errPctTotal", { other: otherAlloc }),
      );

    const fields = {
      name: trimmed,
      icon,
      goal: goal ?? undefined,
      allocPercent: isMain ? undefined : alloc || undefined,
    };
    if (pocket) {
      await db.pockets.update(pocket.id!, fields);
    } else {
      const id = await db.pockets.add({
        ...fields,
        isMain: 0,
        sortOrder: pockets.length,
      } as Pocket);
      const init = initStr ? parseAmount(initStr) : null;
      if (init && init > 0) {
        await db.tx.add({
          type: "INIT",
          amount: init,
          pocketId: id as number,
          date: todayStr(),
          createdAt: Date.now(),
        });
      }
    }
    onClose();
  };

  const remove = async () => {
    if (!pocket || isMain) return;
    if (txCount(pocket.id!) > 0) {
      setError(t("pk_errHasTx"));
      return;
    }
    if (
      await confirmDialog(t("pk_confirmDelete", { name: tName(pocket.name) }), {
        confirmLabel: t("delete"),
        danger: true,
      })
    ) {
      await db.pockets.delete(pocket.id!);
      onClose();
    }
  };

  return (
    <Overlay onClose={onClose}>
      <h2 className="pb-4 font-zen text-lg font-bold">
        {pocket ? t("pk_edit") : t("pk_new")}
      </h2>
      <div className="space-y-4">
        <Field label={t("pk_name")}>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("pk_namePlaceholder")}
          />
        </Field>
        <Field label={t("pk_icon")}>
          <div className="flex flex-wrap gap-1.5">
            {POCKET_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className="pressable flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={
                  icon === ic
                    ? {
                        background:
                          "color-mix(in srgb, var(--accent) 12%, transparent)",
                        outline: "1.5px solid var(--accent)",
                      }
                    : { background: "var(--surface)" }
                }
              >
                {ic}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("pk_goalBaht")}>
            <input
              className={inputCls}
              inputMode="decimal"
              value={goalStr}
              onChange={(e) => setGoalStr(e.target.value)}
              placeholder={t("optional")}
            />
          </Field>
          {!isMain && (
            <Field label={t("pk_splitPct")}>
              <input
                className={inputCls}
                inputMode="numeric"
                value={allocStr}
                onChange={(e) => setAllocStr(e.target.value)}
                placeholder="0"
              />
            </Field>
          )}
        </div>
        {!pocket && (
          <Field label={t("pk_initBaht")}>
            <input
              className={inputCls}
              inputMode="decimal"
              value={initStr}
              onChange={(e) => setInitStr(e.target.value)}
              placeholder={t("optional")}
            />
          </Field>
        )}
        {error && (
          <p className="text-sm" style={{ color: "var(--expense)" }}>
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-1">
          {pocket && !isMain && (
            <button
              onClick={remove}
              className="pressable rounded-2xl px-4 py-3 text-sm"
              style={{ color: "var(--expense)" }}
            >
              {t("delete")}
            </button>
          )}
          <button
            onClick={save}
            className="pressable flex-1 rounded-2xl py-3 font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            {t("save")}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function TransferDialog({
  pockets,
  balances,
  onClose,
}: {
  pockets: Pocket[];
  balances: Map<number, number>;
  onClose: () => void;
}) {
  const { t, name: tName } = useT();
  const [fromId, setFromId] = useState(pockets[0]?.id);
  const [toId, setToId] = useState(pockets[1]?.id);
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    const amount = parseAmount(amountStr);
    if (fromId == null || toId == null) return;
    if (fromId === toId) return setError(t("tf_errDiffer"));
    if (amount === null || amount <= 0) return setError(t("tf_errAmount"));
    if (amount > (balances.get(fromId) ?? 0))
      return setError(t("tf_errInsufficient"));
    await transfer(fromId, toId, amount, todayStr());
    onClose();
  };

  const selectCls = inputCls + " appearance-none";

  return (
    <Overlay onClose={onClose}>
      <h2 className="pb-4 font-zen text-lg font-bold">{t("tf_title")}</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("from")}>
            <select
              className={selectCls}
              value={fromId}
              onChange={(e) => setFromId(Number(e.target.value))}
            >
              {pockets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {tName(p.name)} ({fmt(balances.get(p.id!) ?? 0)})
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("to")}>
            <select
              className={selectCls}
              value={toId}
              onChange={(e) => setToId(Number(e.target.value))}
            >
              {pockets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {tName(p.name)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t("amountBaht")}>
          <input
            className={inputCls}
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </Field>
        {error && (
          <p className="text-sm" style={{ color: "var(--expense)" }}>
            {error}
          </p>
        )}
        <button
          onClick={submit}
          className="pressable w-full rounded-2xl py-3 font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          {t("tf_action")}
        </button>
      </div>
    </Overlay>
  );
}
