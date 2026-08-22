import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb, schema } from "@/core/db";
import { normalizeTelegramUsername } from "./username";

/**
 * The bot's address book.
 *
 * Written by the webhook whenever an update arrives, read by sign-in to answer
 * the only question that matters there: is there a chat we are allowed to send
 * a code to for this username?
 */

export interface TelegramIdentity {
  telegramUserId: number;
  chatId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
}

/**
 * Records — or refreshes — someone the bot can now message.
 *
 * Called on every update rather than only on /start, because a display name or
 * username changed inside Telegram never produces an event of its own; the
 * change simply rides along on the next message.
 */
export async function rememberChat(identity: TelegramIdentity): Promise<void> {
  const db = getDb();
  const username = identity.username ? normalizeTelegramUsername(identity.username) : null;

  // Telegram releases an abandoned username for anyone to claim, so the unique
  // index can legitimately be held by a stale row. Vacating it first turns what
  // would be a constraint violation into what actually happened: the name moved.
  if (username) {
    await db
      .update(schema.telegramChats)
      .set({ username: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.telegramChats.username, username),
          ne(schema.telegramChats.telegramUserId, identity.telegramUserId),
        ),
      );
  }

  await db
    .insert(schema.telegramChats)
    .values({
      telegramUserId: identity.telegramUserId,
      chatId: identity.chatId,
      username,
      firstName: identity.firstName,
      lastName: identity.lastName,
      languageCode: identity.languageCode,
    })
    .onConflictDoUpdate({
      target: schema.telegramChats.telegramUserId,
      set: {
        chatId: identity.chatId,
        username,
        firstName: identity.firstName,
        lastName: identity.lastName,
        languageCode: identity.languageCode,
        // Coming back after /stop is consent to be messaged again.
        blockedAt: null,
        updatedAt: new Date(),
      },
    });

  // A username that moved to this account has to be cleared from the profile
  // that cached it, or two people appear to hold the same handle in Telegram.
  if (username) {
    await db
      .update(schema.profiles)
      .set({ telegramUsername: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.profiles.telegramUsername, username),
          ne(schema.profiles.telegramUserId, identity.telegramUserId),
        ),
      );

    await db
      .update(schema.profiles)
      .set({ telegramUsername: username, updatedAt: new Date() })
      .where(eq(schema.profiles.telegramUserId, identity.telegramUserId));
  }
}

/** Marks someone as not wanting messages. The row stays; sign-in stops working. */
export async function forgetChat(telegramUserId: number): Promise<void> {
  await getDb()
    .update(schema.telegramChats)
    .set({ blockedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.telegramChats.telegramUserId, telegramUserId));
}

export interface ReachableChat {
  telegramUserId: number;
  chatId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

/**
 * The chat behind a username, or null when there is nobody to message.
 *
 * Null covers three cases the caller must keep indistinguishable: no such
 * Telegram account, an account that never started the bot, and one that asked
 * it to stop. Saying which would turn the sign-in form into a directory of who
 * uses this app.
 */
export async function reachableChatFor(username: string): Promise<ReachableChat | null> {
  const rows = await getDb()
    .select({
      telegramUserId: schema.telegramChats.telegramUserId,
      chatId: schema.telegramChats.chatId,
      username: schema.telegramChats.username,
      firstName: schema.telegramChats.firstName,
      lastName: schema.telegramChats.lastName,
    })
    .from(schema.telegramChats)
    .where(
      and(
        eq(schema.telegramChats.username, normalizeTelegramUsername(username)),
        isNull(schema.telegramChats.blockedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
