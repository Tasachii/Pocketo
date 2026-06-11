import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PocketoDB, seedIfEmpty } from "./db";

let testDb: PocketoDB;
vi.mock("./db", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./db")>();
  return {
    ...mod,
    get db() {
      return testDb;
    },
  };
});

const { deleteTxCascade, restoreTxs, saveQuickTx, updateTx } = await import(
  "./data"
);

let n = 0;
let mainId: number;
let savingsId: number;

beforeEach(async () => {
  testDb = new PocketoDB(`edit-test-${++n}`);
  await seedIfEmpty(testDb);
  mainId = (await testDb.pockets.toArray()).find((p) => p.isMain)!.id!;
  savingsId = (await testDb.pockets.add({
    name: "ออม",
    icon: "💰",
    isMain: 0,
    allocPercent: 20,
    sortOrder: 1,
  })) as number;
});

describe("deleteTxCascade + restore", () => {
  it("ลบรายรับ → รายการแบ่งอัตโนมัติถูกลบตาม และ undo กู้กลับครบ", async () => {
    await saveQuickTx({
      type: "IN",
      amount: 1_000_000,
      pocketId: mainId,
      date: "2026-06-01",
    });
    expect(await testDb.tx.count()).toBe(2); // IN + TRANSFER 20%

    const parent = (await testDb.tx.toArray()).find((t) => t.type === "IN")!;
    const removed = await deleteTxCascade(parent.id!);
    expect(removed).toHaveLength(2);
    expect(await testDb.tx.count()).toBe(0);

    await restoreTxs(removed);
    expect(await testDb.tx.count()).toBe(2);
    const restored = (await testDb.tx.toArray()).find(
      (t) => t.type === "TRANSFER",
    )!;
    expect(restored.parentId).toBe(parent.id);
  });

  it("ลบรายจ่ายธรรมดา → ลบแค่ตัวเดียว", async () => {
    await saveQuickTx({
      type: "OUT",
      amount: 5_000,
      pocketId: mainId,
      date: "2026-06-02",
    });
    const t = (await testDb.tx.toArray())[0];
    expect(await deleteTxCascade(t.id!)).toHaveLength(1);
  });
});

describe("updateTx", () => {
  it("แก้ยอดรายรับที่ถูกแบ่งแล้ว → การแบ่งถูกคำนวณใหม่", async () => {
    await saveQuickTx({
      type: "IN",
      amount: 1_000_000,
      pocketId: mainId,
      date: "2026-06-01",
    });
    const parent = (await testDb.tx.toArray()).find((t) => t.type === "IN")!;

    await updateTx(parent.id!, { amount: 2_000_000 });
    const txs = await testDb.tx.toArray();
    expect(txs).toHaveLength(2);
    const tf = txs.find((t) => t.type === "TRANSFER")!;
    expect(tf.amount).toBe(400_000); // 20% ของยอดใหม่
    expect(tf.toPocketId).toBe(savingsId);
    expect(tf.parentId).toBe(parent.id);
  });

  it("แก้แค่โน้ต → การแบ่งเดิมไม่ถูกแตะ", async () => {
    await saveQuickTx({
      type: "IN",
      amount: 1_000_000,
      pocketId: mainId,
      date: "2026-06-01",
    });
    const parent = (await testDb.tx.toArray()).find((t) => t.type === "IN")!;
    const tfBefore = (await testDb.tx.toArray()).find(
      (t) => t.type === "TRANSFER",
    )!;

    await updateTx(parent.id!, { note: "โบนัสพิเศษ" });
    const tfAfter = (await testDb.tx.toArray()).find(
      (t) => t.type === "TRANSFER",
    )!;
    expect(tfAfter.id).toBe(tfBefore.id);
    expect((await testDb.tx.get(parent.id!))!.note).toBe("โบนัสพิเศษ");
  });

  it("แก้วันที่ → การแบ่งใหม่ใช้วันที่เดียวกัน", async () => {
    await saveQuickTx({
      type: "IN",
      amount: 1_000_000,
      pocketId: mainId,
      date: "2026-06-01",
    });
    const parent = (await testDb.tx.toArray()).find((t) => t.type === "IN")!;
    await updateTx(parent.id!, { date: "2026-06-05" });
    const tf = (await testDb.tx.toArray()).find((t) => t.type === "TRANSFER")!;
    expect(tf.date).toBe("2026-06-05");
  });
});
