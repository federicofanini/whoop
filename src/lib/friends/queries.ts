import { and, eq, or, sql } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/lib/db";
import { suggestHandle } from "./handles";

export interface FriendProfile {
  userId: number;
  handle: string;
  firstName: string | null;
  lastName: string | null;
}

/** An accepted friend, carrying the row id so the card can offer to end it. */
export interface Friend extends FriendProfile {
  friendshipId: string;
}

export interface PendingRequest {
  id: string;
  profile: FriendProfile;
  createdAt: Date;
}

export interface FriendGraph {
  friends: Friend[];
  /** Requests waiting on *you*. These are the ones with a decision to make. */
  incoming: PendingRequest[];
  /** Requests you sent that have not been answered. */
  outgoing: PendingRequest[];
}

function toProfile(row: {
  userId: number;
  handle: string | null;
  firstName: string | null;
  lastName: string | null;
}): FriendProfile {
  return {
    userId: row.userId,
    // A row without a handle cannot be searched for, but it can still be a
    // friend from before the column existed; fall back rather than drop it.
    handle: row.handle ?? `whoop.${row.userId}`,
    firstName: row.firstName,
    lastName: row.lastName,
  };
}

export function displayName(profile: FriendProfile): string {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return name || `@${profile.handle}`;
}

/**
 * Everyone connected to `userId`, in all three states, in one round trip.
 *
 * A friendship row names two people and the viewer is one of them, so the
 * "other" account is whichever column the viewer is not in. Doing that in SQL
 * keeps this to a single join instead of a fan-out of per-row lookups.
 */
export async function loadFriendGraph(userId: number): Promise<FriendGraph> {
  if (!isDbConfigured()) return { friends: [], incoming: [], outgoing: [] };

  const db = getDb();
  const rows = await db
    .select({
      id: schema.friendships.id,
      status: schema.friendships.status,
      requesterId: schema.friendships.requesterId,
      createdAt: schema.friendships.createdAt,
      otherUserId: schema.accounts.userId,
      handle: schema.accounts.handle,
      firstName: schema.accounts.firstName,
      lastName: schema.accounts.lastName,
    })
    .from(schema.friendships)
    .innerJoin(
      schema.accounts,
      // Join against the far side of the pair, whichever column that is.
      sql`${schema.accounts.userId} = CASE
            WHEN ${schema.friendships.requesterId} = ${userId} THEN ${schema.friendships.addresseeId}
            ELSE ${schema.friendships.requesterId}
          END`,
    )
    .where(
      or(eq(schema.friendships.requesterId, userId), eq(schema.friendships.addresseeId, userId)),
    );

  const graph: FriendGraph = { friends: [], incoming: [], outgoing: [] };

  for (const row of rows) {
    const profile = toProfile({
      userId: row.otherUserId,
      handle: row.handle,
      firstName: row.firstName,
      lastName: row.lastName,
    });

    if (row.status === "accepted") {
      graph.friends.push({ ...profile, friendshipId: row.id });
    } else if (row.requesterId === userId) {
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
  viewerId: number,
  handle: string,
): Promise<FriendProfile | null> {
  if (!isDbConfigured()) return null;

  const db = getDb();
  const rows = await db
    .select({
      userId: schema.accounts.userId,
      handle: schema.accounts.handle,
      firstName: schema.accounts.firstName,
      lastName: schema.accounts.lastName,
    })
    .from(schema.accounts)
    .innerJoin(
      schema.friendships,
      and(
        eq(schema.friendships.status, "accepted"),
        or(
          and(
            eq(schema.friendships.requesterId, viewerId),
            eq(schema.friendships.addresseeId, schema.accounts.userId),
          ),
          and(
            eq(schema.friendships.addresseeId, viewerId),
            eq(schema.friendships.requesterId, schema.accounts.userId),
          ),
        ),
      ),
    )
    .where(eq(schema.accounts.handle, handle))
    .limit(1);

  return rows[0] ? toProfile(rows[0]) : null;
}

export async function loadAccountProfile(userId: number): Promise<FriendProfile | null> {
  if (!isDbConfigured()) return null;
  const db = getDb();
  const rows = await db
    .select({
      userId: schema.accounts.userId,
      handle: schema.accounts.handle,
      firstName: schema.accounts.firstName,
      lastName: schema.accounts.lastName,
    })
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
    .limit(1);
  return rows[0] ? toProfile(rows[0]) : null;
}

/**
 * Assigns a handle to an account that has none, retrying past collisions.
 *
 * Called on every link rather than only on insert, so an account created before
 * handles existed picks one up the next time its owner signs in.
 */
export async function ensureHandle(
  userId: number,
  firstName: string | null,
  lastName: string | null,
): Promise<string> {
  const db = getDb();
  const existing = await db
    .select({ handle: schema.accounts.handle })
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
    .limit(1);

  if (existing[0]?.handle) return existing[0].handle;

  const base = suggestHandle(firstName, lastName, userId);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    // first.last, then first.last2, first.last3 …
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`.slice(0, 20);
    const updated = await db
      .update(schema.accounts)
      .set({ handle: candidate, updatedAt: new Date() })
      .where(and(eq(schema.accounts.userId, userId), sql`${schema.accounts.handle} IS NULL`))
      .returning({ handle: schema.accounts.handle })
      // A unique-violation means someone else holds the candidate; try the next.
      .catch(() => [] as { handle: string | null }[]);

    if (updated[0]?.handle) return updated[0].handle;

    // The update may have matched nothing because a concurrent request already
    // set a handle — in which case that one is the answer.
    const now = await db
      .select({ handle: schema.accounts.handle })
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, userId))
      .limit(1);
    if (now[0]?.handle) return now[0].handle;
  }

  // Every candidate collided, which takes a deliberate effort. Fall back to the
  // one string that cannot: the WHOOP user id.
  const fallback = `whoop.${userId}`;
  await db
    .update(schema.accounts)
    .set({ handle: fallback, updatedAt: new Date() })
    .where(eq(schema.accounts.userId, userId));
  return fallback;
}
