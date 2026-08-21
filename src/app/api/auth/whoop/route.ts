import { NextResponse } from "next/server";
import { buildAuthorizeUrl, createState } from "@/core/whoop/oauth";
import { resolveCredentialsForProfile } from "@/core/whoop/credentials";
import { getViewer } from "@/server/auth";

export const runtime = "nodejs";

/**
 * Kicks off the OAuth handshake with whichever WHOOP app this member connects
 * through — the shared one if they hold a slot, otherwise their own.
 *
 * Signing in first is required: a slot is claimed here, and a slot belongs to a
 * person rather than to a browser session.
 */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.redirect(new URL("/sign-in?next=/settings", process.env.APP_URL ?? "http://localhost:3000"));
  }

  const resolved = await resolveCredentialsForProfile(viewer.profileId);
  if (!resolved.ok) {
    // Every reason is actionable and has its own explanation in settings.
    return NextResponse.redirect(
      new URL(`/settings?error=${resolved.reason}`, process.env.APP_URL ?? "http://localhost:3000"),
    );
  }

  const state = createState();
  const res = NextResponse.redirect(buildAuthorizeUrl(state, resolved.credentials));

  // The callback compares this against the returned state to block CSRF.
  res.cookies.set("whoop_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  // Which app issued the code, so the callback exchanges against the same one.
  res.cookies.set("whoop_oauth_source", resolved.credentials.source, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return res;
}
