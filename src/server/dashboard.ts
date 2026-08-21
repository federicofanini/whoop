import { cache } from "react";
import type { DashboardData, DayRecord, UserSummary } from "@/core/analytics/types";
import { generateDemoData } from "@/core/data/demo";
import {
  loadAllDays,
  loadCoreDays,
  loadDashboardForUser,
  loadUserSummary,
  loadVitalsDays,
} from "@/core/data/load";
import {
  fetchCycles,
  fetchRecoveries,
  fetchSleeps,
  fetchWorkouts,
} from "@/core/data/tables";
import { getViewer } from "./auth";

/**
 * The request-scoped, policy-applying wrappers around the pure loaders.
 *
 * The core knows how to read a member's history. This decides *whose* history,
 * what to do when there is none, and caches the answers for the duration of the
 * request — a dozen suspended sections all ask, and without the cache that is a
 * dozen round trips, or a dozen independent demo datasets that disagree with
 * each other on screen.
 *
 * Three depths are exposed so a section only blocks on the tables it reads. See
 * `core/data/load` for what each one covers.
 */

/**
 * How far back the dashboard reads.
 *
 * The deepest window any view actually uses is 90 days (the baseline charts and
 * the sleep/recovery correlation), and the 30-day rolling baseline inside those
 * charts needs a month of run-up. 120 covers both with room to spare, and moves
 * a third less data over the wire than the 180 this used to fetch.
 */
const HISTORY_DAYS = 120;

/** One dataset per request, so every section agrees on the same fiction. */
const demoData = cache((): DashboardData => generateDemoData());

/** The viewer's WHOOP id, or null when nothing is linked. */
const linkedWhoopId = cache(async (): Promise<number | null> => {
  const viewer = await getViewer();
  return viewer?.whoopUserId ?? null;
});

/**
 * Starts every table read without waiting for any of them.
 *
 * Sections are rendered concurrently and each triggers the fetchers it needs,
 * so this is not strictly required — but calling it at the top of a page means
 * the queries are already in flight while React is still walking the tree, and
 * turns the slowest section's latency into `max(query)` rather than
 * `time-to-render + query`.
 */
export function preloadViewerData(): void {
  // Nothing awaits this, so it must never reject — a floating rejection here
  // would take down the process rather than the panel it was meant to fill.
  void linkedWhoopId()
    .then((userId) => {
      if (userId === null) return;
      for (const start of [fetchCycles, fetchRecoveries, fetchSleeps, fetchWorkouts]) {
        void start(userId, HISTORY_DAYS).catch(() => {});
      }
    })
    .catch(() => {});
}

function slice(
  load: (userId: number, days: number) => Promise<DayRecord[]>,
): () => Promise<DayRecord[]> {
  return cache(async (): Promise<DayRecord[]> => {
    const userId = await linkedWhoopId();
    if (userId === null) return demoData().days;

    const days = await load(userId, HISTORY_DAYS);
    // A linked-but-unsynced account has no cycles yet; demo data beats a blank page.
    return days.length > 0 ? days : demoData().days;
  });
}

/** Cycles + recoveries. Strain, recovery score, HRV, resting heart rate. */
export const getCoreDays = slice(loadCoreDays);

/** Core + sleeps. Everything the analytics engine reads. */
export const getVitalsDays = slice(loadVitalsDays);

/** Vitals + workouts. Only the strain bars need this depth. */
export const getAllDays = slice(loadAllDays);

/**
 * Name, weight and max heart rate — plus whether any of it is real.
 *
 * `demo` has to agree with what the charts are showing, so an account that is
 * linked but has never synced reports demo here too.
 */
export const getViewerUser = cache(async (): Promise<UserSummary> => {
  const userId = await linkedWhoopId();
  if (userId === null) return demoData().user;

  const [user, days] = await Promise.all([
    loadUserSummary(userId),
    fetchCycles(userId, HISTORY_DAYS),
  ]);
  return user && days.length > 0 ? user : demoData().user;
});

/**
 * The whole dashboard in one object.
 *
 * Left for the handful of callers that genuinely need everything at once and
 * have nothing to stream — chiefly the friend comparison table. Pages should
 * reach for the slices above.
 */
export const loadViewerDashboard = cache(async (): Promise<DashboardData> => {
  const [user, days] = await Promise.all([getViewerUser(), getAllDays()]);
  return { user, days };
});

/**
 * A specific member's data, for the friend views.
 *
 * No demo fallback: a generated dataset under a friend's name would be
 * indistinguishable from their real numbers. Callers must authorise first.
 */
export const loadDashboardFor = cache(
  async (whoopUserId: number, days = 90): Promise<DashboardData | null> => {
    try {
      return await loadDashboardForUser(whoopUserId, days);
    } catch (error) {
      console.error(`Could not load data for WHOOP user ${whoopUserId}:`, error);
      return null;
    }
  },
);
