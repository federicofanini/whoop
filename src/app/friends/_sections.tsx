import { Suspense } from "react";
import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import { loadFriendGraph, type Friend } from "@/core/friends/queries";
import { loadFriendSnapshot } from "@/core/friends/summary";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { FriendCard } from "@/components/friends/friend-card";
import { IncomingRequestRow, OutgoingRequestRow } from "@/components/friends/request-rows";

/**
 * The friends page, split along the one axis that matters here: the graph is a
 * single indexed join and comes back fast, while each friend's card needs that
 * person's own history. Loading them together meant the invite form waited on
 * everyone's sleep data.
 *
 * Each card is also suspended individually, so one friend with a long history
 * does not hold up the rest of the list.
 */

export async function IncomingRequests() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const [graph, t] = await Promise.all([loadFriendGraph(viewer.profileId), getTranslator()]);
  if (graph.incoming.length === 0) return null;

  return (
    <Panel>
      <PanelHeader
        title={t("friends.waitingOnYou", { count: graph.incoming.length })}
        subtitle={t("friends.waitingOnYouSub")}
      />
      <ul className="space-y-3">
        {graph.incoming.map((request) => (
          <IncomingRequestRow
            key={request.id}
            request={request}
            labels={{
              wants: t("friends.wantsToShare"),
              approve: t("friends.approve"),
              decline: t("friends.decline"),
            }}
          />
        ))}
      </ul>
    </Panel>
  );
}

export async function OutgoingRequests() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const [graph, t] = await Promise.all([loadFriendGraph(viewer.profileId), getTranslator()]);
  if (graph.outgoing.length === 0) return null;

  return (
    <Panel>
      <PanelHeader title={t("friends.sentNotApproved")} />
      <ul className="space-y-3">
        {graph.outgoing.map((request) => (
          <OutgoingRequestRow
            key={request.id}
            request={request}
            labels={{ waiting: t("friends.waitingApproval"), withdraw: t("friends.withdraw") }}
          />
        ))}
      </ul>
    </Panel>
  );
}

export async function FriendList() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const [graph, t] = await Promise.all([loadFriendGraph(viewer.profileId), getTranslator()]);

  return (
    <section>
      <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-ink">
        {t("friends.sharingWith")}
        {graph.friends.length > 0 ? ` (${graph.friends.length})` : ""}
      </h2>

      {graph.friends.length === 0 ? (
        <Panel>
          <p className="text-[13px] leading-relaxed text-muted">{t("friends.nobodyYet")}</p>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {graph.friends.map((friend) => (
            <Suspense key={friend.profileId} fallback={<FriendCardSkeleton />}>
              <FriendCardSection friend={friend} />
            </Suspense>
          ))}
        </div>
      )}
    </section>
  );
}

async function FriendCardSection({ friend }: { friend: Friend }) {
  const [snapshot, t] = await Promise.all([loadFriendSnapshot(friend), getTranslator()]);
  return <FriendCard snapshot={snapshot} t={t} friendshipId={friend.friendshipId} />;
}

/** Matches `FriendCard`: avatar row, recovery figure, strip, three vitals. */
export function FriendCardSkeleton() {
  return (
    <div className="border border-hairline bg-surface p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-pill" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-[14px] w-32" />
          <Skeleton className="mt-1.5 h-[12px] w-20" />
        </div>
      </div>
      <Skeleton className="mt-5 h-[40px] w-24" />
      <Skeleton className="mt-4 h-[36px] w-full" />
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-[11px] w-10" />
            <Skeleton className="mt-1.5 h-[16px] w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FriendListSkeleton() {
  return (
    <section>
      <Skeleton className="mb-4 h-[15px] w-40" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FriendCardSkeleton />
        <FriendCardSkeleton />
      </div>
    </section>
  );
}
