import { getTranslator } from "@/server/locale";
import { getBaselines, getInsightsFor } from "@/server/analytics";
import { getCoreDays, getVitalsDays } from "@/server/dashboard";
import { baselineSeries } from "@/core/analytics/baselines";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import { BaselineChart, RecoveryBars } from "@/components/charts/lazy";
import { series, status } from "@/lib/theme";
import { bandLabels } from "../_sections/band-labels";

/**
 * The recovery view, panel by panel.
 *
 * The two baseline charts are the expensive part — `baselineSeries` recomputes
 * a rolling mean and standard deviation at every one of ninety points — so they
 * are separate units of work from the tiles above them and stream in after.
 */

export async function HrvTile() {
  const [t, baselines] = await Promise.all([getTranslator(), getBaselines()]);
  const { hrv } = baselines;

  return (
    <StatTile
      label={t("overview.hrv")}
      value={hrv.latest?.toFixed(0) ?? "—"}
      unit={t("common.ms")}
      accent={series.recovery}
      delta={hrv.latest !== null && hrv.baseline !== null ? hrv.latest - hrv.baseline : undefined}
      deltaLabel={t("recoveryPage.vsBaseline")}
      deltaGood
      caption={`${hrv.z >= 0 ? "+" : ""}${hrv.z.toFixed(1)} SD · baseline ${hrv.baseline?.toFixed(0) ?? "—"}ms`}
    />
  );
}

export async function RestingHrTile() {
  const [t, baselines] = await Promise.all([getTranslator(), getBaselines()]);
  const { restingHr } = baselines;

  return (
    <StatTile
      label={t("overview.restingHr")}
      value={restingHr.latest?.toFixed(0) ?? "—"}
      unit={t("common.bpm")}
      accent={series.restingHr}
      delta={
        restingHr.latest !== null && restingHr.baseline !== null
          ? restingHr.latest - restingHr.baseline
          : undefined
      }
      deltaLabel={t("recoveryPage.vsBaseline")}
      deltaGood={false}
      caption={`${restingHr.z >= 0 ? "+" : ""}${restingHr.z.toFixed(1)} SD · baseline ${restingHr.baseline?.toFixed(0) ?? "—"}bpm`}
    />
  );
}

export async function BandCountTiles() {
  const [t, days] = await Promise.all([getTranslator(), getCoreDays()]);
  const month = days.slice(-30);
  const green = month.filter((d) => (d.recoveryScore ?? 0) >= 67).length;
  const red = month.filter((d) => (d.recoveryScore ?? 100) < 34).length;

  return (
    <>
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
    </>
  );
}

export async function RecoverySignals() {
  const [t, insights] = await Promise.all([getTranslator(), getInsightsFor("recovery")]);
  if (insights.length === 0) return null;

  return (
    <Panel>
      <PanelHeader title={t("recoveryPage.signals")} subtitle={t("recoveryPage.signalsSub")} />
      <InsightList insights={insights} t={t} />
    </Panel>
  );
}

export async function HrvBaselineChart() {
  const [t, days] = await Promise.all([getTranslator(), getVitalsDays()]);

  return (
    <>
      <PanelHeader title={t("recoveryPage.hrvTitle")} subtitle={t("recoveryPage.hrvSub")} />
      <BaselineChart
        points={baselineSeries(days.slice(-90), (d) => d.hrvMs)}
        color={series.recovery}
        unit={t("common.ms")}
        label={t("overview.hrv")}
        height={280}
      />
    </>
  );
}

export async function RestingHrBaselineChart() {
  const [t, days] = await Promise.all([getTranslator(), getVitalsDays()]);

  return (
    <>
      <PanelHeader title={t("recoveryPage.rhrTitle")} subtitle={t("recoveryPage.rhrSub")} />
      <BaselineChart
        points={baselineSeries(days.slice(-90), (d) => d.restingHeartRate)}
        color={series.restingHr}
        unit={` ${t("common.bpm")}`}
        label={t("overview.restingHr")}
        height={280}
      />
    </>
  );
}

export async function DailyRecoveryChart() {
  const [t, days, labels] = await Promise.all([getTranslator(), getCoreDays(), bandLabels()]);

  return (
    <>
      <PanelHeader title={t("recoveryPage.dailyTitle")} subtitle={t("recoveryPage.dailySub")} />
      <RecoveryBars days={days.slice(-60)} bandLabels={labels} height={240} />
    </>
  );
}
