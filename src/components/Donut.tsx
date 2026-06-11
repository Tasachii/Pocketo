export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  slices,
  size = 168,
  thickness = 24,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} className="-rotate-90">
      {total <= 0 ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={thickness}
        />
      ) : (
        slices.map((s, i) => {
          const frac = s.value / total;
          const offset = acc;
          acc += frac;
          // เว้นร่อง 2px ระหว่างชิ้น ให้หายใจแบบ Ma
          const len = Math.max(0, c * frac - 2);
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={-c * offset}
            />
          );
        })
      )}
    </svg>
  );
}

/** ชุดสีโทนญี่ปุ่นหม่นสำหรับกราฟ ใช้ได้ทั้งสองธีม */
export const CHART_COLORS = [
  "#bf4a3e", // 紅
  "#3e5c76", // 藍
  "#58855c", // 抹茶
  "#b9842f", // 山吹
  "#7c5ca8", // 菖蒲
  "#4e8e8a", // 青磁
  "#a85c7c", // 梅紫
  "#8a8a5c", // 鶯
];
