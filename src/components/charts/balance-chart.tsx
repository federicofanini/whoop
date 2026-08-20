"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { BalancePoint } from "@/core/analytics/load";
import { optimalStrain } from "@/core/analytics/load";
import { recoveryBand, recoveryColor, series, type BandLabels } from "@/lib/theme";
import { Legend, TooltipShell, axisProps, chartMargin, gridProps, weekdayDate } from "./chart-chrome";
import { useChartTokens } from "@/lib/use-theme-tokens";
import { useT } from "@/components/i18n-provider";

/**
 * Strain against recovery, as a scatter rather than two lines on two y-scales.
 *
 * Plotting strain (0-21) and recovery (0-100) as a dual-axis time series is the
 * classic version of this chart and it is misleading — the two scales are aligned
 * arbitrarily, so it invents a relationship. A scatter puts one measure on each
 * axis honestly, and the diagonal band shows what each recovery level supports.
 */
export function BalanceScatter({
  points,
  bandLabels,
  height = 320,
}: {
  points: BalancePoint[];
  bandLabels: BandLabels;
  height?: number;
}) {
  const t = useT();
  const tokens = useChartTokens();
  // The target band, sampled across the recovery range and drawn as a guide.
  const band = Array.from({ length: 51 }, (_, i) => {
    const recovery = i * 2;
    const { target, low, high } = optimalStrain(recovery);
    return { recovery, target, low, high };
  });

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ ...chartMargin, bottom: 16, left: 8 }}>
            <CartesianGrid {...gridProps(tokens)} vertical />

            <XAxis
              type="number"
              dataKey="recovery"
              name="Recovery"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              unit="%"
              {...axisProps(tokens)}
              label={{
                value: "Recovery",
                position: "insideBottom",
                offset: -10,
                fill: tokens.muted,
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="strain"
              name="Strain"
              domain={[0, 21]}
              ticks={[0, 7, 14, 21]}
              width={34}
              {...axisProps(tokens)}
              label={{
                value: "Strain",
                angle: -90,
                position: "insideLeft",
                fill: tokens.muted,
                fontSize: 11,
              }}
            />
            <ZAxis range={[70, 70]} />

            {/* Optimal band, drawn as a series of thin slabs under the marks. */}
            {band.slice(0, -1).map((step, i) => (
              <ReferenceArea
                key={step.recovery}
                x1={step.recovery}
                x2={band[i + 1].recovery}
                y1={step.low}
                y2={step.high}
                fill={series.recovery}
                fillOpacity={0.1}
                stroke="none"
                ifOverflow="extendDomain"
              />
            ))}

            <Scatter data={points} isAnimationActive={false}>
              {points.map((point) => (
                <Cell
                  key={point.date}
                  fill={recoveryColor(point.recovery)}
                  fillOpacity={0.85}
                  // A 2px surface ring separates overlapping marks without a contrasting border.
                  stroke={tokens.surface}
                  strokeWidth={2}
                />
              ))}
            </Scatter>

            <Tooltip
              cursor={{ strokeDasharray: "0", stroke: tokens.hairline }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as BalancePoint;
                return (
                  <TooltipShell
                    title={weekdayDate(point.date)}
                    rows={[
                      { label: t("chart.recovery"), value: `${point.recovery}%`, color: recoveryColor(point.recovery) },
                      { label: t("chart.strain"), value: point.strain.toFixed(1), color: series.strain },
                      { label: t("chart.supported"), value: point.target.toFixed(1) },
                    ]}
                    footer={
                      point.verdict === "over"
                        ? `${bandLabels[recoveryBand(point.recovery)]} — +${point.deviation.toFixed(1)}`
                        : point.verdict === "under"
                          ? `${bandLabels[recoveryBand(point.recovery)]} — ${point.deviation.toFixed(1)}`
                          : `${bandLabels[recoveryBand(point.recovery)]}`
                    }
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[
          { label: t("chart.primedBand"), color: "#0ca30c" },
          { label: t("chart.adequateBand"), color: "#fab219" },
          { label: t("chart.compromisedBand"), color: "#d03b3b" },
          { label: t("chart.supportedRange"), color: `${series.recovery}40`, shape: "square" },
        ]}
        note={t("chart.eachDot")}
      />
    </div>
  );
}

/**
 * The same relationship over time, as a single-axis deviation chart.
 *
 * One measure — strain minus what recovery supported — so it needs one axis. Warm
 * above the line, cool below, neutral at zero: a proper diverging encoding.
 */
export function DeviationBars({ points, height = 200 }: { points: BalancePoint[]; height?: number }) {
  const t = useT();
  const tokens = useChartTokens();
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={chartMargin} barCategoryGap="18%">
            <CartesianGrid {...gridProps(tokens)} />
            <XAxis
              dataKey="date"
              {...axisProps(tokens)}
              tickFormatter={(v: string) => weekdayDate(v).replace(/^\w+, /, "")}
              minTickGap={28}
            />
            <YAxis {...axisProps(tokens)} width={34} tickFormatter={(v: number) => (v > 0 ? `+${v}` : String(v))} />
            <ReferenceLine y={0} stroke={tokens.hairline} strokeWidth={1} />

            <Bar dataKey="deviation" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {points.map((point) => (
                <Cell
                  key={point.date}
                  fill={point.deviation > 0 ? series.restingHr : series.strain}
                  fillOpacity={point.verdict === "aligned" ? 0.35 : 0.95}
                />
              ))}
            </Bar>

            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as BalancePoint;
                return (
                  <TooltipShell
                    title={weekdayDate(point.date)}
                    rows={[
                      { label: t("chart.strain"), value: point.strain.toFixed(1) },
                      { label: t("chart.supported"), value: point.target.toFixed(1) },
                      {
                        label: t("chart.deviation"),
                        value: `${point.deviation > 0 ? "+" : ""}${point.deviation.toFixed(1)}`,
                      },
                    ]}
                    footer={
                      point.verdict === "aligned"
                        ? "Inside the supported range"
                        : point.verdict === "over"
                          ? "Trained beyond what recovery supported"
                          : "Left capacity on the table"
                    }
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[
          { label: t("chart.aboveSupported"), color: series.restingHr, shape: "square" },
          { label: t("chart.belowSupported"), color: series.strain, shape: "square" },
        ]}
        note={t("chart.fadedInRange")}
      />
    </div>
  );
}

/** Acute vs chronic load. Same unit, same axis — legitimately one plot. */
export function LoadChart({
  data,
  height = 220,
}: {
  data: { date: string; acute: number | null; chronic: number | null }[];
  height?: number;
}) {
  const t = useT();
  const tokens = useChartTokens();
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
              minTickGap={28}
            />
            <YAxis {...axisProps(tokens)} width={30} />

            <Line
              type="monotone"
              dataKey="acute"
              stroke={series.strain}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="chronic"
              stroke={series.restingHr}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />

            <Tooltip
              cursor={{ stroke: tokens.hairline, strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as (typeof data)[number];
                const ratio =
                  point.acute && point.chronic ? (point.acute / point.chronic).toFixed(2) : "—";
                return (
                  <TooltipShell
                    title={weekdayDate(String(label))}
                    rows={[
                      {
                        label: t("chart.acute"),
                        value: point.acute?.toFixed(1) ?? "—",
                        color: series.strain,
                      },
                      {
                        label: t("chart.chronic"),
                        value: point.chronic?.toFixed(1) ?? "—",
                        color: series.restingHr,
                      },
                    ]}
                    footer={`Ratio ${ratio} — productive between 0.80 and 1.30`}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <Legend
        items={[
          { label: t("chart.acuteLoad"), color: series.strain, shape: "line" },
          { label: t("chart.chronicLoad"), color: series.restingHr, shape: "line" },
        ]}
      />
    </div>
  );
}
