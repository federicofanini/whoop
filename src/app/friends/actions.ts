"use server";

import { revalidatePath } from "next/cache";
import { and, eq, or } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { validateHandle } from "@/lib/friends/handles";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function requireSession(): Promise<number | ActionResult> {
  if (!isDbConfigured()) {
    return { ok: false, message: "No database configured — friends need one to live in." };
  }
  const userId = await getSessionUserId();
  if (userId === null) {
    return { ok: false, message: "Connect your WHOOP account first." };
  }
  return userId;
}

/**
 * Sends a friend request by handle.
 *
 * Two states are deliberately indistinguishable in the response: "no such
 * handle" and "that handle exists". Saying which would turn this form into a
 * membership oracle — anyone could enumerate handles to learn who uses the app.
 * The request is created either way; only a real account ever sees one.
 */
export async function sendFriendRequest(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  if (typeof session !== "number") return session;

  const raw = String(formData.get("handle") ?? "");
  const parsed = validateHandle(raw);
  if (!parsed.ok) return { ok: false, message: parsed.error };

  const db = getDb();
  const target = await db
    .select({ userId: schema.accounts.userId })
    .from(schema.accounts)
    .where(eq(schema.accounts.handle, parsed.handle))
    .limit(1);

  const sent = { ok: true, message: `Request sent to @${parsed.handle}.` } as const;
  const targetId = target[0]?.userId;
  if (targetId === undefined) return sent;

  if (targetId === session) {
    return { ok: false, message: "That is your own handle." };
  }

  // A pair is one row in whichever direction it was created, so check both
  // before inserting — otherwise inviting someone who already invited you
  // creates a second, mirrored row that neither side can resolve.
  const existing = await db
    .select({ id: schema.friendships.id, status: schema.friendships.status, requesterId: schema.friendships.requesterId })
    .from(schema.friendships)
    .where(
      or(
        and(
          eq(schema.friendships.requesterId, session),
          eq(schema.friendships.addresseeId, targetId),
        ),
        and(
          eq(schema.friendships.requesterId, targetId),
          eq(schema.friendships.addresseeId, session),
        ),
      ),
    )
    .limit(1);

  const row = existing[0];
  if (row?.status === "accepted") {
    return { ok: false, message: `You and @${parsed.handle} are already sharing.` };
  }
  if (row && row.requesterId === session) {
    return { ok: true, message: `Already waiting on @${parsed.handle} to approve.` };
  }
  if (row) {
    // They invited you first. Treat this as the acceptance it plainly is.
    await db
      .update(schema.friendships)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(schema.friendships.id, row.id));
    revalidatePath("/friends");
    return { ok: true, message: `@${parsed.handle} had already invited you — you are now sharing.` };
  }

  await db
    .insert(schema.friendships)
    .values({ requesterId: session, addresseeId: targetId, status: "pending" })
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
  const session = await requireSession();
  if (typeof session !== "number") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = getDb();
  await db
    .update(schema.friendships)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(
      and(
        eq(schema.friendships.id, id),
        eq(schema.friendships.addresseeId, session),
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
  const session = await requireSession();
  if (typeof session !== "number") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = getDb();
  await db
    .delete(schema.friendships)
    .where(
      and(
        eq(schema.friendships.id, id),
        or(
          eq(schema.friendships.requesterId, session),
          eq(schema.friendships.addresseeId, session),
        ),
      ),
    );

  revalidatePath("/friends");
}

/** Renames your handle, which is how other people find you. */
export async function updateHandle(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  if (typeof session !== "number") return session;

  const parsed = validateHandle(String(formData.get("handle") ?? ""));
  if (!parsed.ok) return { ok: false, message: parsed.error };

  const db = getDb();
  const taken = await db
    .select({ userId: schema.accounts.userId })
    .from(schema.accounts)
    .where(eq(schema.accounts.handle, parsed.handle))
    .limit(1);

  if (taken[0] && taken[0].userId !== session) {
    return { ok: false, message: `@${parsed.handle} is taken.` };
  }

  await db
    .update(schema.accounts)
    .set({ handle: parsed.handle, updatedAt: new Date() })
    .where(eq(schema.accounts.userId, session));

  revalidatePath("/friends");
  revalidatePath("/settings");
  return { ok: true, message: `You are @${parsed.handle}.` };
}
