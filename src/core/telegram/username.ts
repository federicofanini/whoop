/**
 * Telegram username rules, as Telegram itself enforces them.
 *
 * Kept pure and away from the database so the sign-in form can reject a
 * malformed username before it costs a query — and so the rules can be tested
 * without a Postgres connection.
 */

export const TELEGRAM_USERNAME_MIN = 5;
export const TELEGRAM_USERNAME_MAX = 32;

/**
 * Lowercased, no leading @, no surrounding whitespace.
 *
 * Telegram usernames are case-insensitive, so `@Marco_Rossi` and `marco_rossi`
 * are one account. Storing the lowercase form means the unique index in the
 * registry can do the work of deciding that.
 */
export function normalizeTelegramUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/**
 * Returns a dictionary key rather than a sentence, like the rest of the server:
 * the message is rendered in whichever language the member is reading.
 */
export function validateTelegramUsername(
  raw: string,
): { ok: true; username: string } | { ok: false; errorKey: string } {
  const username = normalizeTelegramUsername(raw);

  // Telegram: 5-32 characters, letters, digits and underscores, starting with
  // a letter. Anything else cannot be an account, so there is nothing to look up.
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(username)) {
    return { ok: false, errorKey: "signIn.telegram.badUsername" };
  }

  return { ok: true, username };
}

/** The display name Telegram gives us, as one string. Empty becomes null. */
export function telegramDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : null;
}
