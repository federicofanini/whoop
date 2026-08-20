import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Square buttons, two weights.
 *
 * `primary` is solid ink — on a page with no brand colour, the primary action
 * is simply the one element that inverts. `secondary` is the same rectangle
 * with a hairline instead of a fill.
 */
const BASE =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-medium transition-colors disabled:opacity-50";

const VARIANTS = {
  primary: "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90",
  secondary: "border border-hairline text-ink hover:bg-surface-2",
  quiet: "text-muted hover:text-ink",
} as const;

type Variant = keyof typeof VARIANTS;

export function Button({
  variant = "secondary",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; children: ReactNode }) {
  return (
    <button className={cn(BASE, VARIANTS[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; children: ReactNode }) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], className)} {...props}>
      {children}
    </Link>
  );
}
