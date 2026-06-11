import type { BackupFile } from "./backup";

/**
 * เข้ารหัสไฟล์ backup ด้วยรหัสผ่าน (AES-GCM 256 + PBKDF2)
 * ใช้ Web Crypto ล้วน — ทำงานทั้งบนเบราว์เซอร์และใน Node 20+ (สำหรับ test)
 */

export interface EncryptedBackup {
  app: "pocketo";
  encrypted: true;
  v: 1;
  kdf: { name: "PBKDF2"; iterations: number; hash: "SHA-256"; salt: string };
  cipher: { name: "AES-GCM"; iv: string };
  data: string;
}

const ITERATIONS = 150_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: BufferSource,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBackup(
  file: BackupFile,
  passphrase: string,
): Promise<EncryptedBackup> {
  if (!passphrase) throw new Error("ต้องตั้งรหัสผ่าน");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(file)),
  );
  return {
    app: "pocketo",
    encrypted: true,
    v: 1,
    kdf: { name: "PBKDF2", iterations: ITERATIONS, hash: "SHA-256", salt: toB64(salt) },
    cipher: { name: "AES-GCM", iv: toB64(iv) },
    data: toB64(ciphertext),
  };
}

export function isEncryptedBackup(data: unknown): data is EncryptedBackup {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.app === "pocketo" && d.encrypted === true && typeof d.data === "string";
}

export async function decryptBackup(
  enc_: EncryptedBackup,
  passphrase: string,
): Promise<unknown> {
  const salt = fromB64(enc_.kdf.salt);
  const iv = fromB64(enc_.cipher.iv);
  const key = await deriveKey(passphrase, salt);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      fromB64(enc_.data),
    );
  } catch {
    // AES-GCM ตรวจ integrity — รหัสผ่านผิดหรือไฟล์เสียจะ throw ที่นี่
    throw new Error("รหัสผ่านไม่ถูกต้อง หรือไฟล์เสียหาย");
  }
  return JSON.parse(dec.decode(plain));
}
