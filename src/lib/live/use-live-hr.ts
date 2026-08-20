"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rmssd, sdnn, estimateStrain } from "@/lib/analytics/hrv";
import { hrZones, zoneForHr } from "@/lib/theme";
import { createSubscriber } from "./transport";
import type { LiveHrMessage } from "./protocol";

export interface LiveSample {
  at: number;
  bpm: number;
}

export interface LiveHrState {
  /** Null until the first reading lands. */
  bpm: number | null;
  samples: LiveSample[];
  /** Seconds accumulated in each of the five zones. */
  zoneSeconds: number[];
  liveHrv: number | null;
  liveSdnn: number | null;
  estimatedStrain: number;
  avgBpm: number | null;
  maxBpm: number | null;
  minBpm: number | null;
  elapsedSeconds: number;
  lastMessageAt: number | null;
  deviceName: string | null;
  /** True when readings have stopped arriving but the session has not been reset. */
  stale: boolean;
}

/** Two minutes of RR intervals is the shortest window that gives a stable RMSSD. */
const RR_WINDOW_MS = 120_000;
/** Cap the plotted history so a long session cannot grow the array without bound. */
const MAX_SAMPLES = 3600;
const STALE_AFTER_MS = 8000;

export function useLiveHeartRate(maxHr: number): LiveHrState & { reset: () => void } {
  const [samples, setSamples] = useState<LiveSample[]>([]);
  const [zoneSeconds, setZoneSeconds] = useState<number[]>(() => new Array(5).fill(0));
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // RR intervals are kept in a ref: they update at beat rate and would otherwise
  // re-render the whole tree once per beat for a number that only refreshes on tick.
  const rrBuffer = useRef<{ at: number; rr: number }[]>([]);
  const [hrv, setHrv] = useState<{ rmssd: number | null; sdnn: number | null }>({
    rmssd: null,
    sdnn: null,
  });
  const startedAt = useRef<number | null>(null);
  const lastSampleAt = useRef<number | null>(null);

  const handleMessage = useCallback(
    (message: LiveHrMessage) => {
      const at = message.at ?? Date.now();
      startedAt.current ??= at;
      setDeviceName(message.deviceName ?? null);
      setLastMessageAt(at);

      setSamples((previous) => {
        const next = [...previous, { at, bpm: message.bpm }];
        return next.length > MAX_SAMPLES ? next.slice(-MAX_SAMPLES) : next;
      });

      // Attribute the gap since the previous reading to the zone it was spent in,
      // rather than assuming a fixed 1 Hz that BLE does not actually guarantee.
      const previousAt = lastSampleAt.current;
      lastSampleAt.current = at;
      if (previousAt) {
        const deltaSeconds = Math.min(10, (at - previousAt) / 1000);
        const zone = zoneForHr(message.bpm, maxHr);
        if (zone) {
          setZoneSeconds((previous) => {
            const next = [...previous];
            next[zone.zone - 1] += deltaSeconds;
            return next;
          });
        }
      }

      if (message.rrIntervals?.length) {
        const cutoff = at - RR_WINDOW_MS;
        rrBuffer.current = [
          ...rrBuffer.current.filter((entry) => entry.at >= cutoff),
          ...message.rrIntervals.map((rr) => ({ at, rr })),
        ];
      }
    },
    [maxHr],
  );

  useEffect(() => {
    const subscriber = createSubscriber(handleMessage);
    return () => subscriber.close();
  }, [handleMessage]);

  // One timer drives both the elapsed clock and the HRV recompute.
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      const intervals = rrBuffer.current.map((entry) => entry.rr);
      setHrv({ rmssd: rmssd(intervals), sdnn: sdnn(intervals) });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const reset = useCallback(() => {
    setSamples([]);
    setZoneSeconds(new Array(5).fill(0));
    setLastMessageAt(null);
    rrBuffer.current = [];
    startedAt.current = null;
    lastSampleAt.current = null;
    setHrv({ rmssd: null, sdnn: null });
  }, []);

  return useMemo(() => {
    const bpms = samples.map((s) => s.bpm);
    const latest = samples.length ? samples[samples.length - 1].bpm : null;

    return {
      bpm: latest,
      samples,
      zoneSeconds,
      liveHrv: hrv.rmssd,
      liveSdnn: hrv.sdnn,
      estimatedStrain: estimateStrain(zoneSeconds, maxHr),
      avgBpm: bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null,
      maxBpm: bpms.length ? Math.max(...bpms) : null,
      minBpm: bpms.length ? Math.min(...bpms) : null,
      elapsedSeconds: startedAt.current ? Math.round((now - startedAt.current) / 1000) : 0,
      lastMessageAt,
      deviceName,
      stale: Boolean(lastMessageAt) && now - (lastMessageAt as number) > STALE_AFTER_MS,
      reset,
    };
  }, [samples, zoneSeconds, hrv, maxHr, now, lastMessageAt, deviceName, reset]);
}

export { hrZones };
