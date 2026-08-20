"use client";

import { Bar, BarChart, Cell, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayRecord } from "@/core/analytics/types";
import { chart, recoveryBand, recoveryColor, type BandLabels } from "@/lib/theme";
import { TooltipShell, axisProps, chartMargin, gridProps, weekdayDate } from "./chart-chrome";

/**
 * Daily recovery, coloured by band.
 *
 * Red/amber/green is not a categorical palette and is not colourblind-separable —
 * so the score itself is always on screen, and the tooltip names the band in
 * words. Colour is the fastest channel here, never the only one.
 */
export function RecoveryBars({
  days,
  bandLabels,
  height = 220,
}: {
  days: DayRecord[];
  bandLabels: BandLabels;
  height?: number;
}) {
  const data = days
    .filter((d) => typeof d.recoveryScore === "number")
    .map((d) => ({
      date: d.date,
      score: d.recoveryScore as number,
      hrv: d.hrvMs,
      rhr: d.restingHeartRate,
    }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartMargin} barCategoryGap="18%">
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="date"
            {...axisProps}
            tickFormatter={(v: string) => weekdayDate(v).replace(/^\w+, /, "")}
            minTickGap={28}
          />
          <YAxis {...axisProps} width={34} domain={[0, 100]} ticks={[0, 34, 67, 100]} unit="%" />

          {/* The two band edges, so a bar's colour can be read off the axis too. */}
          <ReferenceLine y={67} stroke={chart.hairline} strokeWidth={1} />
          <ReferenceLine y={34} stroke={chart.hairline} strokeWidth={1} />

          <Bar dataKey="score" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.date} fill={recoveryColor(entry.score)} />
            ))}
          </Bar>

          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as (typeof data)[number];
              return (
                <TooltipShell
                  title={weekdayDate(point.date)}
                  rows={[
                    {
                      label: "Recovery",
                      value: `${point.score}%`,
                      color: recoveryColor(point.score),
                    },
                    { label: "HRV", value: point.hrv ? `${point.hrv.toFixed(0)} ms` : "—" },
                    { label: "Resting HR", value: point.rhr ? `${point.rhr} bpm` : "—" },
                  ]}
                  footer={bandLabels[recoveryBand(point.score)]}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
