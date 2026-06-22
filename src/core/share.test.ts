// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KakeiboGroup } from "./types";
import { renderShareCard, type ShareCardData } from "./share";

// stub canvas 2D context: บันทึกการเรียกแทนการวาดจริง (ไม่ assert พิกเซล)
interface CtxCall {
  fn: string;
  args: unknown[];
  fillStyle?: string;
}

function makeCtx() {
  const calls: CtxCall[] = [];
  const ctx: Record<string, unknown> = {
    fillStyle: "",
    strokeStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
    lineWidth: 0,
    lineCap: "",
  };
  const record =
    (fn: string) =>
    (...args: unknown[]) => {
      calls.push({ fn, args, fillStyle: ctx.fillStyle as string });
    };
  for (const fn of [
    "fillRect",
    "fillText",
    "strokeRect",
    "beginPath",
    "moveTo",
    "lineTo",
    "stroke",
    "arc",
    "roundRect",
    "fill",
  ]) {
    ctx[fn] = record(fn);
  }
  ctx.measureText = (s: string) => ({ width: String(s).length * 10 });
  return { ctx, calls };
}

const groups: Record<KakeiboGroup, number> = {
  needs: 0,
  wants: 0,
  culture: 0,
  extra: 0,
};

function baseData(over: Partial<ShareCardData> = {}): ShareCardData {
  return {
    monthLabel: "มิถุนายน 2569",
    income: 5_000_000,
    expense: 3_000_000,
    topCats: [],
    groups: { ...groups },
    labels: {
      balance: "ยอดคงเหลือ",
      top: "หมวดที่ใช้มากสุด",
      pillars: "สี่เสา",
      pillar: { needs: "จำเป็น", wants: "อยากได้", culture: "วัฒนธรรม", extra: "พิเศษ" },
    },
    ...over,
  };
}

let calls: CtxCall[];
let toBlobImpl: (cb: (b: Blob | null) => void) => void;

beforeEach(() => {
  const made = makeCtx();
  calls = made.calls;
  // ทุกการ์ดใช้ canvas เดียวกัน — getContext คืน spy ctx
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    made.ctx as unknown as CanvasRenderingContext2D,
  );
  toBlobImpl = (cb) => cb(new Blob(["x"], { type: "image/png" }));
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    function (this: HTMLCanvasElement, cb: BlobCallback) {
      toBlobImpl(cb);
    } as HTMLCanvasElement["toBlob"],
  );
  // document.fonts.ready อาจไม่มีใน jsdom
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const texts = () =>
  calls.filter((c) => c.fn === "fillText").map((c) => String(c.args[0]));

describe("renderShareCard", () => {
  it("happy path → resolve เป็น Blob", async () => {
    const blob = await renderShareCard(baseData());
    expect(blob).toBeInstanceOf(Blob);
  });

  it("toBlob คืน null → reject 'สร้างภาพไม่สำเร็จ'", async () => {
    toBlobImpl = (cb) => cb(null);
    await expect(renderShareCard(baseData())).rejects.toThrow("สร้างภาพไม่สำเร็จ");
  });

  it("net >= 0 ใช้สี INK สำหรับ hero", async () => {
    await renderShareCard(baseData({ income: 5_000_000, expense: 1_000_000 }));
    const hero = calls.find(
      (c) => c.fn === "fillText" && String(c.args[0]).startsWith("฿"),
    );
    expect(hero?.fillStyle).toBe("#eceae4"); // INK
  });

  it("net < 0 ใช้สี EXPENSE สำหรับ hero", async () => {
    await renderShareCard(baseData({ income: 1_000_000, expense: 5_000_000 }));
    const hero = calls.find(
      (c) => c.fn === "fillText" && String(c.args[0]).startsWith("฿−"),
    );
    expect(hero?.fillStyle).toBe("#e07b6f"); // EXPENSE
  });

  it("topCats ว่าง → ไม่วาด section หมวด (ข้าม label top)", async () => {
    await renderShareCard(baseData({ topCats: [] }));
    expect(texts()).not.toContain("หมวดที่ใช้มากสุด");
  });

  it("topCats เกิน 4 → วาดแค่ 4 อันแรก", async () => {
    const topCats = [
      { icon: "🍜", name: "A", amount: 100 },
      { icon: "🚆", name: "B", amount: 90 },
      { icon: "☕", name: "C", amount: 80 },
      { icon: "🛍️", name: "D", amount: 70 },
      { icon: "🎬", name: "E", amount: 60 },
    ];
    await renderShareCard(baseData({ topCats }));
    const drawn = texts();
    expect(drawn.some((s) => s.includes("A"))).toBe(true);
    expect(drawn.some((s) => s.includes("D"))).toBe(true);
    expect(drawn.some((s) => s.includes("E"))).toBe(false); // ตัวที่ 5 ไม่ถูกวาด
  });

  it("expense === 0 → ทุกเสาแสดง 0% และไม่มีแท่ง", async () => {
    await renderShareCard(
      baseData({ expense: 0, income: 0, groups: { needs: 0, wants: 0, culture: 0, extra: 0 } }),
    );
    const pctLabels = texts().filter((s) => s.endsWith("%"));
    expect(pctLabels.length).toBeGreaterThan(0);
    expect(pctLabels.every((s) => s === "0%")).toBe(true);
  });

  it("% ของเสา ปัดด้วย Math.round(pct*100)", async () => {
    // expense 1000, needs 333 → 33.3% → 33%
    await renderShareCard(
      baseData({
        expense: 1000,
        income: 1000,
        groups: { needs: 333, wants: 0, culture: 0, extra: 0 },
      }),
    );
    expect(texts()).toContain("33%");
  });

  it("roundRect delegate ไปที่ ctx.roundRect", async () => {
    await renderShareCard(baseData());
    expect(calls.some((c) => c.fn === "roundRect")).toBe(true);
  });
});
