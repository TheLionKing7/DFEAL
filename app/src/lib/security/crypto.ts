import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Secrets at rest (webhook URLs, API tokens, OAuth tokens) are encrypted with
 * AES-256-GCM. The key is derived from CONNECTOR_ENCRYPTION_KEY (any long
 * random string, e.g. `openssl rand -base64 32`).
 */
function key(): Buffer {
  const raw = process.env.CONNECTOR_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) {
    throw new Error(
      "CONNECTOR_ENCRYPTION_KEY is not set (min 16 chars). Generate one with `openssl rand -base64 32` and add it to your environment.",
    );
  }
  return createHash("sha256").update(raw).digest();
}

export function isEncryptionConfigured(): boolean {
  return (process.env.CONNECTOR_ENCRYPTION_KEY?.trim().length ?? 0) >= 16;
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptJson<T = Record<string, unknown>>(payload: string): T {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unsupported secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** HMAC-signed, expiring state value (OAuth `state`). */
export function signState(payload: Record<string, unknown>, ttlSeconds = 600): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString(
    "base64url",
  );
  const sig = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState<T extends Record<string, unknown>>(state: string): T | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number };
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}
