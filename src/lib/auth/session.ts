import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Session handling for a dashboard whose only identity provider is WHOOP.
 *
 * Once the dashboard can show *someone else's* data, "which account is this
 * request?" stops being rhetorical — every friend-scoped query hangs off the
 * answer. The session is a signed cookie holding the WHOOP user id, which is
 * already the primary key of every table.
 *
 * HMAC over a compact payload rather than a JWT library: the token is read and
 * written by this one process, never parsed by anything else, so the parts of
 * JWT that earn their complexity (algorithm negotiation, key distribution) are
 * all cost and no benefit here.
 */

export const SESSION_COOKIE = "strap_session";

/** Thirty days. The WHOOP refresh token outlives this, so re-linking is rare. */
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

interface SessionPayload {
  /** WHOOP user id. */
  uid: number;
  /** Expiry, seconds since epoch. */
  exp: number;
}

/**
 * Falls back to the client secret so a working WHOOP setup is a working session
 * setup. Deployments that want to rotate sessions independently set their own.
 */
function sessionSecret(): string | null {
  return process.env.SESSION_SECRET ?? process.env.WHOOP_CLIENT_SECRET ?? null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createSessionToken(userId: number): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET or WHOOP_CLIENT_SECRET must be set");

  const payload: SessionPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export function readSessionToken(token: string | undefined): number | null {
  const secret = sessionSecret();
  if (!token || !secret) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(signature);
  // timingSafeEqual throws on a length mismatch, so check that first.
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.uid !== "number" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 <= Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
} as const;

/**
 * The signed-in WHOOP user id, or null.
 *
 * Deliberately does not fall back to "the only account in the table". That
 * shortcut is harmless on a single-user install and a data leak the moment a
 * second person links their WHOOP, which is the entire point of the friends
 * feature.
 */
export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}
