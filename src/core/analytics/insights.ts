import { computeBaselines, type BaselineSet } from "./baselines";
import { computeLoad, optimalStrain, summarizeBalance } from "./load";
import { sleepRecoveryCorrelation, summarizeSleep } from "./sleep";
import type { DayRecord } from "./types";
import { isNumber } from "./stats";

/**
 * Turns the numbers into sentences.
 *
 * Every insight has to clear the same bar: it says something the raw chart does
 * not, and it names the evidence. "HRV is 48ms" is not an insight; "HRV is 1.8 SD
 * below your 30-day baseline for the second day running" is.
 *
 * The engine emits *keys and numbers*, never prose. The same insight has to read
 * naturally in English and Italian, and a sentence assembled here could only
 * ever be one of them. Formatting is the renderer's job too — a duration and a
 * decimal separator both depend on the reader, not on the physiology.
 */

export type InsightTone = "positive" | "neutral" | "caution" | "alert";

/** A duration is tagged so the renderer can format it in the reader's locale. */
export type InsightParam = string | number | { duration: number };

export interface Insight {
  id: string;
  /** Dictionary key under `insight.` for the headline. */
  titleKey: string;
  /** Dictionary key under `insight.` for the supporting paragraph. */
  detailKey: string;
  params: Record<string, InsightParam>;
  tone: InsightTone;
  /** Which view this insight belongs to, so pages can filter to their own. */
  domain: "recovery" | "strain" | "sleep";
  /** Higher sorts first. */
  priority: number;
}

export function generateInsights(days: DayRecord[]): Insight[] {
  if (days.length === 0) return [];

  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const today = ordered[ordered.length - 1];
  const baselines = computeBaselines(ordered);
  const load = computeLoad(ordered);
  const balance = summarizeBalance(ordered);
  const sleep = summarizeSleep(ordered);

  return [
    ...recoveryInsights(baselines, ordered),
    ...loadInsights(load, balance, today),
    ...sleepInsights(sleep, ordered),
  ].sort((a, b) => b.priority - a.priority);
}

function recoveryInsights(baselines: BaselineSet, days: DayRecord[]): Insight[] {
  const out: Insight[] = [];
  const { hrv, restingHr, respiratoryRate, skinTemp } = baselines;

  if (isNumber(hrv.latest) && isNumber(hrv.baseline) && hrv.samples >= 5) {
    const delta = hrv.latest - hrv.baseline;

    if (hrv.z <= -1.5) {
      out.push({
        id: "hrv-suppressed",
        domain: "recovery",
        tone: hrv.z <= -2 ? "alert" : "caution",
        priority: 90 + Math.abs(hrv.z),
        titleKey: "hrvSuppressed.title",
        detailKey: "hrvSuppressed.detail",
        params: {
          sd: round(Math.abs(hrv.z), 1),
          latest: round(hrv.latest, 0),
          baseline: round(hrv.baseline, 0),
          delta: round(delta, 0),
        },
      });
    } else if (hrv.z >= 1.5) {
      out.push({
        id: "hrv-elevated",
        domain: "recovery",
        tone: "positive",
        priority: 70,
        titleKey: "hrvElevated.title",
        detailKey: "hrvElevated.detail",
        params: { delta: round(delta, 0), latest: round(hrv.latest, 0), baseline: round(hrv.baseline, 0) },
      });
    }

    if (Math.abs(hrv.trendPerDay) > 0.3) {
      const rising = hrv.trendPerDay > 0;
      out.push({
        id: "hrv-trend",
        domain: "recovery",
        tone: rising ? "positive" : "caution",
        priority: 55,
        titleKey: rising ? "hrvTrendUp.title" : "hrvTrendDown.title",
        detailKey: rising ? "hrvTrendUp.detail" : "hrvTrendDown.detail",
        params: { perWeek: round(Math.abs(hrv.trendPerDay * 7), 1) },
      });
    }
  }

  if (isNumber(restingHr.latest) && isNumber(restingHr.baseline) && restingHr.z >= 1.5) {
    out.push({
      id: "rhr-elevated",
      domain: "recovery",
      tone: restingHr.z >= 2 ? "alert" : "caution",
      priority: 85,
      titleKey: "rhrElevated.title",
      detailKey: "rhrElevated.detail",
      params: {
        delta: round(restingHr.latest - restingHr.baseline, 0),
        latest: round(restingHr.latest, 0),
        baseline: round(restingHr.baseline, 0),
      },
    });
  }

  // Temperature and respiratory rate move together when something is brewing.
  if (
    isNumber(skinTemp.latest) &&
    skinTemp.z >= 1.5 &&
    isNumber(respiratoryRate.latest) &&
    respiratoryRate.z >= 1.5
  ) {
    out.push({
      id: "illness-signal",
      domain: "recovery",
      tone: "alert",
      priority: 100,
      titleKey: "illnessSignal.title",
      detailKey: "illnessSignal.detail",
      params: {
        respiratoryRate: round(respiratoryRate.latest, 1),
        skinTemp: round(skinTemp.latest, 1),
      },
    });
  }

  const greenStreak = countStreak(days, (d) => (d.recoveryScore ?? 0) >= 67);
  if (greenStreak >= 3) {
    out.push({
      id: "green-streak",
      domain: "recovery",
      tone: "positive",
      priority: 60,
      titleKey: "greenStreak.title",
      detailKey: "greenStreak.detail",
      params: { days: greenStreak },
    });
  }

  return out;
}

function loadInsights(
  load: ReturnType<typeof computeLoad>,
  balance: ReturnType<typeof summarizeBalance>,
  today: DayRecord,
): Insight[] {
  const out: Insight[] = [];

  if (load.zone === "overreaching") {
    out.push({
      id: "load-spike",
      domain: "strain",
      tone: "alert",
      priority: 95,
      titleKey: "loadSpike.title",
      detailKey: "loadSpike.detail",
      params: { ratio: round(load.ratio, 2) },
    });
  } else if (load.zone === "detraining" && load.chronic > 3) {
    out.push({
      id: "load-decay",
      domain: "strain",
      tone: "caution",
      priority: 50,
      titleKey: "loadDecay.title",
      detailKey: "loadDecay.detail",
      params: { ratio: round(load.ratio, 2) },
    });
  } else if (load.chronic > 0) {
    out.push({
      id: "load-productive",
      domain: "strain",
      tone: "positive",
      priority: 40,
      titleKey: "loadProductive.title",
      detailKey: "loadProductive.detail",
      params: {
        ratio: round(load.ratio, 2),
        acute: round(load.acute, 1),
        chronic: round(load.chronic, 1),
      },
    });
  }

  if (balance.points.length >= 10) {
    if (balance.meanDeviation > 1.5) {
      out.push({
        id: "balance-over",
        domain: "strain",
        tone: "caution",
        priority: 75,
        titleKey: "balanceOver.title",
        detailKey: "balanceOver.detail",
        params: {
          over: balance.over,
          total: balance.points.length,
          mean: round(balance.meanDeviation, 1),
        },
      });
    } else if (balance.meanDeviation < -2) {
      out.push({
        id: "balance-under",
        domain: "strain",
        tone: "neutral",
        priority: 45,
        titleKey: "balanceUnder.title",
        detailKey: "balanceUnder.detail",
        params: {
          under: balance.under,
          total: balance.points.length,
          mean: round(Math.abs(balance.meanDeviation), 1),
        },
      });
    }
  }

  if (isNumber(today.recoveryScore)) {
    const { target, low, high } = optimalStrain(today.recoveryScore);
    const soFar = isNumber(today.strain);
    out.push({
      id: "today-target",
      domain: "strain",
      tone: "neutral",
      priority: 80,
      titleKey: "todayTarget.title",
      // Two keys rather than an appended clause: Italian puts the qualifier in
      // a different place, and a concatenated sentence cannot be reordered.
      detailKey: soFar ? "todayTarget.detailWithStrain" : "todayTarget.detail",
      params: {
        target: round(target, 1),
        low: round(low, 1),
        high: round(high, 1),
        recovery: today.recoveryScore,
        ...(soFar ? { strain: round(today.strain as number, 1) } : {}),
      },
    });
  }

  return out;
}

function sleepInsights(sleep: ReturnType<typeof summarizeSleep>, days: DayRecord[]): Insight[] {
  const out: Insight[] = [];
  if (sleep.nights.length === 0) return out;

  if (sleep.debtMilli > 2 * 60 * 60 * 1000) {
    out.push({
      id: "sleep-debt",
      domain: "sleep",
      tone: sleep.debtMilli > 6 * 60 * 60 * 1000 ? "alert" : "caution",
      priority: 88,
      titleKey: "sleepDebt.title",
      detailKey: "sleepDebt.detail",
      params: {
        debt: { duration: sleep.debtMilli },
        asleep: { duration: sleep.avgAsleepMilli },
        need: { duration: sleep.avgNeedMilli },
      },
    });
  }

  if (sleep.bedtimeVariabilityMin > 60) {
    out.push({
      id: "sleep-consistency",
      domain: "sleep",
      tone: "caution",
      priority: 65,
      titleKey: "sleepConsistency.title",
      detailKey: "sleepConsistency.detail",
      params: { minutes: Math.round(sleep.bedtimeVariabilityMin) },
    });
  } else if (sleep.bedtimeVariabilityMin < 30) {
    out.push({
      id: "sleep-regular",
      domain: "sleep",
      tone: "positive",
      priority: 35,
      titleKey: "sleepRegular.title",
      detailKey: "sleepRegular.detail",
      params: { minutes: Math.round(sleep.bedtimeVariabilityMin) },
    });
  }

  if (sleep.restorativeShare > 0 && sleep.restorativeShare < 0.35) {
    out.push({
      id: "restorative-low",
      domain: "sleep",
      tone: "caution",
      priority: 58,
      titleKey: "restorativeLow.title",
      detailKey: "restorativeLow.detail",
      params: { share: round(sleep.restorativeShare * 100, 0) },
    });
  }

  const correlation = sleepRecoveryCorrelation(days);
  if (correlation.n >= 14 && Math.abs(correlation.r) > 0.4) {
    out.push({
      id: "sleep-recovery-link",
      domain: "sleep",
      tone: correlation.r > 0 ? "positive" : "neutral",
      priority: 52,
      titleKey: "sleepRecoveryLink.title",
      detailKey:
        correlation.r > 0.6 ? "sleepRecoveryLink.detailStrong" : "sleepRecoveryLink.detail",
      params: {
        variance: round(correlation.r ** 2 * 100, 0),
        r: round(correlation.r, 2),
        nights: correlation.n,
      },
    });
  }

  return out;
}

/** Rounds for display, keeping the value a number so the locale owns the format. */
function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Length of the current run of days satisfying `predicate`, counting back from today. */
function countStreak(days: DayRecord[], predicate: (d: DayRecord) => boolean): number {
  const ordered = [...days].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const day of ordered) {
    if (!predicate(day)) break;
    streak++;
  }
  return streak;
}
