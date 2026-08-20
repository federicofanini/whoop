import { cache } from "react";
import type { DashboardData } from "@/core/analytics/types";
import { generateDemoData } from "@/core/data/demo";
import { loadDashboardForUser } from "@/core/data/load";
import { getViewer } from "./auth";

/**
 * The request-scoped, policy-applying wrapper around the pure loader.
 *
 * The core knows how to read a member's history. This decides *whose* history,
 * what to do when there is none, and caches the answer for the duration of the
 * request — the layout and the page it renders both ask, and without the cache
 * that is two round trips, or two independent demo datasets that disagree with
 * each other on screen.
 */
export const loadViewerDashboard = cache(async (days = 180): Promise<DashboardData> => {
  const viewer = await getViewer();
  if (!viewer?.whoopUserId) return generateDemoData();

  try {
    const data = await loadDashboardForUser(viewer.whoopUserId, days);
    // A linked-but-unsynced account has no cycles yet; demo data beats a blank page.
    return data && data.days.length > 0 ? data : generateDemoData();
  } catch (error) {
    console.error("Falling back to demo data:", error);
    return generateDemoData();
  }
});

/**
 * A specific member's data, for the friend views.
 *
 * No demo fallback: a generated dataset under a friend's name would be
 * indistinguishable from their real numbers. Callers must authorise first.
 */
export const loadDashboardFor = cache(
  async (whoopUserId: number, days = 180): Promise<DashboardData | null> => {
    try {
      return await loadDashboardForUser(whoopUserId, days);
    } catch (error) {
      console.error(`Could not load data for WHOOP user ${whoopUserId}:`, error);
      return null;
    }
  },
);
