import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Authenticated encryption for secrets held in the database.
 *
 * Members paste their own WHOOP client secret into this app. That value is a
 * credential for *their* account on someone else's platform, so it must not sit
 * in Postgres in plaintext where a stray backup, log line or read-replica leak
 * hands it over.
 *
 * AES-256-GCM rather than CBC: the tag makes tampering detectable, which matters
 * because a decrypted-but-corrupted secret would otherwise be sent to WHOOP as a
 * silent authentication failure with no explanation.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96 bits, the size GCM is specified for.

export class MissingEncryptionKeyError extends Error {
  constructor() {
    super("CREDENTIALS_SECRET is not set — cannot store or read encrypted credentials");
    this.name = "MissingEncryptionKeyError";
  }
}

export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.CREDENTIALS_SECRET);
}

/**
 * Derives the 32-byte key from the configured passphrase.
 *
 * SHA-256 of the passphrase, not a KDF with a work factor: this is a
 * high-entropy secret read from the environment, not a human-chosen password
 * being guessed offline, so stretching would buy nothing and cost every call.
 */
function key(): Buffer {
  const secret = process.env.CREDENTIALS_SECRET;
  if (!secret) throw new MissingEncryptionKeyError();
  return createHash("sha256").update(secret).digest();
}

/** Returns `iv.ciphertext.tag`, each base64url, safe to store in a text column. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, ciphertext, tag].map((b) => b.toString("base64url")).join(".");
}

/** Throws if the key is wrong, the value was tampered with, or the format is not ours. */
export function decryptSecret(stored: string): string {
  const parts = stored.split(".");
  if (parts.length !== 3) throw new Error("Stored secret is not in the expected format");

  const [iv, ciphertext, tag] = parts.map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * What to show in a form: enough to recognise which secret is stored, never
 * enough to reconstruct it.
 */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 4) return "••••";
  return `••••••••${plaintext.slice(-4)}`;
}
