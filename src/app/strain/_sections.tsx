import { getTranslator } from "@/server/locale";
import { getBalance, getInsightsFor, getLoad, getToday } from "@/server/analytics";
import { getAllDays, getCoreDays } from "@/server/dashboard";
import { optimalStrain } from "@/core/analytics/load";
import { ewma } from "@/core/analytics/stats";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import { BalanceScatter, DeviationBars, LoadChart, StrainBars } from "@/components/charts/lazy";
import { series, status } from "@/lib/theme";
import { bandLabels } from "../_sections/band-labels";

/** The strain view. Only the daily bars reach for the workouts table. */

export async function TodayStrainTile() {
  const [t, today] = await Promise.all([getTranslator(), getToday()]);
  const recovery = today?.recoveryScore ?? null;
  const target = recovery !== null ? optimalStrain(recovery) : null;

  return (
    <StatTile
      label={t("strainPage.today")}
      value={today?.strain?.toFixed(1) ?? "—"}
      accent={series.strain}
      caption={
        target ? t("strainPage.supportedRange", { low: target.low, high: target.high }) : undefined
      }
    />
  );
}

export async function LoadRatioTile() {
  const [t, load] = await Promise.all([getTranslator(), getLoad()]);
  const zoneCopy = {
    productive: t("strainPage.zoneProductive"),
    overreaching: t("strainPage.zoneOverreaching"),
    detraining: t("strainPage.zoneDetraining"),
  } as const;

  return (
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
  );
}

export async function WeeklyStrainTile() {
  const [t, load] = await Promise.all([getTranslator(), getLoad()]);

  return (
    <StatTile
      label={t("strainPage.thisWeek")}
      value={load.weeklyStrain.toFixed(0)}
      accent={series.strain}
      delta={load.weeklyStrain - load.weeklyStrainPrior}
      deltaLabel={t("strainPage.vsLastWeek")}
      caption={t("strainPage.weekCaption")}
    />
  );
}

export async function DaysOverTile() {
  const [t, balance] = await Promise.all([getTranslator(), getBalance(45)]);

  return (
    <StatTile
      label={t("strainPage.daysOver")}
      value={balance.over}
      unit={`/ ${balance.points.length}`}
      accent={series.restingHr}
      caption={t("strainPage.meanDeviation", {
        value: `${balance.meanDeviation >= 0 ? "+" : "−"}${t.number(Math.abs(balance.meanDeviation), 1)}`,
      })}
    />
  );
}

export async function StrainSignals() {
  const [t, insights] = await Promise.all([getTranslator(), getInsightsFor("strain")]);
  if (insights.length === 0) return null;

  return (
    <Panel>
      <PanelHeader title={t("strainPage.signals")} subtitle={t("strainPage.signalsSub")} />
      <InsightList insights={insights} t={t} />
    </Panel>
  );
}

export async function BalancePanel() {
  const [t, balance, labels] = await Promise.all([getTranslator(), getBalance(45), bandLabels()]);

  return (
    <>
      <PanelHeader title={t("strainPage.scatterTitle")} subtitle={t("strainPage.scatterSub")} />
      <BalanceScatter points={balance.points} bandLabels={labels} />
    </>
  );
}

export async function DeviationPanel() {
  const [t, balance] = await Promise.all([getTranslator(), getBalance(45)]);

  return (
    <>
      <PanelHeader title={t("strainPage.deviationTitle")} subtitle={t("strainPage.deviationSub")} />
      <DeviationBars points={balance.points.slice(-30)} height={300} />
    </>
  );
}

export async function LoadPanel() {
  const [t, days] = await Promise.all([getTranslator(), getCoreDays()]);

  // Acute and chronic load recomputed at each point, so the ratio can be read
  // historically. Quadratic in the window size, which is why it lives in its own
  // suspended panel rather than in the page body.
  const window = days.slice(-90);
  const strains = window.map((d) => d.strain ?? 0);
  const points = window.map((day, index) => ({
    date: day.date,
    acute: index >= 6 ? ewma(strains.slice(Math.max(0, index - 6), index + 1), 7) : null,
    chronic: index >= 13 ? ewma(strains.slice(Math.max(0, index - 27), index + 1), 28) : null,
  }));

  return (
    <>
      <PanelHeader title={t("strainPage.loadTitle")} subtitle={t("strainPage.loadSub")} />
      <LoadChart data={points} height={260} />
    </>
  );
}

export async function DailyStrainPanel() {
  const [t, days] = await Promise.all([getTranslator(), getAllDays()]);

  return (
    <>
      <PanelHeader title={t("strainPage.dailyTitle")} subtitle={t("strainPage.dailySub")} />
      <StrainBars days={days.slice(-60)} height={240} />
    </>
  );
}
