// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Pocket } from "../core/types";

// guard เงินไม่พอ (Pockets.tsx:337-338) อยู่ใน UI เท่านั้น — เทสต์ผ่าน TransferDialog
// mock transfer ของชั้น data เพื่อตรวจว่า "ถูกเรียก/ไม่ถูกเรียก" โดยไม่แตะ DB จริง
const transferMock = vi.fn(async () => {});
vi.mock("../db/data", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../db/data")>();
  return { ...mod, transfer: transferMock, todayStr: () => "2026-06-15" };
});

const { TransferDialog } = await import("./pockets/TransferDialog");

const pockets: Pocket[] = [
  { id: 1, name: "ใช้จ่าย", icon: "👛", isMain: 1, sortOrder: 0 },
  { id: 2, name: "ออม", icon: "💰", isMain: 0, sortOrder: 1 },
];
// กล่อง 1 มี 100 บาท (10000 สตางค์), กล่อง 2 มี 0
const balances = new Map<number, number>([
  [1, 10_000],
  [2, 0],
]);

const onClose = vi.fn();

function renderDialog() {
  return render(
    <TransferDialog pockets={pockets} balances={balances} onClose={onClose} />,
  );
}

beforeEach(() => {
  transferMock.mockClear();
  onClose.mockClear();
});
afterEach(cleanup);

const amountInput = () => screen.getByPlaceholderText("0") as HTMLInputElement;
const submitBtn = () => screen.getByRole("button", { name: "โอน" });

describe("TransferDialog (insufficient-funds guard อยู่ที่ UI)", () => {
  it("from เท่ากับ to → error tf_errDiffer, ไม่เรียก transfer", () => {
    renderDialog();
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "1" } }); // to = 1
    fireEvent.change(amountInput(), { target: { value: "50" } });
    fireEvent.click(submitBtn());
    expect(screen.getByText("ต้นทางและปลายทางต้องต่างกัน")).toBeInTheDocument();
    expect(transferMock).not.toHaveBeenCalled();
  });

  it("amount <= 0 / parse ไม่ได้ → error tf_errAmount", () => {
    renderDialog();
    fireEvent.change(amountInput(), { target: { value: "abc" } });
    fireEvent.click(submitBtn());
    expect(screen.getByText("ใส่จำนวนเงินให้ถูกต้อง")).toBeInTheDocument();
    expect(transferMock).not.toHaveBeenCalled();
  });

  it("amount > ยอดต้นทาง → error tf_errInsufficient, ไม่เรียก transfer", () => {
    renderDialog();
    fireEvent.change(amountInput(), { target: { value: "200" } }); // 200 บาท > 100
    fireEvent.click(submitBtn());
    expect(screen.getByText("ยอดในกล่องต้นทางไม่พอ")).toBeInTheDocument();
    expect(transferMock).not.toHaveBeenCalled();
  });

  it("valid → เรียก transfer(from,to,amount,today) และ onClose", async () => {
    renderDialog();
    fireEvent.change(amountInput(), { target: { value: "50" } }); // 50 บาท = 5000 สตางค์
    fireEvent.click(submitBtn());
    expect(transferMock).toHaveBeenCalledWith(1, 2, 5_000, "2026-06-15");
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
