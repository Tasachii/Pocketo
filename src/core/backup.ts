import type { PocketoDB } from "../db/db";
import type { Category, Pocket, Tx } from "./types";

export interface BackupFile {
  app: "pocketo";
  schemaVersion: 1;
  exportedAt: string;
  pockets: Pocket[];
  categories: Category[];
  tx: Tx[];
}

export async function exportData(db: PocketoDB): Promise<BackupFile> {
  const [pockets, categories, tx] = await Promise.all([
    db.pockets.toArray(),
    db.categories.toArray(),
    db.tx.toArray(),
  ]);
  return {
    app: "pocketo",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    pockets,
    categories,
    tx,
  };
}

export function validateBackup(data: unknown): data is BackupFile {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    d.app === "pocketo" &&
    d.schemaVersion === 1 &&
    Array.isArray(d.pockets) &&
    Array.isArray(d.categories) &&
    Array.isArray(d.tx)
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
    [db.tx, db.pockets, db.categories, db.kv],
    async () => {
      await Promise.all([
        db.tx.clear(),
        db.pockets.clear(),
        db.categories.clear(),
      ]);
      await db.pockets.bulkAdd(data.pockets);
      await db.categories.bulkAdd(data.categories);
      await db.tx.bulkAdd(data.tx);
      await db.kv.put({ key: "seeded", value: 1 });
    },
  );
}
