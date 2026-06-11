import type { PocketoDB } from "../db/db";
import type { Category, Pocket, Recurring, Tx } from "./types";

export interface BackupFile {
  app: "pocketo";
  /** v1 = ไม่มี recurring, v2 = มี recurring — import รองรับทั้งคู่ */
  schemaVersion: 1 | 2;
  exportedAt: string;
  pockets: Pocket[];
  categories: Category[];
  tx: Tx[];
  recurring?: Recurring[];
}

export async function exportData(db: PocketoDB): Promise<BackupFile> {
  const [pockets, categories, tx, recurring] = await Promise.all([
    db.pockets.toArray(),
    db.categories.toArray(),
    db.tx.toArray(),
    db.recurring.toArray(),
  ]);
  return {
    app: "pocketo",
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    pockets,
    categories,
    tx,
    recurring,
  };
}

/** ดาวน์โหลดไฟล์ backup และจดเวลาส่งออกล่าสุด (ใช้โดยปุ่มตั้งค่าและ banner เตือน) */
export async function downloadBackup(db: PocketoDB): Promise<void> {
  const data = await exportData(db);
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pocketo-backup-${new Date().toLocaleDateString("en-CA")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  await db.kv.put({ key: "lastExport", value: Date.now() });
}

export function validateBackup(data: unknown): data is BackupFile {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    d.app === "pocketo" &&
    (d.schemaVersion === 1 || d.schemaVersion === 2) &&
    Array.isArray(d.pockets) &&
    Array.isArray(d.categories) &&
    Array.isArray(d.tx) &&
    (d.recurring === undefined || Array.isArray(d.recurring))
  );
}

/** แทนที่ข้อมูลทั้งหมดด้วย backup (atomic — ล้มเหลวคือ rollback ทั้งก้อน) */
export async function importData(
  db: PocketoDB,
  data: unknown,
): Promise<void> {
  if (!validateBackup(data)) {
    throw new Error("ไฟล์ไม่ใช่ backup ของ Pocketo หรือเวอร์ชันไม่ตรง");
  }
  await db.transaction(
    "rw",
    [db.tx, db.pockets, db.categories, db.recurring, db.kv],
    async () => {
      await Promise.all([
        db.tx.clear(),
        db.pockets.clear(),
        db.categories.clear(),
        db.recurring.clear(),
      ]);
      await db.pockets.bulkAdd(data.pockets);
      await db.categories.bulkAdd(data.categories);
      await db.tx.bulkAdd(data.tx);
      if (data.recurring?.length) await db.recurring.bulkAdd(data.recurring);
      await db.kv.put({ key: "seeded", value: 1 });
    },
  );
}
