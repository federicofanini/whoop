import { Suspense } from "react";
import Link from "next/link";
import { isDbConfigured } from "@/core/db";
import { isWhoopConfigured } from "@/core/whoop/oauth";
import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import { isSupabaseConfigured } from "@/server/supabase";
import { getCoreDays } from "@/server/dashboard";
import { sharedSlotAvailability } from "@/core/whoop/credentials";
import { loadOwnKeySummary } from "@/core/whoop/key-summary";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncControls } from "./sync-controls";
import { WhoopKeys } from "./whoop-keys";

/**
 * Settings, split by what each panel has to ask.
 *
 * Three of the four requirements below are answered by reading environment
 * variables and are true before any query runs. Only the last needs the session
 * and a cycle count, and only the credentials panel needs the slot accounting —
 * so the checklist appears immediately and fills in its final line, rather than
 * the whole page waiting on a six-month history read to print one number.
 */

export async function ConnectionPanel() {
  const t = await getTranslator();
  const whoopReady = isWhoopConfigured();
  const dbReady = isDbConfigured();

  return (
    <Panel>
      <PanelHeader title={t("settings.whoopAccount")} subtitle={t("settings.whoopAccountSub")} />

      <div className="space-y-3">
        <Requirement met={dbReady} label={t("settings.reqDatabase")}>
          {t("settings.reqDatabaseBody")}
        </Requirement>
        <Requirement met={isSupabaseConfigured()} label={t("settings.reqSupabase")}>
          {t("settings.reqSupabaseBody")}
        </Requirement>
        <Requirement met={whoopReady} label={t("settings.reqWhoop")}>
          {t("settings.reqWhoopBody")}
        </Requirement>
        <Suspense fallback={<RequirementSkeleton />}>
          <LinkedRequirement />
        </Suspense>
      </div>

      {whoopReady && dbReady ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <Suspense fallback={<Skeleton className="h-[42px] w-32" />}>
            <ConnectButton />
          </Suspense>
          <SyncControls />
        </div>
      ) : (
        <p className="mt-5 border border-hairline bg-surface-2 p-4 text-[13px] leading-relaxed text-ink-2">
          {t("settings.envHint")}
        </p>
      )}
    </Panel>
  );
}

async function LinkedRequirement() {
  const [t, viewer] = await Promise.all([getTranslator(), getViewer()]);
  const linked = Boolean(viewer?.whoopUserId);
  const days = linked ? await getCoreDays() : [];

  return (
    <Requirement met={linked} label={t("settings.reqLinked")}>
      {linked ? t("settings.reqLinkedBody", { count: days.length }) : t("settings.reqNotLinked")}
    </Requirement>
  );
}

async function ConnectButton() {
  const [t, viewer] = await Promise.all([getTranslator(), getViewer()]);

  return (
    <a
      href="/api/auth/whoop"
      className="bg-ink px-4 py-2.5 text-[14px] font-semibold text-plane transition-colors hover:bg-ink-2"
    >
      {viewer?.whoopUserId ? t("settings.reconnect") : t("settings.connect")}
    </a>
  );
}

export async function IdentityPanel() {
  const [t, viewer] = await Promise.all([getTranslator(), getViewer()]);

  return (
    <Panel>
      <PanelHeader title={t("settings.identity")} subtitle={t("settings.identitySub")} />
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
  );
}

export async function CredentialsPanel() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const [slots, ownKeys] = await Promise.all([
    sharedSlotAvailability(viewer.profileId),
    loadOwnKeySummary(viewer.profileId),
  ]);

  return (
    <WhoopKeys
      hasOwnKeys={Boolean(ownKeys?.clientId)}
      maskedClientId={ownKeys?.clientId ?? null}
      remaining={slots.held ? slots.remaining + 1 : slots.remaining}
      limit={slots.limit}
      locked={!slots.held && slots.remaining === 0 && !ownKeys?.clientId}
    />
  );
}

function RequirementSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="mt-0.5 h-3 w-3 shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-[13px] w-40" />
        <Skeleton className="mt-1.5 h-[12px] w-64 max-w-full" />
      </div>
    </div>
  );
}

export function PanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <section className="border border-hairline bg-surface p-5 sm:p-6">
      <Skeleton className="h-[15px] w-44" />
      <Skeleton className="mt-2.5 h-[13px] w-full max-w-sm" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-3 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-[13px] w-1/3" />
              <Skeleton className="mt-1.5 h-[12px] w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </section>
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
      <span aria-hidden className={`mt-0.5 text-[13px] ${met ? "text-good" : "text-muted"}`}>
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
