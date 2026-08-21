import { PageHeaderSkeleton, Skeleton } from "@/components/ui/skeleton";
import { FriendListSkeleton } from "./_sections";

export default function FriendsLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {[0, 1].map((i) => (
          <section key={i} className="border border-hairline bg-surface p-5 sm:p-6">
            <Skeleton className="h-[15px] w-36" />
            <Skeleton className="mt-2.5 h-[13px] w-full max-w-xs" />
            <Skeleton className="mt-5 h-[42px] w-full" />
          </section>
        ))}
      </div>
      <FriendListSkeleton />
    </div>
  );
}
