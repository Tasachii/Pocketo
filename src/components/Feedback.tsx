import { useSyncExternalStore } from "react";

/**
 * confirm dialog + undo toast แบบ global — แทน window.confirm ของระบบ
 * ใช้ store เล็กๆ ในโมดูล ไม่ต้องลาก state ผ่านทุกชั้น
 */

interface ConfirmReq {
  message: string;
  detail?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

let confirmReq: ConfirmReq | null = null;
let toasts: Toast[] = [];
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version += 1;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function confirmDialog(
  message: string,
  opts?: { detail?: string; confirmLabel?: string; danger?: boolean },
): Promise<boolean> {
  return new Promise((resolve) => {
    confirmReq = { message, ...opts, resolve };
    emit();
  });
}

let toastSeq = 0;
export function showToast(message: string, undo?: () => void): void {
  const t: Toast = { id: ++toastSeq, message, undo };
  toasts = [...toasts, t];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x !== t);
    emit();
  }, 5000);
}

export function Feedback() {
  useSyncExternalStore(subscribe, () => version);

  const close = (ok: boolean) => {
    const r = confirmReq;
    confirmReq = null;
    emit();
    r?.resolve(ok);
  };

  const dismissToast = (t: Toast, undo: boolean) => {
    toasts = toasts.filter((x) => x !== t);
    emit();
    if (undo) t.undo?.();
  };

  return (
    <>
      {confirmReq && (
        <div
          className="fade fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-8"
          onClick={() => close(false)}
        >
          <div
            className="sheet w-full max-w-xs rounded-3xl bg-bg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium">{confirmReq.message}</p>
            {confirmReq.detail && (
              <p className="pt-2 text-sm text-sub">{confirmReq.detail}</p>
            )}
            <div className="flex gap-3 pt-5">
              <button
                onClick={() => close(false)}
                className="pressable flex-1 rounded-2xl bg-surface2 py-2.5 text-sm font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => close(true)}
                className="pressable flex-1 rounded-2xl py-2.5 text-sm font-semibold text-white"
                style={{
                  background: confirmReq.danger
                    ? "var(--expense)"
                    : "var(--accent)",
                }}
              >
                {confirmReq.confirmLabel ?? "ตกลง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 z-[75] flex flex-col items-center gap-2 px-5"
          style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="fade pointer-events-auto flex items-center gap-3 rounded-full bg-surface py-2.5 pl-4 pr-2 text-sm shadow-lg"
              style={{ border: "1px solid var(--line)" }}
            >
              <span>{t.message}</span>
              {t.undo ? (
                <button
                  onClick={() => dismissToast(t, true)}
                  className="pressable rounded-full px-3 py-1 font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  เลิกทำ
                </button>
              ) : (
                <span className="w-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
