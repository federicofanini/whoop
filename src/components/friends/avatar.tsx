import { displayName, type FriendProfile } from "@/lib/friends/queries";
import { cn } from "@/lib/utils";

/**
 * Initials on a colour derived from the handle.
 *
 * WHOOP's API exposes no profile photo, and asking people to upload one would
 * add storage, moderation and a settings screen to a two-feature app. A stable
 * colour per handle is enough to tell four family members apart in a list.
 */
const TINTS = ["#3987e5", "#199e70", "#d95926", "#9085e9", "#0ca30c", "#fab219"] as const;

export function Avatar({
  profile,
  size = 40,
  muted = false,
}: {
  profile: FriendProfile;
  size?: number;
  muted?: boolean;
}) {
  const name = displayName(profile);
  const initials = name
    .replace(/^@/, "")
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  // Sum of char codes: stable across renders and processes, unlike a hash that
  // depends on runtime string interning.
  let seed = 0;
  for (const char of profile.handle) seed += char.charCodeAt(0);
  const tint = TINTS[seed % TINTS.length];

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-plane",
        muted && "opacity-60",
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: tint,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials || "?"}
    </span>
  );
}
