import { NextResponse, type NextRequest } from "next/server";
import { createWritableClient } from "@/server/supabase";

export const runtime = "nodejs";

/**
 * POST only, so a prefetch or a crawler can never sign anyone out.
 *
 * Signing out drops the Supabase session but leaves the WHOOP connection and
 * its tokens in place — coming back is a Google round trip, not another
 * backfill.
 */
export async function POST(request: NextRequest) {
  const supabase = await createWritableClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/sign-in", request.url), { status: 303 });
}
