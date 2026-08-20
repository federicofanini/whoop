import { NextResponse, type NextRequest } from "next/server";
import { createWritableClient } from "@/server/supabase";

export const runtime = "nodejs";

/**
 * Where Google sends the member back after consent.
 *
 * Supabase hands over a one-time code that has to be exchanged for a session
 * server-side; the exchange is what sets the auth cookies, which is why this is
 * a route handler and not a page.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  // Where the member was heading before being asked to sign in.
  const next = url.searchParams.get("next");

  if (error) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error)}`, url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_code", url));
  }

  const supabase = await createWritableClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(exchangeError.message)}`, url),
    );
  }

  // Only ever redirect to a path on this origin: `next` arrives from the query
  // string, and an absolute URL there would make this an open redirect.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(destination, url));
}
