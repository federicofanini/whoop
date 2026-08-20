import Link from "next/link";
import { isDbConfigured } from "@/core/db";
import { isWhoopConfigured } from "@/core/whoop/oauth";
import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import { isSupabaseConfigured } from "@/server/supabase";
import { loadViewerDashboard } from "@/server/dashboard";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { SyncControls } from "./sync-controls";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; handle?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslator();
  const { days } = await loadViewerDashboard();
  const viewer = await getViewer();

  const whoopReady = isWhoopConfigured();
  const dbReady = isDbConfigured();
  const supabaseReady = isSupabaseConfigured();
  const linked = Boolean(viewer?.whoopUserId);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.lead")}
      />

      {params.connected ? (
        <Notice tone="good">
          {t("settings.connected")}
        </Notice>
      ) : null}
      {params.error ? (
        <Notice tone="bad">{t("settings.connectFailed", { message: params.error })}</Notice>
      ) : null}

      <Panel>
        <PanelHeader
          title={t("settings.whoopAccount")}
          subtitle={t("settings.whoopAccountSub")}
        />

        <div className="space-y-3">
          <Requirement met={dbReady} label={t("settings.reqDatabase")}>
            {t("settings.reqDatabaseBody")}
          </Requirement>
          <Requirement met={supabaseReady} label={t("settings.reqSupabase")}>
            {t("settings.reqSupabaseBody")}
          </Requirement>
          <Requirement met={whoopReady} label={t("settings.reqWhoop")}>
            {t("settings.reqWhoopBody")}
          </Requirement>
          <Requirement met={linked} label={t("settings.reqLinked")}>
            {linked ? t("settings.reqLinkedBody", { count: days.length }) : t("settings.reqNotLinked")}
          </Requirement>
        </div>

        {whoopReady && dbReady ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/api/auth/whoop"
              className="bg-ink px-4 py-2.5 text-[14px] font-semibold text-plane transition-colors hover:bg-ink-2"
            >
              {linked ? t("settings.reconnect") : t("settings.connect")}
            </a>
            <SyncControls />
          </div>
        ) : (
          <p className="mt-5  border border-hairline bg-surface-2 p-4 text-[13px] leading-relaxed text-ink-2">
            {t("settings.envHint")}
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title={t("settings.identity")}
          subtitle={t("settings.identitySub")}
        />
        {viewer ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-semibold text-ink">@{viewer.handle}</p>
              <p className="mt-1 text-[13px] text-muted">
                {viewer.email ? `${t("settings.signedInAs", { email: viewer.email })} · ` : ""}
                {t("settings.handOut")}{" "}
                <Link href="/friends" className="text-ink-2 underline underline-offset-4">
                  {t("settings.manageSharing")}
                </Link>
              </p>
            </div>
            {/* A POST, so a prefetch or a crawler can never sign you out. */}
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="border border-hairline px-4 py-2.5 text-[13px] font-medium text-muted transition-colors hover:text-ink-2"
              >
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-2">
            {t("settings.notSignedIn")}{" "}
            <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4">
              {t("nav.signIn")}
            </Link>
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title={t("live.title")}
          subtitle={t("live.sub")}
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
          className="mt-4 inline-block  border border-hairline bg-surface-2 px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-hairline"
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
      className={` border p-4 text-[13px] leading-relaxed ${
        tone === "good" ? "border-good/30 bg-good/10 text-ink" : "border-critical/30 bg-critical/10 text-ink"
      }`}
    >
      {children}
    </div>
  );
}
