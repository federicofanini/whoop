import { getTranslator } from "@/server/locale";
import { getInsightsFor, getSleepCorrelation, getSleepSummary } from "@/server/analytics";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import {
  BedtimeConsistencyChart,
  SleepDebtChart,
  SleepRecoveryScatter,
  SleepStagesChart,
} from "@/components/charts/lazy";
import { series, stageColor, status } from "@/lib/theme";

/**
 * The sleep view.
 *
 * Every panel here reads the 30-night summary, which is computed once per
 * request and shared — so splitting them costs nothing and each one appears the
 * moment its chart chunk has loaded rather than after the last of them.
 */

const WINDOW = 30;

export async function SleepDebtTile() {
  const [t, sleep] = await Promise.all([getTranslator(), getSleepSummary(WINDOW)]);

  return (
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
  );
}

export async function AverageAsleepTile() {
  const [t, sleep] = await Promise.all([getTranslator(), getSleepSummary(WINDOW)]);

  return (
    <StatTile
      label={t("sleepPage.avgAsleep")}
      value={t.duration(sleep.avgAsleepMilli)}
      accent={series.sleep}
      caption={t("sleepPage.againstNeed", { need: { duration: sleep.avgNeedMilli } })}
    />
  );
}

export async function RestorativeTile() {
  const [t, sleep] = await Promise.all([getTranslator(), getSleepSummary(WINDOW)]);

  return (
    <StatTile
      label={t("sleepPage.restorative")}
      value={(sleep.restorativeShare * 100).toFixed(0)}
      unit={t("common.percent")}
      accent={stageColor.deep}
      caption={t("sleepPage.restorativeCaption")}
    />
  );
}

export async function BedtimeSpreadTile() {
  const [t, sleep] = await Promise.all([getTranslator(), getSleepSummary(WINDOW)]);
  const regular = sleep.bedtimeVariabilityMin < 30;

  return (
    <StatTile
      label={t("sleepPage.spread")}
      value={`±${Math.round(sleep.bedtimeVariabilityMin)}`}
      unit="min"
      accent={regular ? status.good : status.warning}
      caption={regular ? t("sleepPage.genuinelyRegular") : t("sleepPage.spreadCaption")}
    />
  );
}

export async function SleepSignals() {
  const [t, insights] = await Promise.all([getTranslator(), getInsightsFor("sleep")]);
  if (insights.length === 0) return null;

  return (
    <Panel>
      <PanelHeader title={t("sleepPage.signals")} subtitle={t("sleepPage.signalsSub")} />
      <InsightList insights={insights} t={t} />
    </Panel>
  );
}

export async function StagesPanel() {
  const [t, sleep] = await Promise.all([getTranslator(), getSleepSummary(WINDOW)]);

  return (
    <>
      <PanelHeader
        title={t("sleepPage.architecture")}
        subtitle={t("sleepPage.architectureSub")}
      />
      <SleepStagesChart nights={sleep.nights.slice(-21)} height={300} />
    </>
  );
}

export async function ShortfallPanel() {
  const [t, sleep] = await Promise.all([getTranslator(), getSleepSummary(WINDOW)]);

  return (
    <>
      <PanelHeader title={t("sleepPage.shortfall")} subtitle={t("sleepPage.shortfallSub")} />
      <SleepDebtChart nights={sleep.nights.slice(-21)} height={240} />
    </>
  );
}

export async function RegularityPanel() {
  const [t, sleep] = await Promise.all([getTranslator(), getSleepSummary(WINDOW)]);

  return (
    <>
      <PanelHeader title={t("sleepPage.regularity")} subtitle={t("sleepPage.regularitySub")} />
      <BedtimeConsistencyChart nights={sleep.nights.slice(-21)} height={240} />
    </>
  );
}

export async function CorrelationPanel() {
  const [t, correlation] = await Promise.all([getTranslator(), getSleepCorrelation(90)]);

  return (
    <>
      <PanelHeader
        title={t("sleepPage.correlation")}
        subtitle={
          correlation.n >= 14
            ? t("sleepPage.correlationDetail", {
                r: Number(correlation.r.toFixed(2)),
                nights: correlation.n,
                variance: Number((correlation.r ** 2 * 100).toFixed(0)),
              })
            : t("sleepPage.correlationThin")
        }
      />
      <SleepRecoveryScatter points={correlation.points} r={correlation.r} height={300} />
    </>
  );
}
