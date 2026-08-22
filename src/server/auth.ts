import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/core/db";
import { ensureHandle } from "@/core/friends/handles-store";
import { createReadOnlyClient, isSupabaseConfigured } from "./supabase";

/**
 * Who is asking, resolved once per request.
 *
 * Two separate facts live here and are deliberately not conflated:
 *
 *   - the **profile**, which comes from Supabase Auth and is the identity;
 *   - the **WHOOP connection**, which may not exist yet.
 *
 * Signing in with Google gets you a profile immediately; you can be invited and
 * approve friends before ever linking a strap. Only the second fact unlocks
 * data, and only the first unlocks the app.
 */
export interface Viewer {
  profileId: string;
  handle: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  locale: "en" | "it";
  /** The WHOOP user id whose rows belong to this person, if a strap is linked. */
  whoopUserId: number | null;
}

/**
 * Reads the Supabase session and mirrors it into the profiles table.
 *
 * `getUser()` rather than `getSession()`: the session is decoded from a cookie
 * the browser controls, while getUser revalidates it against Supabase. For a
 * page that decides whose heart-rate data to render, that difference matters.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isDbConfigured()) return null;

  const impersonated = await devViewer();
  if (impersonated) return impersonated;

  if (!isSupabaseConfigured()) return null;

  const supabase = await createReadOnlyClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = data.user;
  const db = getDb();

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
  const avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : null;

  // First sign-in creates the profile. Later sign-ins refresh the Google-owned
  // fields but never the handle, which the member may have renamed.
  await db
    .insert(schema.profiles)
    .values({
      id: user.id,
      email: user.email ?? null,
      fullName,
      avatarUrl,
    })
    .onConflictDoUpdate({
      target: schema.profiles.id,
      set: { email: user.email ?? null, fullName, avatarUrl, updatedAt: new Date() },
    });

  const handle = await ensureHandle(user.id, fullName, user.email ?? null);

  const rows = await db
    .select({
      locale: schema.profiles.locale,
      whoopUserId: schema.accounts.userId,
    })
    .from(schema.profiles)
    .leftJoin(schema.accounts, eq(schema.accounts.profileId, schema.profiles.id))
    .where(eq(schema.profiles.id, user.id))
    .limit(1);

  return {
    profileId: user.id,
    handle,
    email: user.email ?? null,
    fullName,
    avatarUrl,
    locale: rows[0]?.locale ?? "en",
    whoopUserId: rows[0]?.whoopUserId ?? null,
  };
});

/**
 * Signs in as a seeded profile, for local development only.
 *
 * Supabase Auth needs a real hosted project, which makes every signed-in
 * surface — friends, sharing, the credentials panel — unreachable while working
 * offline or on a fresh clone. `npm run seed` writes profiles; this lets you be
 * one of them.
 *
 * Guarded on NODE_ENV rather than on the variable alone, so a production build
 * ignores it even if the variable is set in the environment by accident. That
 * is the whole safety argument: the bypass cannot exist in a production bundle.
 */
async function devViewer(): Promise<Viewer | null> {
  if (process.env.NODE_ENV === "production") return null;

  const profileId = process.env.DEV_VIEWER_PROFILE_ID;
  if (!profileId) return null;

  const rows = await getDb()
    .select({
      id: schema.profiles.id,
      handle: schema.profiles.handle,
      email: schema.profiles.email,
      fullName: schema.profiles.fullName,
      avatarUrl: schema.profiles.avatarUrl,
      locale: schema.profiles.locale,
      whoopUserId: schema.accounts.userId,
    })
    .from(schema.profiles)
    .leftJoin(schema.accounts, eq(schema.accounts.profileId, schema.profiles.id))
    .where(eq(schema.profiles.id, profileId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    console.warn(`DEV_VIEWER_PROFILE_ID ${profileId} matches no profile — run npm run seed`);
    return null;
  }

  return {
    profileId: row.id,
    handle: row.handle ?? `member.${row.id.slice(0, 8)}`,
    email: row.email,
    fullName: row.fullName,
    avatarUrl: row.avatarUrl,
    locale: row.locale,
    whoopUserId: row.whoopUserId ?? null,
  };
}

/** The viewer's WHOOP user id, or null when no strap is linked. */
export async function getViewerWhoopUserId(): Promise<number | null> {
  return (await getViewer())?.whoopUserId ?? null;
}
