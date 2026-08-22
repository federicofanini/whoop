/**
 * Friend shapes and the pure helpers over them.
 *
 * Split out from `queries.ts` because that module opens a database connection:
 * a Client Component importing `displayName` from there pulls the Postgres
 * driver into the browser bundle, which fails the build. Types and pure
 * functions belong on the near side of that boundary.
 */

export interface FriendProfile {
  profileId: string;
  handle: string;
  fullName: string | null;
  avatarUrl: string | null;
  /**
   * The WHOOP account this person has linked, if any. Null means they have
   * signed in but never connected a strap — a real state, not an error.
   */
  whoopUserId: number | null;
}

export interface PendingRequest {
  id: string;
  profile: FriendProfile;
  createdAt: Date;
}

/** An accepted friend, carrying the row id so the card can offer to end it. */
export interface Friend extends FriendProfile {
  friendshipId: string;
}

export interface FriendGraph {
  friends: Friend[];
  /** Requests waiting on *you*. These are the ones with a decision to make. */
  incoming: PendingRequest[];
  /** Requests you sent that have not been answered. */
  outgoing: PendingRequest[];
}

/** Falls back to the handle, because a profile may have no display name. */
export function displayName(profile: FriendProfile): string {
  return profile.fullName?.trim() || `@${profile.handle}`;
}
