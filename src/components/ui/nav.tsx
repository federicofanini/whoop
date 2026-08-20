"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/recovery", label: "Recovery" },
  { href: "/strain", label: "Strain" },
  { href: "/sleep", label: "Sleep" },
  { href: "/friends", label: "Friends" },
  { href: "/live", label: "Live" },
];

export function AppNav({
  demo,
  handle,
  pendingRequests = 0,
}: {
  demo: boolean;
  /** The signed-in member's handle, or null when nobody is signed in. */
  handle?: string | null;
  /** Friend requests waiting on a decision, badged on the Friends link. */
  pendingRequests?: number;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-plane/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden
              className="h-6 w-6 rounded-md bg-gradient-to-br from-series-1 to-series-2"
            />
            <span className="text-[15px] font-semibold tracking-tight">Strap</span>
          </Link>

          {/* Horizontally scrollable so the nav never wraps on an iPhone. */}
          <nav
            aria-label="Primary"
            className="-mx-2 flex flex-1 items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
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
                      aria-label={`${badge} pending friend request${badge === 1 ? "" : "s"}`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {handle ? (
              <span className="hidden text-[12px] font-medium text-muted lg:inline" title="Signed in">
                @{handle}
              </span>
            ) : null}
            {demo ? (
              <span
                className="hidden rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] font-medium text-muted sm:inline"
                title="No WHOOP account linked — showing a generated dataset."
              >
                Demo data
              </span>
            ) : null}
            <Link
              href="/settings"
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                pathname.startsWith("/settings")
                  ? "bg-surface-2 text-ink"
                  : "text-muted hover:text-ink-2",
              )}
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
