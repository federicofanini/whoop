import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/core/db";
import { escapeHtml, sendMessage } from "@/core/telegram/bot";

/**
 * Six digits, delivered over Telegram, good for five minutes.
 *
 * The reference implementation this is adapted from kept codes in Redis. Here
 * they live in Postgres, which the app already has: a login code is written
 * once and read once within five minutes, so the only property Redis was
 * providing was expiry — and a timestamp column expresses that just as well
 * without a second piece of infrastructure to run, secure and pay for.
 */

const CODE_TTL_MS = 5 * 60 * 1000;
/** Guesses allowed against one code before it is destroyed. */
const MAX_ATTEMPTS = 5;
/** Codes one IP may ask for per window, whoever they ask for them as. */
const MAX_REQUESTS_PER_IP = 5;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;

/**
 * Whether this IP has any budget left.
 *
 * Counted per IP rather than per username: the thing worth limiting is somebody
 * walking a list of usernames to find which ones the bot knows, and a per-user
 * limit does nothing about that.
 */
export async function withinRequestLimit(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - REQUEST_WINDOW_MS);
  const rows = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.loginCodes)
    .where(and(eq(schema.loginCodes.requestIp, ip), gt(schema.loginCodes.createdAt, since)));

  return (rows[0]?.count ?? 0) < MAX_REQUESTS_PER_IP;
}

/**
 * Mints a code, stores only its hash, and sends the plaintext to Telegram.
 *
 * The code never touches the database in a readable form. For the five minutes
 * it is alive, the row is a valid credential — and a leaked backup, a query
 * printed into a log, or a read replica somebody forgot about must not be a way
 * to sign in as another member.
 *
 * `randomInt` and not `Math.random`: this is a credential, and a predictable
 * one is worth precisely nothing.
 */
export async function issueLoginCode(
  telegramUserId: number,
  chatId: number,
  ip: string | null,
): Promise<boolean> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const db = getDb();

  // Asking for a new code invalidates the one before it, so two codes are never
  // live at once and a resend cannot be used to widen the guessing window.
  await db
    .update(schema.loginCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(schema.loginCodes.telegramUserId, telegramUserId),
        isNull(schema.loginCodes.consumedAt),
      ),
    );

  await db.insert(schema.loginCodes).values({
    telegramUserId,
    codeHash: hash(code),
    requestIp: ip,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  await pruneOldCodes();

  return sendMessage(chatId, codeMessage(code));
}

export type VerifyResult = "ok" | "invalid" | "too-many-attempts";

/**
 * Checks a code and consumes it. A correct code works exactly once.
 *
 * The attempt counter is incremented *before* the comparison, in its own
 * statement, so a client that fires a guess and drops the connection still pays
 * for it — otherwise the budget is trivially bypassed by never reading the
 * response.
 */
export async function verifyLoginCode(
  telegramUserId: number,
  code: string,
): Promise<VerifyResult> {
  const db = getDb();

  const live = await db
    .select({ id: schema.loginCodes.id, codeHash: schema.loginCodes.codeHash })
    .from(schema.loginCodes)
    .where(
      and(
        eq(schema.loginCodes.telegramUserId, telegramUserId),
        isNull(schema.loginCodes.consumedAt),
        gt(schema.loginCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(schema.loginCodes.createdAt))
    .limit(1);

  const row = live[0];
  if (!row) return "invalid";

  const counted = await db
    .update(schema.loginCodes)
    .set({ attempts: sql`${schema.loginCodes.attempts} + 1` })
    .where(eq(schema.loginCodes.id, row.id))
    .returning({ attempts: schema.loginCodes.attempts });

  if ((counted[0]?.attempts ?? MAX_ATTEMPTS + 1) > MAX_ATTEMPTS) {
    await consume(row.id);
    return "too-many-attempts";
  }

  if (!constantTimeEquals(row.codeHash, hash(code))) return "invalid";

  await consume(row.id);
  return "ok";
}

async function consume(id: string): Promise<void> {
  await getDb()
    .update(schema.loginCodes)
    .set({ consumedAt: new Date() })
    .where(eq(schema.loginCodes.id, id));
}

/**
 * Drops rows old enough to be useless for both verification and rate limiting.
 *
 * Opportunistic rather than scheduled: the table only grows when somebody signs
 * in, so the cleanup naturally happens where the rows come from, and one extra
 * small DELETE is cheaper to operate than a cron entry that has to be monitored.
 */
async function pruneOldCodes(): Promise<void> {
  await getDb()
    .delete(schema.loginCodes)
    .where(sql`${schema.loginCodes.createdAt} < now() - interval '24 hours'`);
}

/** The message the member actually reads. `code` is a tap-to-copy monospace run. */
function codeMessage(code: string): string {
  return (
    `<b>${escapeHtml(code)}</b> is your Strap sign-in code.\n\n` +
    "It expires in 5 minutes and can be used once. " +
    "If you did not just try to sign in, ignore this message — " +
    "someone typed your username, and without this code they get nowhere."
  );
}

/** SHA-256, not a password KDF: this is a 6-digit value that lives 5 minutes. */
export function hash(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Strips everything that is not a digit, so "123 456" and "123-456" both work. */
export function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, "");
}

export const CODE_LENGTH = 6;
