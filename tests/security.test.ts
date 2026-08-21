import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { decryptSecret, encryptSecret, maskSecret, isEncryptionConfigured } from "@/core/crypto";
import { verifyWebhookSignature } from "@/core/whoop/oauth";
import { normalizeHandle, suggestHandle, validateHandle } from "@/core/friends/handles";
import { sharedSlotLimit, DEFAULT_SHARED_SLOTS } from "@/core/whoop/credentials";

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("secret encryption", () => {
  beforeEach(() => {
    process.env.CREDENTIALS_SECRET = "a-test-key-that-is-long-enough-to-be-real";
  });

  it("round-trips a secret", () => {
    const secret = "9f8e7d6c5b4a39281706fedcba9876543210";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("produces a different ciphertext each time", () => {
    // A fresh IV per call: identical plaintexts must not be linkable in the table.
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("refuses a tampered ciphertext rather than returning garbage", () => {
    const stored = encryptSecret("secret-value");
    const [iv, body, tag] = stored.split(".");
    const flipped = Buffer.from(body, "base64url");
    flipped[0] ^= 0xff;

    expect(() => decryptSecret(`${iv}.${flipped.toString("base64url")}.${tag}`)).toThrow();
  });

  it("refuses to decrypt under a different key", () => {
    const stored = encryptSecret("secret-value");
    process.env.CREDENTIALS_SECRET = "a-completely-different-key-value-here";
    expect(() => decryptSecret(stored)).toThrow();
  });

  it("rejects a value that is not in our format", () => {
    expect(() => decryptSecret("not-encrypted")).toThrow();
  });

  it("throws a named error when no key is configured", () => {
    delete process.env.CREDENTIALS_SECRET;
    expect(isEncryptionConfigured()).toBe(false);
    expect(() => encryptSecret("x")).toThrow(/CREDENTIALS_SECRET/);
  });

  it("masks all but the last four characters", () => {
    const masked = maskSecret("abcdefghijklmnop");
    expect(masked).toContain("mnop");
    expect(masked).not.toContain("abcdefghijkl");
  });
});

describe("webhook signature", () => {
  const SECRET = "webhook-signing-secret";
  const body = JSON.stringify({ type: "recovery.updated", user_id: 1001 });
  // Current, because the verifier rejects deliveries older than five minutes —
  // a fixed timestamp would test the replay window instead of the signature.
  const timestamp = String(Date.now());

  function sign(payload: string, ts: string, secret = SECRET): string {
    return createHmac("sha256", secret).update(ts + payload).digest("base64");
  }

  beforeEach(() => {
    process.env.WHOOP_WEBHOOK_SECRET = SECRET;
  });

  it("accepts a correctly signed delivery", async () => {
    expect(await verifyWebhookSignature(body, sign(body, timestamp), timestamp)).toBe(true);
  });

  it("rejects a body that changed after signing", async () => {
    const tampered = JSON.stringify({ type: "recovery.updated", user_id: 9999 });
    expect(await verifyWebhookSignature(tampered, sign(body, timestamp), timestamp)).toBe(false);
  });

  it("rejects a replayed signature under a different timestamp", async () => {
    const other = String(Date.now() + 1000);
    expect(await verifyWebhookSignature(body, sign(body, timestamp), other)).toBe(false);
  });

  it("rejects a delivery older than the replay window, even correctly signed", async () => {
    const stale = String(Date.now() - 10 * 60 * 1000);
    expect(await verifyWebhookSignature(body, sign(body, stale), stale)).toBe(false);
  });

  it("rejects a timestamp that is not a number", async () => {
    expect(await verifyWebhookSignature(body, sign(body, "abc"), "abc")).toBe(false);
  });

  it("rejects a signature made with the wrong secret", async () => {
    expect(await verifyWebhookSignature(body, sign(body, timestamp, "wrong"), timestamp)).toBe(false);
  });

  it("rejects missing headers instead of treating them as valid", async () => {
    expect(await verifyWebhookSignature(body, null, timestamp)).toBe(false);
    expect(await verifyWebhookSignature(body, sign(body, timestamp), null)).toBe(false);
  });

  it("fails closed when no secret is configured", async () => {
    delete process.env.WHOOP_WEBHOOK_SECRET;
    delete process.env.WHOOP_CLIENT_SECRET;
    expect(await verifyWebhookSignature(body, sign(body, timestamp), timestamp)).toBe(false);
  });

  it("rejects a malformed signature without throwing", async () => {
    expect(await verifyWebhookSignature(body, "!!!not-base64!!!", timestamp)).toBe(false);
  });
});

describe("handles", () => {
  it("lowercases and strips characters that are not allowed", () => {
    expect(normalizeHandle("Federico Fanini!")).toBe("federicofanini");
  });

  it("accepts a valid handle", () => {
    const result = validateHandle("marco.fanini");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.handle).toBe("marco.fanini");
  });

  it("rejects one that is too short", () => {
    const result = validateHandle("ab");
    expect(result.ok).toBe(false);
    // A key, not a sentence: the message is rendered in the reader's language.
    if (!result.ok) expect(result.errorKey).toBe("friends.error.tooShort");
  });

  it("rejects one that does not start with a letter", () => {
    const result = validateHandle("1marco");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe("friends.error.charset");
  });

  it("suggests from a display name, then an email, then the profile id", () => {
    expect(suggestHandle("Marco Fanini", "m@example.com", "abcdef12-0000")).toBe("marco.fanini");
    expect(suggestHandle(null, "marco@example.com", "abcdef12-0000")).toBe("marco");
    // A name in a script that normalises away must still yield something usable.
    expect(suggestHandle("日本語", null, "abcdef12-0000")).toBe("member.abcdef12");
  });

  it("never suggests a handle that its own validator would reject", () => {
    for (const [name, email] of [["Marco Fanini", "m@x.com"], [null, "marco@x.com"], ["日本語", null]] as const) {
      const suggested = suggestHandle(name, email, "abcdef12-3456");
      expect(validateHandle(suggested).ok, `${suggested} failed validation`).toBe(true);
    }
  });
});

describe("shared slot limit", () => {
  it("defaults to the WHOOP development cap", () => {
    delete process.env.WHOOP_SHARED_USER_LIMIT;
    expect(sharedSlotLimit()).toBe(DEFAULT_SHARED_SLOTS);
    expect(DEFAULT_SHARED_SLOTS).toBe(10);
  });

  it("can be raised once an app is approved for production", () => {
    process.env.WHOOP_SHARED_USER_LIMIT = "100";
    expect(sharedSlotLimit()).toBe(100);
  });

  it("ignores a nonsense value rather than disabling the cap", () => {
    process.env.WHOOP_SHARED_USER_LIMIT = "not-a-number";
    expect(sharedSlotLimit()).toBe(DEFAULT_SHARED_SLOTS);
    process.env.WHOOP_SHARED_USER_LIMIT = "-5";
    expect(sharedSlotLimit()).toBe(DEFAULT_SHARED_SLOTS);
  });
});
