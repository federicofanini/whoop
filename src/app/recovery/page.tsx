import { loadDashboardData } from "@/lib/data/load";
import { baselineSeries, computeBaselines } from "@/lib/analytics/baselines";
import { generateInsights } from "@/lib/analytics/insights";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import { BaselineChart } from "@/components/charts/baseline-chart";
import { RecoveryBars } from "@/components/charts/recovery-bars";
import { series, status } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function RecoveryPage() {
  const { days } = await loadDashboardData();
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
        eyebrow="Recovery"
        title="HRV and resting heart rate, against your own baseline"
        description="Population HRV norms span an order of magnitude, so they tell you nothing. What matters is where today sits inside your own distribution — which is what the shaded band shows."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="HRV"
          value={baselines.hrv.latest?.toFixed(0) ?? "—"}
          unit="ms"
          accent={series.recovery}
          delta={
            baselines.hrv.latest !== null && baselines.hrv.baseline !== null
              ? baselines.hrv.latest - baselines.hrv.baseline
              : undefined
          }
          deltaLabel="vs baseline"
          deltaGood
          caption={`${baselines.hrv.z >= 0 ? "+" : ""}${baselines.hrv.z.toFixed(1)} SD · baseline ${baselines.hrv.baseline?.toFixed(0) ?? "—"}ms`}
        />
        <StatTile
          label="Resting HR"
          value={baselines.restingHr.latest?.toFixed(0) ?? "—"}
          unit="bpm"
          accent={series.restingHr}
          delta={
            baselines.restingHr.latest !== null && baselines.restingHr.baseline !== null
              ? baselines.restingHr.latest - baselines.restingHr.baseline
              : undefined
          }
          deltaLabel="vs baseline"
          deltaGood={false}
          caption={`${baselines.restingHr.z >= 0 ? "+" : ""}${baselines.restingHr.z.toFixed(1)} SD · baseline ${baselines.restingHr.baseline?.toFixed(0) ?? "—"}bpm`}
        />
        <StatTile
          label="Green days"
          value={green}
          unit="/ 30"
          accent={status.good}
          caption="Recovery at or above 67%"
        />
        <StatTile
          label="Red days"
          value={red}
          unit="/ 30"
          accent={status.critical}
          caption="Recovery below 34%"
        />
      </div>

      {insights.length > 0 ? (
        <Panel>
          <PanelHeader title="Recovery signals" subtitle="Only what departs from your normal range." />
          <InsightList insights={insights} />
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title="Heart rate variability"
          subtitle="90 days. The band is ±1 standard deviation around a trailing 30-day mean — inside it is noise, outside it is signal."
        />
        <BaselineChart points={hrvPoints} color={series.recovery} unit="ms" label="HRV" height={280} />
      </Panel>

      <Panel>
        <PanelHeader
          title="Resting heart rate"
          subtitle="Rising RHR alongside falling HRV is the pattern worth acting on — either alone is usually noise."
        />
        <BaselineChart points={rhrPoints} color={series.restingHr} unit=" bpm" label="Resting HR" height={280} />
      </Panel>

      <Panel>
        <PanelHeader title="Daily recovery score" subtitle="Last 60 days." />
        <RecoveryBars days={days.slice(-60)} height={240} />
      </Panel>
    </div>
  );
}
