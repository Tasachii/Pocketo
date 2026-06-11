import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconDelete } from "../components/Icons";
import { exportData, importData } from "../core/backup";
import type { KakeiboGroup } from "../core/types";
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

  useEffect(() => {
    void (async () => {
      if (!navigator.storage) return;
      const persisted = await navigator.storage.persisted?.();
      const est = await navigator.storage.estimate?.();
      setStorage({ persisted: !!persisted, usage: est?.usage });
    })();
  }, []);

  const doExport = async () => {
    const data = await exportData(db);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pocketo-backup-${new Date().toLocaleDateString("en-CA")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (
        !window.confirm(
          "นำเข้าจะแทนที่ข้อมูลทั้งหมดที่มีอยู่ตอนนี้ ดำเนินการต่อ?",
        )
      )
        return;
      await importData(db, data);
      setMsg("นำเข้าข้อมูลเรียบร้อย");
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
    if (!window.confirm("ลบข้อมูลทั้งหมดถาวร?")) return;
    if (!window.confirm("ยืนยันอีกครั้ง — กู้คืนไม่ได้ถ้าไม่มีไฟล์ backup")) return;
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

      <Section title="หมวดหมู่" className="rise rise-3">
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
              <li key={c.id} className="flex items-center gap-3 px-1 py-1.5 text-sm">
                <span>{c.icon}</span>
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-faint">
                  {c.type === "income"
                    ? "รายรับ"
                    : KAKEIBO_LABEL[c.group ?? "extra"]}
                </span>
                <button
                  onClick={async () => {
                    if (txs.some((t) => t.categoryId === c.id)) {
                      setMsg(`"${c.name}" มีรายการใช้อยู่ ลบไม่ได้`);
                      return;
                    }
                    if (window.confirm(`ลบหมวด "${c.name}"?`))
                      await db.categories.delete(c.id!);
                  }}
                  className="pressable p-1 text-faint"
                  aria-label={`ลบหมวด ${c.name}`}
                >
                  <IconDelete size={15} />
                </button>
              </li>
            ))}
        </ul>
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
