/**
 * The shape the UI reads.
 *
 * Both the Postgres-backed loader and the demo dataset produce this, so no chart
 * or insight ever knows which one it is looking at.
 */

export interface SleepRecord {
  id: string;
  start: string;
  end: string;
  nap: boolean;
  inBedMilli: number;
  awakeMilli: number;
  lightMilli: number;
  swsMilli: number;
  remMilli: number;
  noDataMilli: number;
  sleepCycleCount: number;
  disturbanceCount: number;
  needBaselineMilli: number;
  needFromDebtMilli: number;
  needFromStrainMilli: number;
  needFromNapMilli: number;
  respiratoryRate: number | null;
  performancePercentage: number | null;
  consistencyPercentage: number | null;
  efficiencyPercentage: number | null;
}

export interface WorkoutRecord {
  id: string;
  start: string;
  end: string;
  sportName: string;
  strain: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  kilojoule: number | null;
  distanceMeter: number | null;
  zoneDurations: Record<string, number> | null;
}

/** One physiological cycle — WHOOP's "day", which runs sleep-to-sleep. */
export interface DayRecord {
  /** yyyy-mm-dd, taken from the cycle start in local time. */
  date: string;
  cycleId: number;
  start: string;
  end: string | null;
  strain: number | null;
  kilojoule: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  recoveryScore: number | null;
  restingHeartRate: number | null;
  hrvMs: number | null;
  spo2: number | null;
  skinTempC: number | null;
  calibrating: boolean;
  sleep: SleepRecord | null;
  workouts: WorkoutRecord[];
}

export interface UserSummary {
  firstName: string | null;
  maxHeartRate: number;
  weightKilogram: number | null;
  /** True when the dashboard is showing the generated dataset, not real data. */
  demo: boolean;
}

export interface DashboardData {
  user: UserSummary;
  days: DayRecord[];
}
