"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LOCALES, type Locale } from "@/core/i18n/config";
import { setLocale } from "@/app/actions/locale";
import { ThemeToggle } from "./theme-toggle";

export interface NavLabels {
  overview: string;
  recovery: string;
  strain: string;
  sleep: string;
  friends: string;
  live: string;
  settings: string;
  signIn: string;
  demoBadge: string;
  demoTitle: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  language: string;
  /**
   * Already pluralised by the server. A function cannot cross into a Client
   * Component — it is not serialisable — and the count is known at render time
   * anyway, so there is nothing for the client to decide.
   */
  pendingLabel: string;
}

export function AppNav({
  demo,
  locale,
  handle,
  signedIn,
  pendingRequests = 0,
  labels,
}: {
  demo: boolean;
  locale: Locale;
  handle: string | null;
  signedIn: boolean;
  pendingRequests?: number;
  labels: NavLabels;
}) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: labels.overview },
    { href: "/recovery", label: labels.recovery },
    { href: "/strain", label: labels.strain },
    { href: "/sleep", label: labels.sleep },
    { href: "/friends", label: labels.friends },
    { href: "/live", label: labels.live },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-plane/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span aria-hidden className="h-6 w-6 rounded-md bg-gradient-to-br from-series-1 to-series-2" />
            <span className="text-[15px] font-semibold tracking-tight">Strap</span>
          </Link>

          {/* Horizontally scrollable so the nav never wraps on an iPhone. */}
          <nav
            aria-label="Primary"
            className="-mx-2 flex flex-1 items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    "shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                    active ? "bg-surface-2 text-ink" : "text-muted hover:text-ink-2",
                  )}
                >
                  {link.label}
                  {badge > 0 ? (
                    <span
                      className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-series-1 px-1 text-[11px] font-semibold text-plane"
                      aria-label={labels.pendingLabel}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LocaleSwitcher locale={locale} label={labels.language} />
            <ThemeToggle
              label={labels.theme}
              labels={{
                light: labels.themeLight,
                dark: labels.themeDark,
                system: labels.themeSystem,
              }}
            />

            {demo ? (
              <span
                className="hidden rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] font-medium text-muted sm:inline"
                title={labels.demoTitle}
              >
                {labels.demoBadge}
              </span>
            ) : null}

            {signedIn ? (
              <Link
                href="/settings"
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  pathname.startsWith("/settings")
                    ? "bg-surface-2 text-ink"
                    : "text-muted hover:text-ink-2",
                )}
                title={handle ? `@${handle}` : undefined}
              >
                {labels.settings}
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink-2"
              >
                {labels.signIn}
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
    <form action={setLocale} className="hidden items-center rounded-lg border border-hairline sm:flex">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="submit"
          name="locale"
          value={code}
          aria-label={`${label}: ${code.toUpperCase()}`}
          aria-current={code === locale ? "true" : undefined}
          className={cn(
            "px-2 py-1 text-[11px] font-semibold uppercase transition-colors first:rounded-l-md last:rounded-r-md",
            code === locale ? "bg-surface-2 text-ink" : "text-muted hover:text-ink-2",
          )}
        >
          {code}
        </button>
      ))}
    </form>
  );
}
