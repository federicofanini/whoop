import { cn } from "@/lib/utils";

/**
 * Placeholders that hold the exact shape of what is coming.
 *
 * The point of a skeleton is not decoration, it is *layout*: if the placeholder
 * is a different height from the content, the page jumps when the data lands
 * and the reader loses their place. So each one below is built from the same
 * spacing and type scale as the component it stands in for, and the sizes are
 * hard-coded to match rather than guessed at.
 *
 * There is no shimmer sweep. On a page that fills in one panel at a time, half
 * a dozen gradients travelling in parallel is noise; a quiet opacity pulse says
 * "working" without competing with the numbers that have already arrived. It is
 * disabled outright under `prefers-reduced-motion` by the global stylesheet.
 *
 * Every placeholder is `aria-hidden`. A screen reader gains nothing from a tree
 * of grey rectangles, and React announces the real content when it swaps in.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse bg-surface-2", className)} />;
}

/** Matches `StatTile`: eyebrow, 28px numeral, optional caption. */
export function StatTileSkeleton({ caption = true }: { caption?: boolean }) {
  return (
    <div className="border border-hairline bg-surface p-4 sm:p-5">
      <Skeleton className="h-[11px] w-24" />
      <Skeleton className="mt-3 h-7 w-20" />
      {caption ? <Skeleton className="mt-3 h-[12px] w-full max-w-[11rem]" /> : null}
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <StatTileSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches `PanelHeader`: 15px title over a 13px subtitle. */
export function PanelHeaderSkeleton({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="mb-5">
      <Skeleton className="h-[15px] w-40" />
      {subtitle ? <Skeleton className="mt-2.5 h-[13px] w-full max-w-sm" /> : null}
    </div>
  );
}

/**
 * A chart placeholder.
 *
 * Bars of varying height rather than one flat block: a solid rectangle at chart
 * size reads as a broken image, whereas a silhouette reads as a chart that has
 * not arrived yet.
 */
export function ChartSkeleton({ height = 220 }: { height?: number | string }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} aria-hidden>
      {BAR_HEIGHTS.map((percent, i) => (
        <span
          key={i}
          className="flex-1 animate-pulse bg-surface-2"
          style={{ height: `${percent}%`, animationDelay: `${(i % 8) * 60}ms` }}
        />
      ))}
    </div>
  );
}

/*
 * Fixed, not random: a placeholder that reshuffles on every render would flicker
 * between the server pass and hydration, and the silhouette carries no meaning
 * anyway.
 */
const BAR_HEIGHTS = [
  46, 62, 38, 71, 55, 83, 49, 66, 41, 74, 58, 45, 69, 52, 78, 43, 61, 70, 36, 64, 50, 76, 44, 68,
  57, 39, 72, 53, 65, 47,
];

export function ChartPanelSkeleton({ height = 220 }: { height?: number | string }) {
  return (
    <section className="border border-hairline bg-surface p-5 sm:p-6">
      <PanelHeaderSkeleton />
      <ChartSkeleton height={height} />
    </section>
  );
}

/** Matches `InsightList`: a stack of tone-marked rows. */
export function InsightListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-4 w-[3px] shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-[14px] w-2/5" />
            <Skeleton className="mt-2 h-[13px] w-full" />
            <Skeleton className="mt-1.5 h-[13px] w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InsightPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section className="border border-hairline bg-surface p-5 sm:p-6">
      <PanelHeaderSkeleton />
      <InsightListSkeleton rows={rows} />
    </section>
  );
}

/** Matches `PageHeader`, so the title block never shifts once copy resolves. */
export function PageHeaderSkeleton({ description = true }: { description?: boolean }) {
  return (
    <div className="mb-8">
      <Skeleton className="mb-3 h-[11px] w-20" />
      <Skeleton className="h-[38px] w-64 max-w-full" />
      {description ? <Skeleton className="mt-4 h-[15px] w-full max-w-2xl" /> : null}
    </div>
  );
}

/** Matches `RecoveryStrip`: a label over fourteen thin bars. */
export function RecoveryStripSkeleton() {
  return (
    <div>
      <Skeleton className="h-[11px] w-24" />
      <div className="mt-3 flex items-end gap-1" style={{ height: 44 }} aria-hidden>
        {BAR_HEIGHTS.slice(0, 14).map((percent, i) => (
          <span
            key={i}
            className="flex-1 animate-pulse bg-surface-2"
            style={{ height: `${percent}%` }}
          />
        ))}
      </div>
    </div>
  );
}
