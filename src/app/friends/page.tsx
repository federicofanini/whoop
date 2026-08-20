import Link from "next/link";
import { isDbConfigured } from "@/core/db";
import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import { loadFriendGraph } from "@/core/friends/queries";
import { loadFriendSnapshots } from "@/core/friends/summary";
import type { Translator } from "@/core/i18n";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { AddFriendForm } from "@/components/friends/add-friend-form";
import { FriendCard } from "@/components/friends/friend-card";
import { IncomingRequestRow, OutgoingRequestRow } from "@/components/friends/request-rows";
import { HandleField } from "./handle-field";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const t = await getTranslator();
  const viewer = await getViewer();

  if (!isDbConfigured() || !viewer) {
    return <SignedOut t={t} dbReady={isDbConfigured()} />;
  }

  const graph = await loadFriendGraph(viewer.profileId);
  const snapshots = await loadFriendSnapshots(graph.friends);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t("friends.eyebrow")} title={t("friends.title")} description={t("friends.lead")} />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Panel>
          <PanelHeader title={t("friends.invite")} subtitle={t("friends.inviteSub")} />
          <AddFriendForm
            labels={{
              placeholder: t("friends.invitePlaceholder"),
              field: t("friends.theirHandle"),
              send: t("friends.send"),
              sending: t("friends.sending"),
              willSend: (handle: string) => t("friends.willSendTo", { handle }),
            }}
            dict={messageDict(t)}
          />
        </Panel>

        <Panel>
          <PanelHeader title={t("friends.yourHandle")} subtitle={t("friends.yourHandleSub")} />
          <HandleField
            handle={viewer.handle}
            labels={{ field: t("friends.yourHandle"), rename: t("friends.rename") }}
            dict={messageDict(t)}
          />
        </Panel>
      </div>

      {graph.incoming.length > 0 ? (
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
      ) : null}

      <section>
        <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-ink">
          {t("friends.sharingWith")}
          {graph.friends.length > 0 ? ` (${graph.friends.length})` : ""}
        </h2>

        {snapshots.length === 0 ? (
          <Panel>
            <p className="text-[13px] leading-relaxed text-muted">{t("friends.nobodyYet")}</p>
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {snapshots.map((snapshot) => (
              <FriendCard
                key={snapshot.profile.profileId}
                snapshot={snapshot}
                t={t}
                friendshipId={
                  graph.friends.find((f) => f.profileId === snapshot.profile.profileId)?.friendshipId
                }
              />
            ))}
          </div>
        )}
      </section>

      {graph.outgoing.length > 0 ? (
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
      ) : null}
    </div>
  );
}

/**
 * The action results come back as dictionary keys, because the server cannot
 * assume the language the form was rendered in. The client form needs those
 * keys resolved, so the strings travel with it.
 */
function messageDict(t: Translator): Record<string, string> {
  const keys = [
    "friends.sent",
    "friends.renamed",
    "friends.reverseAccepted",
    "friends.error.tooShort",
    "friends.error.charset",
    "friends.error.self",
    "friends.error.already",
    "friends.error.pending",
    "friends.error.taken",
    "friends.error.noDatabase",
    "friends.error.signedOut",
  ];
  // `{handle}` is left in place: the client interpolates it once it knows which
  // handle the member actually typed.
  return Object.fromEntries(keys.map((key) => [key, t(key)]));
}

/**
 * Friends is the one part of the dashboard demo data cannot stand in for — it
 * needs a real account on both ends — so this says what is missing rather than
 * inventing a family.
 */
function SignedOut({ t, dbReady }: { t: Translator; dbReady: boolean }) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("friends.eyebrow")}
        title={t("friends.signedOutTitle")}
        description={t("friends.signedOutLead")}
      />
      <Panel>
        <p className="text-[13px] leading-relaxed text-ink-2">
          {dbReady ? t("friends.signedOutConnect") : t("friends.signedOutDb")}{" "}
          <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4">
            {t("nav.signIn")}
          </Link>
        </p>
      </Panel>
    </div>
  );
}
