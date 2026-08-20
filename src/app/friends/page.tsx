import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { loadAccountProfile, loadFriendGraph } from "@/lib/friends/queries";
import { loadFriendSnapshots } from "@/lib/friends/summary";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { AddFriendForm } from "@/components/friends/add-friend-form";
import { FriendCard } from "@/components/friends/friend-card";
import { IncomingRequestRow, OutgoingRequestRow } from "@/components/friends/request-rows";
import { HandleField } from "./handle-field";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const userId = await getSessionUserId();

  if (!isDbConfigured() || userId === null) {
    return <SignedOut dbReady={isDbConfigured()} />;
  }

  const [me, graph] = await Promise.all([loadAccountProfile(userId), loadFriendGraph(userId)]);
  const snapshots = await loadFriendSnapshots(graph.friends);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Friends"
        title="Shared with family"
        description="Sharing is mutual and symmetric: when a request is approved, each of you sees the other's recovery, strain and sleep. Either side can end it at any time."
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Panel>
          <PanelHeader
            title="Invite someone"
            subtitle="WHOOP has no public directory, so people are found by the handle this app gives them — ask them for theirs."
          />
          <AddFriendForm />
        </Panel>

        <Panel>
          <PanelHeader
            title="Your handle"
            subtitle="This is what you give out. Changing it does not disturb anyone you already share with."
          />
          <HandleField handle={me?.handle ?? null} />
        </Panel>
      </div>

      {graph.incoming.length > 0 ? (
        <Panel>
          <PanelHeader
            title={`${graph.incoming.length} waiting on you`}
            subtitle="Approving lets them see your recovery, strain and sleep — and lets you see theirs."
          />
          <ul className="space-y-3">
            {graph.incoming.map((request) => (
              <IncomingRequestRow key={request.id} request={request} />
            ))}
          </ul>
        </Panel>
      ) : null}

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">
            Sharing with you{graph.friends.length > 0 ? ` (${graph.friends.length})` : ""}
          </h2>
        </div>

        {snapshots.length === 0 ? (
          <Panel>
            <p className="text-[13px] leading-relaxed text-muted">
              Nobody yet. Send an invite above, or give out your handle and let them start it.
            </p>
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {snapshots.map((snapshot) => (
              <FriendCard
                key={snapshot.profile.userId}
                snapshot={snapshot}
                friendshipId={
                  graph.friends.find((f) => f.userId === snapshot.profile.userId)?.friendshipId
                }
              />
            ))}
          </div>
        )}
      </section>

      {graph.outgoing.length > 0 ? (
        <Panel>
          <PanelHeader title="Sent, not yet approved" />
          <ul className="space-y-3">
            {graph.outgoing.map((request) => (
              <OutgoingRequestRow key={request.id} request={request} />
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

/**
 * Friends is the one part of the dashboard demo data cannot stand in for — it
 * needs a real account on both ends — so this says what is missing rather than
 * inventing a family.
 */
function SignedOut({ dbReady }: { dbReady: boolean }) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Friends"
        title="Share with family"
        description="Invite someone by handle. Once they approve, each of you sees the other's recovery, strain and sleep."
      />
      <Panel>
        <p className="text-[13px] leading-relaxed text-ink-2">
          {dbReady
            ? "Connect your WHOOP account to get a handle and start sharing."
            : "Friends need a database to live in — set DATABASE_URL, then connect your WHOOP account."}{" "}
          <Link href="/settings" className="font-medium text-ink underline underline-offset-4">
            Open settings
          </Link>
        </p>
      </Panel>
    </div>
  );
}
