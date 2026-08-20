import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One row per linked WHOOP account. This is a personal dashboard, so in practice
 * there is exactly one row — but keying everything by user id keeps the door open
 * and matches the shape of the webhook payloads, which always name a user.
 */
export const accounts = pgTable("accounts", {
  userId: integer("user_id").primaryKey(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  /** When the current access token stops working. Refreshed ahead of this. */
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scope: text("scope"),
  heightMeter: doublePrecision("height_meter"),
  weightKilogram: doublePrecision("weight_kilogram"),
  maxHeartRate: integer("max_heart_rate"),
  /** Null until the historical backfill has finished walking back through time. */
  backfilledAt: timestamp("backfilled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cycles = pgTable(
  "cycles",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id").notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
    /** Null on the cycle that is still running. */
    end: timestamp("end", { withTimezone: true }),
    timezoneOffset: text("timezone_offset"),
    scoreState: text("score_state").notNull(),
    strain: doublePrecision("strain"),
    kilojoule: doublePrecision("kilojoule"),
    averageHeartRate: integer("average_heart_rate"),
    maxHeartRate: integer("max_heart_rate"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("cycles_user_start_idx").on(t.userId, t.start)],
);

export const recoveries = pgTable(
  "recoveries",
  {
    cycleId: integer("cycle_id").primaryKey(),
    userId: integer("user_id").notNull(),
    sleepId: uuid("sleep_id"),
    scoreState: text("score_state").notNull(),
    /** True while WHOOP is still learning your baseline; scores are not comparable yet. */
    userCalibrating: boolean("user_calibrating").default(false),
    recoveryScore: integer("recovery_score"),
    restingHeartRate: integer("resting_heart_rate"),
    hrvRmssdMilli: doublePrecision("hrv_rmssd_milli"),
    spo2Percentage: doublePrecision("spo2_percentage"),
    skinTempCelsius: doublePrecision("skin_temp_celsius"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("recoveries_user_idx").on(t.userId)],
);

export const sleeps = pgTable(
  "sleeps",
  {
    id: uuid("id").primaryKey(),
    userId: integer("user_id").notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
    end: timestamp("end", { withTimezone: true }).notNull(),
    timezoneOffset: text("timezone_offset"),
    nap: boolean("nap").notNull().default(false),
    scoreState: text("score_state").notNull(),
    inBedMilli: integer("in_bed_milli"),
    awakeMilli: integer("awake_milli"),
    noDataMilli: integer("no_data_milli"),
    lightMilli: integer("light_milli"),
    swsMilli: integer("sws_milli"),
    remMilli: integer("rem_milli"),
    sleepCycleCount: integer("sleep_cycle_count"),
    disturbanceCount: integer("disturbance_count"),
    /** The four components WHOOP adds up to decide how much sleep you needed. */
    needBaselineMilli: integer("need_baseline_milli"),
    needFromDebtMilli: integer("need_from_debt_milli"),
    needFromStrainMilli: integer("need_from_strain_milli"),
    needFromNapMilli: integer("need_from_nap_milli"),
    respiratoryRate: doublePrecision("respiratory_rate"),
    performancePercentage: doublePrecision("performance_percentage"),
    consistencyPercentage: doublePrecision("consistency_percentage"),
    efficiencyPercentage: doublePrecision("efficiency_percentage"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sleeps_user_start_idx").on(t.userId, t.start)],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey(),
    userId: integer("user_id").notNull(),
    start: timestamp("start", { withTimezone: true }).notNull(),
    end: timestamp("end", { withTimezone: true }).notNull(),
    timezoneOffset: text("timezone_offset"),
    sportName: text("sport_name"),
    scoreState: text("score_state").notNull(),
    strain: doublePrecision("strain"),
    averageHeartRate: integer("average_heart_rate"),
    maxHeartRate: integer("max_heart_rate"),
    kilojoule: doublePrecision("kilojoule"),
    percentRecorded: doublePrecision("percent_recorded"),
    distanceMeter: doublePrecision("distance_meter"),
    altitudeGainMeter: doublePrecision("altitude_gain_meter"),
    /** zone_zero_milli … zone_five_milli, kept whole rather than as six columns. */
    zoneDurations: jsonb("zone_durations").$type<Record<string, number>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("workouts_user_start_idx").on(t.userId, t.start)],
);

/**
 * Heart-rate samples captured from the BLE broadcast bridge.
 *
 * The WHOOP API has no continuous heart-rate endpoint, so this table is the only
 * place beat-level data ever exists. Rows are written by the bridge and read back
 * to replay a session after the fact.
 */
export const hrSamples = pgTable(
  "hr_samples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: integer("user_id").notNull(),
    sessionId: uuid("session_id").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    bpm: integer("bpm").notNull(),
    /** RR intervals in milliseconds, when the strap reports them. Feeds live HRV. */
    rrIntervals: jsonb("rr_intervals").$type<number[]>(),
    energyExpended: integer("energy_expended"),
  },
  (t) => [index("hr_samples_session_idx").on(t.sessionId, t.recordedAt)],
);

/** A single connected stretch of broadcast, so sessions can be listed and replayed. */
export const hrSessions = pgTable(
  "hr_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: integer("user_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    deviceName: text("device_name"),
    label: text("label"),
  },
  (t) => [index("hr_sessions_user_idx").on(t.userId, t.startedAt)],
);

export type Cycle = typeof cycles.$inferSelect;
export type Recovery = typeof recoveries.$inferSelect;
export type Sleep = typeof sleeps.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type HrSample = typeof hrSamples.$inferSelect;
