"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BaselinePoint } from "@/core/analytics/baselines";
import { chart } from "@/lib/theme";
import { Legend, TooltipShell, axisProps, chartMargin, gridProps, weekdayDate } from "./chart-chrome";

/**
 * A metric against its own rolling baseline, with a ±1 SD band.
 *
 * The band is the point of the chart: it turns "48ms" — a number nobody can judge
 * — into "outside your normal range", which anyone can.
 */
export function BaselineChart({
  points,
  color,
  unit,
  label,
  height = 260,
}: {
  points: BaselinePoint[];
  color: string;
  unit: string;
  label: string;
  height?: number;
}) {
  const data = points.map((point) => ({
    ...point,
    band:
      point.upper !== null && point.lower !== null
        ? ([point.lower, point.upper] as [number, number])
        : null,
  }));

  const values = points.flatMap((p) => [p.value, p.upper, p.lower]).filter((v): v is number => v !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.18 || 2;

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={chartMargin}>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="date"
              {...axisProps}
              tickFormatter={(value: string) => weekdayDate(value).replace(/^\w+, /, "")}
              minTickGap={28}
            />
            <YAxis
              {...axisProps}
              width={38}
              domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
              tickFormatter={(v: number) => String(Math.round(v))}
            />

            {/* The ±1 SD band, drawn as a range rather than a stack. */}
            <Area
              dataKey="band"
              stroke="none"
              fill={color}
              fillOpacity={0.14}
              isAnimationActive={false}
              connectNulls
            />

            <Line
              dataKey="baseline"
              stroke={chart.muted}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: chart.surface }}
              isAnimationActive={false}
              connectNulls
            />

            <Tooltip
              cursor={{ stroke: chart.baseline, strokeWidth: 1 }}
              content={({ active, payload, label: date }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as BaselinePoint;
                const deviation =
                  point.value !== null && point.baseline !== null
                    ? point.value - point.baseline
                    : null;

                return (
                  <TooltipShell
                    title={weekdayDate(String(date))}
                    rows={[
                      {
                        label,
                        value: point.value !== null ? `${point.value.toFixed(0)}${unit}` : "—",
                        color,
                      },
                      {
                        label: "30-day baseline",
                        value: point.baseline !== null ? `${point.baseline.toFixed(0)}${unit}` : "—",
                        color: chart.muted,
                      },
                    ]}
                    footer={
                      deviation !== null
                        ? `${deviation > 0 ? "+" : ""}${deviation.toFixed(0)}${unit} vs baseline`
                        : "Baseline needs 5 days of history"
                    }
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[
          { label, color, shape: "line" },
          { label: "30-day baseline", color: chart.muted, shape: "line" },
          { label: "±1 SD normal range", color: `${color}40`, shape: "square" },
        ]}
      />
    </div>
  );
}
