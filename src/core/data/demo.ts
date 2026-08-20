import type { DashboardData, DayRecord, SleepRecord, WorkoutRecord } from "@/core/analytics/types";

/**
 * A deterministic, physiologically plausible dataset.
 *
 * The dashboard has to be reviewable before a WHOOP account is linked, and charts
 * built against random noise look wrong in ways that hide real layout problems.
 * So this is not noise: recovery responds to the previous day's strain and to the
 * night's sleep, load builds and tapers across a training block, and there is one
 * seeded illness episode where temperature, respiratory rate and RHR rise together
 * while HRV collapses — the exact pattern the insight engine is meant to catch.
 *
 * Seeded, so the same day always renders the same numbers.
 */

const DAYS = 180;
const SEED = 0x5eed_1234;

/** mulberry32 — small, fast, and identical across runs. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller, so the noise is normal rather than uniform. */
function makeGaussian(rng: () => number) {
  return (mean: number, sd: number): number => {
    const u1 = Math.max(rng(), 1e-9);
    const u2 = rng();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

const SPORTS = [
  { name: "running", baseStrain: 12.5, minutes: 48 },
  { name: "weightlifting", baseStrain: 9.8, minutes: 62 },
  { name: "cycling", baseStrain: 11.2, minutes: 75 },
  { name: "functional_fitness", baseStrain: 14.1, minutes: 55 },
  { name: "swimming", baseStrain: 10.4, minutes: 40 },
  { name: "walking", baseStrain: 4.2, minutes: 45 },
  { name: "yoga", baseStrain: 5.1, minutes: 50 },
];

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function generateDemoData(): DashboardData {
  // Seeded per call, so every render of every page produces the identical dataset.
  const rng = makeRng(SEED);
  const gaussian = makeGaussian(rng);

  const days: DayRecord[] = [];
  const today = new Date();
  today.setHours(6, 0, 0, 0);

  // Personal constants this synthetic athlete is generated around.
  const hrvBase = 68;
  const rhrBase = 51;
  const maxHr = 191;

  // Carried state so each day depends on the ones before it.
  let hrvTrend = 0;
  let sleepDebtMilli = 0;

  // A four-week build followed by a deload, sitting mid-history.
  const blockStart = DAYS - 70;
  const blockEnd = DAYS - 28;
  // A five-day illness episode, late enough to be visible in the recent window.
  const illnessStart = DAYS - 24;
  const illnessEnd = DAYS - 19;

  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (DAYS - 1 - i));

    const dow = date.getDay();
    const previous = days[days.length - 1];

    const inBlock = i >= blockStart && i < blockEnd;
    const inTaper = i >= blockEnd && i < blockEnd + 7;
    const ill = i >= illnessStart && i < illnessEnd;

    // ---- Sleep -------------------------------------------------------------
    // Weekends run later and longer; illness adds time in bed but wrecks quality.
    const isWeekend = dow === 0 || dow === 6;
    const bedtimeHour = 22 + (isWeekend ? 1.4 : 0) + gaussian(0, 0.55);
    const targetSleepHours = clamp(
      (isWeekend ? 9.1 : 8.25) + (ill ? 0.7 : 0) - (inBlock ? 0.2 : 0) + gaussian(0, 0.5),
      5.5,
      10.5,
    );

    const sleepStart = new Date(date);
    sleepStart.setDate(sleepStart.getDate() - 1);
    sleepStart.setHours(Math.floor(bedtimeHour), Math.round((bedtimeHour % 1) * 60), 0, 0);

    const inBedMilli = Math.round(targetSleepHours * 3_600_000);
    const efficiency = clamp(gaussian(ill ? 0.84 : 0.915, 0.03), 0.72, 0.97);
    const asleepMilli = Math.round(inBedMilli * efficiency);
    const awakeMilli = inBedMilli - asleepMilli;

    // Restorative share dips when ill or deep into a build block.
    const remShare = clamp(gaussian(ill ? 0.17 : 0.22, 0.03), 0.1, 0.32);
    const deepShare = clamp(gaussian(ill ? 0.13 : inBlock ? 0.2 : 0.18, 0.03), 0.08, 0.3);
    const remMilli = Math.round(asleepMilli * remShare);
    const swsMilli = Math.round(asleepMilli * deepShare);
    const lightMilli = asleepMilli - remMilli - swsMilli;

    const needBaselineMilli = Math.round(7.6 * 3_600_000);
    const needFromDebtMilli = Math.round(Math.min(sleepDebtMilli, 3 * 3_600_000) * 0.25);
    const needFromStrainMilli = Math.round(
      clamp(((previous?.strain ?? 8) - 8) / 13, 0, 1) * 0.9 * 3_600_000,
    );

    const needMilli = needBaselineMilli + needFromDebtMilli + needFromStrainMilli;
    // Decay before accruing: debt is paid down by a good night, not just added to.
    sleepDebtMilli = clamp(
      sleepDebtMilli * 0.85 + (needMilli - asleepMilli) * 0.35,
      0,
      4 * 3_600_000,
    );

    const sleepEnd = new Date(sleepStart.getTime() + inBedMilli);

    const sleep: SleepRecord = {
      id: `demo-sleep-${i}`,
      start: sleepStart.toISOString(),
      end: sleepEnd.toISOString(),
      nap: false,
      inBedMilli,
      awakeMilli,
      lightMilli,
      swsMilli,
      remMilli,
      noDataMilli: 0,
      sleepCycleCount: Math.round(clamp(asleepMilli / (95 * 60_000), 2, 7)),
      disturbanceCount: Math.round(clamp(gaussian(ill ? 9 : 4.5, 2), 0, 20)),
      needBaselineMilli,
      needFromDebtMilli,
      needFromStrainMilli,
      needFromNapMilli: 0,
      respiratoryRate: Number(clamp(gaussian(ill ? 16.8 : 14.6, 0.35), 12, 22).toFixed(1)),
      performancePercentage: Math.round(clamp((asleepMilli / needMilli) * 100, 30, 100)),
      consistencyPercentage: Math.round(clamp(gaussian(isWeekend ? 62 : 82, 9), 20, 100)),
      efficiencyPercentage: Number((efficiency * 100).toFixed(1)),
    };

    // ---- Recovery ----------------------------------------------------------
    // The physiological core: HRV responds to yesterday's strain, last night's
    // sleep, and a slow-moving fitness trend, then recovery is derived from it.
    hrvTrend += gaussian(inBlock ? -0.18 : inTaper ? 0.5 : 0.05, 0.5);
    hrvTrend = clamp(hrvTrend, -14, 14);

    const strainDrag = ((previous?.strain ?? 8) - 9) * 1.6;
    const sleepLift = ((sleep.performancePercentage ?? 80) - 80) * 0.14;
    const illnessDrag = ill ? 22 : 0;

    const hrvMs = Math.round(
      clamp(hrvBase + hrvTrend - strainDrag + sleepLift - illnessDrag + gaussian(0, 4.5), 18, 130),
    );

    const restingHeartRate = Math.round(
      clamp(
        rhrBase - hrvTrend * 0.18 + (previous?.strain ?? 8) * 0.22 + (ill ? 7 : 0) + gaussian(0, 1.6),
        38,
        75,
      ),
    );

    const recoveryScore = Math.round(
      clamp(
        // Weighted toward HRV, the way WHOOP's own score behaves.
        59 +
          (hrvMs - hrvBase) * 0.85 -
          (restingHeartRate - rhrBase) * 2.6 +
          ((sleep.performancePercentage ?? 80) - 80) * 0.35 +
          gaussian(0, 4),
        3,
        99,
      ),
    );

    // ---- Strain and workouts ----------------------------------------------
    const restDay = rng() < (inBlock ? 0.12 : ill ? 0.75 : 0.25);
    const workouts: WorkoutRecord[] = [];
    let dayStrain = clamp(gaussian(5.5, 1.2), 1.5, 9); // Baseline non-exercise strain.

    if (!restDay) {
      const sessions = rng() < 0.18 ? 2 : 1;
      for (let s = 0; s < sessions; s++) {
        const sport = SPORTS[Math.floor(rng() * SPORTS.length)];

        // Training follows recovery, but imperfectly — people override the number.
        const intent = clamp(0.52 + (recoveryScore / 100) * 0.62 + gaussian(0, 0.19), 0.3, 1.45);
        const strain = clamp(
          sport.baseStrain * intent * (inBlock ? 1.12 : inTaper ? 0.78 : 1) + gaussian(0, 1),
          2,
          20.5,
        );

        const minutes = Math.round(sport.minutes * clamp(gaussian(1, 0.2), 0.5, 1.6));
        const avgHr = Math.round(clamp(maxHr * (0.52 + (strain / 21) * 0.28), 90, maxHr - 12));
        const peakHr = Math.round(clamp(avgHr + gaussian(28, 8), avgHr + 8, maxHr));

        const start = new Date(date);
        start.setHours(s === 0 ? (isWeekend ? 9 : 17) : 19, Math.floor(rng() * 50), 0, 0);
        const end = new Date(start.getTime() + minutes * 60_000);

        workouts.push({
          id: `demo-workout-${i}-${s}`,
          start: start.toISOString(),
          end: end.toISOString(),
          sportName: sport.name,
          strain: Number(strain.toFixed(1)),
          averageHeartRate: avgHr,
          maxHeartRate: peakHr,
          kilojoule: Math.round(minutes * 11 * intent),
          distanceMeter:
            sport.name === "running" || sport.name === "cycling"
              ? Math.round(minutes * (sport.name === "running" ? 190 : 420))
              : null,
          zoneDurations: distributeZones(minutes * 60_000, strain),
        });

        // Sessions add to the day's total on a diminishing curve, not linearly.
        dayStrain = Math.min(21, Math.sqrt(dayStrain ** 2 + strain ** 2));
      }
    }

    const cycleStart = new Date(sleepEnd);
    const cycleEnd = i === DAYS - 1 ? null : new Date(date.getTime() + 22 * 3_600_000);

    days.push({
      date: isoDate(date),
      cycleId: 900000 + i,
      start: cycleStart.toISOString(),
      end: cycleEnd ? cycleEnd.toISOString() : null,
      strain: Number(dayStrain.toFixed(1)),
      kilojoule: Math.round(6800 + dayStrain * 420 + gaussian(0, 300)),
      averageHeartRate: Math.round(clamp(gaussian(66 + dayStrain * 1.1, 3), 50, 100)),
      maxHeartRate: workouts.length
        ? Math.max(...workouts.map((w) => w.maxHeartRate ?? 0))
        : Math.round(clamp(gaussian(118, 10), 95, 150)),
      recoveryScore,
      restingHeartRate,
      hrvMs,
      spo2: Number(clamp(gaussian(ill ? 95.1 : 96.6, 0.5), 92, 100).toFixed(1)),
      skinTempC: Number(clamp(gaussian(ill ? 34.9 : 33.6, 0.3), 32, 37).toFixed(1)),
      calibrating: false,
      sleep,
      workouts,
    });
  }

  return {
    user: { firstName: "Federico", maxHeartRate: maxHr, weightKilogram: 74.5, demo: true },
    days,
  };
}

/** Splits a session's duration across zones, skewed higher as strain rises. */
function distributeZones(totalMilli: number, strain: number): Record<string, number> {
  const intensity = clamp(strain / 21, 0.1, 1);
  const weights = [
    0.3 * (1 - intensity),
    0.35 * (1 - intensity * 0.5),
    0.3,
    0.35 * intensity,
    0.25 * intensity * intensity,
  ];
  const sum = weights.reduce((a, b) => a + b, 0);

  const keys = ["zone_one_milli", "zone_two_milli", "zone_three_milli", "zone_four_milli", "zone_five_milli"];
  const out: Record<string, number> = { zone_zero_milli: 0 };
  keys.forEach((key, idx) => {
    out[key] = Math.round((weights[idx] / sum) * totalMilli);
  });
  return out;
}
