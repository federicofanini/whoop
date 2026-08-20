import { timingSafeEqual } from "node:crypto";
import { WHOOP_AUTH_URL, WHOOP_SCOPES, WHOOP_TOKEN_URL, type WhoopTokens } from "./types";

export function isWhoopConfigured(): boolean {
  return Boolean(
    process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET && process.env.WHOOP_REDIRECT_URI,
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** WHOOP rejects a `state` shorter than 8 characters. */
export function createState(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("WHOOP_CLIENT_ID"),
    redirect_uri: requireEnv("WHOOP_REDIRECT_URI"),
    response_type: "code",
    scope: WHOOP_SCOPES.join(" "),
    state,
  });
  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<WhoopTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: requireEnv("WHOOP_CLIENT_ID"),
    client_secret: requireEnv("WHOOP_CLIENT_SECRET"),
    redirect_uri: requireEnv("WHOOP_REDIRECT_URI"),
  });

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`WHOOP token exchange failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as WhoopTokens;
}

export async function refreshTokens(refreshToken: string): Promise<WhoopTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: requireEnv("WHOOP_CLIENT_ID"),
    client_secret: requireEnv("WHOOP_CLIENT_SECRET"),
    // WHOOP only returns a fresh refresh token if `offline` is asked for again.
    scope: "offline",
  });

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`WHOOP token refresh failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as WhoopTokens;
}

/**
 * Verifies a webhook delivery.
 *
 * WHOOP signs `timestamp + rawBody` with HMAC-SHA256 keyed on the client secret,
 * base64-encoded, and sends it as `X-WHOOP-Signature` alongside
 * `X-WHOOP-Signature-Timestamp`. The raw body must be used verbatim — re-serialising
 * parsed JSON changes the bytes and the signature will not match.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): Promise<boolean> {
  const secret = process.env.WHOOP_WEBHOOK_SECRET ?? process.env.WHOOP_CLIENT_SECRET;
  if (!secret || !signature || !timestamp) return false;

  // Reject replays of old deliveries.
  const age = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + rawBody));
  const expected = Buffer.from(mac).toString("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  // Length must match before timingSafeEqual, which throws on differing lengths.
  return a.length === b.length && timingSafeEqual(a, b);
}
