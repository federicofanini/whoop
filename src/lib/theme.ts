/**
 * Chart colour roles as CSS custom properties.
 *
 * Two themes means a colour is no longer a constant, so nothing here is a hex
 * value any more. Anything rendered as ordinary DOM — a status dot, a bar in
 * the recovery strip, a hero figure — can take these strings directly and let
 * the cascade resolve them per theme, including on the server, where the theme
 * is unknowable.
 *
 * Recharts is the exception: some of its props need a concrete value, so client
 * charts read the same variables through `useChartTokens()`.
 */

/** Categorical slots, in fixed assignment order. Never cycled, never re-ordered. */
export const series = {
  strain: "var(--color-series-1)",
  recovery: "var(--color-series-2)",
  restingHr: "var(--color-series-3)",
  sleep: "var(--color-series-4)",
} as const;

/** Status roles. Always shipped with a number and a written label — never colour alone. */
export const status = {
  good: "var(--color-good)",
  warning: "var(--color-warning)",
  critical: "var(--color-critical)",
} as const;

/** Sleep stages read as one hue, light → dark. Ordinal, so depth maps to darkness. */
export const stageColor = {
  awake: "var(--color-stage-awake)",
  light: "var(--color-stage-light)",
  rem: "var(--color-stage-rem)",
  deep: "var(--color-stage-deep)",
} as const;

export type RecoveryBand = "green" | "yellow" | "red";

/**
 * The three band words, resolved by the server and handed to client charts.
 *
 * Charts run in the browser and cannot reach the request's translator, so the
 * words travel as a prop. Colour still never carries the meaning alone.
 */
export type BandLabels = Record<RecoveryBand, string>;

/**
 * WHOOP's own thresholds: 67%+ is a green day, 34-66% yellow, below that red.
 */
export function recoveryBand(score: number): RecoveryBand {
  if (score >= 67) return "green";
  if (score >= 34) return "yellow";
  return "red";
}

/** A `var(--…)` string, so a server-rendered element still tracks the theme. */
export function recoveryColor(score: number): string {
  const band = recoveryBand(score);
  return band === "green" ? status.good : band === "yellow" ? status.warning : status.critical;
}

/**
 * The written half of the status pairing, as a dictionary key. Colour never
 * travels without it, and the word has to be readable in either language.
 */
export function recoveryLabelKey(score: number): "band.primed" | "band.adequate" | "band.compromised" {
  const band = recoveryBand(score);
  return band === "green" ? "band.primed" : band === "yellow" ? "band.adequate" : "band.compromised";
}

/**
 * Heart-rate zones as WHOOP presents them, as a share of max HR.
 * Zone 1 is the lightest step so the ramp reads as intensity.
 */
export const hrZones = [
  { zone: 1, label: "Zone 1", min: 0.5, max: 0.6, color: "var(--color-stage-awake)" },
  { zone: 2, label: "Zone 2", min: 0.6, max: 0.7, color: "var(--color-stage-light)" },
  { zone: 3, label: "Zone 3", min: 0.7, max: 0.8, color: "var(--color-stage-rem)" },
  { zone: 4, label: "Zone 4", min: 0.8, max: 0.9, color: "var(--color-stage-deep)" },
  { zone: 5, label: "Zone 5", min: 0.9, max: 1.0, color: "var(--color-series-4)" },
] as const;

export function zoneForHr(bpm: number, maxHr: number): (typeof hrZones)[number] | null {
  const pct = bpm / maxHr;
  if (pct < hrZones[0].min) return null;
  for (const z of hrZones) {
    if (pct < z.max) return z;
  }
  return hrZones[hrZones.length - 1];
}
