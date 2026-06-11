import { fmt } from "./money";
import type { KakeiboGroup, Satang } from "./types";

export interface ShareCardData {
  monthLabel: string;
  income: Satang;
  expense: Satang;
  topCats: Array<{ icon: string; name: string; amount: Satang }>;
  groups: Record<KakeiboGroup, Satang>;
  /** ป้ายที่แปลแล้ว ส่งมาจาก UI (core ไม่ผูกกับ i18n) */
  labels: {
    balance: string;
    top: string;
    pillars: string;
    pillar: Record<KakeiboGroup, string>;
  };
}

// การ์ดแชร์ render เป็นธีมหมึกเสมอ — เอกลักษณ์แบรนด์ชัดบน social
const BG = "#131316";
const SURFACE = "#1c1c21";
const INK = "#eceae4";
const SUB = "#a6a39b";
const FAINT = "#6e6b64";
const LINE = "#2c2c33";
const ACCENT = "#e84b3c";
const INCOME = "#8fbf8f";
const EXPENSE = "#e07b6f";
const GROUP_COLORS: Record<KakeiboGroup, string> = {
  needs: "#93afc9",
  wants: "#e07b6f",
  culture: "#8fbf8f",
  extra: "#d9b35c",
};

const ZEN = '"Zen Kaku Gothic New", sans-serif';
const THAI = '"Anuphan", sans-serif';
const MINCHO = '"Shippori Mincho", serif';

/** วาดการ์ดสรุปเดือน 1080×1350 (4:5 สำหรับ social) แล้วคืนเป็น PNG */
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  await document.fonts.ready;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const M = 90; // margin

  // wordmark
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `700 56px ${ZEN}`;
  ctx.fillText("Pocketo", M, 140);
  const w = ctx.measureText("Pocketo").width;
  ctx.fillStyle = FAINT;
  ctx.font = `500 36px ${MINCHO}`;
  ctx.fillText("ポケット", M + w + 24, 140);

  ctx.fillStyle = SUB;
  ctx.font = `500 40px ${THAI}`;
  ctx.textAlign = "right";
  ctx.fillText(data.monthLabel, W - M, 140);
  ctx.textAlign = "left";

  // ยอดคงเหลือ — hero
  const net = data.income - data.expense;
  ctx.fillStyle = SUB;
  ctx.font = `400 38px ${THAI}`;
  ctx.fillText(data.labels.balance, M, 280);
  ctx.fillStyle = net >= 0 ? INK : EXPENSE;
  ctx.font = `500 130px ${ZEN}`;
  ctx.fillText(`฿${fmt(net)}`, M, 420);

  ctx.font = `500 44px ${ZEN}`;
  ctx.fillStyle = INCOME;
  ctx.fillText(`+฿${fmt(data.income)}`, M, 500);
  const incomeW = ctx.measureText(`+฿${fmt(data.income)}`).width;
  ctx.fillStyle = EXPENSE;
  ctx.fillText(`−฿${fmt(data.expense)}`, M + incomeW + 60, 500);

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, 570);
  ctx.lineTo(W - M, 570);
  ctx.stroke();

  // หมวดที่ใช้มากสุด
  let y = 660;
  if (data.topCats.length > 0) {
    ctx.fillStyle = SUB;
    ctx.font = `500 36px ${THAI}`;
    ctx.fillText(data.labels.top, M, y);
    y += 70;
    for (const c of data.topCats.slice(0, 4)) {
      ctx.font = `400 44px ${THAI}`;
      ctx.fillStyle = INK;
      ctx.fillText(`${c.icon}  ${c.name}`, M, y);
      ctx.textAlign = "right";
      ctx.fillStyle = SUB;
      ctx.font = `500 44px ${ZEN}`;
      ctx.fillText(`฿${fmt(c.amount)}`, W - M, y);
      ctx.textAlign = "left";
      y += 78;
    }
  }

  // สี่เสา kakeibo
  y = Math.max(y + 40, 1010);
  ctx.fillStyle = SUB;
  ctx.font = `500 36px ${THAI}`;
  ctx.fillText(data.labels.pillars, M, y);
  y += 56;
  const barW = W - M * 2 - 300;
  for (const g of Object.keys(data.groups) as KakeiboGroup[]) {
    const v = data.groups[g];
    const pct = data.expense > 0 ? v / data.expense : 0;
    ctx.fillStyle = INK;
    ctx.font = `400 34px ${THAI}`;
    ctx.fillText(data.labels.pillar[g], M, y);
    // ราง + แท่ง
    const bx = M + 220;
    ctx.fillStyle = SURFACE;
    roundRect(ctx, bx, y - 26, barW, 26, 13);
    if (pct > 0) {
      ctx.fillStyle = GROUP_COLORS[g];
      roundRect(ctx, bx, y - 26, Math.max(26, barW * pct), 26, 13);
    }
    ctx.fillStyle = SUB;
    ctx.font = `500 30px ${ZEN}`;
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(pct * 100)}%`, W - M, y);
    ctx.textAlign = "left";
    y += 64;
  }

  // footer: วงเปิดปลาย + url
  const fy = H - 80;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(M + 28, fy - 10, 28, -0.9, Math.PI * 2 - 1.7);
  ctx.stroke();
  ctx.fillStyle = FAINT;
  ctx.font = `400 32px ${ZEN}`;
  ctx.fillText("tasachii.github.io/pocketo", M + 90, fy);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("สร้างภาพไม่สำเร็จ"))),
      "image/png",
    ),
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
