import { cache } from "react";
import { fetchAccount, fetchCycles, fetchRecoveries, fetchSleeps, fetchWorkouts } from "./tables";
import type {
  DashboardData,
  DayRecord,
  SleepRecord,
  UserSummary,
  WorkoutRecord,
} from "@/core/analytics/types";
import { schema } from "@/core/db";

/**
 * Assembles one WHOOP member's history from the per-table reads.
 *
 * Pure and framework-free apart from the request cache: no session lookup, no
 * demo fallback. Those are policy decisions that belong to whatever is calling —
 * a page, a CLI command, an export job — not to the data layer.
 *
 * Callers must authorise first: everything here trusts its `userId` argument.
 *
 * Three depths are exposed rather than one, because the tables have very
 * different costs and the UI does not need them all at the same moment:
 *
 *   core   — cycles + recoveries. Strain, recovery score, HRV, resting HR.
 *   vitals — core + sleeps. Everything the analytics engine reads.
 *   all    — vitals + workouts, which only the strain bar tooltip needs.
 *
 * A section awaiting `core` renders without waiting for the sleep scan, and a
 * section awaiting `vitals` renders without waiting for workouts. The queries
 * themselves all run concurrently, so the deepest slice is no slower than the
 * single combined read it replaced.
 */

/** Cycles + recoveries: the smallest useful slice. */
export const loadCoreDays = cache(
  async (userId: number, days = 180): Promise<DayRecord[]> => {
    const [cycles, recoveries] = await Promise.all([
      fetchCycles(userId, days),
      fetchRecoveries(userId, days),
    ]);
    return buildDays(cycles, recoveries, [], []);
  },
);

/** Core plus sleeps — everything `core/analytics` reads. */
export const loadVitalsDays = cache(
  async (userId: number, days = 180): Promise<DayRecord[]> => {
    const [cycles, recoveries, sleeps] = await Promise.all([
      fetchCycles(userId, days),
      fetchRecoveries(userId, days),
      fetchSleeps(userId, days),
    ]);
    return buildDays(cycles, recoveries, sleeps, []);
  },
);

/** The complete history, workouts included. */
export const loadAllDays = cache(async (userId: number, days = 180): Promise<DayRecord[]> => {
  const [cycles, recoveries, sleeps, workouts] = await Promise.all([
    fetchCycles(userId, days),
    fetchRecoveries(userId, days),
    fetchSleeps(userId, days),
    fetchWorkouts(userId, days),
  ]);
  return buildDays(cycles, recoveries, sleeps, workouts);
});

/** Name, weight and max heart rate. One indexed row, no metric scan. */
export const loadUserSummary = cache(async (userId: number): Promise<UserSummary | null> => {
  const account = await fetchAccount(userId);
  if (!account) return null;
  return {
    firstName: account.firstName,
    maxHeartRate: account.maxHeartRate ?? 190,
    weightKilogram: account.weightKilogram,
    demo: false,
  };
});

/**
 * The whole dashboard in one object.
 *
 * Kept for callers outside the request lifecycle — the CLI, the export job, the
 * friend snapshots — which have no reason to stream anything and want a single
 * value. Pages should reach for the slices above instead.
 */
export async function loadDashboardForUser(
  userId: number,
  days = 180,
): Promise<DashboardData | null> {
  const [user, dayRecords] = await Promise.all([loadUserSummary(userId), loadAllDays(userId, days)]);
  if (!user) return null;
  return { user, days: dayRecords };
}

function buildDays(
  cycleRows: schema.Cycle[],
  recoveryRows: schema.Recovery[],
  sleepRows: schema.Sleep[],
  workoutRows: schema.Workout[],
): DayRecord[] {
  const recoveryByCycle = new Map(recoveryRows.map((r) => [r.cycleId, r]));
  const sleepById = new Map(sleepRows.map((s) => [s.id, s]));

  const sortedCycles = [...cycleRows].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Workouts belong to whichever cycle contains their start time.
  const workoutsByCycle = new Map<number, WorkoutRecord[]>();
  for (const workout of workoutRows) {
    const cycle = findContainingCycle(sortedCycles, workout.start);
    if (!cycle) continue;
    const list = workoutsByCycle.get(cycle.id) ?? [];
    list.push(toWorkoutRecord(workout));
    workoutsByCycle.set(cycle.id, list);
  }

  return sortedCycles.map((cycle) => {
    const recovery = recoveryByCycle.get(cycle.id);
    const sleepRow = recovery?.sleepId ? sleepById.get(recovery.sleepId) : undefined;

    return {
      date: toLocalDate(cycle.start, cycle.timezoneOffset),
      cycleId: cycle.id,
      start: cycle.start.toISOString(),
      end: cycle.end?.toISOString() ?? null,
      strain: cycle.strain,
      kilojoule: cycle.kilojoule,
      averageHeartRate: cycle.averageHeartRate,
      maxHeartRate: cycle.maxHeartRate,
      recoveryScore: recovery?.recoveryScore ?? null,
      restingHeartRate: recovery?.restingHeartRate ?? null,
      hrvMs: recovery?.hrvRmssdMilli ?? null,
      spo2: recovery?.spo2Percentage ?? null,
      skinTempC: recovery?.skinTempCelsius ?? null,
      calibrating: recovery?.userCalibrating ?? false,
      sleep: sleepRow ? toSleepRecord(sleepRow) : null,
      workouts: workoutsByCycle.get(cycle.id) ?? [],
    };
  });
}

function findContainingCycle(cycles: schema.Cycle[], at: Date): schema.Cycle | null {
  // Cycles are contiguous and sorted, so the last one starting at or before `at` wins.
  let match: schema.Cycle | null = null;
  for (const cycle of cycles) {
    if (cycle.start.getTime() <= at.getTime()) match = cycle;
    else break;
  }
  return match;
}

/**
 * A cycle's calendar day is the one it starts on *where you were*, which is what
 * `timezone_offset` records. Using UTC here would shift days around every time
 * you travel.
 */
function toLocalDate(date: Date, offset: string | null): string {
  if (!offset) return date.toISOString().slice(0, 10);
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!match) return date.toISOString().slice(0, 10);

  const sign = match[1] === "-" ? -1 : 1;
  const minutes = sign * (Number(match[2]) * 60 + Number(match[3]));
  return new Date(date.getTime() + minutes * 60_000).toISOString().slice(0, 10);
}

function toSleepRecord(row: schema.Sleep): SleepRecord {
  return {
    id: row.id,
    start: row.start.toISOString(),
    end: row.end.toISOString(),
    nap: row.nap,
    inBedMilli: row.inBedMilli ?? 0,
    awakeMilli: row.awakeMilli ?? 0,
    lightMilli: row.lightMilli ?? 0,
    swsMilli: row.swsMilli ?? 0,
    remMilli: row.remMilli ?? 0,
    noDataMilli: row.noDataMilli ?? 0,
    sleepCycleCount: row.sleepCycleCount ?? 0,
    disturbanceCount: row.disturbanceCount ?? 0,
    needBaselineMilli: row.needBaselineMilli ?? 0,
    needFromDebtMilli: row.needFromDebtMilli ?? 0,
    needFromStrainMilli: row.needFromStrainMilli ?? 0,
    needFromNapMilli: row.needFromNapMilli ?? 0,
    respiratoryRate: row.respiratoryRate,
    performancePercentage: row.performancePercentage,
    consistencyPercentage: row.consistencyPercentage,
    efficiencyPercentage: row.efficiencyPercentage,
  };
}

function toWorkoutRecord(row: schema.Workout): WorkoutRecord {
  return {
    id: row.id,
    start: row.start.toISOString(),
    end: row.end.toISOString(),
    sportName: row.sportName ?? "activity",
    strain: row.strain,
    averageHeartRate: row.averageHeartRate,
    maxHeartRate: row.maxHeartRate,
    kilojoule: row.kilojoule,
    distanceMeter: row.distanceMeter,
    zoneDurations: row.zoneDurations,
  };
}
