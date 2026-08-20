"use client";

import { useMemo } from "react";
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
import { useLiveHeartRate } from "@/lib/live/use-live-hr";
import { chart, hrZones, series, zoneForHr } from "@/lib/theme";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { ZoneDistribution } from "@/components/charts/strain-charts";
import { TooltipShell, axisProps, chartMargin, gridProps } from "@/components/charts/chart-chrome";
import { formatDuration } from "@/lib/utils";
import { BridgeCard } from "./bridge-card";

/**
 * The live session view — the subscribing half of the pipeline.
 *
 * Nothing here touches Bluetooth. It reads whatever arrives on the transport,
 * which is why it works identically on an iPhone that has no Web Bluetooth at all.
 */
export function LiveView({ maxHr, restingHr }: { maxHr: number; restingHr: number | null }) {
  const live = useLiveHeartRate(maxHr);

  const chartData = useMemo(
    () =>
      live.samples.map((sample) => ({
        at: sample.at,
        bpm: sample.bpm,
      })),
    [live.samples],
  );

  const currentZone = live.bpm ? zoneForHr(live.bpm, maxHr) : null;
  const waiting = live.bpm === null;

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel className="flex flex-col">
          <PanelHeader
            title="Live heart rate"
            subtitle={
              live.deviceName
                ? `Streaming from ${live.deviceName}`
                : "Waiting for a broadcast from the bridge"
            }
            action={
              live.samples.length > 0 ? (
                <button
                  type="button"
                  onClick={live.reset}
                  className="rounded-lg border border-hairline px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink-2"
                >
                  Reset session
                </button>
              ) : null
            }
          />

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-baseline gap-2">
                {live.bpm !== null ? (
                  <span
                    className="text-[72px] font-semibold leading-[0.85] tracking-tight tabular"
                    style={{ color: currentZone?.color ?? chart.muted }}
                  >
                    {live.bpm}
                  </span>
                ) : (
                  <span className="text-[44px] font-semibold leading-[0.85] tracking-tight text-hairline">
                    ···
                  </span>
                )}
                <span className="text-lg font-medium text-ink-2">bpm</span>
              </p>

              {/* Zone is a colour on the figure above, so it is also written out here. */}
              <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-3 py-1 font-medium text-ink-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: currentZone?.color ?? chart.muted }}
                  />
                  {currentZone ? `${currentZone.label} · ${Math.round(currentZone.min * 100)}-${Math.round(currentZone.max * 100)}% max` : "Below zone 1"}
                </span>
                {live.stale ? (
                  <span className="rounded-full border border-hairline bg-surface-2 px-3 py-1 font-medium text-warning">
                    Stream paused — no reading for 8s
                  </span>
                ) : null}
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-right">
              <Metric label="Avg" value={live.avgBpm} />
              <Metric label="Peak" value={live.maxBpm} />
              <Metric label="Low" value={live.minBpm} />
            </dl>
          </div>

          <div className="mt-6 flex-1">
            {waiting ? (
              <WaitingState />
            ) : (
              <div style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={chartMargin}>
                    <defs>
                      <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={series.strain} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={series.strain} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid {...gridProps} />
                    <XAxis
                      dataKey="at"
                      {...axisProps}
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(value: number) =>
                        new Date(value).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })
                      }
                      minTickGap={40}
                    />
                    <YAxis
                      {...axisProps}
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
                        stroke={chart.hairline}
                        strokeWidth={1}
                      />
                    ))}
                    {restingHr ? (
                      <ReferenceLine
                        y={restingHr}
                        stroke={chart.baseline}
                        strokeWidth={1}
                        label={{
                          value: "Resting",
                          position: "insideTopLeft",
                          fill: chart.muted,
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
                      activeDot={{ r: 4, strokeWidth: 2, stroke: chart.surface }}
                    />

                    <Tooltip
                      cursor={{ stroke: chart.baseline, strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0].payload as { at: number; bpm: number };
                        const zone = zoneForHr(point.bpm, maxHr);
                        return (
                          <TooltipShell
                            title={new Date(point.at).toLocaleTimeString()}
                            rows={[
                              { label: "Heart rate", value: `${point.bpm} bpm`, color: zone?.color ?? series.strain },
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
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <BridgeCard />

          <Panel>
            <PanelHeader
              title="Session"
              subtitle="Accumulated since the first reading arrived."
            />
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Elapsed"
                value={formatDuration(live.elapsedSeconds * 1000)}
                caption={`${live.samples.length} readings`}
              />
              <StatTile
                label="Est. strain"
                value={live.estimatedStrain.toFixed(1)}
                accent={series.strain}
                caption="Approximation — WHOOP's own score lands after the session."
              />
              <StatTile
                label="Live HRV"
                value={live.liveHrv ? live.liveHrv.toFixed(0) : "—"}
                unit="ms"
                accent={series.recovery}
                caption="RMSSD over 2 minutes of RR intervals."
              />
              <StatTile
                label="SDNN"
                value={live.liveSdnn ? live.liveSdnn.toFixed(0) : "—"}
                unit="ms"
                caption="Slower-moving companion to RMSSD."
              />
            </div>
            {live.liveHrv === null && live.samples.length > 0 ? (
              <p className="mt-4 text-[12px] leading-relaxed text-muted">
                No RR intervals in this broadcast. HRV needs beat-to-beat timing, which not every
                strap firmware reports — heart rate itself is unaffected.
              </p>
            ) : null}
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHeader
          title="Time in zone"
          subtitle={`Zones are shares of your ${maxHr} bpm maximum. Higher zones cost disproportionately more strain.`}
        />
        <ZoneDistribution zoneSeconds={live.zoneSeconds} maxHr={maxHr} />
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd
        className={
          value === null
            ? "mt-1 text-[18px] font-semibold text-hairline"
            : "mt-1 text-[18px] font-semibold tabular text-ink-2"
        }
      >
        {value ?? "···"}
      </dd>
    </div>
  );
}

function WaitingState() {
  return (
    <div className="flex h-[340px] flex-col items-center justify-center rounded-xl border border-dashed border-hairline text-center">
      <p className="text-[14px] font-medium text-ink-2">No broadcast yet</p>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
        Open the WHOOP app, turn on Heart Rate Broadcast, then connect the bridge. The trace
        starts the moment the first beat lands.
      </p>
    </div>
  );
}
