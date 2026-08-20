import { and, eq, or, sql } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/core/db";

export interface FriendProfile {
  profileId: string;
  handle: string;
  fullName: string | null;
  avatarUrl: string | null;
  /**
   * The WHOOP account this person has linked, if any. Null means they have
   * signed in but never connected a strap — a real state, not an error.
   */
  whoopUserId: number | null;
}

export interface PendingRequest {
  id: string;
  profile: FriendProfile;
  createdAt: Date;
}

/** An accepted friend, carrying the row id so the card can offer to end it. */
export interface Friend extends FriendProfile {
  friendshipId: string;
}

export interface FriendGraph {
  friends: Friend[];
  /** Requests waiting on *you*. These are the ones with a decision to make. */
  incoming: PendingRequest[];
  /** Requests you sent that have not been answered. */
  outgoing: PendingRequest[];
}

interface ProfileRow {
  profileId: string;
  handle: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  whoopUserId: number | null;
}

function toProfile(row: ProfileRow): FriendProfile {
  return {
    profileId: row.profileId,
    // A profile without a handle cannot be searched for, but it can still be a
    // friend; fall back rather than drop it from the list.
    handle: row.handle ?? `member.${row.profileId.slice(0, 8)}`,
    fullName: row.fullName,
    avatarUrl: row.avatarUrl,
    whoopUserId: row.whoopUserId,
  };
}

export function displayName(profile: FriendProfile): string {
  return profile.fullName?.trim() || `@${profile.handle}`;
}

/**
 * Everyone connected to `profileId`, in all three states, in one round trip.
 *
 * A friendship row names two people and the viewer is one of them, so the
 * "other" profile is whichever column the viewer is not in. Doing that in SQL
 * keeps this to a single join instead of a fan-out of per-row lookups.
 */
export async function loadFriendGraph(profileId: string): Promise<FriendGraph> {
  if (!isDbConfigured()) return { friends: [], incoming: [], outgoing: [] };

  const db = getDb();
  const rows = await db
    .select({
      id: schema.friendships.id,
      status: schema.friendships.status,
      requesterId: schema.friendships.requesterId,
      createdAt: schema.friendships.createdAt,
      profileId: schema.profiles.id,
      handle: schema.profiles.handle,
      fullName: schema.profiles.fullName,
      avatarUrl: schema.profiles.avatarUrl,
      whoopUserId: schema.accounts.userId,
    })
    .from(schema.friendships)
    .innerJoin(
      schema.profiles,
      // Join against the far side of the pair, whichever column that is.
      sql`${schema.profiles.id} = CASE
            WHEN ${schema.friendships.requesterId} = ${profileId} THEN ${schema.friendships.addresseeId}
            ELSE ${schema.friendships.requesterId}
          END`,
    )
    .leftJoin(schema.accounts, eq(schema.accounts.profileId, schema.profiles.id))
    .where(
      or(
        eq(schema.friendships.requesterId, profileId),
        eq(schema.friendships.addresseeId, profileId),
      ),
    );

  const graph: FriendGraph = { friends: [], incoming: [], outgoing: [] };

  for (const row of rows) {
    const profile = toProfile(row);
    if (row.status === "accepted") {
      graph.friends.push({ ...profile, friendshipId: row.id });
    } else if (row.requesterId === profileId) {
      graph.outgoing.push({ id: row.id, profile, createdAt: row.createdAt });
    } else {
      graph.incoming.push({ id: row.id, profile, createdAt: row.createdAt });
    }
  }

  graph.friends.sort((a, b) => displayName(a).localeCompare(displayName(b)));
  graph.incoming.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  graph.outgoing.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return graph;
}

/**
 * The authorisation check every friend-scoped read goes through.
 *
 * Returns the friend's profile only when an accepted friendship exists in
 * either direction. Anything else — pending, declined, absent, or the viewer
 * guessing a handle — comes back null and the page 404s.
 */
export async function loadFriendIfPermitted(
  viewerProfileId: string,
  handle: string,
): Promise<FriendProfile | null> {
  if (!isDbConfigured()) return null;

  const db = getDb();
  const rows = await db
    .select({
      profileId: schema.profiles.id,
      handle: schema.profiles.handle,
      fullName: schema.profiles.fullName,
      avatarUrl: schema.profiles.avatarUrl,
      whoopUserId: schema.accounts.userId,
    })
    .from(schema.profiles)
    .innerJoin(
      schema.friendships,
      and(
        eq(schema.friendships.status, "accepted"),
        or(
          and(
            eq(schema.friendships.requesterId, viewerProfileId),
            eq(schema.friendships.addresseeId, schema.profiles.id),
          ),
          and(
            eq(schema.friendships.addresseeId, viewerProfileId),
            eq(schema.friendships.requesterId, schema.profiles.id),
          ),
        ),
      ),
    )
    .leftJoin(schema.accounts, eq(schema.accounts.profileId, schema.profiles.id))
    .where(eq(schema.profiles.handle, handle))
    .limit(1);

  return rows[0] ? toProfile(rows[0]) : null;
}

export async function loadProfile(profileId: string): Promise<FriendProfile | null> {
  if (!isDbConfigured()) return null;
  const db = getDb();
  const rows = await db
    .select({
      profileId: schema.profiles.id,
      handle: schema.profiles.handle,
      fullName: schema.profiles.fullName,
      avatarUrl: schema.profiles.avatarUrl,
      whoopUserId: schema.accounts.userId,
    })
    .from(schema.profiles)
    .leftJoin(schema.accounts, eq(schema.accounts.profileId, schema.profiles.id))
    .where(eq(schema.profiles.id, profileId))
    .limit(1);
  return rows[0] ? toProfile(rows[0]) : null;
}

/** Resolves a handle to a profile id, for the invite form. */
export async function findProfileByHandle(handle: string): Promise<string | null> {
  if (!isDbConfigured()) return null;
  const db = getDb();
  const rows = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.handle, handle))
    .limit(1);
  return rows[0]?.id ?? null;
}
