import { describe, expect, it } from "vitest";
import { clampedDate, dueDates, nextOccurrence } from "./recurring";

describe("clampedDate", () => {
  it("เดือนปกติ", () => {
    expect(clampedDate(2026, 5, 15)).toBe("2026-06-15");
    expect(clampedDate(2026, 0, 31)).toBe("2026-01-31");
  });
  it("วันที่ 31 ในเดือนสั้น เลื่อนเป็นวันสุดท้าย", () => {
    expect(clampedDate(2026, 3, 31)).toBe("2026-04-30");
    expect(clampedDate(2026, 1, 31)).toBe("2026-02-28");
  });
  it("ปีอธิกสุรทิน ก.พ. มี 29 วัน", () => {
    expect(clampedDate(2028, 1, 31)).toBe("2028-02-29");
    expect(clampedDate(2028, 1, 29)).toBe("2028-02-29");
  });
});

describe("dueDates", () => {
  it("กฎใหม่ ยังไม่ถึงวันกำหนด → ว่าง", () => {
    expect(dueDates({ day: 25, since: "2026-06-10" }, "2026-06-20")).toEqual([]);
  });

  it("กฎใหม่ ถึงวันกำหนดเดือนนี้พอดี → ได้ 1 วัน", () => {
    expect(dueDates({ day: 15, since: "2026-06-10" }, "2026-06-15")).toEqual([
      "2026-06-15",
    ]);
  });

  it("ไม่สร้างย้อนหลังก่อนวันสร้างกฎ", () => {
    // สร้างกฎวันที่ 20 มิ.ย. ตั้งทุกวันที่ 10 → 10 มิ.ย. ต้องไม่ถูกสร้าง
    expect(dueDates({ day: 10, since: "2026-06-20" }, "2026-07-15")).toEqual([
      "2026-07-10",
    ]);
  });

  it("วันสร้างกฎตรงวันกำหนดพอดี → นับวันนั้นด้วย (inclusive)", () => {
    expect(dueDates({ day: 10, since: "2026-06-10" }, "2026-06-10")).toEqual([
      "2026-06-10",
    ]);
  });

  it("ตามเก็บย้อนหลังหลายเดือนถ้าไม่ได้เปิดแอพ", () => {
    expect(
      dueDates(
        { day: 1, since: "2026-01-15", lastPosted: "2026-02-01" },
        "2026-06-11",
      ),
    ).toEqual(["2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"]);
  });

  it("lastPosted เป็น exclusive — ไม่สร้างวันเดิมซ้ำ", () => {
    expect(
      dueDates(
        { day: 11, since: "2026-05-01", lastPosted: "2026-06-11" },
        "2026-06-11",
      ),
    ).toEqual([]);
  });

  it("วันที่ 31 ข้ามเดือนสั้น: เลื่อนตามเดือนและไม่ซ้ำ", () => {
    expect(
      dueDates(
        { day: 31, since: "2026-01-31", lastPosted: "2026-01-31" },
        "2026-04-30",
      ),
    ).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("ข้ามปี: ธ.ค. → ม.ค.", () => {
    expect(
      dueDates(
        { day: 5, since: "2026-11-01", lastPosted: "2026-12-05" },
        "2027-01-10",
      ),
    ).toEqual(["2027-01-05"]);
  });
});

describe("nextOccurrence", () => {
  it("วันกำหนดยังไม่ถึงในเดือนนี้", () => {
    expect(nextOccurrence({ day: 25, since: "2026-01-01" }, "2026-06-11")).toBe(
      "2026-06-25",
    );
  });
  it("วันกำหนดผ่านไปแล้ว → เดือนหน้า", () => {
    expect(nextOccurrence({ day: 5, since: "2026-01-01" }, "2026-06-11")).toBe(
      "2026-07-05",
    );
  });
  it("วันนี้ตรงวันกำหนด → ครั้งถัดไปคือเดือนหน้า", () => {
    expect(nextOccurrence({ day: 11, since: "2026-01-01" }, "2026-06-11")).toBe(
      "2026-07-11",
    );
  });
  it("ข้ามปี", () => {
    expect(nextOccurrence({ day: 10, since: "2026-01-01" }, "2026-12-20")).toBe(
      "2027-01-10",
    );
  });
});
