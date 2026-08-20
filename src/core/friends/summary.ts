import type { DashboardData, DayRecord } from "@/core/analytics/types";
import { asleepMilli } from "@/core/analytics/sleep";
import { loadDashboardForUser } from "@/core/data/load";
import { displayName, type FriendProfile } from "./queries";

/**
 * What one person's card shows on the friends page.
 *
 * Deliberately narrow. A friend's dashboard is a glance — today's headline plus
 * a week of context — not the full analytical treatment the owner gets. Sharing
 * health data with your brother should not mean handing him a research tool.
 */
export interface FriendSnapshot {
  profile: FriendProfile;
  name: string;
  /** Null when they have linked an account but never synced. */
  latest: {
    date: string;
    recovery: number | null;
    strain: number | null;
    hrvMs: number | null;
    restingHr: number | null;
    asleepMilli: number | null;
  } | null;
  /** Seven-day means, for the "is today typical for them?" question. */
  weekly: {
    recovery: number | null;
    strain: number | null;
    asleepMilli: number | null;
  };
  /** Recent days, for the sparkline strip. */
  days: DayRecord[];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function summarizeForFriend(profile: FriendProfile, data: DashboardData | null): FriendSnapshot {
  const days = data?.days ?? [];
  const today = days[days.length - 1] ?? null;
  const week = days.slice(-7);

  return {
    profile,
    name: displayName(profile),
    latest: today
      ? {
          date: today.date,
          recovery: today.recoveryScore,
          strain: today.strain,
          hrvMs: today.hrvMs,
          restingHr: today.restingHeartRate,
          asleepMilli: today.sleep ? asleepMilli(today.sleep) : null,
        }
      : null,
    weekly: {
      recovery: mean(week.map((d) => d.recoveryScore).filter((v): v is number => v !== null)),
      strain: mean(week.map((d) => d.strain).filter((v): v is number => v !== null)),
      asleepMilli: mean(week.filter((d) => d.sleep).map((d) => asleepMilli(d.sleep!))),
    },
    days,
  };
}

/**
 * Loads every friend's snapshot.
 *
 * A 30-day window rather than the dashboard's 180: the card shows a fortnight of
 * bars and a weekly mean, and pulling six months per friend to render fourteen
 * bars would make the page cost scale with the size of the friend list.
 */
export async function loadFriendSnapshots(friends: FriendProfile[]): Promise<FriendSnapshot[]> {
  return Promise.all(
    friends.map(async (profile) => {
      // A friend who has signed in but never linked a strap has nothing to load.
      const data = profile.whoopUserId
        ? await loadDashboardForUser(profile.whoopUserId, 30)
        : null;
      return summarizeForFriend(profile, data);
    }),
  );
}
