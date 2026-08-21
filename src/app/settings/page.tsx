import { Suspense } from "react";
import Link from "next/link";
import { getTranslator } from "@/server/locale";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { ConnectionPanel, CredentialsPanel, IdentityPanel, PanelSkeleton } from "./_sections";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; handle?: string }>;
}) {
  const [params, t] = await Promise.all([searchParams, getTranslator()]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.lead")}
      />

      {params.connected ? <Notice tone="good">{t("settings.connected")}</Notice> : null}
      {params.error ? (
        <Notice tone="bad">{t("settings.connectFailed", { message: params.error })}</Notice>
      ) : null}

      <Suspense fallback={<PanelSkeleton />}>
        <ConnectionPanel />
      </Suspense>

      <Suspense fallback={<PanelSkeleton lines={1} />}>
        <IdentityPanel />
      </Suspense>

      <Suspense fallback={<PanelSkeleton lines={2} />}>
        <CredentialsPanel />
      </Suspense>

      {/* Static copy: no query, no boundary. */}
      <Panel>
        <PanelHeader title={t("live.title")} subtitle={t("live.sub")} />
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
          className="mt-4 inline-block border border-hairline bg-surface-2 px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-hairline"
        >
          Open the live view →
        </Link>
      </Panel>

      <Panel>
        <PanelHeader title={t("settings.freshness")} subtitle={t("settings.freshnessSub")} />
        <dl className="space-y-4 text-[13px] leading-relaxed">
          <div>
            <dt className="font-semibold text-ink">{t("settings.webhooks")}</dt>
            <dd className="mt-1 text-ink-2">{t("settings.webhooksBody")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">{t("settings.reconcile")}</dt>
            <dd className="mt-1 text-ink-2">{t("settings.reconcileBody")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">{t("settings.manual")}</dt>
            <dd className="mt-1 text-ink-2">{t("settings.manualBody")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">{t("settings.cli")}</dt>
            <dd className="mt-1 text-ink-2">{t("settings.cliBody")}</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}

function Notice({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  return (
    <div
      className={`border p-4 text-[13px] leading-relaxed ${
        tone === "good"
          ? "border-good/30 bg-good/10 text-ink"
          : "border-critical/30 bg-critical/10 text-ink"
      }`}
    >
      {children}
    </div>
  );
}
