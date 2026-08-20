/**
 * Handles exist because WHOOP does not have them.
 *
 * There is no endpoint that resolves a WHOOP member by name, email or username —
 * and there should not be, since it would turn every member id into a lookup
 * oracle. So the app mints its own handle when an account first links, and the
 * friend search resolves against that.
 */

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

/** Lowercase, alphanumeric, single internal separators. Recognisable when typed. */
export function normalizeHandle(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_.]+/g, "")
    .replace(/[_.]{2,}/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "")
    .slice(0, HANDLE_MAX);
}

/**
 * Returns a dictionary key rather than a sentence: this runs on the server and
 * the message is rendered in whichever language the member is reading.
 */
export function validateHandle(
  input: string,
): { ok: true; handle: string } | { ok: false; errorKey: string } {
  const handle = normalizeHandle(input);
  if (handle.length < HANDLE_MIN) return { ok: false, errorKey: "friends.error.tooShort" };
  if (!/^[a-z][a-z0-9_.]*$/.test(handle)) {
    return { ok: false, errorKey: "friends.error.charset" };
  }
  return { ok: true, handle };
}

/**
 * A first guess at a handle from whatever Google told us, so nobody is forced
 * through a naming step before they can see their own dashboard. Collisions are
 * resolved by the caller, which owns the uniqueness check.
 */
export function suggestHandle(
  fullName: string | null,
  email: string | null,
  profileId: string,
): string {
  const fromName = normalizeHandle((fullName ?? "").replace(/\s+/g, "."));
  if (fromName.length >= HANDLE_MIN) return fromName;

  // Google always gives an email even when the display name is empty or is
  // written in a script that normalises away to nothing.
  const fromEmail = normalizeHandle((email ?? "").split("@")[0] ?? "");
  if (fromEmail.length >= HANDLE_MIN) return fromEmail;

  return `member.${profileId.slice(0, 8)}`.slice(0, HANDLE_MAX);
}
