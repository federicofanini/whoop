import { NextResponse } from "next/server";
import { buildAuthorizeUrl, createState, isWhoopConfigured } from "@/core/whoop/oauth";

export const runtime = "nodejs";

/** Kicks off the OAuth handshake. */
export async function GET() {
  if (!isWhoopConfigured()) {
    return NextResponse.json(
      { error: "WHOOP OAuth is not configured. See .env.example." },
      { status: 503 },
    );
  }

  const state = createState();
  const res = NextResponse.redirect(buildAuthorizeUrl(state));

  // The callback compares this against the returned state to block CSRF.
  res.cookies.set("whoop_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return res;
}
