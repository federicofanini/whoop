"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LOCALES, type Locale } from "@/core/i18n/config";
import { setLocale } from "@/app/actions/locale";
import { ThemeToggle } from "./theme-toggle";
import { useT } from "@/components/i18n-provider";

/**
 * The header is a single hairline rule with everything sitting on it.
 *
 * The section links use the segmented-control treatment: the active one takes a
 * soft fill and full ink, the rest stay muted. It is the one place a small
 * radius is allowed, because a filled square behind text at this size reads as
 * a button rather than a tab.
 *
 * Everything that needs a database answer arrives as a slot rather than a prop.
 * The header used to take `demo`, `signedIn` and `pendingRequests` as values,
 * which meant the layout had to resolve the session, the friend graph and six
 * months of cycles before it could emit a single byte — so the whole app waited
 * on three queries to decide whether to draw a badge. The links, the language
 * switcher and the theme toggle need none of that, and now render immediately
 * while the slots stream in behind them.
 */
export function AppNav({
  locale,
  demoSlot,
  friendsBadge,
  accountSlot,
}: {
  locale: Locale;
  /** The "demo data" chip, once we know whether any real data is linked. */
  demoSlot?: ReactNode;
  /** The pending-request count on the friends link. */
  friendsBadge?: ReactNode;
  /** Settings link or sign-in button, once the session is known. */
  accountSlot?: ReactNode;
}) {
  const pathname = usePathname();
  const t = useT();

  const links = [
    { href: "/", label: t("nav.overview") },
    { href: "/recovery", label: t("nav.recovery") },
    { href: "/strain", label: t("nav.strain") },
    { href: "/sleep", label: t("nav.sleep") },
    { href: "/friends", label: t("nav.friends") },
    { href: "/live", label: t("nav.live") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-plane/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-baseline gap-1.5">
            <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink">strap</span>
            <span className="eyebrow hidden text-[9px] sm:inline">whoop</span>
          </Link>

          {/* Horizontally scrollable so the nav never wraps on an iPhone. */}
          <nav
            aria-label="Primary"
            className="-mx-2 flex flex-1 items-center gap-0.5 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-[4px] px-2.5 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-surface-2 font-medium text-ink"
                      : "text-muted hover:text-ink-2",
                  )}
                >
                  {link.label}
                  {link.href === "/friends" ? friendsBadge : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {demoSlot}
            <LocaleSwitcher locale={locale} label={t("nav.language")} />
            <ThemeToggle />
            {accountSlot}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Two buttons rather than a select: with exactly two languages, a dropdown is
 * one more interaction than the choice deserves. Submits a form so it works
 * before hydration and without client-side state.
 */
function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  return (
    <form action={setLocale} className="flex items-center border border-hairline">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="submit"
          name="locale"
          value={code}
          aria-label={`${label}: ${code.toUpperCase()}`}
          aria-current={code === locale ? "true" : undefined}
          className={cn(
            "px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
            code === locale ? "bg-surface-2 text-ink" : "text-muted hover:text-ink-2",
          )}
        >
          {code}
        </button>
      ))}
    </form>
  );
}
