import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { WhoopAuthError, WhoopClient } from "./client";
import { refreshTokens } from "./oauth";
import type {
  WhoopBodyMeasurement,
  WhoopCycle,
  WhoopProfile,
  WhoopRecovery,
  WhoopSleep,
  WhoopWorkout,
} from "./types";

/** Refresh a minute early so a long sync never dies mid-page on an expired token. */
const REFRESH_MARGIN_MS = 60_000;

/** Every linked account, for jobs that run on behalf of all members. */
export async function listAccountIds(): Promise<number[]> {
  const db = getDb();
  const rows = await db.select({ userId: schema.accounts.userId }).from(schema.accounts);
  return rows.map((r) => r.userId);
}

export async function getAccount(userId?: number) {
  const db = getDb();
  const rows = userId
    ? await db.select().from(schema.accounts).where(eq(schema.accounts.userId, userId)).limit(1)
    : await db.select().from(schema.accounts).limit(1);
  return rows[0] ?? null;
}

/**
 * Returns a client with a valid token, refreshing and persisting first if the
 * stored one is at or near expiry.
 */
export async function getAuthorizedClient(userId?: number): Promise<{
  client: WhoopClient;
  account: schema.Account;
}> {
  const db = getDb();
  let account = await getAccount(userId);
  if (!account) throw new WhoopAuthError("No WHOOP account linked yet");

  if (account.expiresAt.getTime() - REFRESH_MARGIN_MS <= Date.now()) {
    const tokens = await refreshTokens(account.refreshToken);
    const updated = await db
      .update(schema.accounts)
      .set({
        accessToken: tokens.access_token,
        // WHOOP rotates refresh tokens; keep the old one if none came back.
        refreshToken: tokens.refresh_token || account.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(schema.accounts.userId, account.userId))
      .returning();
    account = updated[0];
  }

  return { client: new WhoopClient(account.accessToken), account };
}

export async function upsertProfile(client: WhoopClient, userId: number) {
  const db = getDb();
  const [profile, body] = await Promise.all([
    client.get<WhoopProfile>("/v2/user/profile/basic"),
    client
      .get<WhoopBodyMeasurement>("/v2/user/measurement/body")
      .catch(() => null as WhoopBodyMeasurement | null),
  ]);

  await db
    .update(schema.accounts)
    .set({
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      heightMeter: body?.height_meter,
      weightKilogram: body?.weight_kilogram,
      maxHeartRate: body?.max_heart_rate,
      updatedAt: new Date(),
    })
    .where(eq(schema.accounts.userId, userId));
}

export async function upsertCycles(records: WhoopCycle[]) {
  if (records.length === 0) return 0;
  const db = getDb();
  await db
    .insert(schema.cycles)
    .values(
      records.map((c) => ({
        id: c.id,
        userId: c.user_id,
        start: new Date(c.start),
        end: c.end ? new Date(c.end) : null,
        timezoneOffset: c.timezone_offset,
        scoreState: c.score_state,
        strain: c.score?.strain ?? null,
        kilojoule: c.score?.kilojoule ?? null,
        averageHeartRate: c.score?.average_heart_rate ?? null,
        maxHeartRate: c.score?.max_heart_rate ?? null,
        updatedAt: new Date(c.updated_at),
      })),
    )
    .onConflictDoUpdate({
      target: schema.cycles.id,
      set: {
        end: sql`excluded."end"`,
        scoreState: sql`excluded.score_state`,
        strain: sql`excluded.strain`,
        kilojoule: sql`excluded.kilojoule`,
        averageHeartRate: sql`excluded.average_heart_rate`,
        maxHeartRate: sql`excluded.max_heart_rate`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  return records.length;
}

export async function upsertRecoveries(records: WhoopRecovery[]) {
  if (records.length === 0) return 0;
  const db = getDb();
  await db
    .insert(schema.recoveries)
    .values(
      records.map((r) => ({
        cycleId: r.cycle_id,
        userId: r.user_id,
        sleepId: r.sleep_id || null,
        scoreState: r.score_state,
        userCalibrating: r.score?.user_calibrating ?? false,
        recoveryScore: r.score?.recovery_score ?? null,
        restingHeartRate: r.score?.resting_heart_rate ?? null,
        hrvRmssdMilli: r.score?.hrv_rmssd_milli ?? null,
        spo2Percentage: r.score?.spo2_percentage ?? null,
        skinTempCelsius: r.score?.skin_temp_celsius ?? null,
        updatedAt: new Date(r.updated_at),
      })),
    )
    .onConflictDoUpdate({
      target: schema.recoveries.cycleId,
      set: {
        sleepId: sql`excluded.sleep_id`,
        scoreState: sql`excluded.score_state`,
        userCalibrating: sql`excluded.user_calibrating`,
        recoveryScore: sql`excluded.recovery_score`,
        restingHeartRate: sql`excluded.resting_heart_rate`,
        hrvRmssdMilli: sql`excluded.hrv_rmssd_milli`,
        spo2Percentage: sql`excluded.spo2_percentage`,
        skinTempCelsius: sql`excluded.skin_temp_celsius`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  return records.length;
}

export async function upsertSleeps(records: WhoopSleep[]) {
  if (records.length === 0) return 0;
  const db = getDb();
  await db
    .insert(schema.sleeps)
    .values(
      records.map((s) => ({
        id: s.id,
        userId: s.user_id,
        start: new Date(s.start),
        end: new Date(s.end),
        timezoneOffset: s.timezone_offset,
        nap: s.nap,
        scoreState: s.score_state,
        inBedMilli: s.score?.stage_summary.total_in_bed_time_milli ?? null,
        awakeMilli: s.score?.stage_summary.total_awake_time_milli ?? null,
        noDataMilli: s.score?.stage_summary.total_no_data_time_milli ?? null,
        lightMilli: s.score?.stage_summary.total_light_sleep_time_milli ?? null,
        swsMilli: s.score?.stage_summary.total_slow_wave_sleep_time_milli ?? null,
        remMilli: s.score?.stage_summary.total_rem_sleep_time_milli ?? null,
        sleepCycleCount: s.score?.stage_summary.sleep_cycle_count ?? null,
        disturbanceCount: s.score?.stage_summary.disturbance_count ?? null,
        needBaselineMilli: s.score?.sleep_needed.baseline_milli ?? null,
        needFromDebtMilli: s.score?.sleep_needed.need_from_sleep_debt_milli ?? null,
        needFromStrainMilli: s.score?.sleep_needed.need_from_recent_strain_milli ?? null,
        needFromNapMilli: s.score?.sleep_needed.need_from_recent_nap_milli ?? null,
        respiratoryRate: s.score?.respiratory_rate ?? null,
        performancePercentage: s.score?.sleep_performance_percentage ?? null,
        consistencyPercentage: s.score?.sleep_consistency_percentage ?? null,
        efficiencyPercentage: s.score?.sleep_efficiency_percentage ?? null,
        updatedAt: new Date(s.updated_at),
      })),
    )
    .onConflictDoUpdate({
      target: schema.sleeps.id,
      set: {
        end: sql`excluded."end"`,
        scoreState: sql`excluded.score_state`,
        inBedMilli: sql`excluded.in_bed_milli`,
        awakeMilli: sql`excluded.awake_milli`,
        lightMilli: sql`excluded.light_milli`,
        swsMilli: sql`excluded.sws_milli`,
        remMilli: sql`excluded.rem_milli`,
        sleepCycleCount: sql`excluded.sleep_cycle_count`,
        disturbanceCount: sql`excluded.disturbance_count`,
        needBaselineMilli: sql`excluded.need_baseline_milli`,
        needFromDebtMilli: sql`excluded.need_from_debt_milli`,
        needFromStrainMilli: sql`excluded.need_from_strain_milli`,
        respiratoryRate: sql`excluded.respiratory_rate`,
        performancePercentage: sql`excluded.performance_percentage`,
        consistencyPercentage: sql`excluded.consistency_percentage`,
        efficiencyPercentage: sql`excluded.efficiency_percentage`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  return records.length;
}

export async function upsertWorkouts(records: WhoopWorkout[]) {
  if (records.length === 0) return 0;
  const db = getDb();
  await db
    .insert(schema.workouts)
    .values(
      records.map((w) => ({
        id: w.id,
        userId: w.user_id,
        start: new Date(w.start),
        end: new Date(w.end),
        timezoneOffset: w.timezone_offset,
        sportName: w.sport_name,
        scoreState: w.score_state,
        strain: w.score?.strain ?? null,
        averageHeartRate: w.score?.average_heart_rate ?? null,
        maxHeartRate: w.score?.max_heart_rate ?? null,
        kilojoule: w.score?.kilojoule ?? null,
        percentRecorded: w.score?.percent_recorded ?? null,
        distanceMeter: w.score?.distance_meter ?? null,
        altitudeGainMeter: w.score?.altitude_gain_meter ?? null,
        zoneDurations: w.score?.zone_durations ?? null,
        updatedAt: new Date(w.updated_at),
      })),
    )
    .onConflictDoUpdate({
      target: schema.workouts.id,
      set: {
        end: sql`excluded."end"`,
        sportName: sql`excluded.sport_name`,
        scoreState: sql`excluded.score_state`,
        strain: sql`excluded.strain`,
        averageHeartRate: sql`excluded.average_heart_rate`,
        maxHeartRate: sql`excluded.max_heart_rate`,
        kilojoule: sql`excluded.kilojoule`,
        percentRecorded: sql`excluded.percent_recorded`,
        distanceMeter: sql`excluded.distance_meter`,
        zoneDurations: sql`excluded.zone_durations`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  return records.length;
}

export interface SyncResult {
  cycles: number;
  recoveries: number;
  sleeps: number;
  workouts: number;
}

/**
 * Pulls everything changed since `since`.
 *
 * On a first run `since` is undefined and this walks the full history — WHOOP
 * caps each page at 25 records, so a few years of data is a few hundred requests,
 * which the client's throttle spreads across a handful of minutes.
 */
export async function syncSince(
  client: WhoopClient,
  since?: Date,
  maxRecordsPerCollection = 10_000,
): Promise<SyncResult> {
  const params = since ? { start: since.toISOString() } : {};

  // Sequential rather than parallel: the throttle is per-client, and four
  // concurrent walks would blow straight through the per-minute limit.
  const cycles = await client.collect<WhoopCycle>("/v2/cycle", params, maxRecordsPerCollection);
  const recoveries = await client.collect<WhoopRecovery>(
    "/v2/recovery",
    params,
    maxRecordsPerCollection,
  );
  const sleeps = await client.collect<WhoopSleep>(
    "/v2/activity/sleep",
    params,
    maxRecordsPerCollection,
  );
  const workouts = await client.collect<WhoopWorkout>(
    "/v2/activity/workout",
    params,
    maxRecordsPerCollection,
  );

  return {
    cycles: await upsertCycles(cycles),
    recoveries: await upsertRecoveries(recoveries),
    sleeps: await upsertSleeps(sleeps),
    workouts: await upsertWorkouts(workouts),
  };
}

/**
 * Where an incremental sync should resume from.
 *
 * Backdated by an hour because WHOOP rescores recent records — a sleep can be
 * re-scored after a nap is added, and the webhook for that can be missed.
 */
export async function lastSyncedAt(userId: number): Promise<Date | undefined> {
  const db = getDb();
  const rows = await db
    .select({ updatedAt: schema.cycles.updatedAt })
    .from(schema.cycles)
    .where(eq(schema.cycles.userId, userId))
    .orderBy(desc(schema.cycles.updatedAt))
    .limit(1);

  if (!rows[0]) return undefined;
  return new Date(rows[0].updatedAt.getTime() - 60 * 60 * 1000);
}

/** Handles a single webhook event by re-fetching just the record that changed. */
export async function applyWebhookEvent(
  client: WhoopClient,
  type: string,
  id: string | number,
): Promise<void> {
  const db = getDb();

  switch (type) {
    case "sleep.updated": {
      const sleep = await client.get<WhoopSleep>(`/v2/activity/sleep/${id}`);
      await upsertSleeps([sleep]);
      return;
    }
    case "workout.updated": {
      const workout = await client.get<WhoopWorkout>(`/v2/activity/workout/${id}`);
      await upsertWorkouts([workout]);
      return;
    }
    case "recovery.updated": {
      // Recovery events carry the cycle id, so the cycle is refreshed alongside it.
      const recovery = await client.get<WhoopRecovery>(`/v2/cycle/${id}/recovery`);
      await upsertRecoveries([recovery]);
      const cycle = await client.get<WhoopCycle>(`/v2/cycle/${id}`);
      await upsertCycles([cycle]);
      return;
    }
    case "sleep.deleted":
      await db.delete(schema.sleeps).where(eq(schema.sleeps.id, String(id)));
      return;
    case "workout.deleted":
      await db.delete(schema.workouts).where(eq(schema.workouts.id, String(id)));
      return;
    case "recovery.deleted":
      await db.delete(schema.recoveries).where(eq(schema.recoveries.cycleId, Number(id)));
      return;
    default:
      return;
  }
}
