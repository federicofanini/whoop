"use client";

import { useState } from "react";

/**
 * Manual sync triggers.
 *
 * A backfill can run for minutes behind the rate limiter, so the button reports
 * what came back rather than pretending it was instant.
 */
export function SyncControls() {
  const [busy, setBusy] = useState<"backfill" | "incremental" | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function run(mode: "backfill" | "incremental") {
    setBusy(mode);
    setResult(null);

    try {
      const response = await fetch(`/api/whoop/sync?mode=${mode}`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setResult(payload.error ?? "Sync failed");
        return;
      }

      setResult(
        `Synced ${payload.cycles} cycles, ${payload.recoveries} recoveries, ${payload.sleeps} sleeps, ${payload.workouts} workouts.`,
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => run("incremental")}
        disabled={busy !== null}
        className="border border-hairline bg-surface-2 px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-hairline disabled:opacity-50"
      >
        {busy === "incremental" ? "Syncing…" : "Sync now"}
      </button>
      <button
        type="button"
        onClick={() => run("backfill")}
        disabled={busy !== null}
        className="border border-hairline bg-surface-2 px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-hairline disabled:opacity-50"
      >
        {busy === "backfill" ? "Backfilling…" : "Backfill history"}
      </button>
      {result ? <p className="w-full text-[12px] text-muted">{result}</p> : null}
    </>
  );
}
