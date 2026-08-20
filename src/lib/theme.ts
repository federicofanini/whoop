/**
 * Chart colour roles, mirroring the CSS custom properties in globals.css.
 *
 * Recharts needs concrete values in JS rather than `var(--…)` for some props
 * (gradient stops, canvas-drawn marks), so the palette lives here as the single
 * source of truth and globals.css restates it for the CSS side.
 */

export const chart = {
  surface: "#14161a",
  plane: "#0a0b0d",
  hairline: "#23262c",
  baseline: "#333842",
  ink: "#ffffff",
  ink2: "#c3c2b7",
  muted: "#898781",
} as const;

/** Categorical slots, in fixed assignment order. Never cycled, never re-ordered. */
export const series = {
  strain: "#3987e5",
  recovery: "#199e70",
  restingHr: "#d95926",
  sleep: "#9085e9",
} as const;

/**
 * Slots that are safe together in an all-pairs form (scatter, bubble), where any
 * two marks can end up side by side. Validated at ΔE 9.4 CVD / 20.9 normal.
 * Violet is deliberately absent: beside blue it measures ΔE 1.9 under protanopia.
 */
export const scatterSafe = [series.strain, series.recovery, series.restingHr] as const;

/** Status roles. Always shipped with a number and a written label — never colour alone. */
export const status = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
} as const;

/** Sleep stages read as one hue, light → dark. Ordinal, so depth maps to darkness. */
export const stageColor = {
  awake: "#9ec5f4",
  light: "#5598e7",
  rem: "#256abf",
  deep: "#184f95",
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
  { zone: 1, label: "Zone 1", min: 0.5, max: 0.6, color: "#86b6ef" },
  { zone: 2, label: "Zone 2", min: 0.6, max: 0.7, color: "#5598e7" },
  { zone: 3, label: "Zone 3", min: 0.7, max: 0.8, color: "#3987e5" },
  { zone: 4, label: "Zone 4", min: 0.8, max: 0.9, color: "#256abf" },
  { zone: 5, label: "Zone 5", min: 0.9, max: 1.0, color: "#184f95" },
] as const;

export function zoneForHr(bpm: number, maxHr: number): (typeof hrZones)[number] | null {
  const pct = bpm / maxHr;
  if (pct < hrZones[0].min) return null;
  for (const z of hrZones) {
    if (pct < z.max) return z;
  }
  return hrZones[hrZones.length - 1];
}
