import { describe, expect, it } from "vitest";
import type { BackupFile } from "./backup";
import { decryptBackup, encryptBackup, isEncryptedBackup } from "./crypto";

const sample: BackupFile = {
  app: "pocketo",
  schemaVersion: 2,
  exportedAt: "2026-06-11T00:00:00.000Z",
  pockets: [{ name: "ใช้จ่าย", icon: "👛", isMain: 1, sortOrder: 0 }],
  categories: [{ name: "อาหาร", icon: "🍜", type: "expense", sortOrder: 0 }],
  tx: [
    {
      type: "OUT",
      amount: 32_050,
      pocketId: 1,
      categoryId: 1,
      note: "ราเมง",
      date: "2026-06-02",
      createdAt: 1,
    },
  ],
  recurring: [],
};

describe("encrypted backup", () => {
  it("เข้ารหัสแล้วถอดกลับได้ข้อมูลเดิมเป๊ะ", async () => {
    const enc = await encryptBackup(sample, "s3cret-pass");
    expect(isEncryptedBackup(enc)).toBe(true);
    expect(enc.data).not.toContain("ราเมง"); // ciphertext ต้องไม่มี plaintext
    const back = await decryptBackup(enc, "s3cret-pass");
    expect(back).toEqual(sample);
  });

  it("รหัสผ่านผิด → โยน error (AES-GCM ตรวจ integrity)", async () => {
    const enc = await encryptBackup(sample, "correct");
    await expect(decryptBackup(enc, "wrong")).rejects.toThrow();
  });

  it("salt/iv สุ่มใหม่ทุกครั้ง → ciphertext ต่างกันแม้ข้อมูลเดิม", async () => {
    const a = await encryptBackup(sample, "pw");
    const b = await encryptBackup(sample, "pw");
    expect(a.data).not.toBe(b.data);
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
  });

  it("รหัสผ่านว่าง → ปฏิเสธ", async () => {
    await expect(encryptBackup(sample, "")).rejects.toThrow();
  });

  it("isEncryptedBackup แยกไฟล์ธรรมดาออกจากไฟล์เข้ารหัส", () => {
    expect(isEncryptedBackup(sample)).toBe(false);
    expect(isEncryptedBackup({ app: "pocketo", encrypted: true, data: "x" })).toBe(true);
  });
});
