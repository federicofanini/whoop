import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A panel is a rectangle with a hairline around it. No radius, no shadow, no
 * tinted fill.
 *
 * That is the whole structural vocabulary of this design: content is separated
 * by rules, the way a spec sheet or a table separates it, rather than by cards
 * floating at different elevations. It means a dense page stays legible without
 * anything competing for depth.
 */
export function Panel({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={cn("border border-hairline bg-surface p-5 sm:p-6", className)}>{children}</Tag>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/**
 * The page title block.
 *
 * The eyebrow is monospace and uppercase, the headline is a large tight
 * grotesque — the two faces doing the two jobs they were picked for, and the
 * clearest signal of where you are on the page.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[38px]">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>
      ) : null}
    </div>
  );
}

/**
 * A numbered spec row: `01  Every model behind one key`.
 *
 * Rows share edges rather than sitting apart, so a list reads as one table.
 */
export function SpecList({ children }: { children: ReactNode }) {
  return <div className="border border-hairline">{children}</div>;
}

export function SpecRow({
  index,
  label,
  value,
  children,
}: {
  index?: number;
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-4 border-b border-hairline p-4 last:border-b-0 sm:px-5">
      {index !== undefined ? (
        <span className="numeral shrink-0 text-[12px] text-muted">
          {index.toString().padStart(2, "0")}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">{label}</p>
        {children ? <div className="mt-1 text-[13px] leading-relaxed text-muted">{children}</div> : null}
      </div>
      {value ? <div className="numeral shrink-0 text-[13px] text-ink">{value}</div> : null}
    </div>
  );
}
