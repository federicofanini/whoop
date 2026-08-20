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
    productive: "Adding stimulus at a rate your base absorbs",
    overreaching: "Acute load has spiked ahead of your base",
    detraining: "Acute load has fallen below your base",
  } as const;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Strain"
        title="Is your training matched to what your body is offering?"
        description="Strain and recovery are on different scales, so they are never plotted on one pair of axes here — a dual-axis version of this chart invents a relationship. Instead: one measure per axis, and a deviation series that has a real zero."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Today's strain"
          value={today?.strain?.toFixed(1) ?? "—"}
          accent={series.strain}
          caption={target ? `Supported range ${target.low.toFixed(1)}–${target.high.toFixed(1)}` : undefined}
        />
        <StatTile
          label="Acute : chronic"
          value={load.ratio.toFixed(2)}
          unit="×"
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
          label="This week"
          value={load.weeklyStrain.toFixed(0)}
          accent={series.strain}
          delta={load.weeklyStrain - load.weeklyStrainPrior}
          deltaLabel="vs last week"
          caption="Total strain across 7 days"
        />
        <StatTile
          label="Days over recovery"
          value={balance.over}
          unit={`/ ${balance.points.length}`}
          accent={series.restingHr}
          caption={`Mean deviation ${balance.meanDeviation >= 0 ? "+" : ""}${balance.meanDeviation.toFixed(1)} strain`}
        />
      </div>

      {insights.length > 0 ? (
        <Panel>
          <PanelHeader title="Load signals" subtitle="Where your training is running relative to your capacity." />
          <InsightList insights={insights} t={t} />
        </Panel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Strain against recovery"
            subtitle="Every dot is a day. The shaded diagonal is the strain each recovery level supports — dots above it are days you outran your recovery."
          />
          <BalanceScatter points={balance.points} bandLabels={bandLabels} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Daily deviation"
            subtitle="Strain minus what that day's recovery supported. One measure, so one axis, with a real zero."
          />
          <DeviationBars points={balance.points.slice(-30)} height={300} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Acute and chronic load"
          subtitle="Both are exponentially weighted strain in the same units, so they legitimately share an axis. Their ratio is the number that matters: 0.80–1.30 is the productive band."
        />
        <LoadChart data={loadSeries} height={260} />
      </Panel>

      <Panel>
        <PanelHeader title="Daily strain" subtitle="Last 60 days." />
        <StrainBars days={days.slice(-60)} height={240} />
      </Panel>
    </div>
  );
}
