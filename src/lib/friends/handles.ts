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

export function validateHandle(input: string): { ok: true; handle: string } | { ok: false; error: string } {
  const handle = normalizeHandle(input);
  if (handle.length < HANDLE_MIN) {
    return { ok: false, error: `Handles are at least ${HANDLE_MIN} characters.` };
  }
  if (!/^[a-z][a-z0-9_.]*$/.test(handle)) {
    return { ok: false, error: "Handles start with a letter and use letters, numbers, . or _" };
  }
  return { ok: true, handle };
}

/**
 * A first guess at a handle from the WHOOP profile, so nobody is forced through
 * a naming step before they can see their own dashboard. Collisions are resolved
 * by the caller, which owns the uniqueness check.
 */
export function suggestHandle(firstName: string | null, lastName: string | null, userId: number): string {
  const base = normalizeHandle(`${firstName ?? ""}${lastName ? `.${lastName}` : ""}`);
  if (base.length >= HANDLE_MIN) return base;
  // Nothing usable in the profile — fall back to something stable and unique.
  return `whoop.${userId}`.slice(0, HANDLE_MAX);
}
