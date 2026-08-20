import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Ends the session without unlinking WHOOP — the stored tokens stay put, so
 * signing back in is another OAuth round trip and not another backfill.
 */
export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
