import { acceptFriendRequest, removeFriendship } from "@/app/friends/actions";
import { displayName, type PendingRequest } from "@/lib/friends/queries";
import { Avatar } from "./avatar";

/**
 * An incoming request is the one screen in the app where a decision has real
 * consequences, so it says what accepting means in full rather than trusting
 * the word "friend" to carry it.
 */
export function IncomingRequestRow({ request }: { request: PendingRequest }) {
  const name = displayName(request.profile);

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
      <Avatar profile={request.profile} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink">{name}</p>
        <p className="truncate text-[12px] text-muted">
          @{request.profile.handle} · wants to share data with you
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <form action={acceptFriendRequest}>
          <input type="hidden" name="id" value={request.id} />
          <button
            type="submit"
            className="rounded-lg bg-ink px-3.5 py-2 text-[13px] font-semibold text-plane transition-opacity hover:opacity-90"
          >
            Approve
          </button>
        </form>
        <form action={removeFriendship}>
          <input type="hidden" name="id" value={request.id} />
          <button
            type="submit"
            className="rounded-lg border border-hairline px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink-2"
          >
            Decline
          </button>
        </form>
      </div>
    </li>
  );
}

export function OutgoingRequestRow({ request }: { request: PendingRequest }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
      <Avatar profile={request.profile} muted />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink-2">
          @{request.profile.handle}
        </p>
        <p className="text-[12px] text-muted">Waiting for approval</p>
      </div>
      <form action={removeFriendship}>
        <input type="hidden" name="id" value={request.id} />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-hairline px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink-2"
        >
          Withdraw
        </button>
      </form>
    </li>
  );
}
