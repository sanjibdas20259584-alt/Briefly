// AES-256-GCM encryption for secrets we store in Postgres
// (Telegram bot token, model provider API keys).
// The secret never leaves the server except when actually used.
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Missing ENCRYPTION_KEY. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  try {
    getKey(); // fail fast if key missing
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, getKey(), iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    // pack: <12-byte iv><16-byte tag><ciphertext>
    const packed = Buffer.concat([iv, tag, enc]);
    return packed.toString("base64");
  } catch {
    throw new Error("Failed to encrypt secret.");
  }
}

export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const raw = Buffer.from(payload, "base64");
  if (raw.length < 12 + 16 + 1) return null;
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}
