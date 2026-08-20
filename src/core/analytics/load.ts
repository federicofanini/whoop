import type { DayRecord } from "./types";
import { ewma, isNumber, mean } from "./stats";

/**
 * Training load, and whether the body is being asked for more than it is offering.
 */

/** Acute load is the last week; chronic is the last month. */
const ACUTE_SPAN = 7;
const CHRONIC_SPAN = 28;

export interface LoadState {
  acute: number;
  chronic: number;
  /**
   * Acute ÷ chronic. Loosely, the sports-science "acute:chronic workload ratio":
   * below ~0.8 is detraining, 0.8-1.3 is productive, above ~1.5 is a spike that
   * historically tracks with injury and illness risk.
   */
  ratio: number;
  zone: "detraining" | "productive" | "overreaching";
  weeklyStrain: number;
  weeklyStrainPrior: number;
}

export function computeLoad(days: DayRecord[]): LoadState {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const strains = ordered.map((d) => (isNumber(d.strain) ? d.strain : 0));

  const acute = ewma(strains.slice(-ACUTE_SPAN), ACUTE_SPAN);
  const chronic = ewma(strains.slice(-CHRONIC_SPAN), CHRONIC_SPAN);
  const ratio = chronic > 0 ? acute / chronic : 0;

  const zone: LoadState["zone"] =
    ratio > 1.5 ? "overreaching" : ratio < 0.8 ? "detraining" : "productive";

  return {
    acute,
    chronic,
    ratio,
    zone,
    weeklyStrain: strains.slice(-7).reduce((a, b) => a + b, 0),
    weeklyStrainPrior: strains.slice(-14, -7).reduce((a, b) => a + b, 0),
  };
}

/**
 * The strain a given recovery can absorb.
 *
 * WHOOP does not publish its strain-target formula, so this is an explicit
 * heuristic: a fully recovered day supports roughly 17 strain, a fully depleted
 * one roughly 6, interpolated linearly, with a ±1.5 band because no single number
 * is the "right" answer.
 */
export function optimalStrain(recoveryScore: number): { target: number; low: number; high: number } {
  const target = 6 + (recoveryScore / 100) * 11;
  return { target, low: Math.max(0, target - 1.5), high: target + 1.5 };
}

export type BalanceVerdict = "under" | "aligned" | "over";

export interface BalancePoint {
  date: string;
  recovery: number;
  strain: number;
  target: number;
  /** Strain minus what that day's recovery supported. */
  deviation: number;
  verdict: BalanceVerdict;
}

export function balanceSeries(days: DayRecord[]): BalancePoint[] {
  return [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((d) => isNumber(d.recoveryScore) && isNumber(d.strain))
    .map((d) => {
      const recovery = d.recoveryScore as number;
      const strain = d.strain as number;
      const { target, low, high } = optimalStrain(recovery);
      const verdict: BalanceVerdict = strain > high ? "over" : strain < low ? "under" : "aligned";
      return { date: d.date, recovery, strain, target, deviation: strain - target, verdict };
    });
}

export interface BalanceSummary {
  points: BalancePoint[];
  over: number;
  under: number;
  aligned: number;
  /** Mean deviation across the window. Positive means consistently outrunning recovery. */
  meanDeviation: number;
}

export function summarizeBalance(days: DayRecord[], window = 30): BalanceSummary {
  const points = balanceSeries(days).slice(-window);
  return {
    points,
    over: points.filter((p) => p.verdict === "over").length,
    under: points.filter((p) => p.verdict === "under").length,
    aligned: points.filter((p) => p.verdict === "aligned").length,
    meanDeviation: points.length ? mean(points.map((p) => p.deviation)) : 0,
  };
}
