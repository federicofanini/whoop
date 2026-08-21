import { cache } from "react";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/core/db";

/**
 * One request-cached read per table, deliberately kept apart.
 *
 * The page used to make a single call that waited on all four tables before it
 * could render anything, so a slow `workouts` scan held up the recovery score.
 * Splitting them means a section awaits only the tables it actually reads, and
 * because every fetcher is wrapped in React's `cache` the four queries are
 * still issued once per request no matter how many sections ask.
 *
 * Every query is scoped by user id *and* by date. Once a second person can link
 * an account, a query filtered only by date returns both members' rows and
 * silently blends two people's physiology into one chart.
 */

function windowStart(dayCount: number): Date {
  return new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000);
}

/**
 * Reads never take the page down with them.
 *
 * A section that cannot reach Postgres renders its empty state; the rest of the
 * page is unaffected. Throwing here would instead bubble to the nearest error
 * boundary and blank out everything around it.
 */
async function safely<T>(label: string, run: () => Promise<T[]>): Promise<T[]> {
  try {
    return await run();
  } catch (error) {
    console.error(`[data] ${label} failed:`, error);
    return [];
  }
}

export const fetchAccount = cache(async (userId: number): Promise<schema.Account | null> => {
  if (!isDbConfigured()) return null;
  const rows = await safely("account", () =>
    getDb().select().from(schema.accounts).where(eq(schema.accounts.userId, userId)).limit(1),
  );
  return rows[0] ?? null;
});

export const fetchCycles = cache(async (userId: number, days: number): Promise<schema.Cycle[]> => {
  if (!isDbConfigured()) return [];
  return safely("cycles", () =>
    getDb()
      .select()
      .from(schema.cycles)
      .where(and(eq(schema.cycles.userId, userId), gte(schema.cycles.start, windowStart(days))))
      .orderBy(desc(schema.cycles.start)),
  );
});

/**
 * Recoveries carry no date of their own — they hang off a cycle — so the window
 * is applied through a join rather than by fetching every recovery ever scored
 * and discarding most of them, which is what the previous unbounded read did.
 */
export const fetchRecoveries = cache(
  async (userId: number, days: number): Promise<schema.Recovery[]> => {
    if (!isDbConfigured()) return [];
    const rows = await safely("recoveries", () =>
      getDb()
        .select({ recovery: schema.recoveries })
        .from(schema.recoveries)
        .innerJoin(schema.cycles, eq(schema.cycles.id, schema.recoveries.cycleId))
        .where(
          and(eq(schema.recoveries.userId, userId), gte(schema.cycles.start, windowStart(days))),
        ),
    );
    return rows.map((row) => row.recovery);
  },
);

export const fetchSleeps = cache(async (userId: number, days: number): Promise<schema.Sleep[]> => {
  if (!isDbConfigured()) return [];
  return safely("sleeps", () =>
    getDb()
      .select()
      .from(schema.sleeps)
      .where(and(eq(schema.sleeps.userId, userId), gte(schema.sleeps.start, windowStart(days)))),
  );
});

export const fetchWorkouts = cache(
  async (userId: number, days: number): Promise<schema.Workout[]> => {
    if (!isDbConfigured()) return [];
    return safely("workouts", () =>
      getDb()
        .select()
        .from(schema.workouts)
        .where(
          and(eq(schema.workouts.userId, userId), gte(schema.workouts.start, windowStart(days))),
        ),
    );
  },
);
