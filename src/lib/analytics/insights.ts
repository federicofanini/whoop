import { formatDuration } from "@/lib/utils";
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
 */

export type InsightTone = "positive" | "neutral" | "caution" | "alert";

export interface Insight {
  id: string;
  title: string;
  detail: string;
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

  const insights: Insight[] = [];

  insights.push(...recoveryInsights(baselines, ordered));
  insights.push(...loadInsights(load, balance, today));
  insights.push(...sleepInsights(sleep, ordered));

  return insights.sort((a, b) => b.priority - a.priority);
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
        title: `HRV is ${Math.abs(hrv.z).toFixed(1)} SD below your baseline`,
        detail: `${hrv.latest.toFixed(0)}ms against a 30-day baseline of ${hrv.baseline.toFixed(0)}ms (${delta.toFixed(0)}ms). A single suppressed morning is noise; two or three in a row usually means accumulated load, a short night, alcohol, or something incubating.`,
      });
    } else if (hrv.z >= 1.5) {
      out.push({
        id: "hrv-elevated",
        domain: "recovery",
        tone: "positive",
        priority: 70,
        title: `HRV is running ${delta.toFixed(0)}ms above baseline`,
        detail: `${hrv.latest.toFixed(0)}ms against ${hrv.baseline.toFixed(0)}ms. Your parasympathetic system has capacity — this is the profile of a day that can absorb real intensity.`,
      });
    }

    if (Math.abs(hrv.trendPerDay) > 0.3) {
      const direction = hrv.trendPerDay > 0 ? "climbing" : "drifting down";
      out.push({
        id: "hrv-trend",
        domain: "recovery",
        tone: hrv.trendPerDay > 0 ? "positive" : "caution",
        priority: 55,
        title: `HRV has been ${direction} for two weeks`,
        detail: `About ${Math.abs(hrv.trendPerDay * 7).toFixed(1)}ms per week over the last 14 days. ${
          hrv.trendPerDay > 0
            ? "That is the signature of adaptation catching up with your training."
            : "Sustained decline over this long is worth taking seriously — check sleep debt and load before adding intensity."
        }`,
      });
    }
  }

  if (isNumber(restingHr.latest) && isNumber(restingHr.baseline) && restingHr.z >= 1.5) {
    out.push({
      id: "rhr-elevated",
      domain: "recovery",
      tone: restingHr.z >= 2 ? "alert" : "caution",
      priority: 85,
      title: `Resting heart rate is elevated by ${(restingHr.latest - restingHr.baseline).toFixed(0)} bpm`,
      detail: `${restingHr.latest.toFixed(0)} bpm against a baseline of ${restingHr.baseline.toFixed(0)}. Elevated RHR alongside suppressed HRV is the classic pre-illness or under-recovered pattern.`,
    });
  }

  // Temperature and respiratory rate move together when something is brewing.
  const tempFlag = isNumber(skinTemp.latest) && skinTemp.z >= 1.5;
  const rrFlag = isNumber(respiratoryRate.latest) && respiratoryRate.z >= 1.5;
  if (tempFlag && rrFlag) {
    out.push({
      id: "illness-signal",
      domain: "recovery",
      tone: "alert",
      priority: 100,
      title: "Skin temperature and respiratory rate are both elevated",
      detail: `Respiratory rate ${respiratoryRate.latest!.toFixed(1)} rpm and skin temperature ${skinTemp.latest!.toFixed(1)}°C are each more than 1.5 SD above baseline. Both moving together is the combination WHOOP flags for possible illness onset.`,
    });
  }

  const greenStreak = countStreak(days, (d) => (d.recoveryScore ?? 0) >= 67);
  if (greenStreak >= 3) {
    out.push({
      id: "green-streak",
      domain: "recovery",
      tone: "positive",
      priority: 60,
      title: `${greenStreak} green days in a row`,
      detail: "A run this long means you are genuinely under-loaded relative to capacity. This is when to schedule the hard block, not when to keep coasting.",
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
      title: `Acute load is ${load.ratio.toFixed(2)}× your chronic base`,
      detail: `This week is running well ahead of the last four. Ratios above 1.5 are where the injury and illness curves start bending upward — the fix is a couple of genuinely easy days, not a rest week.`,
    });
  } else if (load.zone === "detraining" && load.chronic > 3) {
    out.push({
      id: "load-decay",
      domain: "strain",
      tone: "caution",
      priority: 50,
      title: `Acute load has dropped to ${load.ratio.toFixed(2)}× your base`,
      detail: "Fitness built over the last month is starting to decay. A single hard session will not reverse it — consistency will.",
    });
  } else if (load.chronic > 0) {
    out.push({
      id: "load-productive",
      domain: "strain",
      tone: "positive",
      priority: 40,
      title: `Training load is in the productive band (${load.ratio.toFixed(2)}×)`,
      detail: `Acute ${load.acute.toFixed(1)} against chronic ${load.chronic.toFixed(1)}. You are adding stimulus at a rate your base can absorb.`,
    });
  }

  if (balance.points.length >= 10) {
    if (balance.meanDeviation > 1.5) {
      out.push({
        id: "balance-over",
        domain: "strain",
        tone: "caution",
        priority: 75,
        title: `You have outrun your recovery on ${balance.over} of the last ${balance.points.length} days`,
        detail: `Average of ${balance.meanDeviation.toFixed(1)} strain above what each day's recovery supported. Occasional overreach is how adaptation happens; a month of it is how you end up flat.`,
      });
    } else if (balance.meanDeviation < -2) {
      out.push({
        id: "balance-under",
        domain: "strain",
        tone: "neutral",
        priority: 45,
        title: `You have left capacity unused on ${balance.under} of the last ${balance.points.length} days`,
        detail: `Average of ${Math.abs(balance.meanDeviation).toFixed(1)} strain below what your recovery supported. Your body has been offering more than you have asked of it.`,
      });
    }
  }

  if (isNumber(today.recoveryScore)) {
    const { target, low, high } = optimalStrain(today.recoveryScore);
    out.push({
      id: "today-target",
      domain: "strain",
      tone: "neutral",
      priority: 80,
      title: `Today's strain target is ${target.toFixed(1)}`,
      detail: `On ${today.recoveryScore}% recovery, a session landing between ${low.toFixed(1)} and ${high.toFixed(1)} strain adds stimulus without digging a hole.${
        isNumber(today.strain) ? ` You are at ${today.strain.toFixed(1)} so far.` : ""
      }`,
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
      title: `${formatDuration(sleep.debtMilli)} of sleep debt over the last week`,
      detail: `You have averaged ${formatDuration(sleep.avgAsleepMilli)} asleep against a need of ${formatDuration(sleep.avgNeedMilli)}. Debt is repaid at roughly an extra hour a night — a single long weekend lie-in does not clear it.`,
    });
  }

  if (sleep.bedtimeVariabilityMin > 60) {
    out.push({
      id: "sleep-consistency",
      domain: "sleep",
      tone: "caution",
      priority: 65,
      title: `Your bedtime swings by ±${Math.round(sleep.bedtimeVariabilityMin)} minutes`,
      detail: "Consistency is the single most controllable input to sleep quality. Holding bedtime inside a 30-minute window typically buys more recovery than adding total time.",
    });
  } else if (sleep.bedtimeVariabilityMin < 30) {
    out.push({
      id: "sleep-regular",
      domain: "sleep",
      tone: "positive",
      priority: 35,
      title: `Bedtime is holding to ±${Math.round(sleep.bedtimeVariabilityMin)} minutes`,
      detail: "That is genuinely regular, and it is doing quiet work for your recovery scores.",
    });
  }

  if (sleep.restorativeShare > 0 && sleep.restorativeShare < 0.35) {
    out.push({
      id: "restorative-low",
      domain: "sleep",
      tone: "caution",
      priority: 58,
      title: `Only ${(sleep.restorativeShare * 100).toFixed(0)}% of your sleep is REM or deep`,
      detail: `Typical is 40-50%. Time in bed is not the constraint here — quality is. Alcohol, late meals and a warm room all suppress exactly these two stages.`,
    });
  }

  const correlation = sleepRecoveryCorrelation(days);
  if (correlation.n >= 14 && Math.abs(correlation.r) > 0.4) {
    out.push({
      id: "sleep-recovery-link",
      domain: "sleep",
      tone: correlation.r > 0 ? "positive" : "neutral",
      priority: 52,
      title: `Sleep performance explains ${(correlation.r ** 2 * 100).toFixed(0)}% of your recovery variance`,
      detail: `Correlation of ${correlation.r.toFixed(2)} across ${correlation.n} nights. ${
        correlation.r > 0.6
          ? "Sleep is your dominant recovery lever — for you, more than it is for most people."
          : "A real but partial link: sleep matters, and so does load management."
      }`,
    });
  }

  return out;
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
