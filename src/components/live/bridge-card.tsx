"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeartRateBridge, isWebBluetoothSupported, type ConnectionState } from "@/lib/live/bluetooth";
import { createPublisher, transportName, type Publisher } from "@/lib/live/transport";
import type { HeartRateReading } from "@/lib/live/protocol";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";

/**
 * The publishing half of the live pipeline.
 *
 * This card owns the Bluetooth connection and pushes every reading onto the
 * transport. Whatever is watching /live — this tab, another tab, an iPhone across
 * the room — receives the same messages. Keeping publish and subscribe strictly
 * separate is what lets a phone that cannot do Bluetooth still show live HR.
 */

const STATE_COPY: Record<ConnectionState, { label: string; tone: string }> = {
  idle: { label: "Not connected", tone: "text-muted" },
  requesting: { label: "Choose your strap…", tone: "text-ink-2" },
  connecting: { label: "Connecting…", tone: "text-ink-2" },
  connected: { label: "Broadcasting", tone: "text-good" },
  reconnecting: { label: "Link dropped — retrying", tone: "text-warning" },
  error: { label: "Connection failed", tone: "text-critical" },
};

export function BridgeCard() {
  const t = useT();
  const [state, setState] = useState<ConnectionState>("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [beats, setBeats] = useState(0);
  const [supported, setSupported] = useState<boolean | null>(null);

  const bridge = useRef<HeartRateBridge | null>(null);
  const publisher = useRef<Publisher | null>(null);
  const sessionId = useRef<string>("");

  // Feature detection has to wait for the client — the server has no navigator.
  useEffect(() => {
    setSupported(isWebBluetoothSupported());
  }, []);

  const handleReading = useCallback((reading: HeartRateReading) => {
    setBeats((count) => count + 1);
    publisher.current?.publish({
      sessionId: sessionId.current,
      bpm: reading.bpm,
      rrIntervals: reading.rrIntervals,
      energyExpended: reading.energyExpended,
      at: reading.at,
      deviceName: bridge.current?.deviceName ?? null,
    });
  }, []);

  const connect = useCallback(async () => {
    sessionId.current = crypto.randomUUID();
    publisher.current ??= createPublisher();

    bridge.current ??= new HeartRateBridge({
      onReading: handleReading,
      onStateChange: (next, message) => {
        setState(next);
        setDetail(message ?? null);
      },
      onBattery: setBattery,
    });

    await bridge.current.connect();
  }, [handleReading]);

  const disconnect = useCallback(async () => {
    await bridge.current?.disconnect();
    setBeats(0);
    setBattery(null);
  }, []);

  useEffect(() => {
    return () => {
      void bridge.current?.disconnect();
      publisher.current?.close();
    };
  }, []);

  const connected = state === "connected" || state === "reconnecting";
  const copy = STATE_COPY[state];

  return (
    <Panel>
      <PanelHeader
        title={t("live.broadcast")}
        subtitle={t("live.broadcastSub")}
      />

      {supported === false ? (
        <UnsupportedNotice />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={connected ? disconnect : connect}
              disabled={state === "requesting" || state === "connecting"}
              className={cn(
                " px-4 py-2.5 text-[14px] font-semibold transition-colors disabled:opacity-50",
                connected
                  ? "border border-hairline bg-surface-2 text-ink hover:bg-hairline"
                  : "bg-ink text-plane hover:bg-ink-2",
              )}
            >
              {connected ? "Disconnect" : "Connect strap"}
            </button>

            <span className="flex items-center gap-2 text-[13px]">
              <span
                aria-hidden
                className={cn(
                  "h-2 w-2",
                  state === "connected"
                    ? "animate-pulse bg-good"
                    : state === "reconnecting"
                      ? "bg-warning"
                      : state === "error"
                        ? "bg-critical"
                        : "bg-muted",
                )}
              />
              <span className={copy.tone}>{copy.label}</span>
            </span>
          </div>

          {detail ? <p className="mt-3 text-[12px] leading-relaxed text-muted">{detail}</p> : null}

          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4 text-[12px]">
            <div>
              <dt className="text-muted">Device</dt>
              <dd className="mt-1 truncate font-medium text-ink-2">
                {bridge.current?.deviceName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t("livePage.beatsRelayed")}</dt>
              <dd className="mt-1 font-medium numeral text-ink-2">{beats}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("livePage.transport")}</dt>
              <dd className="mt-1 font-medium text-ink-2">
                {transportName() === "supabase" ? "Realtime" : "This browser"}
              </dd>
            </div>
          </dl>

          {transportName() === "local" ? (
            <p className="mt-4  border border-hairline bg-surface-2 p-3 text-[12px] leading-relaxed text-muted">
              No Realtime credentials set, so readings stay inside this browser — other tabs
              on this Mac will see them, your iPhone will not. Add the Supabase keys from{" "}
              <code className="text-ink-2">.env.example</code> to stream across devices.
            </p>
          ) : null}

          {battery !== null ? (
            <p className="mt-3 text-[12px] text-muted">Strap battery {battery}%</p>
          ) : null}
        </>
      )}
    </Panel>
  );
}

/**
 * Safari has no Web Bluetooth on any platform, and Apple has said it does not
 * intend to ship it — so this is a permanent property of the browser, not a bug
 * to wait out. Say so plainly and point at the two things that do work.
 */
function UnsupportedNotice() {
  const t = useT();
  return (
    <div className="border border-hairline bg-surface-2 p-4">
      <p className="text-[13px] font-medium text-ink">{t("livePage.noBluetooth")}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
        Web Bluetooth is available in Chrome and Edge on macOS. Safari does not implement it on
        any platform, and iOS has no Web Bluetooth at all.
      </p>
      <ul className="mt-3 space-y-1.5 text-[13px] text-ink-2">
        <li>
          <span className="text-muted">{t("livePage.onMac")}</span> open this page in Chrome and connect
          there.
        </li>
        <li>
          <span className="text-muted">{t("livePage.onIphone")}</span> leave the Mac bridge running; this
          page will show its stream live.
        </li>
      </ul>
    </div>
  );
}
