import { randomUUID } from "node:crypto";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/core/db";
import { ensureHandle } from "@/core/friends/handles-store";
import { telegramDisplayName } from "@/core/telegram/username";
import { createReadOnlyClient, isSupabaseConfigured } from "./supabase";
import { readTelegramSession } from "./session";

/**
 * Who is asking, resolved once per request.
 *
 * Three separate facts live here and are deliberately not conflated:
 *
 *   - the **profile**, which is the identity everything else keys off;
 *   - **how that identity was proved** — Google, Telegram, or eventually both;
 *   - the **WHOOP connection**, which may not exist yet.
 *
 * Signing in gets you a profile immediately; you can be invited and approve
 * friends before ever linking a strap. Only the last fact unlocks data, and
 * only the first unlocks the app.
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
  /** Their @name on Telegram, when the bot knows them. */
  telegramUsername: string | null;
  /**
   * Which credentials this profile has ever proved — not which one opened the
   * current session. Both are meant to be true one day; the settings page reads
   * this to say which half is still missing.
   */
  identity: { google: boolean; telegram: boolean };
  /** The method behind the session being served right now. */
  signedInWith: "google" | "telegram";
}

interface GoogleFields {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

/**
 * Resolves whoever is signed in, by either method.
 *
 * Supabase first, because a Google session is the stronger claim and because
 * checking it is what the app did before Telegram existed. A member who has
 * linked both and holds two live sessions is one profile either way — the
 * lookups converge on the same row.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isDbConfigured()) return null;

  try {
    return (await viewerFromSupabase()) ?? (await viewerFromTelegram());
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
 * The Google path.
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
async function viewerFromSupabase(): Promise<Viewer | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createReadOnlyClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = data.user;
  const google = googleFields(user.user_metadata as Record<string, unknown> | undefined, user.email);
  const row = await selectProfile(user.id);

  // The common path: the row exists, has a handle, and Google has not changed
  // anything since last time. One SELECT, no writes.
  if (row?.handle && isFresh(row, google)) return toViewer(user.id, row.handle, row, "google");

  return provisionViewer(user.id, google);
}

/**
 * The Telegram path.
 *
 * The cookie already carries the profile id and was signed by this deployment,
 * so this is one indexed SELECT — no round trip to any auth server, because
 * there is no auth server. The row still has to exist: a session that outlives
 * the profile it names is not a session.
 */
async function viewerFromTelegram(): Promise<Viewer | null> {
  const session = await readTelegramSession();
  if (!session) return null;

  const row = await selectProfile(session.profileId);
  if (!row) return null;

  const handle = row.handle ?? (await ensureHandle(session.profileId, row.fullName, row.email));
  return toViewer(session.profileId, handle, row, "telegram");
}

/**
 * Creates or repairs the profile behind a Google account, then returns the viewer.
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
  const now = new Date();

  // First sign-in creates the profile. Later sign-ins refresh the Google-owned
  // fields but never the handle, which the member may have renamed.
  await db
    .insert(schema.profiles)
    .values({ id: profileId, ...google, googleLinkedAt: now })
    .onConflictDoUpdate({
      target: schema.profiles.id,
      set: { ...google, googleLinkedAt: now, updatedAt: now },
    });

  const handle = await ensureHandle(profileId, google.fullName, google.email);
  const row = await selectProfile(profileId);

  return toViewer(profileId, handle, row, "google");
}

export interface TelegramIdentityFields {
  telegramUserId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

export type LinkResult =
  | { ok: true; profileId: string }
  | { ok: false; errorKey: string };

/**
 * Attaches a verified Telegram account to a profile, creating one if needed.
 *
 * Four cases, in the order they are checked:
 *
 *   1. **This Telegram account already belongs to somebody, and somebody else
 *      is signed in.** Refused. Both profiles are real, each may own
 *      friendships and a WHOOP connection, and picking a winner here would
 *      silently strand the other. Merging is a deliberate operation, not
 *      something to do on the back of a login.
 *   2. **This Telegram account is already known.** Return its profile — the
 *      same person coming back on a new device.
 *   3. **Already signed in.** The Telegram account joins the profile in front
 *      of us. This is the half of "both methods" that can be built today: sign
 *      in with Google, verify a code, and the two are the same person for good.
 *   4. **Neither.** A brand new profile, with a locally minted UUID because
 *      there is no Supabase user to borrow one from.
 */
export async function linkTelegramIdentity(
  fields: TelegramIdentityFields,
  existingProfileId: string | null,
): Promise<LinkResult> {
  const db = getDb();
  const now = new Date();
  const fullName = telegramDisplayName(fields.firstName, fields.lastName);

  const claimed = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.telegramUserId, fields.telegramUserId))
    .limit(1);

  const claimedBy = claimed[0]?.id;
  if (claimedBy && existingProfileId && claimedBy !== existingProfileId) {
    return { ok: false, errorKey: "signIn.telegram.otherProfile" };
  }

  const profileId = claimedBy ?? existingProfileId ?? randomUUID();

  await db
    .insert(schema.profiles)
    .values({
      id: profileId,
      fullName,
      telegramUserId: fields.telegramUserId,
      telegramUsername: fields.username,
      telegramLinkedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.profiles.id,
      set: {
        telegramUserId: fields.telegramUserId,
        telegramUsername: fields.username,
        telegramLinkedAt: now,
        // A member who already has a name keeps it — linking Telegram to a
        // Google profile must not quietly rename them to their Telegram alias.
        fullName: sql`coalesce(${schema.profiles.fullName}, ${fullName})`,
        updatedAt: now,
      },
    });

  await ensureHandle(profileId, fullName ?? fields.username, null);
  return { ok: true, profileId };
}

interface ProfileRow {
  handle: string | null;
  locale: "en" | "it" | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  whoopUserId: number | null;
  telegramUsername: string | null;
  googleLinkedAt: Date | null;
  telegramLinkedAt: Date | null;
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
      telegramUsername: schema.profiles.telegramUsername,
      googleLinkedAt: schema.profiles.googleLinkedAt,
      telegramLinkedAt: schema.profiles.telegramLinkedAt,
    })
    .from(schema.profiles)
    .leftJoin(schema.accounts, eq(schema.accounts.profileId, schema.profiles.id))
    .where(eq(schema.profiles.id, profileId))
    .limit(1);
  return rows[0] ?? null;
}

function toViewer(
  profileId: string,
  handle: string,
  row: ProfileRow | null,
  signedInWith: "google" | "telegram",
): Viewer {
  return {
    profileId,
    handle,
    email: row?.email ?? null,
    fullName: row?.fullName ?? null,
    avatarUrl: row?.avatarUrl ?? null,
    locale: row?.locale ?? "en",
    whoopUserId: row?.whoopUserId ?? null,
    telegramUsername: row?.telegramUsername ?? null,
    identity: {
      google: Boolean(row?.googleLinkedAt),
      telegram: Boolean(row?.telegramLinkedAt),
    },
    signedInWith,
  };
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
