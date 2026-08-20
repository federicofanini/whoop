import { NextResponse, type NextRequest } from "next/server";
import { getDb, schema } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { ensureHandle } from "@/lib/friends/queries";
import { exchangeCodeForTokens } from "@/lib/whoop/oauth";
import { WhoopClient } from "@/lib/whoop/client";
import type { WhoopBodyMeasurement, WhoopProfile } from "@/lib/whoop/types";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(error)}`, url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=missing_code", url));
  }

  const expectedState = request.cookies.get("whoop_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL("/settings?error=state_mismatch", url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const client = new WhoopClient(tokens.access_token);

    const profile = await client.get<WhoopProfile>("/v2/user/profile/basic");
    const body = await client
      .get<WhoopBodyMeasurement>("/v2/user/measurement/body")
      .catch(() => null as WhoopBodyMeasurement | null);

    const db = getDb();
    await db
      .insert(schema.accounts)
      .values({
        userId: profile.user_id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
        heightMeter: body?.height_meter,
        weightKilogram: body?.weight_kilogram,
        maxHeartRate: body?.max_heart_rate,
      })
      .onConflictDoUpdate({
        target: schema.accounts.userId,
        set: {
          accessToken: sql`excluded.access_token`,
          refreshToken: sql`excluded.refresh_token`,
          expiresAt: sql`excluded.expires_at`,
          scope: sql`excluded.scope`,
          email: sql`excluded.email`,
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          heightMeter: sql`excluded.height_meter`,
          weightKilogram: sql`excluded.weight_kilogram`,
          maxHeartRate: sql`excluded.max_heart_rate`,
          updatedAt: new Date(),
        },
      });

    // Linking WHOOP *is* signing in: the WHOOP account is the only identity the
    // app has, and the friends feature needs to know whose dashboard this is.
    const handle = await ensureHandle(profile.user_id, profile.first_name, profile.last_name);

    const res = NextResponse.redirect(new URL(`/settings?connected=1&handle=${handle}`, url));
    res.cookies.delete("whoop_oauth_state");
    res.cookies.set(SESSION_COOKIE, createSessionToken(profile.user_id), sessionCookieOptions);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, url));
  }
}
