import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/core/auth/token";

/**
 * The cookie side of a Telegram session.
 *
 * Split from `core/auth/token` so the signing rules stay testable without a
 * request, and so nothing that only needs to *verify* a token has to import
 * `next/headers` to do it.
 */

export async function startTelegramSession(
  payload: Omit<SessionPayload, "expiresAt">,
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(payload), {
    // No script ever needs to read this, and one that could would turn any XSS
    // into a stolen session.
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, not strict: the sign-in redirect is a top-level navigation and
    // strict would drop the cookie on exactly the request that follows it.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endTelegramSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** The current Telegram session, or null. Cheap: no database, no network. */
export async function readTelegramSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
