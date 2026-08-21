import { cache } from "react";
import { computeBaselines, type BaselineSet } from "@/core/analytics/baselines";
import { computeLoad, summarizeBalance, type BalanceSummary, type LoadState } from "@/core/analytics/load";
import { generateInsights, type Insight } from "@/core/analytics/insights";
import { sleepRecoveryCorrelation, summarizeSleep, type SleepSummary } from "@/core/analytics/sleep";
import type { DayRecord } from "@/core/analytics/types";
import { getCoreDays, getVitalsDays } from "./dashboard";

/**
 * The analytics engine, memoised for the request.
 *
 * `core/analytics` is pure and knows nothing about requests, which is right —
 * but it also means every caller that wants a baseline recomputes one. The old
 * overview page ran `computeBaselines`, `computeLoad`, `summarizeBalance` and
 * `summarizeSleep` once directly and then a second time inside
 * `generateInsights`, over a 180-day array, on every render.
 *
 * Now that each panel loads independently the duplication would be worse still,
 * so every derivation is resolved through this module and computed at most once
 * per request.
 *
 * Each function also declares the shallowest slice it can work from, which is
 * what lets a stat tile appear before the sleep query has come back.
 */

export const getToday = cache(async (): Promise<DayRecord | null> => {
  const days = await getCoreDays();
  return days[days.length - 1] ?? null;
});

/** Needs sleeps: respiratory rate is a sleep-scored metric. */
export const getBaselines = cache(async (): Promise<BaselineSet> => {
  return computeBaselines(await getVitalsDays());
});

export const getLoad = cache(async (): Promise<LoadState> => {
  return computeLoad(await getCoreDays());
});

export const getBalance = cache(async (window = 30): Promise<BalanceSummary> => {
  return summarizeBalance(await getCoreDays(), window);
});

export const getSleepSummary = cache(async (window = 14): Promise<SleepSummary> => {
  return summarizeSleep(await getVitalsDays(), window);
});

export const getSleepCorrelation = cache(async (window = 90) => {
  const days = await getVitalsDays();
  return sleepRecoveryCorrelation(days.slice(-window));
});

export const getInsights = cache(async (): Promise<Insight[]> => {
  return generateInsights(await getVitalsDays());
});

export const getInsightsFor = cache(async (domain: Insight["domain"]): Promise<Insight[]> => {
  return (await getInsights()).filter((insight) => insight.domain === domain);
});
