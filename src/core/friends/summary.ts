import type { DayRecord } from "@/core/analytics/types";
import { asleepMilli } from "@/core/analytics/sleep";
import { loadVitalsDays } from "@/core/data/load";
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

export function summarizeForFriend(profile: FriendProfile, days: DayRecord[]): FriendSnapshot {
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
 * One friend's snapshot.
 *
 * A 30-day window rather than the dashboard's own, and the vitals slice rather
 * than the full one: the card shows a fortnight of bars and a weekly mean, so
 * pulling six months and a workout history per friend would make the page cost
 * scale with the size of the friend list for numbers nobody sees.
 */
export async function loadFriendSnapshot(profile: FriendProfile): Promise<FriendSnapshot> {
  // A friend who has signed in but never linked a strap has nothing to load.
  const days = profile.whoopUserId ? await loadVitalsDays(profile.whoopUserId, 30) : [];
  return summarizeForFriend(profile, days);
}

/** Every friend at once, for callers that cannot stream them one by one. */
export async function loadFriendSnapshots(friends: FriendProfile[]): Promise<FriendSnapshot[]> {
  return Promise.all(friends.map(loadFriendSnapshot));
}
