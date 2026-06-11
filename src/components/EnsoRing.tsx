import type { ReactNode } from "react";

/**
 * วงแหวนความคืบหน้าแบบวงหมึก — จงใจเปิดปลายไม่ครบวง (สูงสุด 92%)
 * ตามสุนทรียะวงที่วาดด้วยพู่กัน ครบเป้าคือ "เกือบสมบูรณ์" อย่างตั้งใจ
 */
export function EnsoRing({
  progress,
  size = 56,
  stroke = 5,
  color = "var(--accent)",
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const MAX = 0.92;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress)) * MAX;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={Math.max(1.5, stroke * 0.5)}
          strokeDasharray={`${c * MAX} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          strokeLinecap="round"
          className="enso-progress"
        />
      </svg>
      {children != null && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
