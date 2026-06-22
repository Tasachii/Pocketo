// โลโก้ Pocketo — วงเอ็นโซ (円相) ฝีแปรงเปิดปลาย + เหรียญทองหยอดลงปากกระเป๋า
// รูปทรงตรงกับ scripts/brand-mark.mjs เป๊ะ (แหล่งความจริงของไอคอน PWA / OG / favicon)

// — พารามิเตอร์รูปทรง (sync กับ scripts/brand-mark.mjs) —
const CX = 50,
  CY = 53,
  R = 30,
  W = 5.7,
  GAP_DEG = -33,
  GAP_HALF = 20,
  COIN_DIST = 39,
  COIN_R = 6.6;

function buildEnsoPath(): string {
  const N = 240,
    exp = 0.5,
    wobble = 0.14,
    d2r = Math.PI / 180;
  const start = (GAP_DEG + GAP_HALF) * d2r;
  const sweep = (360 - GAP_HALF * 2) * d2r;
  const halfW = (t: number) =>
    W * Math.pow(Math.sin(Math.PI * t), exp) * (1 + wobble * Math.sin(2.7 * Math.PI * t + 0.6));
  const out: [number, number][] = [];
  const inn: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N,
      a = start + sweep * t,
      w = halfW(t),
      ca = Math.cos(a),
      sa = Math.sin(a);
    out.push([CX + (R + w) * ca, CY + (R + w) * sa]);
    inn.push([CX + (R - w) * ca, CY + (R - w) * sa]);
  }
  const f = (p: [number, number]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  let d = `M${f(out[0])}`;
  for (let i = 1; i < out.length; i++) d += `L${f(out[i])}`;
  for (let i = inn.length - 1; i >= 0; i--) d += `L${f(inn[i])}`;
  return d + "Z";
}

// คำนวณครั้งเดียวตอนโหลดโมดูล
const ENSO_D = buildEnsoPath();
const COIN = {
  x: CX + COIN_DIST * Math.cos((GAP_DEG * Math.PI) / 180),
  y: CY + COIN_DIST * Math.sin((GAP_DEG * Math.PI) / 180),
};

export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-hidden
    >
      <path d={ENSO_D} fill="var(--accent)" />
      <circle cx={COIN.x.toFixed(2)} cy={COIN.y.toFixed(2)} r={COIN_R} fill="var(--coin)" />
    </svg>
  );
}
