import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isDbConfigured } from "@/core/db";
import { escapeHtml, isBotConfigured, sendMessage } from "@/core/telegram/bot";
import { forgetChat, rememberChat } from "@/core/telegram/registry";
import { telegramDisplayName } from "@/core/telegram/username";

export const runtime = "nodejs";

/**
 * Everything Strap Bot hears.
 *
 * The bot is not a chat interface and is not trying to become one. Its entire
 * job is to be a channel the app can reach a person on: this handler records
 * who has opened that channel, and the sign-in flow sends codes down it.
 *
 * Telegram retries any non-2xx delivery, so anything that is merely not
 * actionable — an unconfigured database, a sticker, a message from a group —
 * still answers 200. Only an unauthenticated call is refused.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured() || !isBotConfigured()) {
    return NextResponse.json({ ok: true, skipped: "bot or database not configured" });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true, skipped: "malformed update" });
  }

  const message = update.message ?? update.edited_message;
  const from = message?.from;
  const chat = message?.chat;

  // Private chats only. A bot added to a group would otherwise register every
  // member of it as reachable, and the group as the place to send their codes.
  if (!from || !chat || chat.type !== "private" || from.is_bot) {
    return NextResponse.json({ ok: true, skipped: "not a private message from a person" });
  }

  const command = (message?.text ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";

  try {
    if (command === "/stop") {
      await forgetChat(from.id);
      await sendMessage(chat.id, STOPPED);
      return NextResponse.json({ ok: true, command });
    }

    await rememberChat({
      telegramUserId: from.id,
      chatId: chat.id,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      languageCode: from.language_code ?? null,
    });

    if (command === "/start" || command === "/help") {
      await sendMessage(chat.id, welcome(from));
    } else if (command === "/whoami") {
      await sendMessage(chat.id, whoami(from));
    }

    return NextResponse.json({ ok: true, command: command || "registered" });
  } catch (err) {
    // A 500 asks Telegram to redeliver, which is what a transient database
    // failure deserves: the registration is worth retrying.
    const detail = err instanceof Error ? err.message : "update handling failed";
    console.error("Telegram webhook failed:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

/**
 * Telegram sends a secret token this deployment chose, in a header, on every
 * delivery. Without it the webhook URL is the only secret — and a URL leaks
 * into logs, proxies and browser history in a way a header does not.
 */
function authorized(request: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  // Fail closed. An unset secret used to mean "skip the check", which leaves a
  // public endpoint anyone can use to register themselves as any chat id.
  if (!expected) return false;

  const offered = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  const offeredBytes = Buffer.from(offered);
  const expectedBytes = Buffer.from(expected);

  return offeredBytes.length === expectedBytes.length && timingSafeEqual(offeredBytes, expectedBytes);
}

function welcome(from: TelegramUser): string {
  const name = escapeHtml(telegramDisplayName(from.first_name, null) ?? "there");
  const username = from.username ? `@${escapeHtml(from.username)}` : null;

  return (
    `Hi ${name} — this is <b>Strap Bot</b>.\n\n` +
    "You are now registered, which is all this chat is for: it is where your " +
    "sign-in codes arrive.\n\n" +
    (username
      ? `Go back to Strap, enter <b>${username}</b>, and I will send you a six-digit code.`
      : "One thing first: you have no Telegram username. Set one in " +
        "<b>Settings → Username</b>, send me any message so I see it, then use it to sign in.") +
    "\n\nSend /stop at any time and I will stop being able to reach you."
  );
}

function whoami(from: TelegramUser): string {
  const username = from.username ? `@${escapeHtml(from.username)}` : "— none set";
  return `Telegram id <code>${from.id}</code>\nUsername ${username}`;
}

const STOPPED =
  "Done — I will not send you anything else, and your username can no longer " +
  "be used to sign in to Strap.\n\nSend /start whenever you want that back.";

interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramMessage {
  text?: string;
  from?: TelegramUser;
  chat?: { id: number; type: string };
}

interface TelegramUpdate {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}
