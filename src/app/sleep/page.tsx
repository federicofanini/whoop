import { loadDashboardData } from "@/lib/data/load";
import { sleepRecoveryCorrelation, summarizeSleep } from "@/lib/analytics/sleep";
import { generateInsights } from "@/lib/analytics/insights";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import {
  BedtimeConsistencyChart,
  SleepDebtChart,
  SleepRecoveryScatter,
  SleepStagesChart,
} from "@/components/charts/sleep-charts";
import { series, stageColor, status } from "@/lib/theme";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SleepPage() {
  const { days } = await loadDashboardData();
  const sleep = summarizeSleep(days, 30);
  const correlation = sleepRecoveryCorrelation(days.slice(-90));
  const insights = generateInsights(days).filter((i) => i.domain === "sleep");

  const consistencyGood = sleep.bedtimeVariabilityMin < 30;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sleep"
        title="Debt, architecture, and what actually moves your recovery"
        description="Total time in bed is the least interesting number here. What predicts recovery is the restorative fraction, the regularity of your schedule, and whether you are clearing the need your body has already accumulated."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Sleep debt"
          value={formatDuration(sleep.debtMilli)}
          accent={
            sleep.debtMilli > 6 * 3_600_000
              ? status.critical
              : sleep.debtMilli > 2 * 3_600_000
                ? status.warning
                : status.good
          }
          caption="Shortfall accumulated over 7 nights"
        />
        <StatTile
          label="Average asleep"
          value={formatDuration(sleep.avgAsleepMilli)}
          accent={series.sleep}
          caption={`Against a need of ${formatDuration(sleep.avgNeedMilli)}`}
        />
        <StatTile
          label="Restorative share"
          value={(sleep.restorativeShare * 100).toFixed(0)}
          unit="%"
          accent={stageColor.deep}
          caption="REM plus deep, as a share of total sleep. Typical is 40–50%."
        />
        <StatTile
          label="Bedtime spread"
          value={`±${Math.round(sleep.bedtimeVariabilityMin)}`}
          unit="min"
          accent={consistencyGood ? status.good : status.warning}
          caption={consistencyGood ? "Genuinely regular" : "Under ±30 minutes is the target"}
        />
      </div>

      {insights.length > 0 ? (
        <Panel>
          <PanelHeader title="Sleep signals" subtitle="Where your nights are helping or costing you." />
          <InsightList insights={insights} />
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title="Sleep architecture"
          subtitle="Stages stack deepest-first and share one hue — depth reads as darkness. The stepped line is what WHOOP calculated you needed that night."
        />
        <SleepStagesChart nights={sleep.nights.slice(-21)} height={300} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Nightly shortfall"
            subtitle="How far each night fell short of its need. Debt compounds — it is not cleared by one long lie-in."
          />
          <SleepDebtChart nights={sleep.nights.slice(-21)} height={240} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Schedule regularity"
            subtitle="Consistency is the most controllable input to sleep quality, and usually buys more than extra time in bed."
          />
          <BedtimeConsistencyChart nights={sleep.nights.slice(-21)} height={240} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Does sleep actually drive your recovery?"
          subtitle={
            correlation.n >= 14
              ? `Correlation of ${correlation.r.toFixed(2)} across ${correlation.n} nights — sleep performance explains about ${(correlation.r ** 2 * 100).toFixed(0)}% of the variation in your recovery score.`
              : "Needs a couple more weeks of nights before the relationship means anything."
          }
        />
        <SleepRecoveryScatter points={correlation.points} r={correlation.r} height={300} />
      </Panel>
    </div>
  );
}
