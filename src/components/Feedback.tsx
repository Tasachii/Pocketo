import { useState, useSyncExternalStore } from "react";
import { useT } from "../i18n";

/**
 * confirm / prompt dialog + undo toast แบบ global — แทน window.confirm/prompt ของระบบ
 * ใช้ store เล็กๆ ในโมดูล ไม่ต้องลาก state ผ่านทุกชั้น
 */

interface ConfirmReq {
  message: string;
  detail?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

interface PromptReq {
  message: string;
  detail?: string;
  placeholder?: string;
  password?: boolean;
  confirmLabel?: string;
  resolve: (value: string | null) => void;
}

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

let confirmReq: ConfirmReq | null = null;
let promptReq: PromptReq | null = null;
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

export function promptDialog(
  message: string,
  opts?: {
    detail?: string;
    placeholder?: string;
    password?: boolean;
    confirmLabel?: string;
  },
): Promise<string | null> {
  return new Promise((resolve) => {
    promptReq = { message, ...opts, resolve };
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
  const { t } = useT();
  const [promptValue, setPromptValue] = useState("");

  const close = (ok: boolean) => {
    const r = confirmReq;
    confirmReq = null;
    emit();
    r?.resolve(ok);
  };

  const closePrompt = (value: string | null) => {
    const r = promptReq;
    promptReq = null;
    setPromptValue("");
    emit();
    r?.resolve(value);
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
                {t("cancel")}
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
                {confirmReq.confirmLabel ?? t("ok")}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptReq && (
        <div
          className="fade fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-8"
          onClick={() => closePrompt(null)}
        >
          <form
            className="sheet w-full max-w-xs rounded-3xl bg-bg p-5"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              closePrompt(promptValue);
            }}
          >
            <p className="font-medium">{promptReq.message}</p>
            {promptReq.detail && (
              <p className="pt-2 text-sm text-sub">{promptReq.detail}</p>
            )}
            <input
              autoFocus
              type={promptReq.password ? "password" : "text"}
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder={promptReq.placeholder}
              className="mt-3 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px]"
            />
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => closePrompt(null)}
                className="pressable flex-1 rounded-2xl bg-surface2 py-2.5 text-sm font-medium"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="pressable flex-1 rounded-2xl py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--accent)" }}
              >
                {promptReq.confirmLabel ?? t("ok")}
              </button>
            </div>
          </form>
        </div>
      )}

      {toasts.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 z-[75] flex flex-col items-center gap-2 px-5"
          style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="fade pointer-events-auto flex items-center gap-3 rounded-full bg-surface py-2.5 pl-4 pr-2 text-sm shadow-lg"
              style={{ border: "1px solid var(--line)" }}
            >
              <span>{toast.message}</span>
              {toast.undo ? (
                <button
                  onClick={() => dismissToast(toast, true)}
                  className="pressable rounded-full px-3 py-1 font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  {t("undo")}
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
