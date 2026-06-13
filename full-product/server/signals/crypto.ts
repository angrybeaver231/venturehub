import crypto from "crypto";

const ALGO = "aes-256-gcm";
const VERSION = "v1";

let cachedKey: Buffer | null = null;

function deriveKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw =
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    "";
  if (!raw) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY (or SESSION_SECRET) must be set to encrypt integration credentials",
    );
  }
  cachedKey = crypto.createHash("sha256").update(raw).digest();
  return cachedKey;
}

export function encryptConfig(plain: unknown): string {
  const json = JSON.stringify(plain ?? {});
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, deriveKey(), iv);
  const ct = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptConfig<T = any>(blob: unknown): T | null {
  if (blob == null) return null;
  // Backward compat: legacy rows stored a JSON object directly.
  if (typeof blob === "object") return blob as T;
  if (typeof blob !== "string") return null;
  const parts = blob.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    // Not in our envelope; treat as opaque plaintext config.
    try {
      return JSON.parse(blob) as T;
    } catch {
      return null;
    }
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, deriveKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  return JSON.parse(plain) as T;
}

export function isEncryptionConfigured(): boolean {
  return Boolean(
    process.env.INTEGRATION_ENCRYPTION_KEY ||
      process.env.SESSION_SECRET,
  );
}
