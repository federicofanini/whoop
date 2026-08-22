import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  isSessionSecretConfigured,
  signSession,
  verifySession,
  SESSION_MAX_AGE_SECONDS,
} from "@/core/auth/token";
import { hash, normalizeCode, CODE_LENGTH } from "@/core/auth/otp";
import {
  normalizeTelegramUsername,
  telegramDisplayName,
  validateTelegramUsername,
} from "@/core/telegram/username";
import { escapeHtml } from "@/core/telegram/bot";
import { safeNext } from "@/app/sign-in/login-state";

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("telegram usernames", () => {
  it("strips the @ and lowercases, because Telegram is case-insensitive", () => {
    expect(normalizeTelegramUsername("  @Marco_Rossi ")).toBe("marco_rossi");
    expect(normalizeTelegramUsername("@@doubled")).toBe("doubled");
  });

  it("accepts a valid username", () => {
    const result = validateTelegramUsername("@Marco_Rossi");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.username).toBe("marco_rossi");
  });

  it("rejects anything Telegram itself would not issue", () => {
    // Too short, starts with a digit, dots are not allowed, over 32 characters.
    for (const bad of ["marc", "1marco", "marco.rossi", "m".repeat(33), "", "@"]) {
      const result = validateTelegramUsername(bad);
      expect(result.ok, `${bad} should be rejected`).toBe(false);
      // A key, not a sentence: the message is rendered in the reader's language.
      if (!result.ok) expect(result.errorKey).toBe("signIn.telegram.badUsername");
    }
  });

  it("builds a display name, and gives null rather than an empty string", () => {
    expect(telegramDisplayName("Marco", "Rossi")).toBe("Marco Rossi");
    expect(telegramDisplayName("Marco", null)).toBe("Marco");
    expect(telegramDisplayName(null, null)).toBeNull();
    expect(telegramDisplayName("  ", undefined)).toBeNull();
  });
});

describe("login codes", () => {
  it("accepts a code however it was pasted", () => {
    expect(normalizeCode("123 456")).toBe("123456");
    expect(normalizeCode("123-456")).toBe("123456");
    expect(normalizeCode("code: 123456")).toBe("123456");
    expect(normalizeCode("123456")).toHaveLength(CODE_LENGTH);
  });

  it("hashes deterministically, so a stored hash can be compared", () => {
    expect(hash("123456")).toBe(hash("123456"));
    expect(hash("123456")).not.toBe(hash("123457"));
  });

  it("never leaves the code recoverable from what is stored", () => {
    // The table holds this value for five minutes while the code is live.
    expect(hash("123456")).not.toContain("123456");
    expect(hash("123456")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("session tokens", () => {
  const SECRET = "a-test-session-secret-that-is-long-enough";

  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET;
  });

  it("round-trips a session", () => {
    const token = signSession({ profileId: "abc-123", telegramUserId: 4242 });
    const payload = verifySession(token);

    expect(payload?.profileId).toBe("abc-123");
    expect(payload?.telegramUserId).toBe(4242);
  });

  it("expires no later than the cookie that carries it", () => {
    const payload = verifySession(signSession({ profileId: "a", telegramUserId: 1 }));
    const lifetime = (payload?.expiresAt ?? 0) - Math.floor(Date.now() / 1000);

    expect(lifetime).toBeLessThanOrEqual(SESSION_MAX_AGE_SECONDS);
    expect(lifetime).toBeGreaterThan(SESSION_MAX_AGE_SECONDS - 60);
  });

  it("rejects a payload edited after signing", () => {
    const token = signSession({ profileId: "abc-123", telegramUserId: 4242 });
    const [, signature] = token.split(".");

    // Somebody else's profile, kept alongside the original signature.
    const forged = Buffer.from(
      JSON.stringify({ profileId: "someone-else", telegramUserId: 4242, expiresAt: 9e9 }),
      "utf8",
    ).toString("base64url");

    expect(verifySession(`${forged}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession({ profileId: "abc-123", telegramUserId: 4242 });
    process.env.SESSION_SECRET = "a-completely-different-session-secret";

    expect(verifySession(token)).toBeNull();
  });

  it("rejects an expired token even though its signature is valid", () => {
    const body = Buffer.from(
      JSON.stringify({ profileId: "abc", telegramUserId: 1, expiresAt: 1_700_000_000 }),
      "utf8",
    ).toString("base64url");
    // Signed correctly by this deployment, just long past its expiry.
    const signature = createHmac("sha256", SECRET).update(body).digest("base64url");

    expect(verifySession(`${body}.${signature}`)).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    for (const bad of [undefined, null, "", "no-dot", "a.b", "....", "!!.!!"]) {
      expect(verifySession(bad)).toBeNull();
    }
  });

  it("treats every token as forged when the secret is missing", () => {
    const token = signSession({ profileId: "abc-123", telegramUserId: 4242 });
    delete process.env.SESSION_SECRET;

    expect(isSessionSecretConfigured()).toBe(false);
    // Null rather than a throw: this runs on the read path of every page.
    expect(verifySession(token)).toBeNull();
  });
});

describe("post-sign-in redirect", () => {
  it("keeps a same-origin path", () => {
    expect(safeNext("/friends")).toBe("/friends");
    expect(safeNext("/settings?tab=keys")).toBe("/settings?tab=keys");
  });

  it("refuses to send anyone off this origin", () => {
    // An open redirect on a sign-in page is a phishing primitive: the link is
    // genuinely ours right up to the moment it is not.
    for (const bad of ["https://evil.example", "//evil.example", "/../../etc", null, undefined, ""]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});

describe("bot messages", () => {
  it("escapes a display name before putting it in HTML", () => {
    // Anyone can call themselves this, and Telegram parses the message as HTML.
    expect(escapeHtml('<b>Strap</b> "official"')).toBe(
      "&lt;b&gt;Strap&lt;/b&gt; &quot;official&quot;",
    );
  });
});
