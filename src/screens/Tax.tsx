import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../i18n";
import type { Dict } from "../i18n";
import { fmt } from "../core/money";
import {
  calcThaiTax,
  savingIfDeductMore,
  TAX_YEAR_2568,
  type Deductions,
  type TaxNote,
} from "../core/tax";
import { db } from "../db/db";

interface FieldDef {
  key: keyof Deductions | "income" | "wht";
  labelKey: keyof Dict;
  hintKey?: keyof Dict;
}

const MAIN_FIELDS: FieldDef[] = [
  { key: "income", labelKey: "tax_income" },
  { key: "wht", labelKey: "tax_wht" },
];

const DEDUCTION_FIELDS: FieldDef[] = [
  { key: "socialSecurity", labelKey: "tax_f_ss", hintKey: "tax_h_ss" },
  { key: "lifeInsurance", labelKey: "tax_f_life", hintKey: "tax_h_life" },
  { key: "healthInsurance", labelKey: "tax_f_health", hintKey: "tax_h_health" },
  { key: "pvd", labelKey: "tax_f_pvd", hintKey: "tax_h_pvd" },
  { key: "ssf", labelKey: "tax_f_ssf", hintKey: "tax_h_ssf" },
  { key: "rmf", labelKey: "tax_f_rmf", hintKey: "tax_h_rmf" },
  { key: "tesg", labelKey: "tax_f_tesg", hintKey: "tax_h_tesg" },
  { key: "homeLoan", labelKey: "tax_f_home", hintKey: "tax_h_home" },
  { key: "donation", labelKey: "tax_f_donation", hintKey: "tax_h_donation" },
];

const FIELD_LABEL: Record<string, keyof Dict> = {
  ss: "tax_f_ss",
  life: "tax_f_life",
  health: "tax_f_health",
  ssf: "tax_f_ssf",
  rmf: "tax_f_rmf",
  pvd: "tax_f_pvd",
  tesg: "tax_f_tesg",
  home: "tax_f_home",
  donation: "tax_cap_donation",
};

const toNum = (s: string | undefined): number => {
  if (!s) return 0;
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function Tax() {
  const { t, year: toYear } = useT();
  const txs = useLiveQuery(() => db.tx.toArray(), []) ?? [];

  const years = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    for (const t of txs) ys.add(Number(t.date.slice(0, 4)));
    return [...ys].sort((a, b) => b - a);
  }, [txs]);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [form, setForm] = useState<Record<string, string>>({});
  const loaded = useRef(false);

  // โหลด/บันทึกฟอร์มของแต่ละปีไว้ใน kv
  useEffect(() => {
    // ถ้าผู้ใช้พิมพ์ก่อนที่ค่าที่เก็บไว้จะโหลดเสร็จ (เปิดหน้าแล้วพิมพ์ทันที)
    // ต้องไม่เอาค่าเก่ามาทับ — merge สิ่งที่พิมพ์ไว้ทับค่าที่เก็บ
    // แต่ตอนสลับปี (เคยโหลดปีอื่นเสร็จแล้ว) ให้แทนที่ทั้งฟอร์ม
    const switchingYear = loaded.current;
    loaded.current = false;
    let cancelled = false;
    void db.kv.get(`tax-${year}`).then((row) => {
      if (cancelled) return;
      const stored = (row?.value as Record<string, string>) ?? {};
      setForm((prev) => (switchingYear ? stored : { ...stored, ...prev }));
      loaded.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [year]);
  useEffect(() => {
    if (loaded.current) void db.kv.put({ key: `tax-${year}`, value: form });
  }, [form, year]);

  const pullIncome = () => {
    const sumSatang = txs
      .filter((t) => t.type === "IN" && t.date.startsWith(`${year}-`))
      .reduce((s, t) => s + t.amount, 0);
    setForm((f) => ({ ...f, income: String(sumSatang / 100) }));
  };

  const result = useMemo(
    () =>
      calcThaiTax({
        totalIncome: toNum(form.income),
        wht: toNum(form.wht),
        deductions: Object.fromEntries(
          DEDUCTION_FIELDS.map((d) => [d.key, toNum(form[d.key])]),
        ) as Deductions,
      }),
    [form],
  );

  const hasIncome = toNum(form.income) > 0;
  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const inputCls =
    "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] tabular";

  const fb = (n: number) => `฿${fmt(Math.round(n * 100))}`;

  const noteText = (n: TaxNote): string => {
    const max = n.max.toLocaleString();
    if (n.code === "lifeHealth") return t("tax_cap_lifeHealth", { max });
    if (n.code === "retire") return t("tax_cap_retire", { max });
    return t("tax_cap", { label: t(FIELD_LABEL[n.field] ?? "tax_f_ss"), max });
  };

  return (
    <div>
      <header className="rise flex items-center justify-between pt-2">
        <h1 className="font-zen text-xl font-bold tracking-tight">{t("nav_tax")}</h1>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label={t("tax_aria_year")}
          className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {t("tax_year", { year: toYear(y) })}
            </option>
          ))}
        </select>
      </header>

      <section className="rise rise-1 space-y-3 pt-6">
        {MAIN_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs text-sub">{t(f.labelKey)}</span>
            <input
              className={inputCls + " mt-1"}
              inputMode="decimal"
              value={form[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder="0"
            />
          </label>
        ))}
        <button
          onClick={pullIncome}
          className="pressable rounded-xl bg-surface2 px-4 py-2 text-sm text-sub"
        >
          {t("tax_pull", { year: toYear(year) })}
        </button>
      </section>

      <section className="rise rise-2 pt-7">
        <h2 className="pb-3 text-sm font-medium text-sub">{t("tax_deductions")}</h2>
        <div className="grid grid-cols-2 gap-3">
          {DEDUCTION_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs text-sub">{t(f.labelKey)}</span>
              <input
                className={inputCls + " mt-1"}
                inputMode="decimal"
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.hintKey ? t(f.hintKey) : "0"}
              />
            </label>
          ))}
        </div>
      </section>

      {hasIncome && (
        <section className="rise rise-3 pt-7">
          <div className="rounded-3xl bg-surface p-5">
            <div className="space-y-1.5 text-sm">
              <Row label={t("tax_expenseDeduction")} value={`−${fb(result.expenseDeduction)}`} />
              <Row label={t("tax_allowanceTotal", { personal: fmt(TAX_YEAR_2568.personalAllowance * 100) })} value={`−${fb(result.allowanceTotal)}`} />
              {result.donationApplied > 0 && (
                <Row label={t("tax_donationLine")} value={`−${fb(result.donationApplied)}`} />
              )}
              <Row label={t("tax_netIncome")} value={fb(result.taxableIncome)} strong />
            </div>

            {result.taxableIncome > 0 && (
              <div className="mt-4 space-y-1 border-t border-line pt-4">
                {result.byBracket
                  .filter((b) => b.taxed > 0)
                  .map((b) => (
                    <div
                      key={b.min}
                      className="flex justify-between text-xs text-sub"
                    >
                      <span>
                        {b.rate === 0
                          ? `0 – 150,000 · ${t("tax_exempt")}`
                          : `${(b.min + 1).toLocaleString()} – ${
                              b.max === Infinity ? t("tax_andUp") : b.max.toLocaleString()
                            } · ${Math.round(b.rate * 100)}%`}
                      </span>
                      <span className="tabular">{fb(b.tax)}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="mt-4 border-t border-line pt-4 text-center">
              {result.taxRefund > 0 ? (
                <>
                  <p className="text-sm text-sub">{t("tax_refund")}</p>
                  <p
                    className="tabular pt-1 font-zen text-3xl font-medium"
                    style={{ color: "var(--income)" }}
                  >
                    {fb(result.taxRefund)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-sub">
                    {toNum(form.wht) > 0 ? t("tax_payMore") : t("tax_pay")}
                  </p>
                  <p className="tabular pt-1 font-zen text-3xl font-medium">
                    {fb(result.finalTax)}
                  </p>
                </>
              )}
              <p className="pt-1 text-xs text-faint">
                {t("tax_totalLine", {
                  total: fb(result.totalTax),
                  rate: (result.effectiveRate * 100).toFixed(1),
                })}
              </p>
            </div>
          </div>

          {result.notes.length > 0 && (
            <ul className="space-y-1 pt-3 text-xs" style={{ color: "var(--warn)" }}>
              {result.notes.map((n, i) => (
                <li key={i}>• {noteText(n)}</li>
              ))}
            </ul>
          )}

          {result.taxableIncome > 150_000 && (
            <div className="pt-5">
              <h3 className="pb-2 text-sm font-medium text-sub">
                {t("tax_buyMore")}
              </h3>
              <div className="flex gap-2">
                {[10_000, 50_000, 100_000].map((x) => (
                  <div
                    key={x}
                    className="flex-1 rounded-2xl bg-surface p-3 text-center"
                  >
                    <p className="text-xs text-sub">+{x.toLocaleString()}</p>
                    <p
                      className="tabular pt-1 text-sm font-medium"
                      style={{ color: "var(--income)" }}
                    >
                      −{fb(savingIfDeductMore(result.taxableIncome, x))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="px-1 pb-4 pt-5 text-xs leading-relaxed text-faint">
            {t("tax_disclaimer")}
          </p>
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={strong ? "font-medium" : "text-sub"}>{label}</span>
      <span className={`tabular ${strong ? "font-medium" : "text-sub"}`}>
        {value}
      </span>
    </div>
  );
}
