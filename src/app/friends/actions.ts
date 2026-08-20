"use server";

import { revalidatePath } from "next/cache";
import { and, eq, or } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/core/db";
import { validateHandle } from "@/core/friends/handles";
import { findProfileByHandle } from "@/core/friends/queries";
import { getViewer } from "@/server/auth";

export interface ActionResult {
  ok: boolean;
  /** A key into the dictionary, so the message can be shown in either language. */
  key: string;
  /** Interpolated into the message — currently only ever the handle. */
  handle?: string;
}

async function requireViewer(): Promise<string | ActionResult> {
  if (!isDbConfigured()) return { ok: false, key: "friends.error.noDatabase" };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, key: "friends.error.signedOut" };
  return viewer.profileId;
}

/**
 * Sends a friend request by handle.
 *
 * Two states are deliberately indistinguishable in the response: "no such
 * handle" and "that handle exists". Saying which would turn this form into a
 * membership oracle — anyone could enumerate handles to learn who uses the app.
 */
export async function sendFriendRequest(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (typeof viewer !== "string") return viewer;

  const parsed = validateHandle(String(formData.get("handle") ?? ""));
  if (!parsed.ok) return { ok: false, key: parsed.errorKey };

  const handle = parsed.handle;
  const sent: ActionResult = { ok: true, key: "friends.sent", handle };

  const targetId = await findProfileByHandle(handle);
  if (!targetId) return sent;
  if (targetId === viewer) return { ok: false, key: "friends.error.self" };

  const db = getDb();
  // A pair is one row in whichever direction it was created, so check both
  // before inserting — otherwise inviting someone who already invited you
  // creates a second, mirrored row that neither side can resolve.
  const existing = await db
    .select({
      id: schema.friendships.id,
      status: schema.friendships.status,
      requesterId: schema.friendships.requesterId,
    })
    .from(schema.friendships)
    .where(
      or(
        and(
          eq(schema.friendships.requesterId, viewer),
          eq(schema.friendships.addresseeId, targetId),
        ),
        and(
          eq(schema.friendships.requesterId, targetId),
          eq(schema.friendships.addresseeId, viewer),
        ),
      ),
    )
    .limit(1);

  const row = existing[0];
  if (row?.status === "accepted") return { ok: false, key: "friends.error.already", handle };
  if (row && row.requesterId === viewer) return { ok: true, key: "friends.error.pending", handle };
  if (row) {
    // They invited you first. Treat this as the acceptance it plainly is.
    await db
      .update(schema.friendships)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(schema.friendships.id, row.id));
    revalidatePath("/friends");
    return { ok: true, key: "friends.reverseAccepted", handle };
  }

  await db
    .insert(schema.friendships)
    .values({ requesterId: viewer, addresseeId: targetId, status: "pending" })
    // Concurrent duplicate submissions land on the unique pair index.
    .onConflictDoNothing();

  revalidatePath("/friends");
  return sent;
}

/**
 * Approves an incoming request.
 *
 * Only the addressee can accept, enforced in the WHERE clause rather than by a
 * read-then-write: the id alone must never be enough to grant access to someone
 * else's health data.
 */
export async function acceptFriendRequest(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  if (typeof viewer !== "string") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await getDb()
    .update(schema.friendships)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(
      and(
        eq(schema.friendships.id, id),
        eq(schema.friendships.addresseeId, viewer),
        eq(schema.friendships.status, "pending"),
      ),
    );

  revalidatePath("/friends");
}

/**
 * Declines a request, withdraws one you sent, or removes an existing friend —
 * all three are the same operation: delete the row, if you are on it.
 *
 * Deleting rather than marking declined means a second invite later is a clean
 * new request, not an appeal against a stored "no".
 */
export async function removeFriendship(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  if (typeof viewer !== "string") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await getDb()
    .delete(schema.friendships)
    .where(
      and(
        eq(schema.friendships.id, id),
        or(
          eq(schema.friendships.requesterId, viewer),
          eq(schema.friendships.addresseeId, viewer),
        ),
      ),
    );

  revalidatePath("/friends");
}

/** Renames your handle, which is how other people find you. */
export async function updateHandle(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (typeof viewer !== "string") return viewer;

  const parsed = validateHandle(String(formData.get("handle") ?? ""));
  if (!parsed.ok) return { ok: false, key: parsed.errorKey };

  const owner = await findProfileByHandle(parsed.handle);
  if (owner && owner !== viewer) {
    return { ok: false, key: "friends.error.taken", handle: parsed.handle };
  }

  await getDb()
    .update(schema.profiles)
    .set({ handle: parsed.handle, updatedAt: new Date() })
    .where(eq(schema.profiles.id, viewer));

  revalidatePath("/friends");
  revalidatePath("/settings");
  return { ok: true, key: "friends.renamed", handle: parsed.handle };
}
