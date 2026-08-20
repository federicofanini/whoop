import type { DayRecord } from "./types";
import { isNumber, mean, slope, stdev, zScore } from "./stats";

/**
 * A metric measured against the only baseline that matters — your own.
 *
 * Population norms for HRV are close to useless (healthy adults span 20-200ms).
 * A reading is interesting when it departs from *your* recent distribution, which
 * is what the z-score captures.
 */
export interface BaselineMetric {
  latest: number | null;
  baseline: number | null;
  sd: number;
  z: number;
  /** Slope of the last two weeks, in units per day. */
  trendPerDay: number;
  status: "normal" | "elevated" | "suppressed";
  samples: number;
}

/** 30 days is long enough to be stable and short enough to follow real fitness change. */
const BASELINE_WINDOW = 30;

/** Beyond ±1 SD is worth surfacing; beyond ±2 is worth acting on. */
const NOTABLE_Z = 1;

function buildMetric(series: number[], higherIsBetter: boolean): BaselineMetric {
  if (series.length === 0) {
    return { latest: null, baseline: null, sd: 0, z: 0, trendPerDay: 0, status: "normal", samples: 0 };
  }

  const latest = series[series.length - 1];
  // The baseline deliberately excludes today, so today is compared against history.
  const history = series.slice(-1 - BASELINE_WINDOW, -1);
  const usable = history.length >= 5 ? history : series.slice(0, -1);

  const z = usable.length >= 2 ? zScore(latest, usable) : 0;
  const trendPerDay = slope(series.slice(-14));

  let status: BaselineMetric["status"] = "normal";
  if (z >= NOTABLE_Z) status = higherIsBetter ? "elevated" : "elevated";
  else if (z <= -NOTABLE_Z) status = "suppressed";

  return {
    latest,
    baseline: usable.length ? mean(usable) : null,
    sd: stdev(usable),
    z,
    trendPerDay,
    status,
    samples: usable.length,
  };
}

export interface BaselineSet {
  hrv: BaselineMetric;
  restingHr: BaselineMetric;
  recovery: BaselineMetric;
  respiratoryRate: BaselineMetric;
  skinTemp: BaselineMetric;
}

export function computeBaselines(days: DayRecord[]): BaselineSet {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));

  const pick = (fn: (d: DayRecord) => number | null | undefined) =>
    ordered.map(fn).filter(isNumber);

  return {
    hrv: buildMetric(pick((d) => d.hrvMs), true),
    restingHr: buildMetric(pick((d) => d.restingHeartRate), false),
    recovery: buildMetric(pick((d) => d.recoveryScore), true),
    respiratoryRate: buildMetric(pick((d) => d.sleep?.respiratoryRate ?? null), false),
    skinTemp: buildMetric(pick((d) => d.skinTempC), false),
  };
}

/** Series for the baseline chart: the daily value plus the rolling band around it. */
export interface BaselinePoint {
  date: string;
  value: number | null;
  baseline: number | null;
  upper: number | null;
  lower: number | null;
}

export function baselineSeries(
  days: DayRecord[],
  metric: (d: DayRecord) => number | null | undefined,
  window = BASELINE_WINDOW,
): BaselinePoint[] {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));

  return ordered.map((day, i) => {
    const history = ordered
      .slice(Math.max(0, i - window), i)
      .map(metric)
      .filter(isNumber);

    const value = metric(day);
    if (history.length < 5) {
      return {
        date: day.date,
        value: isNumber(value) ? value : null,
        baseline: null,
        upper: null,
        lower: null,
      };
    }

    const m = mean(history);
    const sd = stdev(history);
    return {
      date: day.date,
      value: isNumber(value) ? value : null,
      baseline: m,
      upper: m + sd,
      lower: m - sd,
    };
  });
}
