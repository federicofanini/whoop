import { NextResponse, type NextRequest } from "next/server";
import { endTelegramSession } from "@/server/session";
import { createWritableClient, isSupabaseConfigured } from "@/server/supabase";

export const runtime = "nodejs";

/**
 * POST only, so a prefetch or a crawler can never sign anyone out.
 *
 * Both sessions are dropped, not just the one that happens to be in use. A
 * member with Google and Telegram both linked holds two cookies, and clearing
 * one would leave them signed in through the other — which is not what anybody
 * pressing Sign out means.
 *
 * Signing out leaves the WHOOP connection and its tokens in place: coming back
 * is a round trip through one of the two methods, not another backfill.
 */
export async function POST(request: NextRequest) {
  await endTelegramSession();

  if (isSupabaseConfigured()) {
    const supabase = await createWritableClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/sign-in", request.url), { status: 303 });
}
