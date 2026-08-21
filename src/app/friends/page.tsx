import { Suspense } from "react";
import Link from "next/link";
import { isDbConfigured } from "@/core/db";
import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import type { Translator } from "@/core/i18n";
import { Panel, PanelHeader, PageHeader } from "@/components/ui/panel";
import { AddFriendForm } from "@/components/friends/add-friend-form";
import { HandleField } from "./handle-field";
import { FriendList, FriendListSkeleton, IncomingRequests, OutgoingRequests } from "./_sections";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const t = await getTranslator();
  const viewer = await getViewer();

  if (!isDbConfigured() || !viewer) {
    return <SignedOut t={t} dbReady={isDbConfigured()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("friends.eyebrow")}
        title={t("friends.title")}
        description={t("friends.lead")}
      />

      {/* Both of these are ready the moment the session is — no graph, no
          history — so they render with the page rather than after it. */}
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

      <Suspense fallback={null}>
        <IncomingRequests />
      </Suspense>

      <Suspense fallback={<FriendListSkeleton />}>
        <FriendList />
      </Suspense>

      <Suspense fallback={null}>
        <OutgoingRequests />
      </Suspense>
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
