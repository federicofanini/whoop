"use client";

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
 */
export function AppNav({
  demo,
  locale,
  handle,
  signedIn,
  pendingRequests = 0,
}: {
  demo: boolean;
  locale: Locale;
  handle: string | null;
  signedIn: boolean;
  pendingRequests?: number;
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
              const badge = link.href === "/friends" ? pendingRequests : 0;
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
                  {badge > 0 ? (
                    <span
                      className="numeral ml-1.5 inline-flex h-[17px] min-w-[17px] items-center justify-center bg-[var(--color-accent)] px-1 text-[10px] font-medium text-[var(--color-accent-ink)]"
                      aria-label={
                        badge === 1
                          ? t("nav.pendingRequests", { count: badge })
                          : t("nav.pendingRequests_plural", { count: badge })
                      }
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {demo ? (
              <span className="eyebrow hidden border border-hairline px-2 py-1 md:inline" title={t("nav.demoTitle")}>
                {t("nav.demoBadge")}
              </span>
            ) : null}

            <LocaleSwitcher locale={locale} label={t("nav.language")} />
            <ThemeToggle />

            {signedIn ? (
              <Link
                href="/settings"
                className={cn(
                  "rounded-[4px] px-2.5 py-1.5 text-[13px] transition-colors",
                  pathname.startsWith("/settings")
                    ? "bg-surface-2 font-medium text-ink"
                    : "text-muted hover:text-ink-2",
                )}
                title={handle ? `@${handle}` : undefined}
              >
                {t("nav.settings")}
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="bg-[var(--color-accent)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
              >
                {t("nav.signIn")}
              </Link>
            )}
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
