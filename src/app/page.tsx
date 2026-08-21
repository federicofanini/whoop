import { Suspense } from "react";
import Link from "next/link";
import { getTranslator } from "@/server/locale";
import { preloadViewerData } from "@/server/dashboard";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { InsightListSkeleton, StatTileSkeleton } from "@/components/ui/skeleton";
import {
  AllInsights,
  DemoNotice,
  Greeting,
  GreetingSkeleton,
  LastNightTile,
  LoadTile,
  RecoveryHero,
  RecoveryHeroSkeleton,
  RecoveryTrend,
  SleepDebtTile,
  StrainTile,
  StrainTrend,
  TopInsights,
  TrendPanelSkeleton,
  VitalsRow,
  VitalsRowSkeleton,
} from "./_sections/overview";

export const dynamic = "force-dynamic";

/**
 * The page is a layout, not a loader.
 *
 * Nothing here awaits data beyond the translator, which is a cookie read and a
 * static dictionary. Every panel resolves its own numbers and is suspended on
 * its own, so the grid, the headings and the navigation paint immediately and
 * each figure appears as it lands rather than the whole page appearing at once
 * behind the slowest query.
 */
export default async function OverviewPage() {
  // Kicks off all four table reads while React is still walking this tree, so
  // the sections below are waiting on queries that are already in flight.
  void preloadViewerData();

  const t = await getTranslator();

  return (
    <div className="space-y-5">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            {t.date(new Date(), { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <Suspense fallback={<GreetingSkeleton />}>
            <Greeting />
          </Suspense>
        </div>
        <Link
          href="/live"
          className="border border-hairline bg-surface px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          {t("overview.liveSession")}
        </Link>
      </div>

      <Suspense fallback={null}>
        <DemoNotice />
      </Suspense>

      {/* The day's headline: one number, plus the numbers that produced it. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Panel className="flex flex-col justify-between">
          <Suspense fallback={<RecoveryHeroSkeleton />}>
            <RecoveryHero />
          </Suspense>

          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-5">
            <Suspense fallback={<VitalsRowSkeleton />}>
              <VitalsRow />
            </Suspense>
          </dl>
        </Panel>

        <Panel>
          <PanelHeader title={t("overview.meaning")} subtitle={t("overview.meaningSub")} />
          <Suspense fallback={<InsightListSkeleton rows={3} />}>
            <TopInsights />
          </Suspense>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatTileSkeleton />}>
          <StrainTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <LoadTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <LastNightTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <SleepDebtTile />
        </Suspense>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Suspense fallback={<TrendPanelSkeleton />}>
            <RecoveryTrend />
          </Suspense>
        </Panel>

        <Panel>
          <Suspense fallback={<TrendPanelSkeleton />}>
            <StrainTrend />
          </Suspense>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title={t("overview.everything")} subtitle={t("overview.everythingSub")} />
        <Suspense fallback={<InsightListSkeleton rows={6} />}>
          <AllInsights />
        </Suspense>
      </Panel>
    </div>
  );
}
