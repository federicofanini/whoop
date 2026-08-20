"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslatorFrom, type Dictionary, type Locale, type Translator } from "@/core/i18n";

/**
 * Makes the translator available to client components.
 *
 * Server components can just `await getTranslator()`. Client components cannot,
 * and threading a `labels` object into every chart, legend and toggle turns
 * every new string into a five-file change. This carries the dictionary across
 * the boundary once, as serialised props.
 *
 * Only the active language crosses: the provider receives a dictionary rather
 * than importing one, so the bundle never contains both.
 */
const TranslatorContext = createContext<Translator | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  const translator = useMemo(() => createTranslatorFrom(locale, dict), [locale, dict]);
  return <TranslatorContext.Provider value={translator}>{children}</TranslatorContext.Provider>;
}

export function useT(): Translator {
  const translator = useContext(TranslatorContext);
  if (!translator) throw new Error("useT must be used inside <I18nProvider>");
  return translator;
}
