"use client";

import { useEffect, useState } from "react";

/**
 * Resolves the chart palette from CSS custom properties.
 *
 * Most coloured elements can simply say `var(--color-critical)` and let the
 * cascade pick the right value for the theme. Recharts cannot: several of its
 * props end up in canvas draws or SVG gradient stops that need a concrete
 * value, so those have to be read out of the document.
 *
 * Re-reads on every theme change. The toggle mutates `data-theme` on <html>,
 * which is exactly what the observer watches.
 */
export interface ChartTokens {
  series1: string;
  series2: string;
  series3: string;
  series4: string;
  good: string;
  warning: string;
  critical: string;
  stageAwake: string;
  stageLight: string;
  stageRem: string;
  stageDeep: string;
  ink: string;
  ink2: string;
  muted: string;
  grid: string;
  hairline: string;
  surface: string;
  plane: string;
}

const VARIABLES: Record<keyof ChartTokens, string> = {
  series1: "--color-series-1",
  series2: "--color-series-2",
  series3: "--color-series-3",
  series4: "--color-series-4",
  good: "--color-good",
  warning: "--color-warning",
  critical: "--color-critical",
  stageAwake: "--color-stage-awake",
  stageLight: "--color-stage-light",
  stageRem: "--color-stage-rem",
  stageDeep: "--color-stage-deep",
  ink: "--color-ink",
  ink2: "--color-ink-2",
  muted: "--color-muted",
  grid: "--color-grid",
  hairline: "--color-hairline",
  surface: "--color-surface",
  plane: "--color-plane",
};

/**
 * The light values, restated in JS.
 *
 * A server render has no document to read, so this is what the first paint
 * uses. It matches `:root` in globals.css; the effect below corrects it on the
 * client if the reader is in dark mode.
 */
const FALLBACK: ChartTokens = {
  series1: "#6786c4",
  series2: "#4e8f63",
  series3: "#c0623c",
  series4: "#8579b8",
  good: "#3f8f57",
  warning: "#b5842c",
  critical: "#c0483a",
  stageAwake: "#b9c6dd",
  stageLight: "#8ea6cc",
  stageRem: "#6786c4",
  stageDeep: "#47639b",
  ink: "#0a0a0a",
  ink2: "#4b4b47",
  muted: "#86867f",
  grid: "#ecece8",
  hairline: "#dcdcd8",
  surface: "#ffffff",
  plane: "#ffffff",
};

function read(): ChartTokens {
  if (typeof window === "undefined") return FALLBACK;
  const styles = getComputedStyle(document.documentElement);

  const out = {} as ChartTokens;
  for (const [key, variable] of Object.entries(VARIABLES) as [keyof ChartTokens, string][]) {
    out[key] = styles.getPropertyValue(variable).trim() || FALLBACK[key];
  }
  return out;
}

export function useChartTokens(): ChartTokens {
  const [tokens, setTokens] = useState<ChartTokens>(FALLBACK);

  useEffect(() => {
    setTokens(read());

    const observer = new MutationObserver(() => setTokens(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return tokens;
}
