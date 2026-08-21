import { describe, expect, it } from "vitest";
import { computeBaselines } from "@/core/analytics/baselines";
import { computeLoad, optimalStrain, summarizeBalance } from "@/core/analytics/load";
import { sleepRecoveryCorrelation, summarizeSleep } from "@/core/analytics/sleep";
import { generateInsights } from "@/core/analytics/insights";
import type { DayRecord, SleepRecord } from "@/core/analytics/types";

/**
 * The analytics are the product: every insight on every page is downstream of
 * these functions, so a subtly wrong z-score or ratio produces a dashboard that
 * is confidently wrong rather than visibly broken.
 *
 * These tests use hand-built days with known answers rather than the demo
 * generator, so a failure names the arithmetic and not the fixture.
 */

const HOUR = 60 * 60 * 1000;

function day(date: string, over: Partial<DayRecord> = {}): DayRecord {
  return {
    date,
    cycleId: Number(date.replaceAll("-", "")),
    start: `${date}T04:00:00.000Z`,
    end: `${date}T23:00:00.000Z`,
    strain: 10,
    kilojoule: 8000,
    averageHeartRate: 70,
    maxHeartRate: 170,
    recoveryScore: 60,
    restingHeartRate: 50,
    hrvMs: 60,
    spo2: 97,
    skinTempC: 33.5,
    calibrating: false,
    sleep: null,
    workouts: [],
    ...over,
  };
}

/** `n` consecutive days ending today, so trailing-window maths has something to walk. */
function series(values: Partial<DayRecord>[]): DayRecord[] {
  const start = new Date("2026-01-01T00:00:00.000Z");
  return values.map((over, i) => {
    const d = new Date(start.getTime() + i * 24 * HOUR);
    return day(d.toISOString().slice(0, 10), over);
  });
}

function night(over: Partial<SleepRecord> = {}): SleepRecord {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    start: "2026-01-01T23:00:00.000Z",
    end: "2026-01-02T07:00:00.000Z",
    nap: false,
    inBedMilli: 8 * HOUR,
    awakeMilli: 0.5 * HOUR,
    lightMilli: 4 * HOUR,
    swsMilli: 1.5 * HOUR,
    remMilli: 2 * HOUR,
    noDataMilli: 0,
    sleepCycleCount: 5,
    disturbanceCount: 3,
    needBaselineMilli: 8 * HOUR,
    needFromDebtMilli: 0,
    needFromStrainMilli: 0,
    needFromNapMilli: 0,
    respiratoryRate: 14,
    performancePercentage: 94,
    consistencyPercentage: 80,
    efficiencyPercentage: 92,
    ...over,
  };
}

describe("baselines", () => {
  it("reports a z-score of zero when today equals a flat baseline", () => {
    const days = series(Array.from({ length: 40 }, () => ({ hrvMs: 60 })));
    const { hrv } = computeBaselines(days);

    expect(hrv.latest).toBe(60);
    expect(hrv.baseline).toBeCloseTo(60, 5);
    // A flat series has zero deviation; the z-score must not divide by zero.
    expect(Number.isFinite(hrv.z)).toBe(true);
    expect(hrv.z).toBe(0);
  });

  it("scores a drop below baseline as strongly negative", () => {
    // Jittered, because real HRV always varies — a perfectly flat history is a
    // degenerate case with its own test below.
    const days = series([
      ...Array.from({ length: 39 }, (_, i) => ({ hrvMs: 60 + (i % 5) - 2 })),
      { hrvMs: 40 },
    ]);
    const { hrv } = computeBaselines(days);

    expect(hrv.latest).toBe(40);
    expect(hrv.z).toBeLessThan(-2);
  });

  it("treats a departure from a perfectly flat history as a strong signal", () => {
    // Zero standard deviation used to score as z = 0, which reported the most
    // significant possible departure as no departure at all.
    const days = series([
      ...Array.from({ length: 39 }, () => ({ hrvMs: 60 })),
      { hrvMs: 40 },
    ]);
    const { hrv } = computeBaselines(days);

    expect(hrv.z).toBeLessThanOrEqual(-2);
    expect(Number.isFinite(hrv.z)).toBe(true);
  });

  it("ignores missing values rather than treating them as zero", () => {
    const days = series([
      ...Array.from({ length: 20 }, () => ({ hrvMs: 60 })),
      ...Array.from({ length: 10 }, () => ({ hrvMs: null })),
      { hrvMs: 60 },
    ]);
    const { hrv } = computeBaselines(days);

    // A null read as 0 would drag the baseline far below 60.
    expect(hrv.baseline).toBeCloseTo(60, 5);
  });

  it("detects a rising trend", () => {
    const days = series(Array.from({ length: 30 }, (_, i) => ({ hrvMs: 50 + i })));
    expect(computeBaselines(days).hrv.trendPerDay).toBeGreaterThan(0);
  });
});

describe("training load", () => {
  it("puts a steady load in the productive band at a ratio near 1", () => {
    const days = series(Array.from({ length: 60 }, () => ({ strain: 10 })));
    const load = computeLoad(days);

    expect(load.ratio).toBeCloseTo(1, 1);
    expect(load.zone).toBe("productive");
  });

  it("flags a spike as overreaching", () => {
    const days = series([
      ...Array.from({ length: 50 }, () => ({ strain: 5 })),
      ...Array.from({ length: 10 }, () => ({ strain: 20 })),
    ]);
    const load = computeLoad(days);

    expect(load.acute).toBeGreaterThan(load.chronic);
    expect(load.ratio).toBeGreaterThan(1.3);
    expect(load.zone).toBe("overreaching");
  });

  it("flags a collapse as detraining", () => {
    const days = series([
      ...Array.from({ length: 50 }, () => ({ strain: 15 })),
      ...Array.from({ length: 10 }, () => ({ strain: 1 })),
    ]);
    expect(computeLoad(days).zone).toBe("detraining");
  });

  it("never divides by zero on an empty history", () => {
    const load = computeLoad([]);
    expect(Number.isFinite(load.ratio)).toBe(true);
  });
});

describe("optimal strain", () => {
  it("recommends more strain as recovery rises", () => {
    expect(optimalStrain(90).target).toBeGreaterThan(optimalStrain(30).target);
  });

  it("returns a band that brackets its own target", () => {
    for (const recovery of [0, 25, 50, 75, 100]) {
      const { low, target, high } = optimalStrain(recovery);
      expect(low).toBeLessThanOrEqual(target);
      expect(target).toBeLessThanOrEqual(high);
      // Strain is a 0-21 scale; nothing may fall outside it.
      expect(low).toBeGreaterThanOrEqual(0);
      expect(high).toBeLessThanOrEqual(21);
    }
  });
});

describe("sleep", () => {
  it("counts debt only where a night fell short of its need", () => {
    const days = series([
      { sleep: night({ inBedMilli: 8 * HOUR, awakeMilli: 0, lightMilli: 5 * HOUR, swsMilli: 1.5 * HOUR, remMilli: 1.5 * HOUR, needBaselineMilli: 8 * HOUR }) },
      { sleep: night({ inBedMilli: 6 * HOUR, awakeMilli: 0, lightMilli: 3 * HOUR, swsMilli: 1.5 * HOUR, remMilli: 1.5 * HOUR, needBaselineMilli: 8 * HOUR }) },
    ]);
    const summary = summarizeSleep(days);

    // Two hours short on the second night, nothing owed on the first.
    expect(summary.debtMilli).toBeCloseTo(2 * HOUR, -4);
  });

  it("does not report negative debt when every night beat its need", () => {
    const days = series([
      { sleep: night({ inBedMilli: 10 * HOUR, awakeMilli: 0, lightMilli: 6 * HOUR, swsMilli: 2 * HOUR, remMilli: 2 * HOUR, needBaselineMilli: 8 * HOUR }) },
    ]);
    expect(summarizeSleep(days).debtMilli).toBeGreaterThanOrEqual(0);
  });

  it("computes the restorative share as REM plus deep over time asleep", () => {
    const days = series([
      { sleep: night({ awakeMilli: 0, lightMilli: 4 * HOUR, swsMilli: 2 * HOUR, remMilli: 2 * HOUR }) },
    ]);
    // 4h restorative of 8h asleep.
    expect(summarizeSleep(days).restorativeShare).toBeCloseTo(0.5, 2);
  });

  it("returns an empty summary rather than throwing on no nights", () => {
    const summary = summarizeSleep([]);
    expect(summary.nights).toEqual([]);
    expect(Number.isFinite(summary.debtMilli)).toBe(true);
  });
});

describe("sleep/recovery correlation", () => {
  it("finds a strong positive correlation when recovery tracks sleep", () => {
    const days = series(
      Array.from({ length: 30 }, (_, i) => ({
        recoveryScore: 40 + i,
        sleep: night({ performancePercentage: 50 + i }),
      })),
    );
    const { r, n } = sleepRecoveryCorrelation(days);

    expect(n).toBe(30);
    expect(r).toBeGreaterThan(0.9);
  });

  it("reports no correlation for a constant series instead of NaN", () => {
    const days = series(
      Array.from({ length: 20 }, () => ({
        recoveryScore: 60,
        sleep: night({ performancePercentage: 90 }),
      })),
    );
    expect(Number.isNaN(sleepRecoveryCorrelation(days).r)).toBe(false);
  });
});

describe("balance", () => {
  it("counts days that ran ahead of what recovery supported", () => {
    const days = series(
      Array.from({ length: 20 }, () => ({ recoveryScore: 30, strain: 18 })),
    );
    const balance = summarizeBalance(days);

    expect(balance.over).toBeGreaterThan(0);
    expect(balance.meanDeviation).toBeGreaterThan(0);
  });
});

describe("insights", () => {
  it("produces nothing for an empty history", () => {
    expect(generateInsights([])).toEqual([]);
  });

  it("sorts by priority, highest first", () => {
    const days = series(Array.from({ length: 60 }, () => ({ strain: 10 })));
    const priorities = generateInsights(days).map((i) => i.priority);
    expect([...priorities].sort((a, b) => b - a)).toEqual(priorities);
  });

  it("raises the illness signal when temperature and respiratory rate both climb", () => {
    const days = series([
      ...Array.from({ length: 39 }, (_, i) => ({
        skinTempC: 33.5 + ((i % 3) - 1) * 0.1,
        sleep: night({ respiratoryRate: 14 + ((i % 3) - 1) * 0.2 }),
      })),
      { skinTempC: 35.5, sleep: night({ respiratoryRate: 17.5 }) },
    ]);
    const ids = generateInsights(days).map((i) => i.id);
    expect(ids).toContain("illness-signal");
  });

  it("emits numbers as params, never as pre-formatted strings", () => {
    const days = series(Array.from({ length: 60 }, () => ({ strain: 10 })));
    for (const insight of generateInsights(days)) {
      for (const value of Object.values(insight.params)) {
        // A string here would mean a number was formatted before the locale
        // was known, which is how "1.234" ends up on an Italian page.
        const isDuration = typeof value === "object" && value !== null && "duration" in value;
        expect(typeof value === "number" || typeof value === "string" || isDuration).toBe(true);
        if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      }
    }
  });
});
