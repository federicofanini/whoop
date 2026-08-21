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

interface GoogleFields {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

/**
 * Reads the Supabase session and resolves it to a profile.
 *
 * `getUser()` rather than `getSession()`: the session is decoded from a cookie
 * the browser controls, while getUser revalidates it against Supabase. For a
 * page that decides whose heart-rate data to render, that difference matters.
 *
 * This is on the critical path of every render, so it is a **read**. Creating
 * the profile row and minting a handle are writes that belong to sign-in, and
 * live in `provisionViewer` below — the fallback here only fires for a profile
 * that predates handles or a session whose callback never completed.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured() || !isDbConfigured()) return null;

  const supabase = await createReadOnlyClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = data.user;
  const google = googleFields(user.user_metadata as Record<string, unknown> | undefined, user.email);

  try {
    const row = await selectProfile(user.id);

    // The common path: the row exists, has a handle, and Google has not changed
    // anything since last time. One SELECT, no writes.
    if (row?.handle && isFresh(row, google)) {
      return {
        profileId: user.id,
        handle: row.handle,
        ...google,
        locale: row.locale ?? "en",
        whoopUserId: row.whoopUserId,
      };
    }

    return await provisionViewer(user.id, google);
  } catch (dbError) {
    // Every page streams now, so throwing here would replace half-rendered
    // markup with an error screen. Reporting nobody signed in degrades the app
    // to its demo state, which is the same thing an unreachable database gives
    // every other read.
    console.error("Could not resolve the viewer's profile:", dbError);
    return null;
  }
});

/**
 * Creates or repairs the profile row, then returns the viewer.
 *
 * Called from the OAuth callback so the writes happen once, at sign-in, rather
 * than on every page render.
 */
export async function provisionViewer(
  profileId: string,
  google: GoogleFields,
): Promise<Viewer | null> {
  if (!isDbConfigured()) return null;
  const db = getDb();

  // First sign-in creates the profile. Later sign-ins refresh the Google-owned
  // fields but never the handle, which the member may have renamed.
  await db
    .insert(schema.profiles)
    .values({ id: profileId, ...google })
    .onConflictDoUpdate({
      target: schema.profiles.id,
      set: { ...google, updatedAt: new Date() },
    });

  const handle = await ensureHandle(profileId, google.fullName, google.email);
  const row = await selectProfile(profileId);

  return {
    profileId,
    handle,
    ...google,
    locale: row?.locale ?? "en",
    whoopUserId: row?.whoopUserId ?? null,
  };
}

interface ProfileRow {
  handle: string | null;
  locale: "en" | "it" | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  whoopUserId: number | null;
}

async function selectProfile(profileId: string): Promise<ProfileRow | null> {
  const rows = await getDb()
    .select({
      handle: schema.profiles.handle,
      locale: schema.profiles.locale,
      email: schema.profiles.email,
      fullName: schema.profiles.fullName,
      avatarUrl: schema.profiles.avatarUrl,
      whoopUserId: schema.accounts.userId,
    })
    .from(schema.profiles)
    .leftJoin(schema.accounts, eq(schema.accounts.profileId, schema.profiles.id))
    .where(eq(schema.profiles.id, profileId))
    .limit(1);
  return rows[0] ?? null;
}

/** True when the stored copy of the Google-owned fields still matches the token. */
function isFresh(row: ProfileRow, google: GoogleFields): boolean {
  return (
    row.email === google.email &&
    row.fullName === google.fullName &&
    row.avatarUrl === google.avatarUrl
  );
}

export function googleFields(
  metadata: Record<string, unknown> | undefined,
  email: string | undefined,
): GoogleFields {
  const meta = metadata ?? {};
  return {
    email: email ?? null,
    fullName: typeof meta.full_name === "string" ? meta.full_name : null,
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
}

/** The viewer's WHOOP user id, or null when no strap is linked. */
export async function getViewerWhoopUserId(): Promise<number | null> {
  return (await getViewer())?.whoopUserId ?? null;
}
