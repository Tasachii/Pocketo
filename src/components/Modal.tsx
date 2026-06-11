import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px]";

export function Overlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fade fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="sheet max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg p-5 sm:rounded-3xl"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-sub">{label}</span>
      <div className="pt-1">{children}</div>
    </label>
  );
}
