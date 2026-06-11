import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { confirmDialog, showToast } from "../components/Feedback";
import { Field, inputCls, Overlay } from "../components/Modal";
import { RecurringManager } from "../components/RecurringManager";
import { downloadBackup, importData } from "../core/backup";
import { fmt, fmtBaht, parseAmount } from "../core/money";
import type { Category, KakeiboGroup } from "../core/types";
import { KAKEIBO_LABEL } from "../core/types";
import { db } from "../db/db";
import type { ThemeMode } from "../state/useTheme";

export function Settings({
  mode,
  setMode,
}: {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}) {
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
    await downloadBackup(db);
    showToast("ส่งออกไฟล์ backup แล้ว");
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const ok = await confirmDialog("นำเข้าข้อมูลจากไฟล์?", {
        detail: "ข้อมูลทั้งหมดที่มีอยู่ตอนนี้จะถูกแทนที่ด้วยข้อมูลในไฟล์",
        confirmLabel: "นำเข้า",
        danger: true,
      });
      if (!ok) return;
      await importData(db, data);
      await db.kv.put({ key: "lastExport", value: Date.now() });
      showToast("นำเข้าข้อมูลเรียบร้อย");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ");
    }
  };

  const requestPersist = async () => {
    const ok = await navigator.storage?.persist?.();
    setStorage((s) => (s ? { ...s, persisted: !!ok } : s));
    setMsg(
      ok
        ? "เบราว์เซอร์รับคำขอเก็บข้อมูลถาวรแล้ว"
        : "เบราว์เซอร์ยังไม่อนุมัติ — ติดตั้งเป็นแอพช่วยได้",
    );
  };

  const clearAll = async () => {
    if (
      !(await confirmDialog("ลบข้อมูลทั้งหมดถาวร?", {
        detail: "ทุกรายการ กล่อง หมวด และรายการประจำจะหายไป",
        confirmLabel: "ลบทั้งหมด",
        danger: true,
      }))
    )
      return;
    if (
      !(await confirmDialog("ยืนยันอีกครั้ง", {
        detail: "กู้คืนไม่ได้ถ้าไม่มีไฟล์ backup",
        confirmLabel: "ยืนยันลบ",
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
        <h1 className="font-zen text-xl font-bold tracking-tight">ตั้งค่า</h1>
      </header>

      <Section title="ธีม" className="rise rise-1">
        <div className="flex rounded-2xl bg-surface2 p-1">
          {(
            [
              ["dark", "มืด"],
              ["light", "สว่าง"],
              ["auto", "ตามระบบ"],
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

      <Section title="ข้อมูล" className="rise rise-2">
        <div className="space-y-2">
          <button onClick={doExport} className="pressable w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm">
            ส่งออกข้อมูล (ไฟล์ JSON)
            <span className="block pt-0.5 text-xs text-faint">
              เก็บไว้เป็น backup หรือย้ายเครื่อง
            </span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="pressable w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm"
          >
            นำเข้าข้อมูลจากไฟล์ backup
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
            ขอพื้นที่เก็บข้อมูลถาวร
            <span className="block pt-0.5 text-xs text-faint">
              {storage?.persisted
                ? "✓ ได้รับอนุมัติแล้ว — ข้อมูลปลอดภัยจากการถูกล้างอัตโนมัติ"
                : "ลดโอกาสที่เบราว์เซอร์ล้างข้อมูลเมื่อไม่ได้เปิดนาน"}
            </span>
          </button>
          <button
            onClick={clearAll}
            className="pressable w-full rounded-2xl px-4 py-3 text-left text-sm"
            style={{ color: "var(--expense)" }}
          >
            ลบข้อมูลทั้งหมด
          </button>
          {msg && <p className="px-1 text-xs text-sub">{msg}</p>}
        </div>
      </Section>

      <Section title="รายการประจำ" className="rise rise-3">
        <p className="pb-3 text-xs text-faint">
          เงินเดือน ค่าเช่า subscription — สร้างให้อัตโนมัติทุกเดือนตามวันที่กำหนด
        </p>
        <RecurringManager />
      </Section>

      <Section title="หมวดหมู่" className="rise rise-3">
        <p className="pb-3 text-xs text-faint">
          แตะหมวดเพื่อแก้ไขหรือตั้งงบประมาณต่อเดือน
        </p>
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
                      งบ {fmtBaht(c.budget!)}
                    </span>
                  )}
                  <span className="text-xs text-faint">
                    {c.type === "income"
                      ? "รายรับ"
                      : KAKEIBO_LABEL[c.group ?? "extra"]}
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

      <Section title="เกี่ยวกับ" className="rise rise-4">
        <div className="rounded-2xl bg-surface p-4 text-sm leading-relaxed text-sub">
          <p className="pb-2 font-medium text-ink">
            Pocketo <span className="font-mincho text-faint">ポケット</span> · v0.1
          </p>
          <p>
            ข้อมูลทั้งหมดเก็บอยู่ในเครื่องของคุณเท่านั้น ไม่มีการส่งขึ้น
            server ใดๆ — แนะนำให้ส่งออกไฟล์ backup เก็บไว้สม่ำเสมอ
          </p>
          <p className="pt-3 text-xs text-faint">
            ติดตั้งเป็นแอพ: iPhone — Safari แตะปุ่มแชร์ → เพิ่มลงหน้าจอโฮม ·
            Android — Chrome แตะเมนู ⋮ → ติดตั้งแอพ
          </p>
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
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [group, setGroup] = useState<KakeiboGroup>(category.group ?? "wants");
  const [budgetStr, setBudgetStr] = useState(
    category.budget ? fmt(category.budget) : "",
  );
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) return setError("ตั้งชื่อหมวดก่อน");
    const budget = budgetStr ? parseAmount(budgetStr) : null;
    if (budgetStr && budget === null) return setError("งบประมาณต้องเป็นตัวเลข");
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
      setError("หมวดนี้มีรายการใช้อยู่ ลบไม่ได้");
      return;
    }
    if (
      await confirmDialog(`ลบหมวด "${category.name}"?`, {
        confirmLabel: "ลบ",
        danger: true,
      })
    ) {
      await db.categories.delete(category.id!);
      onClose();
    }
  };

  return (
    <Overlay onClose={onClose}>
      <h2 className="pb-4 font-zen text-lg font-bold">แก้ไขหมวด</h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className={`${inputCls} w-16 text-center`}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            aria-label="ไอคอน"
          />
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อหมวด"
          />
        </div>
        {category.type === "expense" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="เสา kakeibo">
              <select
                className={inputCls}
                value={group}
                onChange={(e) => setGroup(e.target.value as KakeiboGroup)}
              >
                {(Object.keys(KAKEIBO_LABEL) as KakeiboGroup[]).map((g) => (
                  <option key={g} value={g}>
                    {KAKEIBO_LABEL[g]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="งบต่อเดือน (บาท)">
              <input
                className={inputCls}
                inputMode="decimal"
                value={budgetStr}
                onChange={(e) => setBudgetStr(e.target.value)}
                placeholder="ไม่จำกัด"
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
            ลบ
          </button>
          <button
            onClick={save}
            className="pressable flex-1 rounded-2xl py-3 font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            บันทึก
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function CategoryManager() {
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
        + เพิ่มหมวดใหม่
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
          aria-label="ไอคอน"
        />
        <input
          className={`${inputCls} min-w-0 flex-1`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อหมวด"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <select
          className={inputCls}
          value={type}
          onChange={(e) => setType(e.target.value as "income" | "expense")}
        >
          <option value="expense">รายจ่าย</option>
          <option value="income">รายรับ</option>
        </select>
        {type === "expense" && (
          <select
            className={inputCls}
            value={group}
            onChange={(e) => setGroup(e.target.value as KakeiboGroup)}
          >
            {(Object.keys(KAKEIBO_LABEL) as KakeiboGroup[]).map((g) => (
              <option key={g} value={g}>
                {KAKEIBO_LABEL[g]}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={add}
          className="pressable ml-auto rounded-xl px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          เพิ่ม
        </button>
        <button
          onClick={() => setOpen(false)}
          className="pressable px-2 text-sm text-faint"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
