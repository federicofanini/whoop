import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A person, as this app knows them.
 *
 * Identity comes from Supabase Auth (Google), so `id` is the `auth.users` UUID
 * and the row is created on first sign-in. Identity is deliberately separate
 * from the WHOOP connection below: you can sign in, be invited, and appear in
 * a friend list before you have ever linked a strap — and unlinking WHOOP must
 * not delete who you are.
 */
export const profiles = pgTable("profiles", {
  /** Mirrors `auth.users.id` from Supabase. */
  id: uuid("id").primaryKey(),
  /**
   * The name friends search for. WHOOP has no public user directory and no
   * endpoint that resolves a person by name, so the handle is minted here on
   * first sign-in and is unique to this app.
   */
  handle: text("handle").unique(),
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  /** "en" | "it" — remembered so the choice survives a new device. */
  locale: text("locale").$type<Locale>().notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Locale = "en" | "it";

/**
 * One row per linked WHOOP account, keyed by the WHOOP user id — which is also
 * what every webhook payload names, so an incoming event needs no translation.
 *
 * This is a *connection*, not an identity: it holds the tokens and owns every
 * metric row below it, and points back at the profile that linked it.
 */
export const accounts = pgTable("accounts", {
  userId: integer("user_id").primaryKey(),
  /** The profile that linked this strap. Null only for rows predating auth. */
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
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

/**
 * The friend graph: one row per pair, in whichever direction the request went.
 *
 * Sharing is symmetric — accepting means each person sees the other's recovery,
 * strain and sleep — so a single row carries the whole relationship rather than
 * two mirrored rows that could drift out of agreement. Reads have to check both
 * columns; that is a cheaper problem than a half-accepted friendship.
 *
 * Keyed on profiles rather than WHOOP accounts, so a friendship survives
 * unlinking and relinking a strap, and can exist before either side has one.
 */
export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Who sent the invite. */
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** Who has to approve it. */
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").$type<FriendshipStatus>().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the addressee accepted. Null while pending. */
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    // One row per ordered pair. The application also rejects the mirrored
    // request, so a pair can never hold two rows.
    uniqueIndex("friendships_pair_idx").on(t.requesterId, t.addresseeId),
    index("friendships_addressee_idx").on(t.addresseeId, t.status),
    index("friendships_requester_idx").on(t.requesterId, t.status),
  ],
);

export type FriendshipStatus = "pending" | "accepted";

export type Cycle = typeof cycles.$inferSelect;
export type Recovery = typeof recoveries.$inferSelect;
export type Sleep = typeof sleeps.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type HrSample = typeof hrSamples.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
