import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { setLang, useT } from "../i18n";
import { RecurringManager } from "../components/RecurringManager";
import { fmtBaht } from "../core/money";
import type { Category } from "../core/types";
import { db } from "../db/db";
import type { ThemeMode } from "../state/useTheme";
import { CategoryDialog } from "./settings/CategoryDialog";
import { CategoryManager } from "./settings/CategoryManager";
import { DataSection } from "./settings/DataSection";
import { Section } from "./settings/Section";

export function Settings({
  mode,
  setMode,
}: {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}) {
  const { t, name: tName, lang } = useT();
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const txs = useLiveQuery(() => db.tx.toArray(), []) ?? [];
  const [catEditing, setCatEditing] = useState<Category | null>(null);

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

      <DataSection />

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
                  <span className="flex-1">{tName(c.name)}</span>
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
