import { useState } from "react";
import { useT } from "../../i18n";
import type { KakeiboGroup } from "../../core/types";
import { db } from "../../db/db";

const KAKEIBO_GROUPS: KakeiboGroup[] = ["needs", "wants", "culture", "extra"];

export function CategoryManager() {
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
