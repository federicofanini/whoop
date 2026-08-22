import {
  bigint,
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
  /**
   * Mirrors `auth.users.id` when the profile came from Google.
   *
   * A profile created by Telegram sign-in has no Supabase user behind it, so
   * this is a locally generated UUID instead. Nothing outside `server/auth`
   * cares which — the rest of the app only needs a stable id per person.
   */
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

  /*
   * Proof of identity, one column per method.
   *
   * Both are nullable and neither is the primary key, because the long-term
   * goal is a profile that has proved *both*: a Google account nobody else can
   * open, and a Telegram account that can be messaged. Recording when each was
   * linked — rather than a pair of booleans — makes "verified since" answerable
   * and lets a future re-verification policy have something to compare against.
   */

  /** When Google last proved this profile. Null on a Telegram-only member. */
  googleLinkedAt: timestamp("google_linked_at", { withTimezone: true }),
  /**
   * The numeric Telegram user id, which never changes. The username can be
   * given up and claimed by someone else, so it is the id that owns the link.
   */
  telegramUserId: bigint("telegram_user_id", { mode: "number" }).unique(),
  /** Lowercased, without the leading @. A cached copy of what the bot last saw. */
  telegramUsername: text("telegram_username"),
  telegramLinkedAt: timestamp("telegram_linked_at", { withTimezone: true }),

  /*
   * WHOOP credentials.
   *
   * A WHOOP developer app may only have ten users while it is in development,
   * which is a hard platform limit and not something the app can raise. So there
   * are two ways to connect: take one of the shared app's ten slots, or bring
   * your own developer app.
   */

  /**
   * Which of the shared app's slots this profile holds, or null for none.
   *
   * A slot *number* with a unique constraint rather than a boolean flag: the
   * database then refuses to hand the same slot to two people, which is what
   * makes claiming safe without a transaction or a lock.
   */
  sharedSlot: integer("shared_slot").unique(),

  /** Set only when the member brought their own WHOOP developer app. */
  whoopClientId: text("whoop_client_id"),
  /** AES-256-GCM, via core/crypto. Never stored or logged in plaintext. */
  whoopClientSecret: text("whoop_client_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Locale = "en" | "it";

/**
 * Everyone who has pressed Start on the bot.
 *
 * A bot cannot open a conversation: Telegram only lets it reply inside a chat
 * the person started. So there is no way to send a login code to a username the
 * bot has never met, and this table is the record of who it has — the reason
 * the sign-in flow begins in Telegram rather than in the browser.
 *
 * Separate from `profiles` on purpose. Pressing Start is not signing up; it
 * only makes someone reachable. A row here becomes a profile the first time a
 * code minted against it is actually verified.
 */
export const telegramChats = pgTable(
  "telegram_chats",
  {
    /** The person. Stable for the life of the Telegram account. */
    telegramUserId: bigint("telegram_user_id", { mode: "number" }).primaryKey(),
    /**
     * Where to deliver a message. Identical to the user id for a private chat,
     * kept separate because it is the field the Bot API actually takes.
     */
    chatId: bigint("chat_id", { mode: "number" }).notNull(),
    /**
     * Lowercased, without the @, and null for the accounts that have none.
     *
     * Unique, because sign-in resolves a username to exactly one person — but
     * *not* the key: Telegram releases abandoned usernames for anyone to claim,
     * so the registry clears the old holder before recording a new one.
     */
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    /** Their Telegram interface language, used to pick the bot's replies. */
    languageCode: text("language_code"),
    /** Set when someone sends /stop; they stay in the table but cannot sign in. */
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("telegram_chats_username_idx").on(t.username)],
);

/**
 * One-time codes, in flight.
 *
 * Only the SHA-256 of the code is stored. A code sits in this table for five
 * minutes, and for those five minutes the table is a list of valid credentials
 * — so a leaked backup or a careless log of a row must not be enough to sign in
 * as anybody.
 *
 * Rows are kept after use rather than deleted: `consumedAt` is what makes a
 * correct code work exactly once, and the trail of recent rows per IP is what
 * the request rate limit counts.
 */
export const loginCodes = pgTable(
  "login_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    telegramUserId: bigint("telegram_user_id", { mode: "number" }).notNull(),
    codeHash: text("code_hash").notNull(),
    /** Incremented before each comparison, so an abandoned guess still costs one. */
    attempts: integer("attempts").notNull().default(0),
    /** Only ever compared and counted; never shown. */
    requestIp: text("request_ip"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("login_codes_user_idx").on(t.telegramUserId, t.createdAt),
    index("login_codes_ip_idx").on(t.requestIp, t.createdAt),
  ],
);

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
  /**
   * Which credentials linked this account: the shared app or the member's own.
   *
   * Recorded rather than re-derived, because refreshing a token requires the
   * *same* client that issued it. A member who links via a shared slot and later
   * adds their own keys must keep refreshing against the shared app until they
   * reconnect, or every refresh fails with an opaque 401.
   */
  credentialSource: text("credential_source").$type<"shared" | "own">().notNull().default("shared"),
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
export type TelegramChat = typeof telegramChats.$inferSelect;
export type LoginCode = typeof loginCodes.$inferSelect;
