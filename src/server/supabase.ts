import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase clients for the server side of the App Router.
 *
 * Auth lives in an httpOnly cookie that Supabase refreshes on its own schedule,
 * which means the client has to be able to *write* cookies — and Server
 * Components are not allowed to. So there are two constructors: a read-only one
 * for rendering, and a writable one for route handlers and Server Actions.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function credentials(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured — see .env.example");
  return { url, key };
}

/**
 * For Server Components. Cookie writes are swallowed: a component cannot set
 * them, and a token refresh landing mid-render is not an error worth crashing
 * the page over — the next route handler or action will persist it.
 */
export async function createReadOnlyClient(): Promise<SupabaseClient> {
  const store = await cookies();
  const { url, key } = credentials();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: () => {
        /* not writable from a Server Component */
      },
    },
  });
}

/** For route handlers and Server Actions, where cookies can be written. */
export async function createWritableClient(): Promise<SupabaseClient> {
  const store = await cookies();
  const { url, key } = credentials();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) store.set(name, value, options);
      },
    },
  });
}
