import { useEffect, useRef, useState } from "react";
import { fmt } from "../core/money";

/** ตัวเลขหมุนนับนุ่มๆ ตอนค่าเปลี่ยน — first impression ของหน้าแรก */
export function NumberTicker({
  value,
  prefix = "฿",
  className = "",
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const start = performance.now();
    const duration = 650;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={`tabular ${className}`}>
      {prefix}
      {fmt(display)}
    </span>
  );
}
