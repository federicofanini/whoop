"use client";

import { acceptFriendRequest, removeFriendship } from "@/app/friends/actions";
import { displayName, type PendingRequest } from "@/core/friends/types";
import { Avatar } from "./avatar";
import { useT } from "@/components/i18n-provider";

/**
 * An incoming request is the one screen in the app where a decision has real
 * consequences, so it says what accepting means in full rather than trusting
 * the word "friend" to carry it.
 */
export function IncomingRequestRow({ request }: { request: PendingRequest }) {
  const t = useT();

  return (
    <li className="flex flex-wrap items-center gap-3 border border-hairline bg-surface-2 p-4">
      <Avatar profile={request.profile} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink">{displayName(request.profile)}</p>
        <p className="truncate text-[12px] text-muted">
          @{request.profile.handle} · {t("friends.wantsToShare")}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <form action={acceptFriendRequest}>
          <input type="hidden" name="id" value={request.id} />
          <button
            type="submit"
            className="bg-[var(--color-accent)] px-3.5 py-2 text-[13px] font-medium text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
          >
            {t("friends.approve")}
          </button>
        </form>
        <form action={removeFriendship}>
          <input type="hidden" name="id" value={request.id} />
          <button
            type="submit"
            className="border border-hairline px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink-2"
          >
            {t("friends.decline")}
          </button>
        </form>
      </div>
    </li>
  );
}

export function OutgoingRequestRow({ request }: { request: PendingRequest }) {
  const t = useT();

  return (
    <li className="flex items-center gap-3 border border-hairline bg-surface-2 p-4">
      <Avatar profile={request.profile} muted />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink-2">@{request.profile.handle}</p>
        <p className="text-[12px] text-muted">{t("friends.waitingApproval")}</p>
      </div>
      <form action={removeFriendship}>
        <input type="hidden" name="id" value={request.id} />
        <button
          type="submit"
          className="shrink-0  border border-hairline px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink-2"
        >
          {t("friends.withdraw")}
        </button>
      </form>
    </li>
  );
}
