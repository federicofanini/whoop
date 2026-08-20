"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Starts the Google handshake from the browser.
 *
 * Client-side rather than a server action because Supabase needs to hand the
 * browser a redirect it controls, including the PKCE verifier it stores locally.
 * The code that comes back is exchanged server-side in /auth/callback, which is
 * where the session cookie is actually set.
 */
export function GoogleButton({ label, next }: { label: string; next: string }) {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const callback = new URL("/auth/callback", window.location.origin);
    if (next.startsWith("/")) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });

    // On success the browser has already navigated; only a failure lands here.
    if (error) setPending(false);
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={pending}
      className="flex w-full items-center justify-center gap-3  border border-hairline bg-surface-2 px-4 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-hairline disabled:opacity-60"
    >
      <GoogleMark />
      {label}
    </button>
  );
}

/** Google's mark, inline so it needs no network request and no CSP exception. */
function GoogleMark() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
