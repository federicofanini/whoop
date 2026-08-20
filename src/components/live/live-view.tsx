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
import { hrZones, series, zoneForHr } from "@/lib/theme";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatTile } from "@/components/ui/stat";
import { ZoneDistribution } from "@/components/charts/strain-charts";
import { TooltipShell, axisProps, chartMargin, gridProps } from "@/components/charts/chart-chrome";
import { useChartTokens } from "@/lib/use-theme-tokens";
import { useT } from "@/components/i18n-provider";
import { BridgeCard } from "./bridge-card";

/**
 * The live session view — the subscribing half of the pipeline.
 *
 * Nothing here touches Bluetooth. It reads whatever arrives on the transport,
 * which is why it works identically on an iPhone that has no Web Bluetooth at all.
 */
export function LiveView({ maxHr, restingHr }: { maxHr: number; restingHr: number | null }) {
  const t = useT();
  const tokens = useChartTokens();
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
            title={t("live.heartRate")}
            subtitle={
              live.deviceName
                ? t("livePage.streamingFrom", { device: live.deviceName })
                : "Waiting for a broadcast from the bridge"
            }
            action={
              live.samples.length > 0 ? (
                <button
                  type="button"
                  onClick={live.reset}
                  className="border border-hairline px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink-2"
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
                    className="text-[72px] font-semibold leading-[0.85] tracking-tight numeral"
                    style={{ color: currentZone?.color ?? tokens.muted }}
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
                <span className="inline-flex items-center gap-2 border border-hairline px-2.5 py-1 font-medium text-ink-2">
                  <span
                    aria-hidden
                    className="h-2 w-2"
                    style={{ backgroundColor: currentZone?.color ?? tokens.muted }}
                  />
                  {currentZone ? `${currentZone.label} · ${Math.round(currentZone.min * 100)}-${Math.round(currentZone.max * 100)}% max` : "Below zone 1"}
                </span>
                {live.stale ? (
                  <span className="border border-hairline px-2.5 py-1 font-medium text-warning">
                    Stream paused — no reading for 8s
                  </span>
                ) : null}
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-right">
              <Metric label={t("live.avg")} value={live.avgBpm} />
              <Metric label={t("live.peak")} value={live.maxBpm} />
              <Metric label={t("live.low")} value={live.minBpm} />
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
              title={t("live.session")}
              subtitle={t("live.sessionSub")}
            />
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label={t("live.elapsed")}
                value={t.duration(live.elapsedSeconds * 1000)}
                caption={`${live.samples.length} readings`}
              />
              <StatTile
                label={t("live.estStrain")}
                value={live.estimatedStrain.toFixed(1)}
                accent={series.strain}
                caption="Approximation — WHOOP's own score lands after the session."
              />
              <StatTile
                label={t("live.liveHrv")}
                value={live.liveHrv ? live.liveHrv.toFixed(0) : "—"}
                unit="ms"
                accent={series.recovery}
                caption="RMSSD over 2 minutes of RR intervals."
              />
              <StatTile
                label={t("live.sdnn")}
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
          title={t("live.timeInZone")}
          subtitle={t("live.zonesSub", { maxHr })}
        />
        <ZoneDistribution zoneSeconds={live.zoneSeconds} maxHr={maxHr} />
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd
        className={
          value === null
            ? "mt-1 text-[18px] font-semibold text-hairline"
            : "mt-1 text-[18px] font-semibold numeral text-ink-2"
        }
      >
        {value ?? "···"}
      </dd>
    </div>
  );
}

function WaitingState() {
  const t = useT();
  return (
    <div className="flex h-[340px] flex-col items-center justify-center  border border-dashed border-hairline text-center">
      <p className="text-[14px] font-medium text-ink-2">{t("livePage.noBroadcast")}</p>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
        Open the WHOOP app, turn on Heart Rate Broadcast, then connect the bridge. The trace
        starts the moment the first beat lands.
      </p>
    </div>
  );
}
