import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import { getViewerUser } from "@/server/dashboard";
import { loadFriendGraph } from "@/core/friends/queries";
import { AccountLink } from "./account-link";

/**
 * The three pieces of the header that need an answer from the database.
 *
 * Each is suspended on its own in the layout, so a slow friend-graph query
 * delays a badge and nothing else. None of them block the page body: the layout
 * hands them to the header as slots and carries on rendering.
 */

export async function AccountSlot() {
  const viewer = await getViewer();
  return <AccountLink signedIn={Boolean(viewer)} handle={viewer?.handle ?? null} />;
}

export async function DemoSlot() {
  const [user, t] = await Promise.all([getViewerUser(), getTranslator()]);
  if (!user.demo) return null;

  return (
    <span
      className="eyebrow hidden border border-hairline px-2 py-1 md:inline"
      title={t("nav.demoTitle")}
    >
      {t("nav.demoBadge")}
    </span>
  );
}

export async function FriendsBadge() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const graph = await loadFriendGraph(viewer.profileId);
  const count = graph.incoming.length;
  if (count === 0) return null;

  const t = await getTranslator();
  return (
    <span
      className="numeral ml-1.5 inline-flex h-[17px] min-w-[17px] items-center justify-center bg-[var(--color-accent)] px-1 text-[10px] font-medium text-[var(--color-accent-ink)]"
      aria-label={
        count === 1
          ? t("nav.pendingRequests", { count })
          : t("nav.pendingRequests_plural", { count })
      }
    >
      {count}
    </span>
  );
}
