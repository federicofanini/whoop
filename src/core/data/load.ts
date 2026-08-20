import { and, desc, eq, gte } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/core/db";
import type { DashboardData, DayRecord, SleepRecord, WorkoutRecord } from "@/core/analytics/types";

/**
 * Loads one WHOOP member's history straight from Postgres.
 *
 * Pure and framework-free: no session lookup, no request cache, no demo
 * fallback. Those are policy decisions that belong to whatever is calling —
 * a page, a CLI command, an export job — not to the data layer.
 *
 * Callers must authorise first: this function trusts its `userId` argument.
 */
export async function loadDashboardForUser(
  userId: number,
  days = 180,
): Promise<DashboardData | null> {
  if (!isDbConfigured()) return null;
  return loadFromDatabase(userId, days);
}

async function loadFromDatabase(userId: number, dayCount: number): Promise<DashboardData | null> {
  const db = getDb();

  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, userId))
    .limit(1);
  const account = accounts[0];
  if (!account) return null;

  const since = new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000);

  // Every one of these is scoped by user id as well as by date. Once a second
  // person can link an account, a query filtered only by date returns both
  // members' rows and silently blends two people's physiology into one chart.
  const [cycleRows, recoveryRows, sleepRows, workoutRows] = await Promise.all([
    db
      .select()
      .from(schema.cycles)
      .where(and(eq(schema.cycles.userId, userId), gte(schema.cycles.start, since)))
      .orderBy(desc(schema.cycles.start)),
    db.select().from(schema.recoveries).where(eq(schema.recoveries.userId, userId)),
    db
      .select()
      .from(schema.sleeps)
      .where(and(eq(schema.sleeps.userId, userId), gte(schema.sleeps.start, since))),
    db
      .select()
      .from(schema.workouts)
      .where(and(eq(schema.workouts.userId, userId), gte(schema.workouts.start, since))),
  ]);

  const recoveryByCycle = new Map(recoveryRows.map((r) => [r.cycleId, r]));
  const sleepById = new Map(sleepRows.map((s) => [s.id, s]));

  // Workouts belong to whichever cycle contains their start time.
  const sortedCycles = [...cycleRows].sort((a, b) => a.start.getTime() - b.start.getTime());
  const workoutsByCycle = new Map<number, WorkoutRecord[]>();
  for (const workout of workoutRows) {
    const cycle = findContainingCycle(sortedCycles, workout.start);
    if (!cycle) continue;
    const list = workoutsByCycle.get(cycle.id) ?? [];
    list.push(toWorkoutRecord(workout));
    workoutsByCycle.set(cycle.id, list);
  }

  const days: DayRecord[] = sortedCycles.map((cycle) => {
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

  return {
    user: {
      firstName: account.firstName,
      maxHeartRate: account.maxHeartRate ?? 190,
      weightKilogram: account.weightKilogram,
      demo: false,
    },
    days,
  };
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
