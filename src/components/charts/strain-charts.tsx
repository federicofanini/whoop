"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayRecord } from "@/core/analytics/types";
import { chart, hrZones, series } from "@/lib/theme";
import { formatDuration } from "@/lib/utils";
import { Legend, TooltipShell, axisProps, chartMargin, gridProps, weekdayDate } from "./chart-chrome";

/**
 * Daily strain. One series, so one colour for every bar and no legend box — the
 * panel title names it. Days with a logged session are drawn solid; days without
 * are the same hue, faded, because the distinction is presence not identity.
 */
export function StrainBars({ days, height = 220 }: { days: DayRecord[]; height?: number }) {
  const data = days
    .filter((d) => typeof d.strain === "number")
    .map((d) => ({
      date: d.date,
      strain: d.strain as number,
      workouts: d.workouts.length,
      sports: d.workouts.map((w) => w.sportName.replace(/_/g, " ")).join(", "),
      kilojoule: d.kilojoule,
    }));

  return (
    <div>
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
            <YAxis {...axisProps} width={30} domain={[0, 21]} ticks={[0, 7, 14, 21]} />

            <Bar dataKey="strain" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((point) => (
                <Cell
                  key={point.date}
                  fill={series.strain}
                  fillOpacity={point.workouts > 0 ? 0.95 : 0.4}
                />
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
                      { label: "Day strain", value: point.strain.toFixed(1), color: series.strain },
                      {
                        label: "Energy",
                        value: point.kilojoule ? `${Math.round(point.kilojoule / 4.184)} kcal` : "—",
                      },
                    ]}
                    footer={point.workouts > 0 ? point.sports : "No logged session"}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[{ label: "Day with a logged session", color: series.strain, shape: "square" }]}
        note="Faded bars are days with no session"
      />
    </div>
  );
}

/**
 * Time in each heart-rate zone.
 *
 * Zones are ordered, so they take the ordinal ramp — intensity reads as darkness.
 * Horizontal because the labels are words, and words belong on a horizontal axis.
 */
export function ZoneDistribution({
  zoneSeconds,
  maxHr,
  height = 200,
}: {
  zoneSeconds: number[];
  maxHr: number;
  height?: number;
}) {
  const data = hrZones
    .map((zone, index) => ({
      label: zone.label,
      seconds: zoneSeconds[index] ?? 0,
      color: zone.color,
      range: `${Math.round(zone.min * maxHr)}-${Math.round(zone.max * maxHr)} bpm`,
    }))
    .reverse();

  const total = zoneSeconds.reduce((a, b) => a + b, 0);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid {...gridProps} vertical horizontal={false} />
          <XAxis
            type="number"
            {...axisProps}
            domain={[0, (max: number) => Math.max(60, Math.ceil(max / 60) * 60)]}
            tickFormatter={(v: number) => `${Math.round(v / 60)}m`}
          />
          <YAxis type="category" dataKey="label" {...axisProps} width={56} />

          <Bar dataKey="seconds" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={18}>
            {data.map((point) => (
              <Cell key={point.label} fill={point.color} />
            ))}
          </Bar>

          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as (typeof data)[number];
              return (
                <TooltipShell
                  title={point.label}
                  rows={[
                    { label: "Time", value: formatDuration(point.seconds * 1000), color: point.color },
                    {
                      label: "Share",
                      value: total > 0 ? `${((point.seconds / total) * 100).toFixed(0)}%` : "0%",
                    },
                  ]}
                  footer={point.range}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { chart };
