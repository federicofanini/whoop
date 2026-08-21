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
  AverageAsleepTile,
  BedtimeSpreadTile,
  CorrelationPanel,
  RegularityPanel,
  RestorativeTile,
  ShortfallPanel,
  SleepDebtTile,
  SleepSignals,
  StagesPanel,
} from "./_sections";

export const dynamic = "force-dynamic";

export default async function SleepPage() {
  void preloadViewerData();
  const t = await getTranslator();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("nav.sleep")}
        title={t("sleepPage.title")}
        description={t("sleepPage.lead")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatTileSkeleton />}>
          <SleepDebtTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <AverageAsleepTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <RestorativeTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <BedtimeSpreadTile />
        </Suspense>
      </div>

      <Suspense fallback={<InsightPanelSkeleton />}>
        <SleepSignals />
      </Suspense>

      <Panel>
        <Suspense
          fallback={
            <>
              <PanelHeaderSkeleton />
              <ChartSkeleton height={300} />
            </>
          }
        >
          <StagesPanel />
        </Suspense>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Suspense
            fallback={
              <>
                <PanelHeaderSkeleton />
                <ChartSkeleton height={240} />
              </>
            }
          >
            <ShortfallPanel />
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
            <RegularityPanel />
          </Suspense>
        </Panel>
      </div>

      <Panel>
        <Suspense
          fallback={
            <>
              <PanelHeaderSkeleton />
              <ChartSkeleton height={300} />
            </>
          }
        >
          <CorrelationPanel />
        </Suspense>
      </Panel>
    </div>
  );
}
