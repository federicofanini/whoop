import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The session token for members who signed in over Telegram.
 *
 * Google sessions are Supabase's, cookie and refresh cycle included. Telegram
 * sign-in has no such server behind it, so this is the whole of it: a JSON
 * payload and an HMAC over it, both base64url, joined by a dot.
 *
 * That is a JWT in everything but the header, and the header is the part worth
 * dropping — `alg` inside the token is what makes `alg: none` and algorithm
 * confusion possible at all. Here there is exactly one algorithm, chosen here,
 * and a token that claims otherwise is simply a token whose signature fails.
 *
 * Deliberately free of `next/headers` and of anything database-shaped: this
 * runs wherever a cookie needs reading, including a future middleware.
 */

export const SESSION_COOKIE = "strap_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface SessionPayload {
  /** The profile this session belongs to. */
  profileId: string;
  /** The Telegram account that proved it. */
  telegramUserId: number;
  /** Seconds since the epoch, matching the cookie's own lifetime. */
  expiresAt: number;
}

export class MissingSessionSecretError extends Error {
  constructor() {
    super("SESSION_SECRET is not set — Telegram sign-in cannot issue sessions");
    this.name = "MissingSessionSecretError";
  }
}

export function isSessionSecretConfigured(): boolean {
  return Boolean(process.env.SESSION_SECRET);
}

export function signSession(payload: Omit<SessionPayload, "expiresAt">): string {
  const full: SessionPayload = {
    ...payload,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

/**
 * Returns the payload, or null for anything at all that is wrong with the
 * token — tampered, expired, signed with a retired secret, or not ours.
 *
 * One null rather than a set of reasons: every one of them means the same thing
 * to the caller, which is that nobody is signed in.
 */
export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  // A deployment that lost its secret has no way to tell a real token from a
  // forged one, so it must treat every token as forged rather than throwing on
  // the read path of every page.
  if (!isSessionSecretConfigured()) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!constantTimeEquals(signature, sign(body))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
    if (typeof payload !== "object" || payload === null) return null;

    const { profileId, telegramUserId, expiresAt } = payload as Record<string, unknown>;
    if (typeof profileId !== "string" || profileId.length === 0) return null;
    if (typeof telegramUserId !== "number" || !Number.isSafeInteger(telegramUserId)) return null;
    if (typeof expiresAt !== "number" || expiresAt * 1000 <= Date.now()) return null;

    return { profileId, telegramUserId, expiresAt };
  } catch {
    return null;
  }
}

function sign(body: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new MissingSessionSecretError();
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
