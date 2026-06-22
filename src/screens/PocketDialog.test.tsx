// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Pocket } from "../core/types";
import { PocketoDB, seedIfEmpty } from "../db/db";

// PocketDialog เขียน db.pockets / db.tx ตรง ๆ → mock instance db ด้วย getter pattern
let testDb: PocketoDB;
vi.mock("../db/db", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../db/db")>();
  return {
    ...mod,
    get db() {
      return testDb;
    },
  };
});

const { PocketDialog } = await import("./pockets/PocketDialog");

const onClose = vi.fn();
let n = 0;
let existing: Pocket[];

beforeEach(async () => {
  testDb = new PocketoDB(`pocketdialog-${++n}`);
  await seedIfEmpty(testDb);
  existing = await testDb.pockets.toArray();
  onClose.mockClear();
});
afterEach(cleanup);

function renderNew(pockets: Pocket[] = existing) {
  return render(
    <PocketDialog pocket={null} pockets={pockets} txCount={() => 0} onClose={onClose} />,
  );
}

const nameInput = () => screen.getByPlaceholderText("เช่น ออมฉุกเฉิน") as HTMLInputElement;
const saveBtn = () => screen.getByRole("button", { name: "บันทึก" });

describe("PocketDialog — validation alloc-total", () => {
  it("ชื่อว่าง → pk_errName, ไม่เพิ่มกล่อง", async () => {
    renderNew();
    fireEvent.click(saveBtn());
    expect(screen.getByText("ตั้งชื่อกล่องก่อน")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(await testDb.pockets.count()).toBe(existing.length);
  });

  it("alloc > 100 → pk_errPct", () => {
    renderNew();
    fireEvent.change(nameInput(), { target: { value: "ลงทุน" } });
    fireEvent.change(screen.getByLabelText("แบ่งจากรายรับ (%)"), {
      target: { value: "150" },
    });
    fireEvent.click(saveBtn());
    expect(screen.getByText("เปอร์เซ็นต์ต้องอยู่ระหว่าง 0–100")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("otherAlloc + alloc > 100 → pk_errPctTotal", async () => {
    // กล่องอื่น (ไม่ใช่ main) ถือ 80% อยู่แล้ว → ใส่อีก 30% รวมเกิน
    const withAlloc: Pocket[] = [
      ...existing,
      { id: 999, name: "ออม", icon: "💰", isMain: 0, allocPercent: 80, sortOrder: 5 },
    ];
    renderNew(withAlloc);
    fireEvent.change(nameInput(), { target: { value: "ลงทุน" } });
    fireEvent.change(screen.getByLabelText("แบ่งจากรายรับ (%)"), {
      target: { value: "30" },
    });
    fireEvent.click(saveBtn());
    expect(
      screen.getByText("แบ่งอัตโนมัติรวมทุกกล่องเกิน 100% (ตอนนี้กล่องอื่นรวม 80%)"),
    ).toBeInTheDocument();
  });

  it("กล่องใหม่ + ยอดตั้งต้น → เขียน INIT tx", async () => {
    renderNew();
    fireEvent.change(nameInput(), { target: { value: "ออมฉุกเฉิน" } });
    fireEvent.change(screen.getByLabelText("ยอดตั้งต้น (บาท)"), {
      target: { value: "1000" },
    });
    fireEvent.click(saveBtn());
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    const inits = (await testDb.tx.toArray()).filter((t) => t.type === "INIT");
    expect(inits).toHaveLength(1);
    expect(inits[0].amount).toBe(100_000); // 1,000 บาท = 100,000 สตางค์
  });
});

describe("PocketDialog — กล่องหลัก", () => {
  it("main: ซ่อนช่องแบ่ง % (allocPercent ถูกบังคับ undefined)", () => {
    const main = existing.find((p) => p.isMain)!;
    render(
      <PocketDialog pocket={main} pockets={existing} txCount={() => 0} onClose={onClose} />,
    );
    expect(screen.queryByLabelText("แบ่งจากรายรับ (%)")).not.toBeInTheDocument();
  });
});
