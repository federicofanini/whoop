import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/core/db";
import { schema } from "@/core/db";
import { suggestHandle } from "./handles";

/**
 * Assigns a handle to a profile that has none, retrying past collisions.
 *
 * Called on every sign-in rather than only on insert, so a profile created
 * before handles existed picks one up the next time its owner signs in.
 */
export async function ensureHandle(
  profileId: string,
  fullName: string | null,
  email: string | null,
): Promise<string> {
  const db = getDb();
  const existing = await db
    .select({ handle: schema.profiles.handle })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);

  if (existing[0]?.handle) return existing[0].handle;

  const base = suggestHandle(fullName, email, profileId);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    // marco.fanini, then marco.fanini2, marco.fanini3 …
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`.slice(0, 20);
    const updated = await db
      .update(schema.profiles)
      .set({ handle: candidate, updatedAt: new Date() })
      .where(and(eq(schema.profiles.id, profileId), isNull(schema.profiles.handle)))
      .returning({ handle: schema.profiles.handle })
      // A unique violation means someone else holds the candidate; try the next.
      .catch(() => [] as { handle: string | null }[]);

    if (updated[0]?.handle) return updated[0].handle;

    // The update may have matched nothing because a concurrent sign-in already
    // set a handle — in which case that one is the answer.
    const now = await db
      .select({ handle: schema.profiles.handle })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, profileId))
      .limit(1);
    if (now[0]?.handle) return now[0].handle;
  }

  // Every candidate collided, which takes deliberate effort. Fall back to the
  // one string that cannot: a slice of the profile UUID.
  const fallback = `member.${profileId.slice(0, 8)}`;
  await db
    .update(schema.profiles)
    .set({ handle: fallback, updatedAt: new Date() })
    .where(eq(schema.profiles.id, profileId));
  return fallback;
}



