import { loadViewerDashboard } from "@/server/dashboard";
import { getTranslator } from "@/server/locale";
import { computeLoad, optimalStrain, summarizeBalance } from "@/core/analytics/load";
import { generateInsights } from "@/core/analytics/insights";
import { ewma } from "@/core/analytics/stats";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import { BalanceScatter, DeviationBars, LoadChart } from "@/components/charts/balance-chart";
import { StrainBars } from "@/components/charts/strain-charts";
import { series, status, type BandLabels } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function StrainPage() {
  const t = await getTranslator();
  const bandLabels: BandLabels = {
    green: t("band.primed"),
    yellow: t("band.adequate"),
    red: t("band.compromised"),
  };
  const { days } = await loadViewerDashboard();
  const load = computeLoad(days);
  const balance = summarizeBalance(days, 45);
  const insights = generateInsights(days).filter((i) => i.domain === "strain");

  const today = days[days.length - 1];
  const target = today?.recoveryScore !== null && today?.recoveryScore !== undefined
    ? optimalStrain(today.recoveryScore)
    : null;

  // Acute and chronic load recomputed at each point, so the ratio can be read historically.
  const loadSeries = days.slice(-90).map((day, index, all) => {
    const upTo = all.slice(0, index + 1).map((d) => d.strain ?? 0);
    return {
      date: day.date,
      acute: upTo.length >= 7 ? ewma(upTo.slice(-7), 7) : null,
      chronic: upTo.length >= 14 ? ewma(upTo.slice(-28), 28) : null,
    };
  });

  const zoneCopy = {
    productive: t("strainPage.zoneProductive"),
    overreaching: t("strainPage.zoneOverreaching"),
    detraining: t("strainPage.zoneDetraining"),
  } as const;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("nav.strain")}
        title={t("strainPage.title")}
        description={t("strainPage.lead")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t("strainPage.today")}
          value={today?.strain?.toFixed(1) ?? "—"}
          accent={series.strain}
          caption={target ? t("strainPage.supportedRange", { low: target.low, high: target.high }) : undefined}
        />
        <StatTile
          label={t("strainPage.acuteChronic")}
          value={load.ratio.toFixed(2)}
          unit={t("common.times")}
          accent={
            load.zone === "overreaching"
              ? status.critical
              : load.zone === "detraining"
                ? status.warning
                : status.good
          }
          caption={zoneCopy[load.zone]}
        />
        <StatTile
          label={t("strainPage.thisWeek")}
          value={load.weeklyStrain.toFixed(0)}
          accent={series.strain}
          delta={load.weeklyStrain - load.weeklyStrainPrior}
          deltaLabel={t("strainPage.vsLastWeek")}
          caption={t("strainPage.weekCaption")}
        />
        <StatTile
          label={t("strainPage.daysOver")}
          value={balance.over}
          unit={`/ ${balance.points.length}`}
          accent={series.restingHr}
          caption={t("strainPage.meanDeviation", {
            value: `${balance.meanDeviation >= 0 ? "+" : "−"}${t.number(Math.abs(balance.meanDeviation), 1)}`,
          })}
        />
      </div>

      {insights.length > 0 ? (
        <Panel>
          <PanelHeader title={t("strainPage.signals")} subtitle={t("strainPage.signalsSub")} />
          <InsightList insights={insights} t={t} />
        </Panel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title={t("strainPage.scatterTitle")}
            subtitle={t("strainPage.scatterSub")}
          />
          <BalanceScatter points={balance.points} bandLabels={bandLabels} />
        </Panel>

        <Panel>
          <PanelHeader
            title={t("strainPage.deviationTitle")}
            subtitle={t("strainPage.deviationSub")}
          />
          <DeviationBars points={balance.points.slice(-30)} height={300} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title={t("strainPage.loadTitle")}
          subtitle={t("strainPage.loadSub")}
        />
        <LoadChart data={loadSeries} height={260} />
      </Panel>

      <Panel>
        <PanelHeader title={t("strainPage.dailyTitle")} subtitle={t("strainPage.dailySub")} />
        <StrainBars days={days.slice(-60)} height={240} />
      </Panel>
    </div>
  );
}
