"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { SleepNight } from "@/core/analytics/sleep";
import { recoveryColor, stageColor } from "@/lib/theme";
import { Legend, TooltipShell, axisProps, chartMargin, gridProps, weekdayDate } from "./chart-chrome";
import { useChartTokens } from "@/lib/use-theme-tokens";
import { useT } from "@/components/i18n-provider";

const HOUR = 3_600_000;

/**
 * Sleep architecture as a stacked bar per night, against the night's need.
 *
 * The stages are ordered by depth, so they take an ordinal ramp — one hue, light
 * to dark — rather than four unrelated categorical hues. Depth reads as darkness,
 * which is one fewer thing for the reader to memorise.
 */
export function SleepStagesChart({ nights, height = 280 }: { nights: SleepNight[]; height?: number }) {
  const t = useT();
  const tokens = useChartTokens();
  const data = nights.map((night) => ({
    date: night.date,
    awake: night.stages.awake / HOUR,
    light: night.stages.light / HOUR,
    rem: night.stages.rem / HOUR,
    deep: night.stages.deep / HOUR,
    need: night.needMilli / HOUR,
    asleep: night.asleepMilli / HOUR,
    performance: night.performance,
  }));

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={chartMargin} barCategoryGap="20%">
            <CartesianGrid {...gridProps(tokens)} />
            <XAxis
              dataKey="date"
              {...axisProps(tokens)}
              tickFormatter={(v: string) => weekdayDate(v).replace(/^\w+, /, "")}
              minTickGap={24}
            />
            <YAxis
              {...axisProps(tokens)}
              width={34}
              tickFormatter={(v: number) => `${v}h`}
              domain={[0, (max: number) => Math.ceil(max + 1)]}
            />

            {/*
              Deep sits at the base — it is the stage that matters most and the one
              you want readable against the axis. A 2px surface-coloured stroke
              renders as a gap between segments rather than as a border on them.
            */}
            <Bar dataKey="deep" stackId="sleep" fill={stageColor.deep} stroke={tokens.surface} strokeWidth={2} isAnimationActive={false} />
            <Bar dataKey="rem" stackId="sleep" fill={stageColor.rem} stroke={tokens.surface} strokeWidth={2} isAnimationActive={false} />
            <Bar dataKey="light" stackId="sleep" fill={stageColor.light} stroke={tokens.surface} strokeWidth={2} isAnimationActive={false} />
            <Bar
              dataKey="awake"
              stackId="sleep"
              fill={stageColor.awake}
              stroke={tokens.surface}
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />

            <Line
              type="stepAfter"
              dataKey="need"
              stroke={tokens.ink2}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />

            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as (typeof data)[number];
                const shortfall = point.need - point.asleep;
                return (
                  <TooltipShell
                    title={weekdayDate(point.date)}
                    rows={[
                      { label: t("sleepPage.deep"), value: t.duration(point.deep * HOUR), color: stageColor.deep },
                      { label: t("sleepPage.rem"), value: t.duration(point.rem * HOUR), color: stageColor.rem },
                      { label: t("sleepPage.light"), value: t.duration(point.light * HOUR), color: stageColor.light },
                      { label: t("sleepPage.awake"), value: t.duration(point.awake * HOUR), color: stageColor.awake },
                      { label: t("sleepPage.needed"), value: t.duration(point.need * HOUR), color: tokens.ink2 },
                    ]}
                    footer={
                      shortfall > 0
                        ? t("sleepPage.shortOfNeed", { amount: t.duration(shortfall * HOUR), performance: point.performance ?? "—" })
                        : t("sleepPage.needMet", { performance: point.performance ?? "—" })
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
          { label: "Deep", color: stageColor.deep, shape: "square" },
          { label: "REM", color: stageColor.rem, shape: "square" },
          { label: "Light", color: stageColor.light, shape: "square" },
          { label: "Awake", color: stageColor.awake, shape: "square" },
          { label: "Sleep needed", color: tokens.ink2, shape: "line" },
        ]}
      />
    </div>
  );
}

/** Nightly shortfall against need. One measure, one axis, zero baseline. */
export function SleepDebtChart({ nights, height = 200 }: { nights: SleepNight[]; height?: number }) {
  const t = useT();
  const tokens = useChartTokens();
  const data = nights.map((night) => ({
    date: night.date,
    shortfallHours: night.shortfallMilli / HOUR,
    surplusHours: Math.max(0, night.asleepMilli - night.needMilli) / HOUR,
  }));

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={chartMargin} barCategoryGap="20%">
            <CartesianGrid {...gridProps(tokens)} />
            <XAxis
              dataKey="date"
              {...axisProps(tokens)}
              tickFormatter={(v: string) => weekdayDate(v).replace(/^\w+, /, "")}
              minTickGap={24}
            />
            <YAxis {...axisProps(tokens)} width={34} tickFormatter={(v: number) => `${v.toFixed(1)}h`} />
            <ReferenceLine y={0} stroke={tokens.hairline} strokeWidth={1} />

            <Bar dataKey="shortfallHours" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((point) => (
                <Cell
                  key={point.date}
                  fill={point.shortfallHours > 1 ? "#d03b3b" : point.shortfallHours > 0 ? "#fab219" : "#0ca30c"}
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
                      {
                        label: "Short of need",
                        value: point.shortfallHours > 0 ? t.duration(point.shortfallHours * HOUR) : t("sleepPage.none"),
                      },
                    ]}
                    footer={
                      point.shortfallHours > 1
                        ? "More than an hour short — this one carries into tomorrow"
                        : point.shortfallHours > 0
                          ? "Minor shortfall"
                          : "Need met in full"
                    }
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Bedtime regularity. Consistency is the most controllable input to sleep quality. */
export function BedtimeConsistencyChart({ nights, height = 220 }: { nights: SleepNight[]; height?: number }) {
  const tokens = useChartTokens();
  const data = nights.map((night) => ({
    date: night.date,
    // Minutes past noon, so an 11pm and a 1am bedtime plot two hours apart.
    bedtime: night.bedtimeMinutes,
    waketime: night.waketimeMinutes + 1440,
  }));

  const allMinutes = data.flatMap((point) => [point.bedtime, point.waketime]);
  const lo = Math.min(...allMinutes) - 40;
  const hi = Math.max(...allMinutes) + 40;
  // A tick every 90 minutes keeps 4-6 labels regardless of how wide the spread is.
  const firstTick = Math.ceil(lo / 90) * 90;
  const ticks: number[] = [];
  for (let t = firstTick; t <= hi; t += 90) ticks.push(t);

  const formatMinutes = (minutes: number) => {
    const normalised = ((minutes % 1440) + 1440) % 1440;
    const hour = Math.floor(normalised / 60);
    const minute = Math.round(normalised % 60);
    return `${((hour + 11) % 12) + 1}:${minute.toString().padStart(2, "0")}${hour < 12 ? "am" : "pm"}`;
  };

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={chartMargin}>
            <CartesianGrid {...gridProps(tokens)} />
            <XAxis
              dataKey="date"
              {...axisProps(tokens)}
              tickFormatter={(v: string) => weekdayDate(v).replace(/^\w+, /, "")}
              minTickGap={24}
            />
            <YAxis
              {...axisProps(tokens)}
              width={58}
              domain={[lo, hi]}
              ticks={ticks}
              tickFormatter={formatMinutes}
            />

            <Area
              dataKey="bedtime"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
            />
            <Line
              dataKey="bedtime"
              stroke={stageColor.deep}
              strokeWidth={2}
              dot={{ r: 2.5, fill: stageColor.deep, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              dataKey="waketime"
              stroke={stageColor.awake}
              strokeWidth={2}
              dot={{ r: 2.5, fill: stageColor.awake, strokeWidth: 0 }}
              isAnimationActive={false}
            />

            <Tooltip
              cursor={{ stroke: tokens.hairline, strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as (typeof data)[number];
                return (
                  <TooltipShell
                    title={weekdayDate(String(label))}
                    rows={[
                      { label: "Asleep", value: formatMinutes(point.bedtime), color: stageColor.deep },
                      { label: "Awake", value: formatMinutes(point.waketime), color: stageColor.awake },
                    ]}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[
          { label: "Fell asleep", color: stageColor.deep, shape: "line" },
          { label: "Woke up", color: stageColor.awake, shape: "line" },
        ]}
      />
    </div>
  );
}

/**
 * Does sleep performance actually predict your recovery?
 *
 * A scatter with a fitted line, because the answer is a relationship between two
 * measures — and it is genuinely person-specific.
 */
export function SleepRecoveryScatter({
  points,
  r,
  height = 280,
}: {
  points: { performance: number; recovery: number; date: string }[];
  r: number;
  height?: number;
}) {
  const tokens = useChartTokens();
  // Least-squares fit, drawn only when the correlation is strong enough to mean something.
  const n = points.length;
  const meanX = points.reduce((a, p) => a + p.performance, 0) / (n || 1);
  const meanY = points.reduce((a, p) => a + p.recovery, 0) / (n || 1);
  let num = 0;
  let den = 0;
  for (const point of points) {
    num += (point.performance - meanX) * (point.recovery - meanY);
    den += (point.performance - meanX) ** 2;
  }
  const gradient = den === 0 ? 0 : num / den;
  const intercept = meanY - gradient * meanX;

  const xs = points.map((p) => p.performance);
  const xMin = xs.length ? Math.max(0, Math.floor((Math.min(...xs) - 4) / 5) * 5) : 30;
  const xMax = xs.length ? Math.min(100, Math.ceil((Math.max(...xs) + 4) / 5) * 5) : 100;

  const fit = [xMin, xMax].map((performance) => ({
    performance,
    recovery: Math.max(0, Math.min(100, gradient * performance + intercept)),
  }));

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ ...chartMargin, bottom: 16, left: 8 }}>
            <CartesianGrid {...gridProps(tokens)} vertical />
            <XAxis
              type="number"
              dataKey="performance"
              domain={[xMin, xMax]}
              unit="%"
              {...axisProps(tokens)}
              label={{
                value: "Sleep performance",
                position: "insideBottom",
                offset: -10,
                fill: tokens.muted,
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="recovery"
              domain={[0, 100]}
              width={34}
              unit="%"
              {...axisProps(tokens)}
              label={{
                value: "Recovery",
                angle: -90,
                position: "insideLeft",
                fill: tokens.muted,
                fontSize: 11,
              }}
            />
            <ZAxis range={[60, 60]} />

            <Scatter data={points} isAnimationActive={false}>
              {points.map((point) => (
                <Cell
                  key={point.date}
                  fill={recoveryColor(point.recovery)}
                  fillOpacity={0.8}
                  stroke={tokens.surface}
                  strokeWidth={2}
                />
              ))}
            </Scatter>

            {Math.abs(r) > 0.25 ? (
              <Scatter data={fit} line={{ stroke: tokens.ink2, strokeWidth: 2 }} shape={() => <g />} isAnimationActive={false} />
            ) : null}

            <Tooltip
              cursor={{ stroke: tokens.hairline }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as (typeof points)[number];
                if (!point.date) return null;
                return (
                  <TooltipShell
                    title={weekdayDate(point.date)}
                    rows={[
                      { label: "Sleep performance", value: `${point.performance.toFixed(0)}%` },
                      {
                        label: "Recovery next day",
                        value: `${point.recovery}%`,
                        color: recoveryColor(point.recovery),
                      },
                    ]}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[{ label: "Trend", color: tokens.ink2, shape: "line" }]}
        note={`One dot per night · r = ${r.toFixed(2)}`}
      />
    </div>
  );
}
