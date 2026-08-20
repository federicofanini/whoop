import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { isWhoopConfigured } from "@/lib/whoop/oauth";
import { loadDashboardData } from "@/lib/data/load";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { SyncControls } from "./sync-controls";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { user, days } = await loadDashboardData();

  const whoopReady = isWhoopConfigured();
  const dbReady = isDbConfigured();
  const linked = !user.demo;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Connections"
        description="Two independent pipelines feed this dashboard: the WHOOP REST API for everything historical, and a Bluetooth broadcast for live heart rate. Either can work without the other."
      />

      {params.connected ? (
        <Notice tone="good">
          WHOOP account linked. Run a backfill below to pull your history — it walks 25 records a
          page, so a few years takes a few minutes.
        </Notice>
      ) : null}
      {params.error ? <Notice tone="bad">Connection failed: {params.error}</Notice> : null}

      <Panel>
        <PanelHeader
          title="WHOOP account"
          subtitle="OAuth 2.0 with the offline scope, so the link survives past the first hour."
        />

        <div className="space-y-3">
          <Requirement met={dbReady} label="DATABASE_URL configured">
            Postgres holds your synced history. Without it the dashboard runs on demo data.
          </Requirement>
          <Requirement met={whoopReady} label="WHOOP OAuth credentials configured">
            Create an app at developer-dashboard.whoop.com and set the client id, secret and
            redirect URI.
          </Requirement>
          <Requirement met={linked} label="Account linked">
            {linked
              ? `${days.length} cycles held locally.`
              : "Not linked yet — the dashboard is showing generated data."}
          </Requirement>
        </div>

        {whoopReady && dbReady ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/api/auth/whoop"
              className="rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-plane transition-colors hover:bg-ink-2"
            >
              {linked ? "Reconnect WHOOP" : "Connect WHOOP"}
            </a>
            <SyncControls />
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-hairline bg-surface-2 p-4 text-[13px] leading-relaxed text-ink-2">
            Copy <code className="text-ink">.env.example</code> to{" "}
            <code className="text-ink">.env.local</code> and fill in the values, then restart the
            dev server. Everything except live heart rate needs those two blocks.
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Live heart rate"
          subtitle="Independent of the API — this path is pure Bluetooth."
        />
        <p className="text-[13px] leading-relaxed text-ink-2">
          WHOOP exposes the standard Bluetooth Heart Rate Service when you enable Heart Rate
          Broadcast in the app. Chrome and Edge on macOS can read it directly from this page.
          Safari cannot — not on macOS and not on iOS — so your iPhone subscribes to the Mac&apos;s
          stream instead of connecting itself.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
          Without Supabase Realtime credentials the stream stays inside one browser. With them, it
          reaches any device you have the dashboard open on.
        </p>
        <Link
          href="/live"
          className="mt-4 inline-block rounded-xl border border-hairline bg-surface-2 px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-hairline"
        >
          Open the live view →
        </Link>
      </Panel>

      <Panel>
        <PanelHeader title="Keeping data fresh" subtitle="Three mechanisms, deliberately overlapping." />
        <dl className="space-y-4 text-[13px] leading-relaxed">
          <div>
            <dt className="font-semibold text-ink">Webhooks</dt>
            <dd className="mt-1 text-ink-2">
              WHOOP posts to <code className="text-muted">/api/whoop/webhook</code> when a record is
              scored, rescored or deleted. Signature-verified, and the fastest path.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Nightly reconcile</dt>
            <dd className="mt-1 text-ink-2">
              A cron job re-pulls the last week every morning, so a webhook missed during a deploy
              costs a day of freshness rather than leaving a permanent hole.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Manual sync</dt>
            <dd className="mt-1 text-ink-2">
              Backfill walks your whole history; incremental picks up from the newest record held.
              Both respect the 100 requests/minute limit.
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}

function Requirement({
  met,
  label,
  children,
}: {
  met: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Icon and text carry the state; the colour only reinforces it. */}
      <span
        aria-hidden
        className={`mt-0.5 text-[13px] ${met ? "text-good" : "text-muted"}`}
      >
        {met ? "✓" : "○"}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">
          <span className="sr-only">{met ? "Done: " : "Not done: "}</span>
          {label}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{children}</p>
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border p-4 text-[13px] leading-relaxed ${
        tone === "good" ? "border-good/30 bg-good/10 text-ink" : "border-critical/30 bg-critical/10 text-ink"
      }`}
    >
      {children}
    </div>
  );
}
