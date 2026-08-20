"use client";

import type { ReactNode } from "react";
import { chart } from "@/lib/theme";

/**
 * Shared chart chrome.
 *
 * Grid and axes are solid hairlines one shade off the surface — recessive, never
 * dashed. Everything here exists so every chart in the app reads as one system
 * rather than seven separate charts that happen to share a page.
 */

export const axisProps = {
  stroke: chart.baseline,
  tick: { fill: chart.muted, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = {
  stroke: chart.hairline,
  strokeDasharray: "0",
  vertical: false,
} as const;

/** Consistent margins mean the plot areas of stacked charts line up down the page. */
export const chartMargin = { top: 8, right: 12, bottom: 4, left: 4 } as const;

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export function TooltipShell({ title, rows, footer }: { title: string; rows: TooltipRow[]; footer?: ReactNode }) {
  return (
    <div className="pointer-events-none rounded-xl border border-hairline bg-surface-2/95 px-3 py-2.5 shadow-xl backdrop-blur">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {title}
      </p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-6 text-[12px]">
            <span className="flex items-center gap-1.5 text-ink-2">
              {row.color ? (
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              ) : null}
              {row.label}
            </span>
            {/* Values wear text tokens, never the series colour. */}
            <span className="tabular font-medium text-ink">{row.value}</span>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-2 border-t border-hairline pt-2 text-[11px] text-muted">{footer}</div> : null}
    </div>
  );
}

/** A legend is always present when two or more series share a plot. */
export function Legend({
  items,
  note,
}: {
  items: { label: string; color: string; shape?: "line" | "dot" | "square" }[];
  note?: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[12px] text-ink-2">
          <span
            aria-hidden
            className={
              item.shape === "line"
                ? "h-[2px] w-4 rounded-full"
                : item.shape === "square"
                  ? "h-2.5 w-2.5 rounded-[2px]"
                  : "h-2.5 w-2.5 rounded-full"
            }
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
      {note ? <span className="text-[12px] text-muted">{note}</span> : null}
    </div>
  );
}

/** Short axis labels: "12 Aug" beats "2026-08-12" at 11px. */
export function shortDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function weekdayDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
