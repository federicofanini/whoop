import { timingSafeEqual } from "node:crypto";
import { WHOOP_AUTH_URL, WHOOP_SCOPES, WHOOP_TOKEN_URL, type WhoopTokens } from "./types";
import type { WhoopCredentials } from "./credentials";

/**
 * Every call takes the credentials to use rather than reading the environment.
 *
 * Members may bring their own WHOOP developer app, so "the client id" is no
 * longer a property of the deployment — it is a property of whoever is
 * connecting. Passing it in makes that explicit and keeps this module a pure
 * protocol implementation.
 */

/** Whether the deployment has a shared app at all. Per-member keys are separate. */
export function isWhoopConfigured(): boolean {
  return Boolean(
    process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET && process.env.WHOOP_REDIRECT_URI,
  );
}

/** WHOOP rejects a `state` shorter than 8 characters. */
export function createState(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function buildAuthorizeUrl(state: string, credentials: WhoopCredentials): string {
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUri,
    response_type: "code",
    scope: WHOOP_SCOPES.join(" "),
    state,
  });
  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  credentials: WhoopCredentials,
): Promise<WhoopTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    redirect_uri: credentials.redirectUri,
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

export async function refreshTokens(
  refreshToken: string,
  credentials: WhoopCredentials,
): Promise<WhoopTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
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
