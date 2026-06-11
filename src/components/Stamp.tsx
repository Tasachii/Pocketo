/** ตราประทับสีชาด ปรากฏชั่วครู่เมื่อบันทึกสำเร็จ — แทน toast ธรรมดา */
export function Stamp({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="hanko-stamp hanko-leave flex h-28 w-28 items-center justify-center rounded-full border-[3.5px]"
        style={{
          borderColor: "var(--accent)",
          color: "var(--accent)",
          background:
            "color-mix(in srgb, var(--accent) 10%, var(--surface))",
          boxShadow: "0 4px 24px color-mix(in srgb, var(--accent) 25%, transparent)",
        }}
      >
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 12.5 10 18 19.5 7" />
        </svg>
      </div>
    </div>
  );
}
