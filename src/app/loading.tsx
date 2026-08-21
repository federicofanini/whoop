import {
  ChartSkeleton,
  InsightListSkeleton,
  PanelHeaderSkeleton,
  RecoveryStripSkeleton,
  Skeleton,
  StatGridSkeleton,
} from "@/components/ui/skeleton";

/**
 * What a client-side navigation to the overview shows before the server
 * responds.
 *
 * The per-panel skeletons inside `page.tsx` cover the streaming case, where the
 * shell has already arrived and individual figures are still landing. This
 * covers the moment before that: the router has swapped the route but the first
 * byte of the new page is still in flight. Without it the browser sits on the
 * previous page with nothing to say it heard the click.
 */
export default function OverviewLoading() {
  return (
    <div className="space-y-5">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Skeleton className="h-[11px] w-40" />
          <Skeleton className="mt-1.5 h-[34px] w-56" />
        </div>
        <Skeleton className="h-[38px] w-32" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section className="border border-hairline bg-surface p-5 sm:p-6">
          <Skeleton className="h-[11px] w-20" />
          <Skeleton className="mt-4 h-[76px] w-40" />
          <div className="mt-8">
            <RecoveryStripSkeleton />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-5">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Skeleton className="h-[11px] w-12" />
                <Skeleton className="mt-2 h-[20px] w-14" />
              </div>
            ))}
          </div>
        </section>

        <section className="border border-hairline bg-surface p-5 sm:p-6">
          <PanelHeaderSkeleton />
          <InsightListSkeleton rows={3} />
        </section>
      </div>

      <StatGridSkeleton />

      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <section key={i} className="border border-hairline bg-surface p-5 sm:p-6">
            <PanelHeaderSkeleton />
            <ChartSkeleton />
          </section>
        ))}
      </div>
    </div>
  );
}
