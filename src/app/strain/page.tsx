import { Suspense } from "react";
import { getTranslator } from "@/server/locale";
import { preloadViewerData } from "@/server/dashboard";
import { Panel, PageHeader } from "@/components/ui/panel";
import {
  ChartSkeleton,
  InsightPanelSkeleton,
  PanelHeaderSkeleton,
  StatTileSkeleton,
} from "@/components/ui/skeleton";
import {
  BalancePanel,
  DailyStrainPanel,
  DaysOverTile,
  DeviationPanel,
  LoadPanel,
  LoadRatioTile,
  StrainSignals,
  TodayStrainTile,
  WeeklyStrainTile,
} from "./_sections";

export const dynamic = "force-dynamic";

export default async function StrainPage() {
  void preloadViewerData();
  const t = await getTranslator();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("nav.strain")}
        title={t("strainPage.title")}
        description={t("strainPage.lead")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatTileSkeleton />}>
          <TodayStrainTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <LoadRatioTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <WeeklyStrainTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <DaysOverTile />
        </Suspense>
      </div>

      <Suspense fallback={<InsightPanelSkeleton />}>
        <StrainSignals />
      </Suspense>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Suspense
            fallback={
              <>
                <PanelHeaderSkeleton />
                <ChartSkeleton height={320} />
              </>
            }
          >
            <BalancePanel />
          </Suspense>
        </Panel>

        <Panel>
          <Suspense
            fallback={
              <>
                <PanelHeaderSkeleton />
                <ChartSkeleton height={300} />
              </>
            }
          >
            <DeviationPanel />
          </Suspense>
        </Panel>
      </div>

      <Panel>
        <Suspense
          fallback={
            <>
              <PanelHeaderSkeleton />
              <ChartSkeleton height={260} />
            </>
          }
        >
          <LoadPanel />
        </Suspense>
      </Panel>

      <Panel>
        <Suspense
          fallback={
            <>
              <PanelHeaderSkeleton />
              <ChartSkeleton height={240} />
            </>
          }
        >
          <DailyStrainPanel />
        </Suspense>
      </Panel>
    </div>
  );
}
