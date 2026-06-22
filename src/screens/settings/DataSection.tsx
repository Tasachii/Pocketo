import { useEffect, useRef, useState } from "react";
import { useT } from "../../i18n";
import { confirmDialog, promptDialog, showToast } from "../../components/Feedback";
import { downloadBackup, importData } from "../../core/backup";
import { decryptBackup, isEncryptedBackup } from "../../core/crypto";
import { db } from "../../db/db";
import { Section } from "./Section";

export function DataSection() {
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<{
    persisted: boolean;
    usage?: number;
  } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void (async () => {
      if (!navigator.storage) return;
      const persisted = await navigator.storage.persisted?.();
      const est = await navigator.storage.estimate?.();
      setStorage({ persisted: !!persisted, usage: est?.usage });
    })();
  }, []);

  const doExport = async () => {
    const wantEncrypt = await confirmDialog(t("set_encryptQ"), {
      detail:
        t("set_encryptDesc"),
      confirmLabel: t("set_setPasswordBtn"),
    });
    let passphrase: string | undefined;
    if (wantEncrypt) {
      const pw = await promptDialog(t("set_setPassword"), {
        password: true,
        placeholder: t("set_passwordPlaceholder"),
        confirmLabel: t("set_encryptSave"),
      });
      if (pw == null) return; // ยกเลิก
      if (pw.length < 8) {
        setMsg(t("set_pwTooShort"));
        return;
      }
      passphrase = pw;
    }
    await downloadBackup(db, passphrase);
    showToast(t("set_exported"));
  };

  const doImport = async (file: File) => {
    try {
      let data: unknown = JSON.parse(await file.text());
      if (isEncryptedBackup(data)) {
        const pw = await promptDialog(t("set_fileEncrypted"), {
          detail: t("set_enterPassword"),
          password: true,
          placeholder: t("set_passwordPlaceholder"),
          confirmLabel: t("set_unlock"),
        });
        if (pw == null) return;
        data = await decryptBackup(data, pw); // โยน error ถ้ารหัสผิด
      }
      const ok = await confirmDialog(t("set_importQ"), {
        detail: t("set_importDesc"),
        confirmLabel: t("set_importBtn"),
        danger: true,
      });
      if (!ok) return;
      await importData(db, data);
      await db.kv.put({ key: "lastExport", value: Date.now() });
      showToast(t("set_importDone"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("set_importFail"));
    }
  };

  const requestPersist = async () => {
    const ok = await navigator.storage?.persist?.();
    setStorage((s) => (s ? { ...s, persisted: !!ok } : s));
    setMsg(
      ok
        ? t("set_persistOk")
        : t("set_persistNo"),
    );
  };

  const clearAll = async () => {
    if (
      !(await confirmDialog(t("set_clearQ"), {
        detail: t("set_clearDesc"),
        confirmLabel: t("set_clearBtn"),
        danger: true,
      }))
    )
      return;
    if (
      !(await confirmDialog(t("set_clearAgain"), {
        detail: t("set_clearAgainDesc"),
        confirmLabel: t("set_clearAgainBtn"),
        danger: true,
      }))
    )
      return;
    await db.delete();
    location.reload();
  };

  return (
    <Section title={t("set_data")} className="rise rise-2">
      <div className="space-y-2">
        <button onClick={doExport} className="pressable w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm">
          {t("set_export")}
          <span className="block pt-0.5 text-xs text-faint">
            {t("set_exportDesc")}
          </span>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="pressable w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm"
        >
          {t("set_import")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={requestPersist}
          className="pressable w-full rounded-2xl bg-surface px-4 py-3 text-left text-sm"
        >
          {t("set_persist")}
          <span className="block pt-0.5 text-xs text-faint">
            {storage?.persisted
              ? t("set_persistGranted")
              : t("set_persistDesc")}
          </span>
        </button>
        <button
          onClick={clearAll}
          className="pressable w-full rounded-2xl px-4 py-3 text-left text-sm"
          style={{ color: "var(--expense)" }}
        >
          {t("set_clear")}
        </button>
        {msg && <p className="px-1 text-xs text-sub">{msg}</p>}
      </div>
    </Section>
  );
}
