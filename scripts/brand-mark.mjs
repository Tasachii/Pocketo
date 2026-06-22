// แหล่งความจริงเดียวของโลโก้ Pocketo — วงเอ็นโซ (円相) ฝีแปรงเปิดปลาย + เหรียญทองหยอดลงปากกระเป๋า
// ใช้ร่วมกันโดย gen-icons.mjs และ gen-og.mjs (ฝั่งแอป React มีพอร์ตชุดเดียวกันใน src/brand/Mark.tsx)

// พารามิเตอร์รูปทรง — ต้องตรงกับ src/brand/Mark.tsx เป๊ะ
export const MARK = {
  cx: 50,
  cy: 53,
  R: 30, // รัศมีเส้นกึ่งกลางวง
  W: 5.7, // ครึ่งความหนาสูงสุดของฝีแปรง
  gapDeg: -33, // ทิศปากกระเป๋า (ขวาบน)
  gapHalf: 20, // ครึ่งมุมช่องเปิด (องศา)
  coinDist: 39, // ระยะเหรียญจากจุดศูนย์กลาง (R + 9)
  coinR: 6.6,
};

// วงเอ็นโซเป็น path ทึบที่ปลายเรียวทั้งสองข้าง (ให้ความรู้สึกฝีแปรง)
export function ensoPath(m = MARK) {
  const { cx, cy, R, W, gapDeg, gapHalf } = m;
  const N = 240,
    exp = 0.5,
    wobble = 0.14,
    d2r = Math.PI / 180;
  const start = (gapDeg + gapHalf) * d2r;
  const sweep = (360 - gapHalf * 2) * d2r;
  const halfW = (t) =>
    W * Math.pow(Math.sin(Math.PI * t), exp) * (1 + wobble * Math.sin(2.7 * Math.PI * t + 0.6));
  const out = [],
    inn = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N,
      a = start + sweep * t,
      w = halfW(t),
      ca = Math.cos(a),
      sa = Math.sin(a);
    out.push([cx + (R + w) * ca, cy + (R + w) * sa]);
    inn.push([cx + (R - w) * ca, cy + (R - w) * sa]);
  }
  const f = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  let d = `M${f(out[0])}`;
  for (let i = 1; i < out.length; i++) d += `L${f(out[i])}`;
  for (let i = inn.length - 1; i >= 0; i--) d += `L${f(inn[i])}`;
  return d + "Z";
}

// ตำแหน่งเหรียญ (ลอยอยู่นอกปากกระเป๋าเล็กน้อย เหมือนกำลังหยอดลง)
export function coinPos(m = MARK) {
  const a = m.gapDeg * (Math.PI / 180);
  return { x: m.cx + m.coinDist * Math.cos(a), y: m.cy + m.coinDist * Math.sin(a), r: m.coinR };
}

// markup ภายใน <svg> (ไม่รวม <svg> เอง) — รับสีวงและสีเหรียญ
export function markInner(ring, coin) {
  const c = coinPos();
  return (
    `<path d="${ensoPath()}" fill="${ring}"/>` +
    `<circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="${c.r}" fill="${coin}"/>`
  );
}

// <svg> เต็มใบ
export function markSvg(ring, coin, size = 100) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">` +
    markInner(ring, coin) +
    `</svg>`
  );
}
