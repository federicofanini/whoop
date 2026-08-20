import { loadViewerDashboard } from "@/server/dashboard";
import { getTranslator } from "@/server/locale";
import { baselineSeries, computeBaselines } from "@/core/analytics/baselines";
import { generateInsights } from "@/core/analytics/insights";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import { BaselineChart } from "@/components/charts/baseline-chart";
import { RecoveryBars } from "@/components/charts/recovery-bars";
import { series, status, type BandLabels } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function RecoveryPage() {
  const t = await getTranslator();
  const bandLabels: BandLabels = {
    green: t("band.primed"),
    yellow: t("band.adequate"),
    red: t("band.compromised"),
  };
  const { days } = await loadViewerDashboard();
  const baselines = computeBaselines(days);
  const insights = generateInsights(days).filter((i) => i.domain === "recovery");

  const window = days.slice(-90);
  const hrvPoints = baselineSeries(window, (d) => d.hrvMs);
  const rhrPoints = baselineSeries(window, (d) => d.restingHeartRate);

  const green = days.slice(-30).filter((d) => (d.recoveryScore ?? 0) >= 67).length;
  const red = days.slice(-30).filter((d) => (d.recoveryScore ?? 100) < 34).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("nav.recovery")}
        title={t("recoveryPage.title")}
        description={t("recoveryPage.lead")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t("overview.hrv")}
          value={baselines.hrv.latest?.toFixed(0) ?? "—"}
          unit={t("common.ms")}
          accent={series.recovery}
          delta={
            baselines.hrv.latest !== null && baselines.hrv.baseline !== null
              ? baselines.hrv.latest - baselines.hrv.baseline
              : undefined
          }
          deltaLabel={t("recoveryPage.vsBaseline")}
          deltaGood
          caption={`${baselines.hrv.z >= 0 ? "+" : ""}${baselines.hrv.z.toFixed(1)} SD · baseline ${baselines.hrv.baseline?.toFixed(0) ?? "—"}ms`}
        />
        <StatTile
          label={t("overview.restingHr")}
          value={baselines.restingHr.latest?.toFixed(0) ?? "—"}
          unit={t("common.bpm")}
          accent={series.restingHr}
          delta={
            baselines.restingHr.latest !== null && baselines.restingHr.baseline !== null
              ? baselines.restingHr.latest - baselines.restingHr.baseline
              : undefined
          }
          deltaLabel={t("recoveryPage.vsBaseline")}
          deltaGood={false}
          caption={`${baselines.restingHr.z >= 0 ? "+" : ""}${baselines.restingHr.z.toFixed(1)} SD · baseline ${baselines.restingHr.baseline?.toFixed(0) ?? "—"}bpm`}
        />
        <StatTile
          label={t("recoveryPage.greenDays")}
          value={green}
          unit={t("recoveryPage.outOf30")}
          accent={status.good}
          caption={t("recoveryPage.greenCaption")}
        />
        <StatTile
          label={t("recoveryPage.redDays")}
          value={red}
          unit={t("recoveryPage.outOf30")}
          accent={status.critical}
          caption={t("recoveryPage.redCaption")}
        />
      </div>

      {insights.length > 0 ? (
        <Panel>
          <PanelHeader title={t("recoveryPage.signals")} subtitle={t("recoveryPage.signalsSub")} />
          <InsightList insights={insights} t={t} />
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title={t("recoveryPage.hrvTitle")}
          subtitle={t("recoveryPage.hrvSub")}
        />
        <BaselineChart points={hrvPoints} color={series.recovery} unit={t("common.ms")} label={t("overview.hrv")} height={280} />
      </Panel>

      <Panel>
        <PanelHeader
          title={t("recoveryPage.rhrTitle")}
          subtitle={t("recoveryPage.rhrSub")}
        />
        <BaselineChart points={rhrPoints} color={series.restingHr} unit={` ${t("common.bpm")}`} label={t("overview.restingHr")} height={280} />
      </Panel>

      <Panel>
        <PanelHeader title={t("recoveryPage.dailyTitle")} subtitle={t("recoveryPage.dailySub")} />
        <RecoveryBars days={days.slice(-60)} bandLabels={bandLabels} height={240} />
      </Panel>
    </div>
  );
}
