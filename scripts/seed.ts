/**
 * Seeds a database with generated history for two members.
 *
 * Exists so the whole persistence layer — every insert, join, index and
 * friend-scoped query — can be exercised without a WHOOP account. It writes
 * through the same tables the sync path writes to, so a query that works here
 * works against real data.
 *
 * Never run this against a database holding real syncs: it inserts fixed ids.
 */
import { generateDemoData } from "../src/core/data/demo";
import { getDb, schema } from "../src/core/db";

const HOUR = 60 * 60 * 1000;

/** A stable UUID per member per night, so re-seeding updates rather than duplicates. */
function uuidForNight(userId: number, index: number): string {
  const hex = (userId * 1_000_000 + index).toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

async function seedMember(opts: {
  profileId: string;
  handle: string;
  fullName: string;
  email: string;
  whoopUserId: number;
  seed: number;
}) {
  const db = getDb();
  const data = generateDemoData(opts.seed);

  await db
    .insert(schema.profiles)
    .values({
      id: opts.profileId,
      handle: opts.handle,
      fullName: opts.fullName,
      email: opts.email,
      locale: "en",
    })
    .onConflictDoNothing();

  await db
    .insert(schema.accounts)
    .values({
      userId: opts.whoopUserId,
      profileId: opts.profileId,
      email: opts.email,
      firstName: opts.fullName.split(" ")[0],
      lastName: opts.fullName.split(" ")[1] ?? "",
      accessToken: "seed-access-token",
      refreshToken: `seed-refresh-${opts.whoopUserId}`,
      expiresAt: new Date(Date.now() + HOUR),
      scope: "offline read:recovery",
      maxHeartRate: data.user.maxHeartRate,
      credentialSource: "shared",
    })
    .onConflictDoNothing();

  let cycles = 0;
  for (const [index, day] of data.days.entries()) {
    const start = new Date(`${day.date}T04:00:00.000Z`);
    // Cycle ids are integers in the WHOOP API; only sleeps and workouts moved
    // to UUIDs in v2. Deriving one keeps a re-run idempotent.
    const cycleId = opts.whoopUserId * 100_000 + index;
    const sleepId = uuidForNight(opts.whoopUserId, index);

    await db
      .insert(schema.cycles)
      .values({
        id: cycleId,
        userId: opts.whoopUserId,
        start,
        end: new Date(start.getTime() + 20 * HOUR),
        timezoneOffset: "+00:00",
        scoreState: "SCORED",
        strain: day.strain,
        averageHeartRate: day.averageHeartRate,
        maxHeartRate: day.maxHeartRate,
        kilojoule: day.kilojoule,
        updatedAt: start,
      })
      .onConflictDoNothing();
    cycles += 1;

    if (day.recoveryScore !== null) {
      await db
        .insert(schema.recoveries)
        .values({
          cycleId,
          sleepId,
          userId: opts.whoopUserId,
          scoreState: "SCORED",
          recoveryScore: day.recoveryScore,
          restingHeartRate: day.restingHeartRate,
          hrvRmssdMilli: day.hrvMs,
          skinTempCelsius: day.skinTempC,
          spo2Percentage: day.spo2,
          userCalibrating: false,
          updatedAt: start,
        })
        .onConflictDoNothing();
    }
  }

  let sleeps = 0;
  let workouts = 0;

  for (const [index, day] of data.days.entries()) {
    const night = day.sleep;
    if (night) {
      await db
        .insert(schema.sleeps)
        .values({
          id: uuidForNight(opts.whoopUserId, index),
          userId: opts.whoopUserId,
          start: new Date(night.start),
          end: new Date(night.end),
          timezoneOffset: "+00:00",
          nap: night.nap,
          scoreState: "SCORED",
          performancePercentage: night.performancePercentage,
          respiratoryRate: night.respiratoryRate,
          consistencyPercentage: night.consistencyPercentage,
          efficiencyPercentage: night.efficiencyPercentage,
          inBedMilli: night.inBedMilli,
          awakeMilli: night.awakeMilli,
          lightMilli: night.lightMilli,
          remMilli: night.remMilli,
          swsMilli: night.swsMilli,
          noDataMilli: night.noDataMilli,
          sleepCycleCount: night.sleepCycleCount,
          disturbanceCount: night.disturbanceCount,
          needBaselineMilli: night.needBaselineMilli,
          needFromDebtMilli: night.needFromDebtMilli,
          needFromStrainMilli: night.needFromStrainMilli,
          needFromNapMilli: night.needFromNapMilli,
          updatedAt: new Date(night.end),
        })
        .onConflictDoNothing();
      sleeps += 1;
    }

    for (const [w, workout] of day.workouts.entries()) {
      await db
        .insert(schema.workouts)
        .values({
          id: uuidForNight(opts.whoopUserId, 500_000 + index * 10 + w),
          userId: opts.whoopUserId,
          sportName: workout.sportName,
          start: new Date(workout.start),
          end: new Date(workout.end),
          timezoneOffset: "+00:00",
          scoreState: "SCORED",
          strain: workout.strain,
          averageHeartRate: workout.averageHeartRate,
          maxHeartRate: workout.maxHeartRate,
          kilojoule: workout.kilojoule,
          distanceMeter: workout.distanceMeter,
          zoneDurations: workout.zoneDurations,
          updatedAt: new Date(workout.end),
        })
        .onConflictDoNothing();
      workouts += 1;
    }
  }

  console.log(
    `seeded ${opts.handle}: ${cycles} cycles, ${sleeps} sleeps, ${workouts} workouts`,
  );
}

/*
 * Fixed rather than random.
 *
 * Handles are unique, so a re-run with fresh UUIDs conflicts on the handle,
 * `onConflictDoNothing` skips the whole row, and every foreign key pointing at
 * the profile then fails. Deterministic ids make re-seeding a no-op instead.
 */
const PROFILE_A = "11111111-1111-4111-8111-111111111111";
const PROFILE_B = "22222222-2222-4222-8222-222222222222";

async function main() {
  const me = process.env.SEED_PROFILE_A ?? PROFILE_A;
  const brother = process.env.SEED_PROFILE_B ?? PROFILE_B;

  await seedMember({
    profileId: me,
    handle: "federico",
    fullName: "Federico Fanini",
    email: "federico@example.test",
    whoopUserId: 1001,
    seed: 7,
  });

  await seedMember({
    profileId: brother,
    handle: "fratello",
    fullName: "Marco Fanini",
    email: "marco@example.test",
    whoopUserId: 1002,
    seed: 23,
  });

  await getDb()
    .insert(schema.friendships)
    .values({ requesterId: me, addresseeId: brother, status: "accepted", respondedAt: new Date() })
    .onConflictDoNothing();

  console.log(`\nprofiles:\n  A ${me}\n  B ${brother}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
