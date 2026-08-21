import { describe, expect, it } from "vitest";
import { createTranslator, getDictionary, negotiateLocale, plural } from "@/core/i18n";
import { LOCALES } from "@/core/i18n/config";
import { generateInsights } from "@/core/analytics/insights";
import type { DayRecord } from "@/core/analytics/types";

describe("locale negotiation", () => {
  it("picks Italian from an Italian header", () => {
    expect(negotiateLocale("it-IT,it;q=0.9,en;q=0.8")).toBe("it");
  });

  it("matches on the primary subtag, so regional variants count", () => {
    expect(negotiateLocale("it-CH")).toBe("it");
  });

  it("respects quality ordering rather than document order", () => {
    expect(negotiateLocale("fr;q=0.9,it;q=1.0")).toBe("it");
  });

  it("falls back to English for an unsupported or missing header", () => {
    expect(negotiateLocale("de-DE,de;q=0.9")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("")).toBe("en");
  });

  it("does not crash on a malformed header", () => {
    expect(LOCALES).toContain(negotiateLocale(";;;q=,,"));
  });
});

describe("translator", () => {
  it("interpolates named placeholders", () => {
    const t = createTranslator("en");
    expect(t("friends.sent", { handle: "marco" })).toContain("@marco");
  });

  it("formats numbers in the reader's locale", () => {
    // Italian swaps both separators; a hard-coded toFixed would not.
    expect(createTranslator("en").number(1234.5, 1)).toBe("1,234.5");
    expect(createTranslator("it").number(1234.5, 1)).toBe("1234,5");

    // Italian CLDR sets minimumGroupingDigits to 2, so grouping starts at five
    // digits rather than four — "1234,5" above is correct, not a missing separator.
    expect(createTranslator("it").number(12345.5, 1)).toBe("12.345,5");
  });

  it("uses a comma as the decimal separator for the numbers insights emit", () => {
    // The case that matters on screen: 13.4 strain must read as 13,4 in Italian.
    expect(createTranslator("it").number(13.4, 1)).toBe("13,4");
  });

  it("formats durations in each language's idiom", () => {
    expect(createTranslator("en").duration(7.5 * 3600_000)).toBe("7h 30m");
    // "m" reads as metres in Italian.
    expect(createTranslator("it").duration(7.5 * 3600_000)).toBe("7h 30min");
  });

  it("returns the key rather than throwing when one is missing", () => {
    expect(createTranslator("en")("no.such.key")).toBe("no.such.key");
  });

  it("leaves an unmatched placeholder intact instead of printing undefined", () => {
    expect(createTranslator("en")("friends.sent", {})).toContain("{handle}");
  });

  it("picks singular and plural forms", () => {
    const t = createTranslator("en");
    expect(plural(t, "nav.pendingRequests", 1)).toContain("1 pending friend request");
    expect(plural(t, "nav.pendingRequests", 3)).toContain("3 pending friend requests");
  });
});

describe("dictionary completeness", () => {
  /** Every leaf path in a dictionary, so the two can be compared as sets. */
  function paths(node: unknown, prefix = ""): string[] {
    if (typeof node === "string") return [prefix];
    if (typeof node !== "object" || node === null) return [];
    return Object.entries(node).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
  }

  it("has exactly the same keys in English and Italian", () => {
    const en = paths(getDictionary("en")).sort();
    const it = paths(getDictionary("it")).sort();

    expect(it).toEqual(en);
  });

  it("leaves no Italian string identical to its English source by accident", () => {
    const en = getDictionary("en");
    const it = getDictionary("it");

    // Some are legitimately identical — product names, units, metric names WHOOP
    // itself leaves in English. Everything else being identical means untranslated.
    const allowed = new Set([
      "app.name", "common.none", "common.ms", "common.bpm", "common.rpm",
      "common.percent", "common.times", "nav.recovery", "nav.strain", "nav.live",
      "overview.recovery", "overview.hrv", "chart.recovery", "chart.strain",
      "sleepPage.rem", "live.sdnn", "settings.keys.clientId", "settings.keys.clientSecret",
      "settings.webhooks", "recoveryPage.outOf30",
    ]);

    const identical = paths(en).filter((path) => {
      const read = (d: unknown) => path.split(".").reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], d);
      return read(en) === read(it) && !allowed.has(path);
    });

    expect(identical).toEqual([]);
  });
});

describe("insight keys", () => {
  it("resolves every emitted key in both languages", () => {
    // Insights emit keys, so a renamed key ships as a raw dotted path on screen.
    // Generating across varied histories exercises most of the branches.
    const histories: DayRecord[][] = [];
    const base = (over: Partial<DayRecord>, i: number): DayRecord => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      cycleId: i, start: "", end: null, strain: 10, kilojoule: 8000,
      averageHeartRate: 70, maxHeartRate: 170, recoveryScore: 60,
      restingHeartRate: 50, hrvMs: 60, spo2: 97, skinTempC: 33.5,
      calibrating: false, sleep: null, workouts: [], ...over,
    });

    histories.push(Array.from({ length: 60 }, (_, i) => base({ strain: 5 }, i)));
    histories.push(Array.from({ length: 60 }, (_, i) => base({ strain: i > 50 ? 20 : 4 }, i)));
    histories.push(Array.from({ length: 60 }, (_, i) => base({ recoveryScore: 80, hrvMs: 60 + i }, i)));

    const en = createTranslator("en");
    const it = createTranslator("it");

    let checked = 0;
    for (const days of histories) {
      for (const insight of generateInsights(days)) {
        for (const key of [insight.titleKey, insight.detailKey]) {
          const full = `insight.${key}`;
          expect(en(full, insight.params), `${full} missing in en`).not.toBe(full);
          expect(it(full, insight.params), `${full} missing in it`).not.toBe(full);
          // A leftover placeholder means the params and the string disagree.
          expect(en(full, insight.params)).not.toMatch(/\{[a-z]+\}/i);
          expect(it(full, insight.params)).not.toMatch(/\{[a-z]+\}/i);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(6);
  });
});
