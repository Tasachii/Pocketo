import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { setLang, useT } from "../i18n";
import { confirmDialog, promptDialog, showToast } from "../components/Feedback";
import { Field, inputCls, Overlay } from "../components/Modal";
import { RecurringManager } from "../components/RecurringManager";
import { downloadBackup, importData } from "../core/backup";
import { decryptBackup, isEncryptedBackup } from "../core/crypto";
import { fmt, fmtBaht, parseAmount } from "../core/money";
import type { Category, KakeiboGroup } from "../core/types";
import { db } from "../db/db";
import type { ThemeMode } from "../state/useTheme";

const KAKEIBO_GROUPS: KakeiboGroup[] = ["needs", "wants", "culture", "extra"];

export function Settings({
  mode,
  setMode,
}: {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}) {
  const { t, lang } = useT();
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const txs = useLiveQuery(() => db.tx.toArray(), []) ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<{
    persisted: boolean;
    usage?: number;
  } | null>(null);
  const [msg, setMsg] = useState("");
  const [catEditing, setCatEditing] = useState<Category | null>(null);

  useEffect(() => {
    void (async () => {
      if (!navigator.storage) return;
      const persisted = await navigator.storage.persisted?.();
      const est = await navigator.storage.estimate?.();
      setStorage({ persisted: !!persisted, usage: est?.usage });
    })();
  }, []);

  const doExport = async () => {
    const wantEncrypt = await confirmDialog(t("set_encryptQ"), {
      detail:
        t("set_encryptDesc"),
      confirmLabel: t("set_setPasswordBtn"),
    });
    let passphrase: string | undefined;
    if (wantEncrypt) {
      const pw = await promptDialog(t("set_setPassword"), {
        password: true,
        placeholder: t("set_passwordPlaceholder"),
        confirmLabel: t("set_encryptSave"),
      });
      if (pw == null) return; // ยกเลิก
      if (pw.length < 4) {
        setMsg(t("set_pwTooShort"));
        return;
      }
      passphrase = pw;
    }
    await downloadBackup(db, passphrase);
    showToast(t("set_exported"));
  };

  const doImport = async (file: File) => {
    try {
      let data: unknown = JSON.parse(await file.text());
      if (isEncryptedBackup(data)) {
        const pw = await promptDialog(t("set_fileEncrypted"), {
          detail: t("set_enterPassword"),
          password: true,
          placeholder: t("set_passwordPlaceholder"),
          confirmLabel: t("set_unlock"),
        });
        if (pw == null) return;
        data = await decryptBackup(data, pw); // โยน error ถ้ารหัสผิด
      }
      const ok = await confirmDialog(t("set_importQ"), {
        detail: t("set_importDesc"),
        confirmLabel: t("set_importBtn"),
        danger: true,
      });
      if (!ok) return;
      await importData(db, data);
      await db.kv.put({ key: "lastExport", value: Date.now() });
      showToast(t("set_importDone"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("set_importFail"));
    }
  };

  const requestPersist = async () => {
    const ok = await navigator.storage?.persist?.();
    setStorage((s) => (s ? { ...s, persisted: !!ok } : s));
    setMsg(
      ok
        ? t("set_persistOk")
        : t("set_persistNo"),
    );
  };

  const clearAll = async () => {
    if (
      !(await confirmDialog(t("set_clearQ"), {
        detail: t("set_clearDesc"),
        confirmLabel: t("set_clearBtn"),
        danger: true,
      }))
    )
      return;
    if (
      !(await confirmDialog(t("set_clearAgain"), {
        detail: t("set_clearAgainDesc"),
        confirmLabel: t("set_clearAgainBtn"),
        danger: true,
      }))
    )
      return;
    await db.delete();
    location.reload();
  };

  return (
    <div className="space-y-8">
      <header className="rise pt-2">
        <h1 className="font-zen text-xl font-bold tracking-tight">{t("nav_settings")}</h1>
      </header>

      <Section title={t("set_theme")} className="rise rise-1">
        <div className="flex rounded-2xl bg-surface2 p-1">
          {(
            [
              ["dark", t("theme_dark")],
              ["light", t("theme_light")],
              ["auto", t("theme_auto")],
            ] as Array<[ThemeMode, string]>
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="pressable flex-1 rounded-xl py-2 text-sm font-medium"
              style={
                mode === m
                  ? {
                      background: "var(--surface)",
                      boxShadow: "0 1px 4px rgb(0 0 0 / 0.12)",
                    }
                  : { color: "var(--faint)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("set_language")} className="rise rise-1">
        <div className="flex rounded-2xl bg-surface2 p-1">
          {(["th", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="pressable flex-1 rounded-xl py-2 text-sm font-medium"
              style={
                lang === l
                  ? {
                      background: "var(--surface)",
                      boxShadow: "0 1px 4px rgb(0 0 0 / 0.12)",
                    }
                  : { color: "var(--faint)" }
              }
            >
              {l === "th" ? t("lang_th") : t("lang_en")}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("set_data")} className="rise rise-2">
        <div className="space-y-2">
          <button onClick={doExport} className="pressable w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm">
            {t("set_export")}
            <span className="block pt-0.5 text-xs text-faint">
              {t("set_exportDesc")}
            </span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="pressable w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm"
          >
            {t("set_import")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={requestPersist}
            className="pressable w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm"
          >
            {t("set_persist")}
            <span className="block pt-0.5 text-xs text-faint">
              {storage?.persisted
                ? t("set_persistGranted")
                : t("set_persistDesc")}
            </span>
          </button>
          <button
            onClick={clearAll}
            className="pressable w-full rounded-2xl px-4 py-3 text-left text-sm"
            style={{ color: "var(--expense)" }}
          >
            {t("set_clear")}
          </button>
          {msg && <p className="px-1 text-xs text-sub">{msg}</p>}
        </div>
      </Section>

      <Section title={t("set_recurring")} className="rise rise-3">
        <p className="pb-3 text-xs text-faint">{t("set_recurringDesc")}</p>
        <RecurringManager />
      </Section>

      <Section title={t("set_categories")} className="rise rise-3">
        <p className="pb-3 text-xs text-faint">{t("set_categoriesHint")}</p>
        <CategoryManager />
        <ul className="space-y-1 pt-3">
          {categories
            .sort((a, b) =>
              a.type === b.type
                ? a.sortOrder - b.sortOrder
                : a.type === "income"
                  ? -1
                  : 1,
            )
            .map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setCatEditing(c)}
                  className="pressable flex w-full items-center gap-3 px-1 py-1.5 text-left text-sm"
                >
                  <span>{c.icon}</span>
                  <span className="flex-1">{c.name}</span>
                  {(c.budget ?? 0) > 0 && (
                    <span className="tabular text-xs text-sub">
                      {t("set_budgetTag", { amount: fmtBaht(c.budget!) })}
                    </span>
                  )}
                  <span className="text-xs text-faint">
                    {c.type === "income"
                      ? t("qa_income")
                      : t(`kakeibo_${c.group ?? "extra"}`)}
                  </span>
                </button>
              </li>
            ))}
        </ul>
        {catEditing && (
          <CategoryDialog
            category={catEditing}
            inUse={txs.some((t) => t.categoryId === catEditing.id)}
            onClose={() => setCatEditing(null)}
          />
        )}
      </Section>

      <Section title={t("set_about")} className="rise rise-4">
        <div className="rounded-2xl bg-surface p-4 text-sm leading-relaxed text-sub">
          <p className="pb-2 font-medium text-ink">
            Pocketo <span className="font-mincho text-faint">ポケット</span> · v0.1
          </p>
          <p>{t("set_aboutBody")}</p>
          <p className="pt-3 text-xs text-faint">{t("set_installHint")}</p>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <h2 className="pb-3 text-sm font-medium text-sub">{title}</h2>
      {children}
    </section>
  );
}

function CategoryDialog({
  category,
  inUse,
  onClose,
}: {
  category: Category;
  inUse: boolean;
  onClose: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [group, setGroup] = useState<KakeiboGroup>(category.group ?? "wants");
  const [budgetStr, setBudgetStr] = useState(
    category.budget ? fmt(category.budget) : "",
  );
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) return setError(t("cat_errName"));
    const budget = budgetStr ? parseAmount(budgetStr) : null;
    if (budgetStr && budget === null) return setError(t("cat_errBudget"));
    await db.categories.update(category.id!, {
      name: name.trim(),
      icon: icon.trim() || "🏷️",
      group: category.type === "expense" ? group : undefined,
      budget: budget && budget > 0 ? budget : undefined,
    });
    onClose();
  };

  const remove = async () => {
    if (inUse) {
      setError(t("cat_inUse"));
      return;
    }
    if (
      await confirmDialog(t("cat_confirmDelete", { name: category.name }), {
        confirmLabel: t("delete"),
        danger: true,
      })
    ) {
      await db.categories.delete(category.id!);
      onClose();
    }
  };

  return (
    <Overlay onClose={onClose}>
      <h2 className="pb-4 font-zen text-lg font-bold">{t("cat_edit")}</h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className={`${inputCls} w-16 text-center`}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            aria-label={t("pk_icon")}
          />
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("cat_namePlaceholder")}
          />
        </div>
        {category.type === "expense" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("cat_pillar")}>
              <select
                className={inputCls}
                value={group}
                onChange={(e) => setGroup(e.target.value as KakeiboGroup)}
              >
                {KAKEIBO_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {t(`kakeibo_${g}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("cat_budget")}>
              <input
                className={inputCls}
                inputMode="decimal"
                value={budgetStr}
                onChange={(e) => setBudgetStr(e.target.value)}
                placeholder={t("cat_unlimited")}
              />
            </Field>
          </div>
        )}
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
            {t("delete")}
          </button>
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

function CategoryManager() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏷️");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [group, setGroup] = useState<KakeiboGroup>("wants");

  const add = async () => {
    if (!name.trim()) return;
    const count = await db.categories.where("type").equals(type).count();
    await db.categories.add({
      name: name.trim(),
      icon: icon.trim() || "🏷️",
      type,
      group: type === "expense" ? group : undefined,
      sortOrder: count,
    });
    setName("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="pressable rounded-xl bg-surface2 px-4 py-2 text-sm text-sub"
      >
        {t("cat_addNew")}
      </button>
    );
  }

  const inputCls =
    "rounded-xl border border-line bg-surface px-3 py-2 text-sm";
  return (
    <div className="space-y-2 rounded-2xl bg-surface p-3">
      <div className="flex gap-2">
        <input
          className={`${inputCls} w-14 text-center`}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          aria-label={t("pk_icon")}
        />
        <input
          className={`${inputCls} min-w-0 flex-1`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("cat_namePlaceholder")}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <select
          className={inputCls}
          value={type}
          onChange={(e) => setType(e.target.value as "income" | "expense")}
        >
          <option value="expense">{t("qa_expense")}</option>
          <option value="income">{t("qa_income")}</option>
        </select>
        {type === "expense" && (
          <select
            className={inputCls}
            value={group}
            onChange={(e) => setGroup(e.target.value as KakeiboGroup)}
          >
            {KAKEIBO_GROUPS.map((g) => (
              <option key={g} value={g}>
                {t(`kakeibo_${g}`)}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={add}
          className="pressable ml-auto rounded-xl px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          {t("cat_add")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="pressable px-2 text-sm text-faint"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
