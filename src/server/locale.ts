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
 * Three sources, most explicit first:
 *
 *   1. the locale cookie — an explicit click on the switcher, this device;
 *   2. the signed-in profile — the same choice, carried to a new device;
 *   3. Accept-Language — what the browser says, for a first-time visitor.
 *
 * A stored preference beats the browser: someone with an Italian phone who
 * chose English meant it, and should not have to choose again every visit.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const viewer = await getViewer();
  if (viewer && isLocale(viewer.locale)) return viewer.locale;

  const header = (await headers()).get("accept-language");
  return negotiateLocale(header) ?? DEFAULT_LOCALE;
});

/** The translator for this request. */
export const getTranslator = cache(async (): Promise<Translator> => {
  return createTranslator(await getLocale());
});

/**
 * Persists a language choice.
 *
 * Written to both the cookie and the profile: the cookie makes it instant and
 * works signed out, the profile makes it follow you to your phone.
 */
export async function persistLocale(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });

  if (!isDbConfigured()) return;
  const viewer = await getViewer();
  if (!viewer) return;

  await getDb()
    .update(schema.profiles)
    .set({ locale, updatedAt: new Date() })
    .where(eq(schema.profiles.id, viewer.profileId));
}
