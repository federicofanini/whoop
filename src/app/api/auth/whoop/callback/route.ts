import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/core/db";
import { exchangeCodeForTokens } from "@/core/whoop/oauth";
import { WhoopClient } from "@/core/whoop/client";
import type { WhoopBodyMeasurement, WhoopProfile } from "@/core/whoop/types";
import { getViewer } from "@/server/auth";
import { resolveCredentialsForProfile } from "@/core/whoop/credentials";

export const runtime = "nodejs";

/**
 * Finishes linking a WHOOP strap to the signed-in profile.
 *
 * WHOOP is a *data source* here, not an identity — Google already said who this
 * is. So this route requires an existing session and refuses to create one:
 * without that check, anyone who completed a WHOOP handshake would attach a
 * strap to whichever profile happened to be first in the table.
 */
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

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.redirect(new URL("/sign-in?next=/settings", url));
  }

  const resolved = await resolveCredentialsForProfile(viewer.profileId);
  if (!resolved.ok) {
    return NextResponse.redirect(new URL(`/settings?error=${resolved.reason}`, url));
  }

  // The code was issued by whichever app started the handshake; exchanging it
  // against a different client id fails with an unhelpful invalid_grant.
  const startedWith = request.cookies.get("whoop_oauth_source")?.value;
  if (startedWith && startedWith !== resolved.credentials.source) {
    return NextResponse.redirect(new URL("/settings?error=credentials_changed", url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, resolved.credentials);
    const client = new WhoopClient(tokens.access_token);

    const profile = await client.get<WhoopProfile>("/v2/user/profile/basic");
    const body = await client
      .get<WhoopBodyMeasurement>("/v2/user/measurement/body")
      .catch(() => null as WhoopBodyMeasurement | null);

    await getDb()
      .insert(schema.accounts)
      .values({
        userId: profile.user_id,
        profileId: viewer.profileId,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        credentialSource: resolved.credentials.source,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
        heightMeter: body?.height_meter,
        weightKilogram: body?.weight_kilogram,
        maxHeartRate: body?.max_heart_rate,
      })
      .onConflictDoUpdate({
        target: schema.accounts.userId,
        set: {
          // Re-linking the same strap under a different profile moves it, which
          // is what someone switching Google accounts means by "reconnect".
          profileId: sql`excluded.profile_id`,
          accessToken: sql`excluded.access_token`,
          refreshToken: sql`excluded.refresh_token`,
          expiresAt: sql`excluded.expires_at`,
          // Reconnecting through a different app must move this too, or the
          // next refresh is sent to the client that did not issue the token.
          credentialSource: sql`excluded.credential_source`,
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

    const res = NextResponse.redirect(new URL("/settings?connected=1", url));
    res.cookies.delete("whoop_oauth_state");
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, url));
  }
}
