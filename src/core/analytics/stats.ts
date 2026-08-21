/** Small statistics helpers. Every one of them ignores nulls rather than propagating NaN. */

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * How many standard deviations `value` sits from the baseline.
 *
 * Returns 0 rather than Infinity when the baseline has no spread — a flat
 * baseline means "nothing to compare against", not "infinitely unusual".
 */
/**
 * How far `value` sits from a baseline, in standard deviations.
 *
 * A zero standard deviation needs care. Returning 0 — "no signal" — is right
 * when the value matches the flat history, and badly wrong when it does not: a
 * baseline that never moved and then moved is the *strongest* possible
 * departure, not the weakest. Since the true z-score there is infinite, and an
 * infinity would propagate into a priority, a sort and eventually a rendered
 * number, it is clamped to a value beyond any threshold the app tests for.
 */
export function zScore(value: number, baseline: number[]): number {
  const sd = stdev(baseline);
  if (sd === 0) {
    const delta = value - mean(baseline);
    if (delta === 0) return 0;
    return delta > 0 ? DEGENERATE_Z : -DEGENERATE_Z;
  }
  return (value - mean(baseline)) / sd;
}

/** Past every threshold in the app, while staying a finite, sortable number. */
const DEGENERATE_Z = 4;

/**
 * Exponentially weighted moving average.
 *
 * Preferred over a flat window for training load: a hard session three days ago
 * should weigh more than one 27 days ago, which a plain mean cannot express.
 */
export function ewma(values: number[], span: number): number {
  if (values.length === 0) return 0;
  const alpha = 2 / (span + 1);
  let acc = values[0];
  for (let i = 1; i < values.length; i++) {
    acc = alpha * values[i] + (1 - alpha) * acc;
  }
  return acc;
}

/** Trailing rolling mean, aligned to the input so index i is "the mean up to i". */
export function rollingMean(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter(isNumber);
    return slice.length ? mean(slice) : null;
  });
}

/** Least-squares slope, in units per step. Used to say "trending up" with a number behind it. */
export function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
