"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TooltipShell, axisProps, chartMargin, gridProps } from "@/components/charts/chart-chrome";
import { useChartTokens } from "@/lib/use-theme-tokens";
import { hrZones, series, zoneForHr } from "@/lib/theme";

/**
 * The heart-rate trace, split out so the rest of the live view does not wait
 * for recharts.
 *
 * This page is the one place where the interactive control — the Bluetooth
 * connect button — is the whole point, and it used to sit behind a 130 kB
 * plotting library that had nothing to draw until the strap was already
 * broadcasting. Now the button, the current bpm and the zone readout are live
 * immediately and the chart chunk arrives in the background.
 */
export function LiveTrace({
  data,
  maxHr,
  restingHr,
}: {
  data: { at: number; bpm: number }[];
  maxHr: number;
  restingHr: number | null;
}) {
  const tokens = useChartTokens();

  return (
    <div style={{ height: 340 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={chartMargin}>
          <defs>
            <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series.strain} stopOpacity={0.35} />
              <stop offset="100%" stopColor={series.strain} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid {...gridProps(tokens)} />
          <XAxis
            dataKey="at"
            {...axisProps(tokens)}
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) =>
              new Date(value).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })
            }
            minTickGap={40}
          />
          <YAxis
            {...axisProps(tokens)}
            width={34}
            domain={[
              (min: number) => Math.max(40, Math.floor((min - 8) / 10) * 10),
              (max: number) => Math.ceil((max + 8) / 10) * 10,
            ]}
          />

          {/* Zone edges give the trace a reference without a second axis. */}
          {hrZones.map((zone) => (
            <ReferenceLine
              key={zone.zone}
              y={Math.round(zone.min * maxHr)}
              stroke={tokens.hairline}
              strokeWidth={1}
            />
          ))}
          {restingHr ? (
            <ReferenceLine
              y={restingHr}
              stroke={tokens.hairline}
              strokeWidth={1}
              label={{
                value: "Resting",
                position: "insideTopLeft",
                fill: tokens.muted,
                fontSize: 10,
              }}
            />
          ) : null}

          <Area
            dataKey="bpm"
            stroke={series.strain}
            strokeWidth={2}
            fill="url(#hrFill)"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: tokens.surface }}
          />

          <Tooltip
            cursor={{ stroke: tokens.hairline, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as { at: number; bpm: number };
              const zone = zoneForHr(point.bpm, maxHr);
              return (
                <TooltipShell
                  title={new Date(point.at).toLocaleTimeString()}
                  rows={[
                    {
                      label: "Heart rate",
                      value: `${point.bpm} bpm`,
                      color: zone?.color ?? series.strain,
                    },
                    { label: "% of max", value: `${Math.round((point.bpm / maxHr) * 100)}%` },
                  ]}
                  footer={zone ? zone.label : "Below zone 1"}
                />
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
