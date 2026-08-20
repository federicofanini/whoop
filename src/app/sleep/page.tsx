import { loadViewerDashboard } from "@/server/dashboard";
import { getTranslator } from "@/server/locale";
import { sleepRecoveryCorrelation, summarizeSleep } from "@/core/analytics/sleep";
import { generateInsights } from "@/core/analytics/insights";
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

export const dynamic = "force-dynamic";

export default async function SleepPage() {
  const t = await getTranslator();
  const { days } = await loadViewerDashboard();
  const sleep = summarizeSleep(days, 30);
  const correlation = sleepRecoveryCorrelation(days.slice(-90));
  const insights = generateInsights(days).filter((i) => i.domain === "sleep");

  const consistencyGood = sleep.bedtimeVariabilityMin < 30;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("nav.sleep")}
        title={t("sleepPage.title")}
        description={t("sleepPage.lead")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t("overview.sleepDebt")}
          value={t.duration(sleep.debtMilli)}
          accent={
            sleep.debtMilli > 6 * 3_600_000
              ? status.critical
              : sleep.debtMilli > 2 * 3_600_000
                ? status.warning
                : status.good
          }
          caption={t("sleepPage.debtCaption")}
        />
        <StatTile
          label={t("sleepPage.avgAsleep")}
          value={t.duration(sleep.avgAsleepMilli)}
          accent={series.sleep}
          caption={t("sleepPage.againstNeed", { need: { duration: sleep.avgNeedMilli } })}
        />
        <StatTile
          label={t("sleepPage.restorative")}
          value={(sleep.restorativeShare * 100).toFixed(0)}
          unit={t("common.percent")}
          accent={stageColor.deep}
          caption={t("sleepPage.restorativeCaption")}
        />
        <StatTile
          label={t("sleepPage.spread")}
          value={`±${Math.round(sleep.bedtimeVariabilityMin)}`}
          unit="min"
          accent={consistencyGood ? status.good : status.warning}
          caption={consistencyGood ? t("sleepPage.genuinelyRegular") : t("sleepPage.spreadCaption")}
        />
      </div>

      {insights.length > 0 ? (
        <Panel>
          <PanelHeader title={t("sleepPage.signals")} subtitle={t("sleepPage.signalsSub")} />
          <InsightList insights={insights} t={t} />
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title={t("sleepPage.architecture")}
          subtitle={t("sleepPage.architectureSub")}
        />
        <SleepStagesChart nights={sleep.nights.slice(-21)} height={300} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title={t("sleepPage.shortfall")}
            subtitle={t("sleepPage.shortfallSub")}
          />
          <SleepDebtChart nights={sleep.nights.slice(-21)} height={240} />
        </Panel>

        <Panel>
          <PanelHeader
            title={t("sleepPage.regularity")}
            subtitle={t("sleepPage.regularitySub")}
          />
          <BedtimeConsistencyChart nights={sleep.nights.slice(-21)} height={240} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title={t("sleepPage.correlation")}
          subtitle={
            correlation.n >= 14
              ? t("sleepPage.correlationDetail", {
                  r: Number(correlation.r.toFixed(2)),
                  nights: correlation.n,
                  variance: Number((correlation.r ** 2 * 100).toFixed(0)),
                })
              : "Needs a couple more weeks of nights before the relationship means anything."
          }
        />
        <SleepRecoveryScatter points={correlation.points} r={correlation.r} height={300} />
      </Panel>
    </div>
  );
}
