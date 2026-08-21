"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";

/**
 * Settings or sign-in, whichever the session calls for.
 *
 * A client component because the settings link highlights itself on the
 * settings route, which needs the pathname. The *answer* to "is anyone signed
 * in" comes from the server slot that renders this.
 */
export function AccountLink({ signedIn, handle }: { signedIn: boolean; handle: string | null }) {
  const pathname = usePathname();
  const t = useT();

  if (!signedIn) {
    return (
      <Link
        href="/sign-in"
        className="bg-[var(--color-accent)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
      >
        {t("nav.signIn")}
      </Link>
    );
  }

  return (
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
  );
}

/** Holds the account slot's width so the header does not reflow when it lands. */
export function AccountLinkSkeleton() {
  return <span aria-hidden className="h-[30px] w-[70px] animate-pulse bg-surface-2" />;
}
