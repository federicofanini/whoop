import { en, type Dictionary } from "./en";
import { it } from "./it";
import { DEFAULT_LOCALE, type Locale } from "./config";
import type { InsightParam } from "@/core/analytics/insights";

export * from "./config";
export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { en, it };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export type TranslateValues = Record<string, string | number | { duration: number }>;

/**
 * A translator bound to one locale.
 *
 * `t("friends.sent", { handle })` walks the dictionary by dotted path. A missing
 * key returns the key itself rather than throwing — a broken string on screen is
 * recoverable, a crashed dashboard is not — but the dictionaries are typed
 * against each other, so a missing *translation* cannot reach production.
 */
export interface Translator {
  (key: string, values?: TranslateValues): string;
  locale: Locale;
  dict: Dictionary;
  /** Locale-aware number formatting: 1,234.5 in English, 1.234,5 in Italian. */
  number: (value: number, digits?: number) => string;
  /** 7h 32m / 7h 32min, in the reader's idiom. */
  duration: (milli: number) => string;
  date: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  time: (value: Date | string) => string;
}

function lookup(dict: Dictionary, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(locale: Locale): Translator {
  const dict = getDictionary(locale);
  const tag = locale === "it" ? "it-IT" : "en-GB";

  const number = (value: number, digits?: number) =>
    new Intl.NumberFormat(tag, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits ?? 2,
    }).format(value);

  const duration = (milli: number) => {
    const totalMinutes = Math.round(milli / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    // Italian abbreviates minutes as "min"; "7h 32m" reads as metres.
    const minuteUnit = locale === "it" ? "min" : "m";
    if (hours === 0) return `${minutes}${minuteUnit}`;
    return `${hours}h ${minutes.toString().padStart(2, "0")}${minuteUnit}`;
  };

  const t = ((key: string, values?: TranslateValues): string => {
    const template = lookup(dict, key);
    if (template === undefined) return key;
    if (!values) return template;

    return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const value = values[name];
      if (value === undefined) return whole;
      if (typeof value === "number") return number(value);
      if (typeof value === "object" && "duration" in value) return duration(value.duration);
      return String(value);
    });
  }) as Translator;

  t.locale = locale;
  t.dict = dict;
  t.number = number;
  t.duration = duration;
  t.date = (value, options) =>
    new Intl.DateTimeFormat(tag, options ?? { day: "numeric", month: "short" }).format(
      typeof value === "string" ? new Date(value) : value,
    );
  t.time = (value) =>
    new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" }).format(
      typeof value === "string" ? new Date(value) : value,
    );

  return t;
}

/**
 * Renders one insight in the reader's language.
 *
 * Lives here rather than in the component so the same call works from a CLI
 * report or a future notification — nothing about translating a sentence needs
 * React.
 */
export function translateInsight(
  t: Translator,
  insight: { titleKey: string; detailKey: string; params: Record<string, InsightParam> },
): { title: string; detail: string } {
  return {
    title: t(`insight.${insight.titleKey}`, insight.params),
    detail: t(`insight.${insight.detailKey}`, insight.params),
  };
}

/** Picks singular or plural, which English and Italian happen to share the shape of. */
export function plural(t: Translator, key: string, count: number): string {
  return t(count === 1 ? key : `${key}_plural`, { count });
}
