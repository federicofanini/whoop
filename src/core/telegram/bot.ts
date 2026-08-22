/**
 * The thin slice of the Telegram Bot API this app actually uses.
 *
 * Strap Bot only ever does two things: notice that somebody pressed Start, and
 * deliver a six-digit code to a chat that already exists. That is small enough
 * that a dependency-free `fetch` wrapper is the honest implementation — a bot
 * framework would bring long polling, a middleware stack and a scheduler for a
 * surface area of two methods.
 */

const API_ROOT = "https://api.telegram.org";

/** The bot's @name, used for the deep link that opens the chat. */
export const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export function isBotConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export class MissingBotTokenError extends Error {
  constructor() {
    super("TELEGRAM_BOT_TOKEN is not set — the bot cannot send anything");
    this.name = "MissingBotTokenError";
  }
}

interface BotApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/**
 * Calls one Bot API method.
 *
 * Errors are returned, not thrown: every caller here is on a path where the
 * right answer to "Telegram is down" is to tell the member to try again, not to
 * replace the page with a stack trace.
 */
export async function callBotApi<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new MissingBotTokenError();

  try {
    const response = await fetch(`${API_ROOT}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = (await response.json()) as BotApiResponse<T>;
    if (!payload.ok || payload.result === undefined) {
      return { ok: false, error: payload.description ?? `Telegram returned ${response.status}` };
    }
    return { ok: true, result: payload.result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Telegram is unreachable" };
  }
}

/** Sends HTML-formatted text to a chat the bot is already in. */
export async function sendMessage(chatId: number, html: string): Promise<boolean> {
  const sent = await callBotApi<unknown>("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    // The codes and instructions never contain a link worth unfurling, and a
    // preview card under a login code looks like a phishing attempt.
    disable_web_page_preview: true,
  });

  return sent.ok;
}

/**
 * Escapes the four characters Telegram's HTML parser treats as markup.
 *
 * Display names are attacker-chosen — anyone can call themselves `<b>Strap` —
 * and an unescaped one either breaks the message or forges emphasis inside it.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
