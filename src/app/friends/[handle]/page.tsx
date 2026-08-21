import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import { getViewerUser } from "@/server/dashboard";
import { displayName, loadFriendIfPermitted, type FriendProfile } from "@/core/friends/queries";
import { Panel } from "@/components/ui/panel";
import {
  ChartSkeleton,
  PanelHeaderSkeleton,
  RecoveryStripSkeleton,
  Skeleton,
  StatTileSkeleton,
} from "@/components/ui/skeleton";
import { Avatar } from "@/components/friends/avatar";
import type { Translator } from "@/core/i18n";
import {
  FriendHero,
  FriendRecoveryChart,
  FriendStrainChart,
  FriendTiles,
  SideBySide,
  friendDays,
} from "./_sections";

export const dynamic = "force-dynamic";

export default async function FriendPage({ params }: { params: Promise<{ handle: string }> }) {
  const [{ handle }, t, viewer] = await Promise.all([params, getTranslator(), getViewer()]);
  if (!viewer) notFound();

  // The authorisation check and the lookup are the same query: an unaccepted
  // handle is indistinguishable from one that does not exist, so guessing a
  // handle reveals nothing about whether it belongs to anyone.
  const friend = await loadFriendIfPermitted(viewer.profileId, handle);
  if (!friend) notFound();

  const name = displayName(friend);
  // Italian and English both read better with a first name than a full one.
  const firstName = friend.fullName?.split(" ")[0] ?? `@${friend.handle}`;

  // Their history is the gate on everything below, so it is fetched once here
  // and shared; every panel then renders from the request cache.
  const days = await friendDays(friend.whoopUserId);
  if (days.length === 0) {
    return (
      <div className="space-y-5">
        <FriendHeader name={name} handle={friend.handle} profile={friend} t={t} />
        <Panel>
          <p className="text-[13px] leading-relaxed text-muted">
            {t("friends.noHistory", { name: firstName })}
          </p>
        </Panel>
      </div>
    );
  }

  const { demo } = await getViewerUser();

  return (
    <div className="space-y-5">
      <FriendHeader name={name} handle={friend.handle} profile={friend} t={t} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Panel className="flex flex-col justify-between">
          <Suspense fallback={<HeroSkeleton />}>
            <FriendHero whoopUserId={friend.whoopUserId} />
          </Suspense>
        </Panel>

        <Panel>
          <Suspense
            fallback={
              <>
                <PanelHeaderSkeleton />
                <Skeleton className="h-[160px] w-full" />
              </>
            }
          >
            <SideBySide whoopUserId={friend.whoopUserId} firstName={firstName} demo={demo} />
          </Suspense>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense
          fallback={
            <>
              <StatTileSkeleton />
              <StatTileSkeleton />
              <StatTileSkeleton />
              <StatTileSkeleton />
            </>
          }
        >
          <FriendTiles whoopUserId={friend.whoopUserId} />
        </Suspense>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <Suspense
            fallback={
              <>
                <PanelHeaderSkeleton />
                <ChartSkeleton />
              </>
            }
          >
            <FriendRecoveryChart whoopUserId={friend.whoopUserId} />
          </Suspense>
        </Panel>
        <Panel>
          <Suspense
            fallback={
              <>
                <PanelHeaderSkeleton subtitle={false} />
                <ChartSkeleton />
              </>
            }
          >
            <FriendStrainChart whoopUserId={friend.whoopUserId} />
          </Suspense>
        </Panel>
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <>
      <div>
        <Skeleton className="h-[11px] w-28" />
        <Skeleton className="mt-3 h-[64px] w-40" />
        <Skeleton className="mt-3 h-[26px] w-28" />
      </div>
      <div className="mt-8">
        <RecoveryStripSkeleton />
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-5">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-[11px] w-12" />
            <Skeleton className="mt-2 h-[20px] w-14" />
          </div>
        ))}
      </dl>
    </>
  );
}

function FriendHeader({
  name,
  handle,
  profile,
  t,
}: {
  name: string;
  handle: string;
  profile: FriendProfile;
  t: Translator;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar profile={profile} size={52} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
          {name}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          @{handle} · {t("friends.sharingWithYou")}
        </p>
      </div>
      <Link
        href="/friends"
        className="shrink-0 border border-hairline bg-surface px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        {t("friends.allFriends")}
      </Link>
    </div>
  );
}
