import { cache } from "react";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/core/db";
import {
  createTranslator,
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  negotiateLocale,
  type Locale,
  type Translator,
} from "@/core/i18n";
import { getViewer } from "./auth";

/**
 * Which language to render in, resolved once per request.
 *
 * Two sources, most explicit first:
 *
 *   1. the locale cookie — an explicit click on the switcher, or the stored
 *      profile preference, which sign-in copies into the cookie;
 *   2. Accept-Language — what the browser says, for a first-time visitor.
 *
 * The profile is deliberately *not* read here. This runs before `<html lang>`
 * can be emitted, so every millisecond it spends is a millisecond the browser
 * has no markup at all — and a database round trip to learn a two-letter string
 * is the worst possible thing to put in that position. `syncLocaleCookie` moves
 * the stored preference into the cookie at sign-in instead, which gets the same
 * "follows you to a new device" behaviour for free on every later request.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const header = (await headers()).get("accept-language");
  return negotiateLocale(header) ?? DEFAULT_LOCALE;
});

/** The translator for this request. */
export const getTranslator = cache(async (): Promise<Translator> => {
  return createTranslator(await getLocale());
});

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: 365 * 24 * 60 * 60,
  sameSite: "lax",
} as const;

/**
 * Persists a language choice.
 *
 * Written to both the cookie and the profile: the cookie makes it instant and
 * works signed out, the profile makes it follow you to your phone.
 */
export async function persistLocale(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, COOKIE_OPTIONS);

  if (!isDbConfigured()) return;
  const viewer = await getViewer();
  if (!viewer) return;

  await getDb()
    .update(schema.profiles)
    .set({ locale, updatedAt: new Date() })
    .where(eq(schema.profiles.id, viewer.profileId));
}

/**
 * Copies a freshly signed-in member's stored language into the cookie, so that
 * `getLocale` never has to ask the database. Call from route handlers only —
 * Server Components cannot write cookies.
 */
export async function syncLocaleCookie(locale: Locale): Promise<void> {
  const store = await cookies();
  if (isLocale(store.get(LOCALE_COOKIE)?.value)) return;
  store.set(LOCALE_COOKIE, locale, COOKIE_OPTIONS);
}
