import type { DayRecord, SleepRecord } from "./types";
import { isNumber, mean, stdev } from "./stats";

const HOUR = 3_600_000;

/** Time actually asleep: everything in bed minus wake and dropout. */
export function asleepMilli(sleep: SleepRecord): number {
  return Math.max(0, sleep.inBedMilli - sleep.awakeMilli - sleep.noDataMilli);
}

/** What WHOOP said the body needed that night — baseline plus the three add-ons. */
export function sleepNeedMilli(sleep: SleepRecord): number {
  return (
    sleep.needBaselineMilli +
    sleep.needFromDebtMilli +
    sleep.needFromStrainMilli +
    sleep.needFromNapMilli
  );
}

export interface SleepNight {
  date: string;
  asleepMilli: number;
  needMilli: number;
  /** Positive when short of need. */
  shortfallMilli: number;
  performance: number | null;
  efficiency: number | null;
  consistency: number | null;
  respiratoryRate: number | null;
  disturbances: number;
  cycles: number;
  stages: { awake: number; light: number; rem: number; deep: number };
  /** Minutes past midnight, so bedtimes after midnight sort naturally. */
  bedtimeMinutes: number;
  waketimeMinutes: number;
}

export function sleepNights(days: DayRecord[]): SleepNight[] {
  return [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((d): d is DayRecord & { sleep: SleepRecord } => Boolean(d.sleep) && !d.sleep!.nap)
    .map((d) => {
      const s = d.sleep;
      const asleep = asleepMilli(s);
      const need = sleepNeedMilli(s);
      const start = new Date(s.start);
      const end = new Date(s.end);

      // Shift so an 11pm bedtime and a 1am bedtime are 2 hours apart, not 22.
      const rawBed = start.getHours() * 60 + start.getMinutes();
      const bedtimeMinutes = rawBed < 720 ? rawBed + 1440 : rawBed;

      return {
        date: d.date,
        asleepMilli: asleep,
        needMilli: need,
        shortfallMilli: Math.max(0, need - asleep),
        performance: s.performancePercentage,
        efficiency: s.efficiencyPercentage,
        consistency: s.consistencyPercentage,
        respiratoryRate: s.respiratoryRate,
        disturbances: s.disturbanceCount,
        cycles: s.sleepCycleCount,
        stages: {
          awake: s.awakeMilli,
          light: s.lightMilli,
          rem: s.remMilli,
          deep: s.swsMilli,
        },
        bedtimeMinutes,
        waketimeMinutes: end.getHours() * 60 + end.getMinutes(),
      };
    });
}

export interface SleepSummary {
  nights: SleepNight[];
  /** Rolling debt over the window, in milliseconds. */
  debtMilli: number;
  avgAsleepMilli: number;
  avgNeedMilli: number;
  avgPerformance: number;
  avgEfficiency: number;
  /** Standard deviation of bedtime, in minutes. Under 30 is genuinely regular. */
  bedtimeVariabilityMin: number;
  waketimeVariabilityMin: number;
  /** Share of REM + deep in total sleep — the restorative fraction. */
  restorativeShare: number;
  avgDisturbances: number;
}

export function summarizeSleep(days: DayRecord[], window = 14): SleepSummary {
  const nights = sleepNights(days).slice(-window);

  if (nights.length === 0) {
    return {
      nights,
      debtMilli: 0,
      avgAsleepMilli: 0,
      avgNeedMilli: 0,
      avgPerformance: 0,
      avgEfficiency: 0,
      bedtimeVariabilityMin: 0,
      waketimeVariabilityMin: 0,
      restorativeShare: 0,
      avgDisturbances: 0,
    };
  }

  // Debt is capped at a week's worth: older shortfall stops being physiologically live.
  const recent = nights.slice(-7);
  const debtMilli = recent.reduce((acc, n) => acc + n.shortfallMilli, 0);

  const restorative = nights.reduce((acc, n) => acc + n.stages.rem + n.stages.deep, 0);
  const totalAsleep = nights.reduce((acc, n) => acc + n.asleepMilli, 0);

  return {
    nights,
    debtMilli,
    avgAsleepMilli: mean(nights.map((n) => n.asleepMilli)),
    avgNeedMilli: mean(nights.map((n) => n.needMilli)),
    avgPerformance: mean(nights.map((n) => n.performance).filter(isNumber)),
    avgEfficiency: mean(nights.map((n) => n.efficiency).filter(isNumber)),
    bedtimeVariabilityMin: stdev(nights.map((n) => n.bedtimeMinutes)),
    waketimeVariabilityMin: stdev(nights.map((n) => n.waketimeMinutes)),
    restorativeShare: totalAsleep > 0 ? restorative / totalAsleep : 0,
    avgDisturbances: mean(nights.map((n) => n.disturbances)),
  };
}

/**
 * Does sleep actually move *your* recovery?
 *
 * Correlates each night's sleep performance against the recovery score that
 * followed it. This is the question the raw numbers cannot answer on their own,
 * and the answer differs person to person.
 */
export function sleepRecoveryCorrelation(days: DayRecord[]): {
  r: number;
  n: number;
  points: { performance: number; recovery: number; date: string }[];
} {
  const points = [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter(
      (d) =>
        d.sleep &&
        !d.sleep.nap &&
        isNumber(d.sleep.performancePercentage) &&
        isNumber(d.recoveryScore),
    )
    .map((d) => ({
      date: d.date,
      performance: d.sleep!.performancePercentage as number,
      recovery: d.recoveryScore as number,
    }));

  if (points.length < 5) return { r: 0, n: points.length, points };

  const xs = points.map((p) => p.performance);
  const ys = points.map((p) => p.recovery);
  const xMean = mean(xs);
  const yMean = mean(ys);

  let num = 0;
  let xVar = 0;
  let yVar = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    xVar += (xs[i] - xMean) ** 2;
    yVar += (ys[i] - yMean) ** 2;
  }

  const denom = Math.sqrt(xVar * yVar);
  return { r: denom === 0 ? 0 : num / denom, n: points.length, points };
}

export function hoursFromMilli(milli: number): number {
  return milli / HOUR;
}
