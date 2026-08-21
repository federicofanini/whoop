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
  BandCountTiles,
  DailyRecoveryChart,
  HrvBaselineChart,
  HrvTile,
  RecoverySignals,
  RestingHrBaselineChart,
  RestingHrTile,
} from "./_sections";

export const dynamic = "force-dynamic";

export default async function RecoveryPage() {
  void preloadViewerData();
  const t = await getTranslator();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("nav.recovery")}
        title={t("recoveryPage.title")}
        description={t("recoveryPage.lead")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatTileSkeleton />}>
          <HrvTile />
        </Suspense>
        <Suspense fallback={<StatTileSkeleton />}>
          <RestingHrTile />
        </Suspense>
        <Suspense
          fallback={
            <>
              <StatTileSkeleton />
              <StatTileSkeleton />
            </>
          }
        >
          <BandCountTiles />
        </Suspense>
      </div>

      <Suspense fallback={<InsightPanelSkeleton />}>
        <RecoverySignals />
      </Suspense>

      <Panel>
        <Suspense
          fallback={
            <>
              <PanelHeaderSkeleton />
              <ChartSkeleton height={280} />
            </>
          }
        >
          <HrvBaselineChart />
        </Suspense>
      </Panel>

      <Panel>
        <Suspense
          fallback={
            <>
              <PanelHeaderSkeleton />
              <ChartSkeleton height={280} />
            </>
          }
        >
          <RestingHrBaselineChart />
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
          <DailyRecoveryChart />
        </Suspense>
      </Panel>
    </div>
  );
}
