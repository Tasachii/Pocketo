import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { exportData, importData, validateBackup } from "./backup";
import { PocketoDB, seedIfEmpty } from "../db/db";

let db: PocketoDB;
let n = 0;

beforeEach(() => {
  db = new PocketoDB(`test-${++n}`);
});

describe("backup round-trip", () => {
  it("export → import กลับมาได้ข้อมูลครบทุกรายการ", async () => {
    await seedIfEmpty(db);
    const main = await db.pockets.toCollection().first();
    await db.tx.bulkAdd([
      {
        type: "IN",
        amount: 3_800_000,
        pocketId: main!.id!,
        categoryId: 1,
        date: "2026-06-01",
        createdAt: 1,
      },
      {
        type: "OUT",
        amount: 32_050,
        pocketId: main!.id!,
        categoryId: 5,
        note: "ราเมง",
        date: "2026-06-02",
        createdAt: 2,
      },
    ]);

    const backup = await exportData(db);
    expect(validateBackup(backup)).toBe(true);
    expect(backup.tx).toHaveLength(2);

    // import ลง DB ใหม่ (จำลองย้ายเครื่อง)
    const db2 = new PocketoDB(`test-import-${n}`);
    await importData(db2, JSON.parse(JSON.stringify(backup)));
    expect(await db2.tx.count()).toBe(2);
    expect(await db2.categories.count()).toBe(backup.categories.length);
    const restored = await db2.tx.where("date").equals("2026-06-02").first();
    expect(restored?.note).toBe("ราเมง");
    expect(restored?.amount).toBe(32_050);
  });

  it("import ทับของเดิม: ข้อมูลเก่าหายหมด เหลือเฉพาะใน backup", async () => {
    await seedIfEmpty(db);
    const backup = await exportData(db);
    await db.tx.add({
      type: "OUT",
      amount: 100,
      pocketId: 1,
      date: "2026-06-03",
      createdAt: 3,
    });
    await importData(db, backup);
    expect(await db.tx.count()).toBe(0);
  });

  it("ไฟล์แปลกปลอม → โยน error และข้อมูลเดิมไม่หาย", async () => {
    await seedIfEmpty(db);
    const before = await db.categories.count();
    await expect(importData(db, { foo: "bar" })).rejects.toThrow();
    expect(await db.categories.count()).toBe(before);
  });

  it("recurring ไป-กลับครบ และไฟล์ v1 เก่า (ไม่มี recurring) นำเข้าได้", async () => {
    await seedIfEmpty(db);
    await db.recurring.add({
      type: "IN",
      amount: 3_800_000,
      pocketId: 1,
      categoryId: 1,
      note: "เงินเดือน",
      day: 25,
      since: "2026-06-01",
      active: 1,
      createdAt: 1,
    });
    const backup = await exportData(db);
    expect(backup.schemaVersion).toBe(2);
    expect(backup.recurring).toHaveLength(1);

    const db2 = new PocketoDB(`test-rec-${n}`);
    await importData(db2, JSON.parse(JSON.stringify(backup)));
    expect(await db2.recurring.count()).toBe(1);

    // ไฟล์ v1 จากแอพเวอร์ชันก่อน — ไม่มี field recurring
    const v1 = { ...backup, schemaVersion: 1 as const };
    delete (v1 as Partial<typeof v1>).recurring;
    const db3 = new PocketoDB(`test-v1-${n}`);
    await importData(db3, JSON.parse(JSON.stringify(v1)));
    expect(await db3.tx.count()).toBe(0);
    expect(await db3.recurring.count()).toBe(0);
    expect(await db3.categories.count()).toBe(backup.categories.length);
  });

  it("seedIfEmpty ไม่ seed ซ้ำหลังผู้ใช้ลบหมวด", async () => {
    await seedIfEmpty(db);
    await db.categories.clear();
    await seedIfEmpty(db);
    expect(await db.categories.count()).toBe(0);
  });
});
