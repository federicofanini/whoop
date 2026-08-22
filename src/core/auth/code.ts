/**
 * What a login code *is*, with no opinion on where it is stored or sent.
 *
 * Split out of `otp.ts` because the sign-in form needs the length to render the
 * right number of boxes, and `otp.ts` reaches the database — importing it from
 * a client component drags `postgres` into the browser bundle and fails the
 * build. Same discipline as `token.ts` keeping clear of `next/headers`: the
 * pure part of a rule belongs somewhere both sides can import it.
 */

export const CODE_LENGTH = 6;

/** Strips everything that is not a digit, so "123 456" and "123-456" both work. */
export function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, "");
}
